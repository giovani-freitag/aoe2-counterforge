import { describe, expect, it } from 'vitest';
import { InvalidArgumentError } from '../../../../src/domain/errors/domain-error.ts';
import { EconomyService } from '../../../../src/services/economy/economy-service.ts';
import { gatherRates } from '../../../../src/composition-root.ts';
import { economyConfig } from '../../../fixtures/economy.ts';
import { makeUnit } from '../../../fixtures/unit-builder.ts';

const economy = new EconomyService(economyConfig());
const stated = gatherRates();

describe('EconomyService gather rates', () => {
    it('delivers less than the rate at the tree, because the walk home costs time', () => {
        const rate = economy.gatherRate({ resource: 'wood' });

        expect(rate).toBeLessThan(stated.wood.gatherRate);
    });

    it('would deliver the stated rate if the drop-off were underfoot', () => {
        const instant = new EconomyService({
            ...economyConfig(),
            rates: { ...stated, wood: { ...stated.wood, dropOffDistance: 0 } },
        });

        const rate = instant.gatherRate({ resource: 'wood' });

        expect(rate).toBeCloseTo(stated.wood.gatherRate, 4);
    });

    it('applies a gathering technology as a percentage of the work itself', () => {
        const rate = economy.gatherRate({ resource: 'gold', techs: ['gold-mining'] });

        expect(rate).toBeGreaterThan(economy.gatherRate({ resource: 'gold' }));
    });

    it('stacks the two mining technologies', () => {
        const single = economy.gatherRate({ resource: 'gold', techs: ['gold-mining'] });
        const both = economy.gatherRate({ resource: 'gold', techs: ['gold-mining', 'gold-shaft-mining'] });

        expect(both).toBeGreaterThan(single);
    });

    it('raises the rate with Wheelbarrow by shortening the carrying trip', () => {
        const base = economy.gatherRate({ resource: 'wood' });
        const withWheelbarrow = economy.gatherRate({ resource: 'wood', techs: ['wheelbarrow'] });

        expect(withWheelbarrow / base).toBeGreaterThan(1.05);
    });

    it('keeps the carrying gain modest rather than compounding it like a rate bonus', () => {
        const base = economy.gatherRate({ resource: 'wood' });
        const withCarts = economy.gatherRate({ resource: 'wood', techs: ['wheelbarrow', 'hand-cart'] });

        expect(withCarts / base).toBeLessThan(1.3);
    });

    it('gives Heavy Plow its extra carry capacity only to farmers', () => {
        const onFarm = economy.gatherRate({ resource: 'food', foodSource: 'farm', techs: ['heavy-plow'] });
        const onSheep = economy.gatherRate({ resource: 'food', foodSource: 'sheep', techs: ['heavy-plow'] });

        expect([
            onFarm > economy.gatherRate({ resource: 'food', foodSource: 'farm' }),
            onSheep === economy.gatherRate({ resource: 'food', foodSource: 'sheep' }),
        ]).toEqual([true, true]);
    });

    it('switches the food rate with the chosen food source', () => {
        const onHunt = economy.gatherRate({ resource: 'food', foodSource: 'hunt' });

        expect(onHunt).not.toBeCloseTo(economy.gatherRate({ resource: 'food', foodSource: 'berries' }), 2);
    });

    it('carries a whole boar back at once, the way the game says', () => {
        const hunt = economy.gatherRate({ resource: 'food', foodSource: 'hunt' });
        const berries = economy.gatherRate({ resource: 'food', foodSource: 'berries' });

        // Thirty-five a trip against ten: the hunter walks a third as often for the same load.
        expect(hunt / stated.food.hunt.gatherRate).toBeGreaterThan(berries / stated.food.berries.gatherRate);
    });
});

describe('EconomyService production plan', () => {
    it('divides the resource drain by the gather rate to size the villager count', () => {
        const unit = makeUnit({ cost: { wood: 25, gold: 45 }, trainTime: 35 });

        const plan = economy.plan({ unit, buildings: 1 });

        expect(plan.demands.map((demand) => [demand.resource, Number(demand.villagers.toFixed(2))])).toEqual([
            ['wood', 2.37],
            ['gold', 4.35],
        ]);
    });

    it('scales the demand with the number of production buildings', () => {
        const unit = makeUnit({ cost: { wood: 25, gold: 45 }, trainTime: 35 });

        const plan = economy.plan({ unit, buildings: 3 });

        expect(plan.unitsPerMinute).toBeCloseTo(5.14, 2);
    });

    it('names the resource that needs the most villagers as the bottleneck', () => {
        const unit = makeUnit({ cost: { wood: 25, gold: 45 }, trainTime: 35 });

        const plan = economy.plan({ unit });

        expect(plan.bottleneck).toBe('gold');
    });

    it('charges wood for the farms that feed a food-hungry queue', () => {
        const unit = makeUnit({ cost: { food: 60 }, trainTime: 20 });

        const plan = economy.plan({ unit, foodSource: 'farm' });

        expect(plan.demands.map((demand) => demand.resource)).toEqual(['food', 'wood']);
    });

    it('cuts the farm upkeep once the farm technologies are researched', () => {
        const unit = makeUnit({ cost: { food: 60 }, trainTime: 20 });

        const upgraded = economy.plan({ unit, gatherTechs: ['horse-collar', 'heavy-plow', 'crop-rotation'] });
        const plain = economy.plan({ unit });

        expect(upgraded.farmUpkeep?.woodPerSecond).toBeLessThan(plain.farmUpkeep?.woodPerSecond ?? 0);
    });

    it('drops the farm upkeep entirely when the food comes from somewhere else', () => {
        const unit = makeUnit({ cost: { food: 60 }, trainTime: 20 });

        const plan = economy.plan({ unit, foodSource: 'hunt' });

        expect(plan.farmUpkeep).toBeNull();
    });

    it('lets the upkeep be switched off', () => {
        const unit = makeUnit({ cost: { food: 60 }, trainTime: 20 });

        const plan = economy.plan({ unit, includeFarmUpkeep: false });

        expect(plan.demands.map((demand) => demand.resource)).toEqual(['food']);
    });

    it('counts one farm per farmer', () => {
        const unit = makeUnit({ cost: { food: 60 }, trainTime: 20 });

        const plan = economy.plan({ unit });

        expect(plan.farmUpkeep?.farms).toBe(Math.ceil(plan.demands[0].villagers));
    });

    it('skips resources the unit neither costs nor needs for upkeep', () => {
        const unit = makeUnit({ cost: { gold: 60 }, trainTime: 20 });

        const plan = economy.plan({ unit });

        expect(plan.demands).toHaveLength(1);
    });

    it('reports how many buildings a villager budget sustains', () => {
        const unit = makeUnit({ cost: { wood: 25, gold: 45 }, trainTime: 35 });

        const buildings = economy.sustainableBuildings({ unit }, 20);

        expect(buildings).toBe(2);
    });

    it('refuses to plan a unit with no training time', () => {
        const unit = makeUnit({ trainTime: 0 });

        expect(() => economy.plan({ unit })).toThrow(InvalidArgumentError);
    });
});

describe('EconomyService villager totals', () => {
    it('rounds each resource up on its own, because a villager cannot be split', () => {
        const unit = makeUnit({ cost: { food: 60, gold: 75 }, trainTime: 30 });

        const plan = economy.plan({ unit });

        expect(plan.wholeVillagers).toBe(plan.demands.reduce((sum, demand) => sum + Math.ceil(demand.villagers), 0));
    });

    it('never reports fewer whole villagers than the exact figure', () => {
        const unit = makeUnit({ cost: { food: 60, gold: 75 }, trainTime: 30 });

        const plan = economy.plan({ unit });

        expect(plan.wholeVillagers).toBeGreaterThanOrEqual(plan.totalVillagers);
    });
});

import { describe, expect, it } from 'vitest';
import { createServices } from '../../src/composition-root.ts';
import type { ProductionPlan } from '../../src/services/economy/economy-service.ts';

const services = createServices();

const woodVillagers = (plan: ProductionPlan) =>
    plan.demands.find((demand) => demand.resource === 'wood')?.villagers ?? 0;

describe('shipped dataset', () => {
    it('exposes every civilization of the tech tree', () => {
        expect(services.catalog.civilizations()).toHaveLength(53);
    });

    it('gives every unit a localized Brazilian Portuguese name', () => {
        const missing = services.catalog
            .units()
            .filter((unit) => services.text.unit('pt-BR', unit.key).name === unit.key);

        expect(missing).toEqual([]);
    });

    it('keeps every unit reachable from its own upgrade line', () => {
        const orphans = services.catalog
            .units()
            .filter((unit) => services.catalog.units({ line: unit.line }).length === 0);

        expect(orphans).toEqual([]);
    });

    it('points every unique unit at a civilization that exists', () => {
        const keys = new Set(services.catalog.civilizations().map((civilization) => civilization.key));
        const dangling = services.catalog
            .units()
            .filter((unit) => unit.uniqueTo !== null && !keys.has(unit.uniqueTo));

        expect(dangling).toEqual([]);
    });

    it('resolves every modelled technology against the catalog', () => {
        const affecting = services.upgrades.affecting(services.catalog.unit('archer'));

        expect(affecting.length).toBeGreaterThan(5);
    });
});

describe('unit guidance', () => {
    it('rates the Pikeman as a hard counter to the Knight', () => {
        const pikeman = services.catalog.unit('pikeman');

        const matchup = services.matchups.against({ unit: pikeman }, services.catalog.unit('knight'));

        expect(matchup.efficiency).toBeGreaterThan(1.25);
    });

    it('rates the Knight as countered by the Halberdier', () => {
        const knight = services.catalog.unit('knight');

        const report = services.matchups.rank({ unit: knight });

        expect(report.weakAgainst.map((matchup) => matchup.opponent.key)).toContain('halberdier');
    });

    it('rates the Elite Skirmisher as a counter to the Crossbowman', () => {
        const crossbow = services.catalog.unit('crossbowman');

        const report = services.matchups.rank({ unit: crossbow });

        expect(report.weakAgainst.map((matchup) => matchup.opponent.key)).toContain('elite-skirmisher');
    });

    it('applies the whole blacksmith and range line to a fully upgraded Archer', () => {
        const archer = services.catalog.unit('archer');

        const upgraded = services.upgrades.fullyUpgraded(archer).stats.toRecord();

        expect(upgraded).toMatchObject({ attack: 8, range: 7, pierceArmour: 4, accuracy: 100 });
    });

    it('sizes the villager count for two Archery Ranges', () => {
        const archer = services.catalog.unit('archer');

        const plan = services.economy.plan({ unit: archer, buildings: 2 });

        expect(plan.demands.map((demand) => [demand.resource, Math.ceil(demand.villagers)])).toEqual([
            ['wood', 4],
            ['gold', 7],
        ]);
    });

    it('adds up the rounded villager counts of each resource', () => {
        const knight = services.catalog.unit('knight');

        const plan = services.economy.plan({ unit: knight, buildings: 1 });

        expect([plan.wholeVillagers, plan.demands.map((demand) => Math.ceil(demand.villagers))]).toEqual([
            16,
            [7, 2, 7],
        ]);
    });

    it('marks gold as the bottleneck of Knight production', () => {
        const knight = services.catalog.unit('knight');

        const plan = services.economy.plan({ unit: knight, buildings: 3 });

        expect(plan.bottleneck).toBe('gold');
    });
});

describe('search', () => {
    it('finds a unit by its accent-free Brazilian Portuguese name', () => {
        const outcome = services.search.search({ text: 'milicia', locale: 'pt-BR' });

        expect(outcome.hits[0]?.document.key).toBe('militia');
    });

    it('finds a unit by its English name while the interface is in Portuguese', () => {
        const outcome = services.search.search({ text: 'crossbowman', locale: 'pt-BR' });

        expect(outcome.hits[0]?.document.key).toBe('crossbowman');
    });

    it('scopes the results to the civilization named in the query', () => {
        const outcome = services.search.search({ text: 'bretoes arqueiro', locale: 'pt-BR' });

        expect(outcome.civScope?.key).toBe('britons');
    });

    it('keeps only that civilization roster once the query is scoped', () => {
        const outcome = services.search.search({ text: 'britons longbow', locale: 'en' });

        expect(outcome.hits[0]?.document.key).toBe('longbowman');
    });

    it('ranks a civilization first when its name is typed alone', () => {
        const outcome = services.search.search({ text: 'teutons', locale: 'en' });

        expect(outcome.hits[0]?.document.kind).toBe('civilization');
    });

    it('finds technologies too', () => {
        const outcome = services.search.search({ text: 'bloodlines', locale: 'en' });

        expect(outcome.hits.some((hit) => hit.document.key === 'bloodlines')).toBe(true);
    });
});

describe('opponent pools on the shipped roster', () => {
    it('keeps the common pool small enough to read at a glance', () => {
        const knight = services.catalog.unit('knight');

        const report = services.matchups.rank({ unit: knight, pool: 'common' });

        expect(report.all.length).toBeLessThan(20);
    });

    it('adds the unique units to the wider pool', () => {
        const knight = services.catalog.unit('knight');

        const common = services.matchups.rank({ unit: knight, pool: 'common' }).all.length;
        const all = services.matchups.rank({ unit: knight, pool: 'all' }).all.length;

        expect(all).toBeGreaterThan(common * 3);
    });

    it('lists every upgrade step in the widest pool', () => {
        const knight = services.catalog.unit('knight');

        const report = services.matchups.rank({ unit: knight, pool: 'every' });

        expect(report.all.map((matchup) => matchup.opponent.key)).toEqual(
            expect.arrayContaining(['militia', 'man-at-arms', 'long-swordsman', 'champion']),
        );
    });

    it('never lets the subject fight itself', () => {
        const knight = services.catalog.unit('knight');

        const report = services.matchups.rank({ unit: knight, pool: 'every' });

        expect(report.all.map((matchup) => matchup.opponent.key)).not.toContain('knight');
    });
});

describe('economy on the shipped roster', () => {
    it('charges wood for the farms behind a Knight queue even though Knights cost none', () => {
        const knight = services.catalog.unit('knight');

        const plan = services.economy.plan({ unit: knight, buildings: 1 });

        expect(plan.demands.map((demand) => demand.resource)).toEqual(['food', 'wood', 'gold']);
    });

    it('drops the farm wood once the food comes from hunting', () => {
        const knight = services.catalog.unit('knight');

        const plan = services.economy.plan({ unit: knight, buildings: 1, foodSource: 'hunt' });

        expect(plan.demands.map((demand) => demand.resource)).toEqual(['food', 'gold']);
    });

    it('cuts the farm count with the farm technologies researched', () => {
        const knight = services.catalog.unit('knight');

        const plain = services.economy.plan({ unit: knight });
        const upgraded = services.economy.plan({
            unit: knight,
            gatherTechs: ['horse-collar', 'heavy-plow', 'crop-rotation'],
        });

        expect(upgraded.farmUpkeep?.foodPerFarm).toBe(550);
        expect(upgraded.demands[1].villagers).toBeLessThan(plain.demands[1].villagers);
    });

    it('needs fewer lumberjacks once the wood technologies are in', () => {
        const archer = services.catalog.unit('archer');

        const plain = services.economy.plan({ unit: archer, buildings: 2 });
        const upgraded = services.economy.plan({
            unit: archer,
            buildings: 2,
            gatherTechs: ['double-bit-axe', 'bow-saw', 'two-man-saw', 'wheelbarrow', 'hand-cart'],
        });

        expect(woodVillagers(upgraded)).toBeLessThan(woodVillagers(plain) * 0.7);
    });
});

describe('roster ordering on the shipped units', () => {
    it('puts a cheap fast unit at the top of the quickest-to-train ordering', () => {
        const units = services.catalog.units({ combatOnly: true, categories: ['infantry'] });

        const ranked = services.ranking.rank({ units, sort: 'train-time' });

        expect(ranked[0].unit.trainTime).toBeLessThanOrEqual(ranked.at(-1)?.unit.trainTime ?? 0);
    });

    it('keeps single-use units out of the top of the value ordering', () => {
        const units = services.catalog.units({ combatOnly: true });

        const ranked = services.ranking.rank({ units, sort: 'value' });

        expect(ranked.slice(0, 10).map((entry) => entry.unit.key)).not.toContain('petard');
    });

    it('gives every single-use unit a damage per second of zero', () => {
        const oneShot = services.catalog.units().filter((unit) => unit.stats.reloadTime === 0);

        const values = oneShot.map((unit) => services.ranking.rawDps(unit.stats));

        expect(values.every((value) => value === 0)).toBe(true);
    });

    it('ranks the War Elephant above a Militia on raw power', () => {
        const units = [services.catalog.unit('militia'), services.catalog.unit('war-elephant')];

        const ranked = services.ranking.rank({ units, sort: 'hp' });

        expect(ranked[0].unit.key).toBe('war-elephant');
    });

    it('reranks by attack once the blacksmith line is counted', () => {
        const units = [services.catalog.unit('champion')];

        const plain = services.ranking.rank({ units, sort: 'attack' })[0].metric;
        const upgraded = services.ranking.rank({ units, sort: 'attack', upgraded: true })[0].metric;

        expect(upgraded).toBeGreaterThan(plain);
    });
});

describe('units whose projectiles bypass the accuracy roll', () => {
    it('does not silence the Organ Gun', () => {
        const organGun = services.catalog.unit('elite-organ-gun');
        const target = services.catalog.unit('elite-kipchak');

        const dps = services.combat.dps(organGun.stats, target.stats);

        expect(dps).toBeGreaterThan(0.5);
    });

    it('keeps the Arambai inaccurate, since that number is real', () => {
        const arambai = services.catalog.unit('arambai');

        expect(arambai.stats.hitChance()).toBeCloseTo(0.2, 5);
    });

    it('stops rating the Organ Gun as free food for cavalry', () => {
        const tiger = services.catalog.unit('elite-tiger-cavalry');

        const matchup = services.matchups.against({ unit: tiger }, services.catalog.unit('elite-organ-gun'));

        expect(matchup.efficiency).toBeLessThan(99);
    });
});

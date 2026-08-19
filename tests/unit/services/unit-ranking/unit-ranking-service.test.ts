import { describe, expect, it } from 'vitest';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from '../../../../src/services/game-catalog/game-catalog-service.ts';
import { UnitRankingService } from '../../../../src/services/unit-ranking/unit-ranking-service.ts';
import { UpgradeService } from '../../../../src/services/upgrade/upgrade-service.ts';
import { technologyRecord, unitRecord } from '../../../fixtures/records.ts';

function buildService() {
    const catalog = new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: [
            unitRecord({
                key: 'scout',
                category: 'cavalry',
                age: 1,
                hp: 45,
                attacks: { 'base-melee': 3 },
                reloadTime: 2,
                speed: 1.55,
                trainTime: 30,
                cost: { food: 80 },
            }),
            unitRecord({
                key: 'archer',
                category: 'archer',
                age: 2,
                hp: 30,
                attacks: { 'base-pierce': 4 },
                reloadTime: 2,
                range: 4,
                speed: 0.96,
                trainTime: 35,
                cost: { wood: 25, gold: 45 },
            }),
            unitRecord({
                key: 'champion',
                category: 'infantry',
                age: 4,
                hp: 70,
                attacks: { 'base-melee': 13 },
                reloadTime: 2,
                speed: 0.99,
                trainTime: 21,
                cost: { food: 60, gold: 20 },
            }),
        ],
        technologies: [
            technologyRecord({
                key: 'forging',
                civs: ['britons', 'franks'],
                effects: [
                    {
                        mode: 'add',
                        unit: null,
                        unitClass: 6,
                        attribute: 'attack',
                        value: 5,
                        damageClass: 'base-melee',
                    },
                ],
            }),
        ],
        civilizations: [],
    });

    const upgrades = new UpgradeService({ catalog });

    return {
        catalog,
        ranking: new UnitRankingService({ upgrades, resourceWeights: { food: 1, wood: 1, gold: 1.6, stone: 1.6 } }),
    };
}

describe('UnitRankingService', () => {
    it('puts the quickest unit to train first', () => {
        const { catalog, ranking } = buildService();

        const ranked = ranking.rank({ units: catalog.units(), sort: 'train-time' });

        expect(ranked.map((entry) => entry.unit.key)).toEqual(['champion', 'scout', 'archer']);
    });

    it('puts the toughest unit first', () => {
        const { catalog, ranking } = buildService();

        const ranked = ranking.rank({ units: catalog.units(), sort: 'hp' });

        expect(ranked.map((entry) => entry.unit.key)).toEqual(['champion', 'scout', 'archer']);
    });

    it('puts the cheapest unit first', () => {
        const { catalog, ranking } = buildService();

        const ranked = ranking.rank({ units: catalog.units(), sort: 'cost' });

        expect(ranked.map((entry) => entry.unit.key)).toEqual(['scout', 'champion', 'archer']);
    });

    it('puts the fastest unit first', () => {
        const { catalog, ranking } = buildService();

        const ranked = ranking.rank({ units: catalog.units(), sort: 'speed' });

        expect(ranked[0].unit.key).toBe('scout');
    });

    it('divides attack by reload to rank damage per second', () => {
        const { catalog, ranking } = buildService();

        const ranked = ranking.rank({ units: catalog.units(), sort: 'dps' });

        expect(ranked[0].metric).toBeCloseTo(6.5, 5);
    });

    it('discounts damage per second by the accuracy of a ranged unit', () => {
        const { catalog, ranking } = buildService();

        const dps = ranking.rawDps(catalog.unit('archer').stats);

        expect(dps).toBeCloseTo(2, 5);
    });

    it('rates power against what the unit costs', () => {
        const { catalog, ranking } = buildService();

        const ranked = ranking.rank({ units: catalog.units(), sort: 'value' });

        expect(ranked[0].unit.key).toBe('champion');
    });

    it('reranks once the upgrades are counted', () => {
        const { catalog, ranking } = buildService();

        const ranked = ranking.rank({ units: catalog.units(), sort: 'attack', upgraded: true });

        expect(ranked[0].metric).toBe(18);
    });

    it('reports the metric it sorted on', () => {
        const { catalog, ranking } = buildService();

        const ranked = ranking.rank({ units: catalog.units(), sort: 'train-time' });

        expect(ranked.map((entry) => entry.metric)).toEqual([21, 30, 35]);
    });
});

describe('UnitRankingService outliers', () => {
    it('gives a single-use unit no sustained damage instead of an enormous one', () => {
        const catalog = new GameCatalogService({
            assembler: new CatalogAssembler(),
            units: [unitRecord({ key: 'petard', attacks: { 'base-melee': 25 }, reloadTime: 0 })],
            technologies: [],
            civilizations: [],
        });
        const ranking = new UnitRankingService({
            upgrades: new UpgradeService({ catalog }),
            resourceWeights: { food: 1, wood: 1, gold: 1.6, stone: 1.6 },
        });

        const dps = ranking.rawDps(catalog.unit('petard').stats);

        expect(dps).toBe(0);
    });

    it('does not rate a free unit as infinitely cost-efficient', () => {
        const catalog = new GameCatalogService({
            assembler: new CatalogAssembler(),
            units: [unitRecord({ key: 'free-kipchak', cost: {}, hp: 45, attacks: { 'base-pierce': 5 } })],
            technologies: [],
            civilizations: [],
        });
        const ranking = new UnitRankingService({
            upgrades: new UpgradeService({ catalog }),
            resourceWeights: { food: 1, wood: 1, gold: 1.6, stone: 1.6 },
        });

        const ranked = ranking.rank({ units: catalog.units(), sort: 'value' });

        expect(ranked[0].metric).toBe(0);
    });
});

import { describe, expect, it } from 'vitest';
import { CombatService } from '../../../../src/services/combat/combat-service.ts';
import { DamageCalculator } from '../../../../src/services/combat/damage-calculator.ts';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from '../../../../src/services/game-catalog/game-catalog-service.ts';
import { MatchupService } from '../../../../src/services/matchup/matchup-service.ts';
import { UpgradeService } from '../../../../src/services/upgrade/upgrade-service.ts';
import { unitRecord } from '../../../fixtures/records.ts';

const ALL_CIVS = ['britons', 'franks', 'goths'];

function buildService(units = defaultUnits()) {
    const catalog = new GameCatalogService({
        assembler: new CatalogAssembler(),
        units,
        technologies: [],
        civilizations: [],
    });
    const combat = new CombatService({ damageCalculator: new DamageCalculator(), maxFreeHits: 6, kiteRepeats: 3 });

    return {
        catalog,
        matchups: new MatchupService({
            catalog,
            combat,
            upgrades: new UpgradeService({ catalog }),
            resourceWeights: { food: 1, wood: 1, gold: 1.6, stone: 1.6 },
            thresholds: { dominant: 2, favourable: 1.25, even: 0.8, unfavourable: 0.5 },
            commonOpponentCivs: 2,
            maxEfficiency: 25,
        }),
    };
}

function defaultUnits() {
    return [
        unitRecord({
            key: 'knight',
            category: 'cavalry',
            hp: 100,
            attacks: { 'base-melee': 10, cavalry: 0 },
            armours: { 'base-melee': 2, 'base-pierce': 2, cavalry: 0 },
            cost: { food: 60, gold: 75 },
            speed: 1.35,
            civs: ALL_CIVS,
        }),
        unitRecord({
            key: 'pikeman',
            category: 'infantry',
            hp: 55,
            attacks: { 'base-melee': 4, cavalry: 22 },
            armours: { 'base-melee': 0, 'base-pierce': 0, infantry: 0, spearman: 0 },
            cost: { food: 35, wood: 25 },
            speed: 1,
            civs: ALL_CIVS,
        }),
        unitRecord({
            key: 'longbowman',
            category: 'archer',
            hp: 35,
            attacks: { 'base-pierce': 6 },
            armours: { 'base-melee': 0, 'base-pierce': 0, archer: 0 },
            cost: { wood: 35, gold: 40 },
            range: 6,
            speed: 0.96,
            civs: ['britons'],
        }),
        unitRecord({
            key: 'monk',
            category: 'monk',
            hp: 30,
            attacks: {},
            armours: { 'base-melee': 0, 'base-pierce': 0, monk: 0 },
            cost: { gold: 100 },
            civs: ALL_CIVS,
        }),
    ];
}

describe('MatchupService', () => {
    it('rates a unit with heavy bonus damage as the winner of the trade', () => {
        const { catalog, matchups } = buildService();

        const matchup = matchups.against({ unit: catalog.unit('pikeman') }, catalog.unit('knight'));

        expect(matchup.efficiency).toBeGreaterThan(2);
    });

    it('produces the mirror verdict when the same pair is compared the other way round', () => {
        const { catalog, matchups } = buildService();

        const matchup = matchups.against({ unit: catalog.unit('knight') }, catalog.unit('pikeman'));

        expect(matchup.verdict).toBe('countered');
    });

    it('flags the bonus damage that decided the trade', () => {
        const { catalog, matchups } = buildService();

        const matchup = matchups.against({ unit: catalog.unit('pikeman') }, catalog.unit('knight'));

        expect(matchup.notes).toContain('bonus-damage');
    });

    it('leaves units without an attack out of the opponent pool', () => {
        const { catalog, matchups } = buildService();

        const report = matchups.rank({ unit: catalog.unit('knight') });

        expect(report.all.map((matchup) => matchup.opponent.key)).not.toContain('monk');
    });

    it('hides units only one civilization trains from the common pool', () => {
        const { catalog, matchups } = buildService();

        const report = matchups.rank({ unit: catalog.unit('knight') });

        expect(report.all.map((matchup) => matchup.opponent.key)).not.toContain('longbowman');
    });

    it('brings unique units back when the full pool is asked for', () => {
        const { catalog, matchups } = buildService();

        const report = matchups.rank({ unit: catalog.unit('knight'), pool: 'all' });

        expect(report.all.map((matchup) => matchup.opponent.key)).toContain('longbowman');
    });

    it('keeps the efficiency inside the configured bounds', () => {
        const { catalog, matchups } = buildService();

        const report = matchups.rank({ unit: catalog.unit('knight'), pool: 'all' });

        expect(report.all.every((matchup) => matchup.efficiency <= 25 && matchup.efficiency >= 1 / 25)).toBe(true);
    });

    it('splits the ranking into a strong and a weak list', () => {
        const { catalog, matchups } = buildService();

        const report = matchups.rank({ unit: catalog.unit('knight'), pool: 'all' });

        expect(report.strongAgainst.every((matchup) => matchup.efficiency > 0.8)).toBe(true);
    });
});

describe('MatchupService opponent pools', () => {
    it('groups an upgrade line into a single representative outside the widest pool', () => {
        const units = [
            unitRecord({ key: 'knight', category: 'cavalry', civs: ALL_CIVS }),
            unitRecord({ key: 'militia', age: 1, line: 'militia', civs: ALL_CIVS }),
            unitRecord({ key: 'man-at-arms', age: 2, line: 'militia', upgradesFrom: 'militia', civs: ALL_CIVS }),
        ];
        const { catalog, matchups } = buildService(units);

        const report = matchups.rank({ unit: catalog.unit('knight'), pool: 'all' });

        expect(report.all).toHaveLength(1);
    });

    it('lists every step of a line in the widest pool', () => {
        const units = [
            unitRecord({ key: 'knight', category: 'cavalry', civs: ALL_CIVS }),
            unitRecord({ key: 'militia', age: 1, line: 'militia', civs: ALL_CIVS }),
            unitRecord({ key: 'man-at-arms', age: 2, line: 'militia', upgradesFrom: 'militia', civs: ALL_CIVS }),
        ];
        const { catalog, matchups } = buildService(units);

        const report = matchups.rank({ unit: catalog.unit('knight'), pool: 'every' });

        expect(report.all.map((matchup) => matchup.opponent.key).sort()).toEqual(['man-at-arms', 'militia']);
    });

    it('still leaves the subject itself out of the widest pool', () => {
        const units = [
            unitRecord({ key: 'militia', age: 1, line: 'militia', civs: ALL_CIVS }),
            unitRecord({ key: 'man-at-arms', age: 2, line: 'militia', upgradesFrom: 'militia', civs: ALL_CIVS }),
        ];
        const { catalog, matchups } = buildService(units);

        const report = matchups.rank({ unit: catalog.unit('militia'), pool: 'every' });

        expect(report.all.map((matchup) => matchup.opponent.key)).toEqual(['man-at-arms']);
    });
});

describe('MatchupService saturation', () => {
    it('stops counting once one side cannot answer, and lets cost tell the rest apart', () => {
        const catalog = new GameCatalogService({
            assembler: new CatalogAssembler(),
            units: [
                unitRecord({ key: 'brute', hp: 200, attacks: { 'base-melee': 20 }, cost: { food: 60 }, civs: ALL_CIVS }),
                unitRecord({ key: 'weak', hp: 60, attacks: { 'base-melee': 4 }, cost: { food: 60 }, civs: ALL_CIVS }),
                unitRecord({ key: 'weaker', hp: 40, attacks: { 'base-melee': 4 }, cost: { food: 60 }, civs: ALL_CIVS }),
                unitRecord({ key: 'costly', hp: 40, attacks: { 'base-melee': 4 }, cost: { gold: 200 }, civs: ALL_CIVS }),
            ],
            technologies: [],
            civilizations: [],
        });
        const matchups = new MatchupService({
            catalog,
            combat: new CombatService({ damageCalculator: new DamageCalculator(), maxFreeHits: 6, kiteRepeats: 3 }),
            upgrades: new UpgradeService({ catalog }),
            resourceWeights: { food: 1, wood: 1, gold: 1.6, stone: 1.6 },
            thresholds: { dominant: 2, favourable: 1.25, even: 0.8, unfavourable: 0.5 },
            commonOpponentCivs: 2,
            maxEfficiency: 30,
        });

        const report = matchups.rank({ unit: catalog.unit('brute'), pool: 'every' });
        const efficiencyOf = (key: string) =>
            report.all.find((matchup) => matchup.opponent.key === key)?.efficiency ?? 0;

        // Both are helpless, so the fight itself stops separating them and only the price does.
        expect(efficiencyOf('weak')).toBe(efficiencyOf('weaker'));
        expect(efficiencyOf('costly')).toBeGreaterThan(efficiencyOf('weak'));
    });
});

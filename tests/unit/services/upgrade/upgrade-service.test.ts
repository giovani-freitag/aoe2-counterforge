import { describe, expect, it } from 'vitest';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from '../../../../src/services/game-catalog/game-catalog-service.ts';
import { UpgradeService } from '../../../../src/services/upgrade/upgrade-service.ts';
import type { TechEffectRecord } from '../../../../src/data/records.ts';
import { civilizationRecord, technologyRecord, unitRecord } from '../../../fixtures/records.ts';

/** Classes as the game files them: six is infantry, twelve is cavalry. */
const INFANTRY = 6;
const CAVALRY = 12;

/** One age's worth of a bonus the game grants to infantry once per age. */
function attackPerAge(age: number, value: number): TechEffectRecord {
    return { mode: 'add', unit: null, unitClass: INFANTRY, attribute: 'attack', value, damageClass: 'base-melee', age };
}

function buildService() {
    const catalog = new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: [
            unitRecord({ key: 'champion', id: 1, classId: INFANTRY, category: 'infantry', hp: 70, speed: 1 }),
            unitRecord({ key: 'knight', id: 2, classId: CAVALRY, category: 'cavalry', hp: 100, civs: ['franks'] }),
        ],
        technologies: [
            technologyRecord({
                key: 'forging',
                age: 2,
                building: 'blacksmith',
                effects: [
                    { mode: 'add', unit: null, unitClass: INFANTRY, attribute: 'attack', value: 1, damageClass: 'base-melee' },
                    { mode: 'add', unit: null, unitClass: CAVALRY, attribute: 'attack', value: 1, damageClass: 'base-melee' },
                ],
            }),
            technologyRecord({
                key: 'bloodlines',
                age: 2,
                building: 'stable',
                civs: ['franks'],
                effects: [{ mode: 'add', unit: null, unitClass: CAVALRY, attribute: 'hp', value: 20 }],
            }),
            technologyRecord({
                key: 'squires',
                age: 3,
                building: 'barracks',
                effects: [{ mode: 'multiply', unit: null, unitClass: INFANTRY, attribute: 'speed', value: 1.1 }],
            }),
            technologyRecord({
                key: 'chain-mail',
                age: 3,
                building: 'blacksmith',
                effects: [{ mode: 'add', unit: 1, unitClass: null, attribute: 'armour', value: 1, damageClass: 'base-melee' }],
            }),
            technologyRecord({
                key: 'conscription',
                age: 4,
                building: 'castle',
                effects: [{ mode: 'multiply', unit: 1, unitClass: null, attribute: 'workRate', value: 1.33 }],
            }),
        ],
        civilizations: [
            civilizationRecord('franks', {
                bonusEffects: [{ mode: 'multiply', unit: null, unitClass: CAVALRY, attribute: 'hp', value: 1.2 }],
            }),
            civilizationRecord('britons'),
            // A factor on attack and armour reaches the dataset already decoded, class by class.
            civilizationRecord('gurjaras', {
                bonusEffects: [
                    {
                        mode: 'multiply',
                        unit: null,
                        unitClass: CAVALRY,
                        attribute: 'attack',
                        value: 1.25,
                        damageClass: 'base-melee',
                    },
                ],
            }),
            civilizationRecord('khitans', {
                bonusEffects: [
                    attackPerAge(2, 1),
                    attackPerAge(3, 1),
                    { ...attackPerAge(4, 2), unitClass: CAVALRY },
                ].map((effect) => ({ ...effect, unitClass: CAVALRY })),
            }),
            civilizationRecord('huns', {
                bonusEffects: [{ mode: 'set', unit: 2, unitClass: null, attribute: 'hp', value: -1 }],
            }),
            civilizationRecord('burmese', {
                bonusEffects: [attackPerAge(2, 1), attackPerAge(3, 1), attackPerAge(4, 1)],
            }),
        ],
    });

    return { catalog, upgrades: new UpgradeService({ catalog }) };
}

describe('UpgradeService', () => {
    it('lists the technologies whose own effects reach the unit class', () => {
        const { catalog, upgrades } = buildService();

        const affecting = upgrades.affecting(catalog.unit('champion'));

        expect(affecting.map((entry) => entry.technology.key)).toEqual([
            'forging',
            'squires',
            'chain-mail',
            'conscription',
        ]);
    });

    it('reaches a unit a technology names by identity, not by class', () => {
        const { catalog, upgrades } = buildService();

        const affecting = upgrades.affecting(catalog.unit('knight'));

        expect(affecting.map((entry) => entry.technology.key)).toEqual(['forging', 'bloodlines']);
    });

    it('drops technologies the chosen civilization cannot research', () => {
        const { catalog, upgrades } = buildService();

        const affecting = upgrades.affecting(catalog.unit('knight'), 'britons');

        expect(affecting.map((entry) => entry.technology.key)).toEqual(['forging']);
    });

    it('adds the attack to the damage class the command names', () => {
        const { catalog, upgrades } = buildService();

        const outcome = upgrades.apply({ unit: catalog.unit('champion'), techs: ['forging'] });

        const before = catalog.unit('champion').stats.attack.valueFor('base-melee');

        expect(outcome.stats.attack.valueFor('base-melee')).toBe(before + 1);
    });

    it('multiplies the speed instead of adding to it', () => {
        const { catalog, upgrades } = buildService();

        const outcome = upgrades.apply({ unit: catalog.unit('champion'), techs: ['squires'] });

        expect(outcome.stats.speed).toBeCloseTo(1.1, 5);
    });

    it('marks a technology that changes nothing the guide measures', () => {
        const { catalog, upgrades } = buildService();

        const conscription = upgrades
            .affecting(catalog.unit('champion'))
            .find((entry) => entry.technology.key === 'conscription');

        expect(conscription?.qualitative).toBe(true);
    });

    it('stacks every technology a civilization can research', () => {
        const { catalog, upgrades } = buildService();

        const outcome = upgrades.fullyUpgraded(catalog.unit('knight'), 'franks');

        expect(outcome.stats.hp).toBe(140);
    });

    it('scales an attack class by the factor the extraction decoded', () => {
        const { catalog, upgrades } = buildService();

        const outcome = upgrades.apply({ unit: catalog.unit('knight'), techs: [], civ: 'gurjaras' });

        expect(outcome.stats.attack.displayValue).toBe(12.5);
    });

    it('adds up what the game states one damage class at a time', () => {
        const { catalog, upgrades } = buildService();

        const outcome = upgrades.apply({ unit: catalog.unit('knight'), techs: [], civ: 'khitans' });

        expect(outcome.stats.attack.displayValue).toBe(14);
    });

    it('ignores an effect the game writes as setting a value below zero', () => {
        const { catalog, upgrades } = buildService();

        const outcome = upgrades.apply({ unit: catalog.unit('knight'), techs: [], civ: 'huns' });

        expect(outcome.stats.hp).toBe(100);
    });

    it('counts the ages of a bonus the game hands out once per age', () => {
        const { catalog, upgrades } = buildService();

        const [entry] = upgrades.civilizationBonuses(catalog.unit('champion')).filter(({ civ }) => civ === 'burmese');

        expect([entry.delta.perAge, entry.delta.attack]).toEqual([3, [{ armourClass: 'base-melee', amount: 3 }]]);
    });

    it('leaves a bonus alone when the ages grant different amounts', () => {
        const { catalog, upgrades } = buildService();

        const [entry] = upgrades.civilizationBonuses(catalog.unit('knight')).filter(({ civ }) => civ === 'khitans');

        expect(entry.delta.perAge).toBeUndefined();
    });

    it('lists only the civilizations whose own bonuses reach the unit', () => {
        const { catalog, upgrades } = buildService();

        const civs = upgrades.civilizationBonuses(catalog.unit('champion')).map(({ civ }) => civ);

        expect(civs).toEqual(['burmese']);
    });

    it('scales the unit by the bonuses the civilization is simply given', () => {
        const { catalog, upgrades } = buildService();

        const outcome = upgrades.apply({ unit: catalog.unit('knight'), techs: [], civ: 'franks' });

        expect(outcome.stats.hp).toBe(120);
    });

    it('leaves the unit alone for a civilization with no bonus of its own', () => {
        const { catalog, upgrades } = buildService();

        const outcome = upgrades.apply({ unit: catalog.unit('knight'), techs: [], civ: 'britons' });

        expect(outcome.stats.hp).toBe(100);
    });
});

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    CIVILIZATION_RECORDS,
    GAME_STRING_BUNDLES,
    TECHNOLOGY_RECORDS,
    UNIT_RECORDS,
} from '../../../src/data/dataset.ts';
import type { UnitRecord } from '../../../src/data/records.ts';

function unit(key: string): UnitRecord {
    const record = UNIT_RECORDS.find((entry) => entry.key === key);
    if (!record) throw new Error(`The dataset ships no unit called "${key}".`);

    return record;
}

function bonus(key: string, armourClass: string): number {
    return unit(key).attacks.find((entry) => entry.class === armourClass)?.amount ?? 0;
}

function armour(key: string, armourClass: string): number {
    return unit(key).armours.find((entry) => entry.class === armourClass)?.amount ?? 0;
}

function hasIcon(path: string): boolean {
    return existsSync(fileURLToPath(new URL(`../../../public/img/${path}`, import.meta.url)));
}

describe('shipped unit statistics', () => {
    it('matches the Militia the game trains in the Dark Age', () => {
        expect(unit('militia')).toMatchObject({
            age: 1,
            buildings: ['barracks'],
            cost: { food: 50, wood: 0, gold: 20, stone: 0 },
            trainTime: 21,
            hp: 40,
            speed: 0.9,
            category: 'infantry',
        });
    });

    it('gives the Archer its published cost, range and accuracy', () => {
        expect(unit('archer')).toMatchObject({
            age: 2,
            cost: { food: 0, wood: 25, gold: 45, stone: 0 },
            hp: 30,
            range: 4,
            reloadTime: 2,
            accuracy: 80,
            category: 'archer',
        });
    });

    it('gives the Knight its published cost and speed', () => {
        expect(unit('knight')).toMatchObject({
            age: 3,
            buildings: ['stable'],
            cost: { food: 60, wood: 0, gold: 75, stone: 0 },
            hp: 100,
            speed: 1.35,
        });
    });

    it('gives the Knight two points of each armour', () => {
        expect([armour('knight', 'base-melee'), armour('knight', 'base-pierce')]).toEqual([2, 2]);
    });

    it('keeps the anti-cavalry bonuses that define the Spearman', () => {
        expect([
            bonus('spearman', 'cavalry'),
            bonus('spearman', 'war-elephant'),
            bonus('spearman', 'camel'),
        ]).toEqual([15, 15, 12]);
    });

    it('keeps the anti-archer bonus and the pierce armour of the Skirmisher', () => {
        expect([bonus('skirmisher', 'archer'), armour('skirmisher', 'base-pierce')]).toEqual([3, 3]);
    });

    it('prices the Monk in gold alone', () => {
        expect(unit('monk').cost).toEqual({ food: 0, wood: 0, gold: 100, stone: 0 });
    });

    it('marks the Trebuchet as unable to trade with an army', () => {
        expect(unit('trebuchet').tags).toContain('demolition');
    });

    it('marks the Mangonel as a blast weapon', () => {
        expect(unit('mangonel').tags).toContain('blast');
    });

    it('reserves the Longbowman for the civilization that trains it', () => {
        expect([unit('longbowman').uniqueTo, unit('longbowman').buildings]).toEqual(['britons', ['castle']]);
    });

    it('places every step of the Archer line under one line root', () => {
        expect(['archer', 'crossbowman', 'arbalester'].map((key) => unit(key).line)).toEqual([
            'archer',
            'archer',
            'archer',
        ]);
    });

    it('prices the Man-at-Arms upgrade the Militia pays for', () => {
        expect(unit('man-at-arms')).toMatchObject({
            upgradesFrom: 'militia',
            upgradeCost: { food: 100, wood: 0, gold: 40, stone: 0 },
        });
    });
});

describe('shipped technology statistics', () => {
    it('matches the Blacksmith attack upgrade of the Feudal Age', () => {
        expect(TECHNOLOGY_RECORDS.find((entry) => entry.key === 'forging')).toMatchObject({
            age: 2,
            building: 'blacksmith',
            cost: { food: 150, wood: 0, gold: 0, stone: 0 },
            researchTime: 50,
        });
    });

    it('matches the University upgrade that straightens arrows', () => {
        expect(TECHNOLOGY_RECORDS.find((entry) => entry.key === 'ballistics')).toMatchObject({
            age: 3,
            building: 'university',
            cost: { food: 0, wood: 300, gold: 175, stone: 0 },
        });
    });

    it('offers the Town Center economy upgrades to everyone', () => {
        const wheelbarrow = TECHNOLOGY_RECORDS.find((entry) => entry.key === 'wheelbarrow');

        expect(wheelbarrow?.civs).toHaveLength(CIVILIZATION_RECORDS.length);
    });

    it('restricts a stable upgrade to the civilizations that have it', () => {
        const bloodlines = TECHNOLOGY_RECORDS.find((entry) => entry.key === 'bloodlines');

        expect(bloodlines?.civs.length).toBeLessThan(CIVILIZATION_RECORDS.length);
    });
});

describe('shipped civilization statistics', () => {
    it('lists both tiers of a civilization unique unit', () => {
        expect(CIVILIZATION_RECORDS.find((entry) => entry.key === 'britons')).toMatchObject({
            uniqueUnits: ['longbowman', 'elite-longbowman'],
            uniqueTechs: ['yeomen', 'warwolf'],
        });
    });

    it('gives every civilization two unique technologies', () => {
        const incomplete = CIVILIZATION_RECORDS.filter((entry) => entry.uniqueTechs.length !== 2);

        expect(incomplete.map((entry) => entry.key)).toEqual([]);
    });
});

describe('shipped dataset integrity', () => {
    it('gives every unit its own key', () => {
        expect(new Set(UNIT_RECORDS.map((entry) => entry.key)).size).toBe(UNIT_RECORDS.length);
    });

    it('gives every technology its own key', () => {
        expect(new Set(TECHNOLOGY_RECORDS.map((entry) => entry.key)).size).toBe(TECHNOLOGY_RECORDS.length);
    });

    it('points every predecessor at a unit that exists', () => {
        const keys = new Set(UNIT_RECORDS.map((entry) => entry.key));
        const dangling = UNIT_RECORDS.filter((entry) => entry.upgradesFrom && !keys.has(entry.upgradesFrom));

        expect(dangling.map((entry) => entry.key)).toEqual([]);
    });

    it('keeps the successor list the exact mirror of the predecessors', () => {
        const mismatched = UNIT_RECORDS.filter((entry) => {
            const successors = UNIT_RECORDS.filter((other) => other.upgradesFrom === entry.key).map(
                (other) => other.key,
            );

            return JSON.stringify(successors) !== JSON.stringify(entry.upgradesTo);
        });

        expect(mismatched.map((entry) => entry.key)).toEqual([]);
    });

    it('roots every upgrade line at a unit nothing upgrades into', () => {
        const byKey = new Map(UNIT_RECORDS.map((entry) => [entry.key, entry]));
        const broken = UNIT_RECORDS.filter((entry) => byKey.get(entry.line)?.upgradesFrom !== null);

        expect(broken.map((entry) => entry.key)).toEqual([]);
    });

    it('names only civilizations that exist', () => {
        const keys = new Set(CIVILIZATION_RECORDS.map((entry) => entry.key));
        const unknown = new Set(
            [...UNIT_RECORDS, ...TECHNOLOGY_RECORDS].flatMap((entry) => entry.civs).filter((civ) => !keys.has(civ)),
        );

        expect([...unknown]).toEqual([]);
    });

    it('trains every unit somewhere and every technology in some building', () => {
        const homeless = [
            ...UNIT_RECORDS.filter((entry) => entry.buildings.some((name) => name.startsWith('building-'))),
            ...TECHNOLOGY_RECORDS.filter((entry) => entry.building.startsWith('building-')),
        ];

        expect(homeless.map((entry) => entry.key)).toEqual([]);
    });

    it('keeps every stat inside the range the game allows', () => {
        const invalid = UNIT_RECORDS.filter(
            (entry) =>
                entry.hp <= 0 ||
                entry.trainTime < 0 ||
                entry.accuracy < 0 ||
                entry.accuracy > 100 ||
                entry.age < 1 ||
                entry.age > 4 ||
                Object.values(entry.cost).some((amount) => amount < 0),
        );

        expect(invalid.map((entry) => entry.key)).toEqual([]);
    });

    it('marks a unit as unique only when a single civilization trains it', () => {
        const wrong = UNIT_RECORDS.filter((entry) => entry.uniqueTo !== null && entry.civs.length !== 1);

        expect(wrong.map((entry) => entry.key)).toEqual([]);
    });

    it('ships the icon behind every record', () => {
        const missing = [
            ...UNIT_RECORDS.filter((entry) => entry.icon !== null && !hasIcon(`Unit/${String(entry.icon)}.png`)),
            ...TECHNOLOGY_RECORDS.filter((entry) => entry.icon !== null && !hasIcon(`Tech/${String(entry.icon)}.png`)),
            ...CIVILIZATION_RECORDS.filter((entry) => !hasIcon(`Civs/${entry.icon}.png`)),
        ];

        expect(missing.map((entry) => entry.key)).toEqual([]);
    });

    it('names every unit, technology and civilization in every shipped locale', () => {
        const missing = Object.entries(GAME_STRING_BUNDLES).flatMap(([locale, bundle]) => [
            ...UNIT_RECORDS.filter((entry) => !bundle.units[entry.key]?.name).map((entry) => `${locale}:${entry.key}`),
            ...TECHNOLOGY_RECORDS.filter((entry) => !bundle.techs[entry.key]?.name).map(
                (entry) => `${locale}:${entry.key}`,
            ),
            ...CIVILIZATION_RECORDS.filter((entry) => !bundle.civs[entry.key]?.name).map(
                (entry) => `${locale}:${entry.key}`,
            ),
        ]);

        expect(missing).toEqual([]);
    });
});

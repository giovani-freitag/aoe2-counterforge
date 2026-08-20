/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARMOUR_CLASSES } from '../../../../src/domain/enums/armour-class.ts';
import type { CivilizationRecord, TechEffectRecord, TechnologyRecord } from '../../../../src/data/records.ts';

const technologies = JSON.parse(
    readFileSync('src/data/generated/technologies.json', 'utf8'),
) as TechnologyRecord[];
const civilizations = JSON.parse(
    readFileSync('src/data/generated/civilizations.json', 'utf8'),
) as CivilizationRecord[];

const packed = [
    ...technologies.flatMap((technology) => technology.effects),
    ...civilizations.flatMap((civilization) => [...civilization.bonusEffects, ...civilization.teamBonusEffects]),
].filter((effect: TechEffectRecord) => effect.attribute === 'attack' || effect.attribute === 'armour');

describe('packed attack and armour effects', () => {
    it('keeps the ones the game writes as a reduction', () => {
        const reductions = packed.filter((effect) => effect.value < 0);

        expect(reductions.length).toBeGreaterThan(0);
    });

    it('names a damage class for every one of them', () => {
        const known = new Set<string>(ARMOUR_CLASSES);
        const unnamed = packed.filter((effect) => effect.damageClass === undefined || !known.has(effect.damageClass));

        expect(unnamed).toEqual([]);
    });

    it('reads a factor as a factor rather than as a whole percentage', () => {
        const factors = packed.filter((effect) => effect.mode === 'multiply').map((effect) => effect.value);

        expect(factors.every((factor) => factor > 0 && factor <= 4)).toBe(true);
    });
});

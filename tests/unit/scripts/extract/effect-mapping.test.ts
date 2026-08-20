/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TechnologyRecord, UnitRecord } from '../../../../src/data/records.ts';

const technologies = JSON.parse(
    readFileSync('src/data/generated/technologies.json', 'utf8'),
) as TechnologyRecord[];
const units = JSON.parse(readFileSync('src/data/generated/units.json', 'utf8')) as UnitRecord[];

describe('technology effects', () => {
    it('hands a unit one change per technology, however many missiles it fires', () => {
        const listed = new Set(units.map((unit) => unit.id));

        const repeated = technologies.flatMap((technology) => {
            const seen = new Set<string>();

            return technology.effects.flatMap((effect) => {
                if (effect.unit === null || !listed.has(effect.unit)) return [];

                const key = [effect.unit, effect.attribute, effect.damageClass ?? '', effect.mode].join('|');
                if (!seen.has(key)) {
                    seen.add(key);

                    return [];
                }

                return [`${technology.key}: ${key}`];
            });
        });

        expect(repeated).toEqual([]);
    });
});

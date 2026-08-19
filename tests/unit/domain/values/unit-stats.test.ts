import { describe, expect, it } from 'vitest';
import { makeStats } from '../../../fixtures/unit-builder.ts';

describe('UnitStats hit chance', () => {
    it('always lands hits for a melee unit', () => {
        const stats = makeStats({ range: 0, accuracy: 80 });

        expect(stats.hitChance()).toBe(1);
    });

    it('applies the accuracy of a ranged unit', () => {
        const stats = makeStats({ range: 5, accuracy: 80 });

        expect(stats.hitChance()).toBe(0.8);
    });

    it('reads a recorded accuracy of zero as always hitting', () => {
        const stats = makeStats({ range: 7, accuracy: 0 });

        expect(stats.hitChance()).toBe(1);
    });

    it('reports the effective accuracy rather than the placeholder zero', () => {
        const stats = makeStats({ range: 7, accuracy: 0 });

        expect(stats.toRecord().accuracy).toBe(100);
    });
});

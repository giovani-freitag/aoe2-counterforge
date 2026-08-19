import { describe, expect, it } from 'vitest';
import { ResourceCost } from '../../../../src/domain/values/resource-cost.ts';

describe('ResourceCost', () => {
    it('fills every resource slot when only some are given', () => {
        const cost = new ResourceCost({ food: 60, gold: 20 });

        expect(cost.toRecord()).toEqual({ food: 60, wood: 0, gold: 20, stone: 0 });
    });

    it('sums every resource without weighting', () => {
        const cost = new ResourceCost({ food: 60, wood: 25, gold: 20, stone: 5 });

        expect(cost.total()).toBe(110);
    });

    it('applies per-resource weights when comparing trades', () => {
        const cost = new ResourceCost({ food: 100, gold: 100 });

        expect(cost.weighted({ food: 1, wood: 1, gold: 1.5, stone: 1.5 })).toBe(250);
    });

    it('lists only the resources actually spent', () => {
        const cost = new ResourceCost({ wood: 25, gold: 45 });

        expect(cost.spentResources()).toEqual(['wood', 'gold']);
    });

    it('leaves the receiver untouched when scaled', () => {
        const cost = new ResourceCost({ food: 50 });

        const doubled = cost.scaled(2);

        expect([doubled.food, cost.food]).toEqual([100, 50]);
    });
});

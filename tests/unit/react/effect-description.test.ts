import { describe, expect, it } from 'vitest';
import { describeEffect } from '../../../src/react/effect-description.ts';
import { translator } from '../../fixtures/translator.ts';

const t = translator();

describe('describeEffect', () => {
    it('writes an added value with its sign', () => {
        const labels = describeEffect({ hp: 20 }, t);

        expect(labels).toEqual(['+20 HP']);
    });

    it('writes a factor as the percentage it adds', () => {
        const labels = describeEffect({ hpMultiplier: 1.2 }, t);

        expect(labels).toEqual(['+20% HP']);
    });

    it('names the damage class an attack bonus applies to', () => {
        const labels = describeEffect({ attack: [{ armourClass: 'archer', amount: 4 }] }, t);

        expect(labels).toEqual(['+4 attack vs Archers']);
    });

    it('leaves the class out for the plain attack value', () => {
        const labels = describeEffect({ attack: [{ armourClass: 'base-melee', amount: 3 }] }, t);

        expect(labels).toEqual(['+3 attack']);
    });

    it('states a factor once when it covers the whole damage table', () => {
        const labels = describeEffect(
            {
                attackMultipliers: [
                    { armourClass: 'archer', amount: 1.25 },
                    { armourClass: 'cavalry', amount: 1.25 },
                    { armourClass: 'infantry', amount: 1.25 },
                    { armourClass: 'monk', amount: 1.25 },
                ],
            },
            t,
        );

        expect(labels).toEqual(['+25% attack']);
    });

    it('keeps the classes apart while a factor reaches only a couple of them', () => {
        const labels = describeEffect(
            {
                attackMultipliers: [
                    { armourClass: 'archer', amount: 1.25 },
                    { armourClass: 'cavalry', amount: 1.25 },
                ],
            },
            t,
        );

        expect(labels).toEqual(['+25% attack vs Archers', '+25% attack vs Cavalry']);
    });

    it('splits a per-age bonus into the share each age grants', () => {
        const labels = describeEffect({ perAge: 3, attack: [{ armourClass: 'base-melee', amount: 3 }] }, t);

        expect(labels).toEqual(['+1 attack per age']);
    });

    it('says nothing for an effect the guide puts no number on', () => {
        const labels = describeEffect({}, t);

        expect(labels).toEqual([]);
    });
});

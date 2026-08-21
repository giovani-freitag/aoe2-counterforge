import { describe, expect, it } from 'vitest';
import { DamageCalculator } from '../../../../src/services/combat/damage-calculator.ts';
import { makeStats } from '../../../fixtures/unit-builder.ts';

describe('DamageCalculator', () => {
    const calculator = new DamageCalculator();

    it('subtracts the matching armour from the base attack', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 10 } });
        const defender = makeStats({ armours: { 'base-melee': 3, 'base-pierce': 0 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(7);
    });

    it('adds bonus damage when the defender carries the targeted class', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 4, cavalry: 15 } });
        const defender = makeStats({ armours: { 'base-melee': 2, cavalry: 0 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(17);
    });

    it('ignores bonus damage against a class the defender does not carry', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 4, cavalry: 15 } });
        const defender = makeStats({ armours: { 'base-melee': 0, infantry: 0 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(4);
    });

    it('never drops below one damage per hit', () => {
        const attacker = makeStats({ attacks: { 'base-pierce': 4 } });
        const defender = makeStats({ armours: { 'base-pierce': 180 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(1);
    });

    it('treats negative armour as extra damage taken', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 10 } });
        const defender = makeStats({ armours: { 'base-melee': -3 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(13);
    });

    it('reports the per-class breakdown behind the total', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 4, spearman: 12 } });
        const defender = makeStats({ armours: { 'base-melee': 1, spearman: 0 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.components).toEqual([
            { armourClass: 'spearman', attack: 12, armour: 0, net: 12 },
            { armourClass: 'base-melee', attack: 4, armour: 1, net: 3 },
        ]);
    });
    it('stops a class the armour outmatches from eating the damage of the others', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 14, cavalry: 0 } });
        const defender = makeStats({ armours: { 'base-melee': 2, cavalry: 12 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(12);
    });

    it('keeps an attack the game wrote as a reduction', () => {
        const attacker = makeStats({ attacks: { 'base-pierce': 10, infantry: -10 } });
        const defender = makeStats({ armours: { 'base-pierce': 0, infantry: 0 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(1);
    });

    it('lets matching negative armour cancel a reduction out', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 10, cavalry: -3 } });
        const defender = makeStats({ armours: { 'base-melee': 0, cavalry: -3 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(10);
    });

    it('applies the reduction once the armour that was cancelling it is gone', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 10, cavalry: -3 } });
        const defender = makeStats({ armours: { 'base-melee': 0, cavalry: 0 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(7);
    });

    it('turns negative armour into damage taken', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 4, 'cavalry-archer': 0 } });
        const defender = makeStats({ armours: { 'base-melee': 0, 'cavalry-archer': -4 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(8);
    });

    it('falls back to the base armour for a class the defender does not carry', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 6, cavalry: 9 } });
        const defender = makeStats({ armours: { 'base-melee': 0 }, baseArmour: 0 });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(15);
    });
    it('softens the bonus classes for a unit that resists them', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 4, cavalry: 32 } });
        const defender = makeStats({ armours: { 'base-melee': 0, cavalry: 0 }, bonusDamageResistance: 0.4 });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBeCloseTo(23.2);
    });

    it('leaves the base classes alone when bonus damage is resisted', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 10 } });
        const defender = makeStats({ armours: { 'base-melee': 0 }, bonusDamageResistance: 0.4 });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(10);
    });

    it('walks an armour-ignoring attack past the base armour', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 16 }, ignoresArmour: true });
        const defender = makeStats({ armours: { 'base-melee': 10 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(16);
    });

    it('stops it against a unit built to hold', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 16 }, ignoresArmour: true });
        const defender = makeStats({ armours: { 'base-melee': 10 }, resistsArmourIgnore: true });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(6);
    });

    it('keeps the bonus classes payable by an armour-ignoring attack', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 16, cavalry: 5 }, ignoresArmour: true });
        const defender = makeStats({ armours: { 'base-melee': 10, cavalry: 4 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.total).toBe(17);
    });
    it('lands every missile of a volley, each one answered by the armour on its own', () => {
        const attacker = makeStats({
            attacks: { 'base-pierce': 8 },
            extraProjectiles: 2,
            secondaryAttacks: { 'base-pierce': 3 },
        });
        const defender = makeStats({ armours: { 'base-pierce': 1 } });

        const damage = calculator.between(attacker, defender);

        expect([damage.total, damage.volley]).toEqual([7, { extra: 2, each: 2 }]);
    });

    it('keeps the later missiles hurting a target the first one barely scratches', () => {
        const attacker = makeStats({
            attacks: { 'base-pierce': 8 },
            extraProjectiles: 2,
            secondaryAttacks: { 'base-pierce': 3 },
        });
        const defender = makeStats({ armours: { 'base-pierce': 20 } });

        const damage = calculator.between(attacker, defender);

        expect([damage.total, damage.volley.each]).toEqual([1, 1]);
    });

    it('leaves a single-missile weapon with no volley at all', () => {
        const attacker = makeStats({ attacks: { 'base-pierce': 8 } });
        const defender = makeStats({ armours: { 'base-pierce': 1 } });

        const damage = calculator.between(attacker, defender);

        expect(damage.volley).toEqual({ extra: 0, each: 0 });
    });
});

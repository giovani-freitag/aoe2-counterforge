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
});

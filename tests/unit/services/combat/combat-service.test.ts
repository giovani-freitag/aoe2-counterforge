import { describe, expect, it } from 'vitest';
import { CombatService } from '../../../../src/services/combat/combat-service.ts';
import { DamageCalculator } from '../../../../src/services/combat/damage-calculator.ts';
import { makeStats } from '../../../fixtures/unit-builder.ts';

describe('CombatService', () => {
    const combat = new CombatService({
        damageCalculator: new DamageCalculator(),
        maxFreeHits: 6,
        kiteRepeats: 3,
    });

    it('divides damage per hit by the reload time to get damage per second', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 10 }, reloadTime: 2 });
        const defender = makeStats({ armours: { 'base-melee': 0 } });

        const dps = combat.dps(attacker, defender);

        expect(dps).toBe(5);
    });

    it('scales damage per second by the accuracy of a ranged attacker', () => {
        const attacker = makeStats({ attacks: { 'base-pierce': 10 }, reloadTime: 2, range: 4, accuracy: 50 });
        const defender = makeStats({ armours: { 'base-pierce': 0 } });

        const dps = combat.dps(attacker, defender);

        expect(dps).toBe(2.5);
    });

    it('counts the hits needed to bring the defender down', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 7 } });
        const defender = makeStats({ hp: 30, armours: { 'base-melee': 0 } });

        const duel = combat.duel({ attacker, defender });

        expect(duel.attacker.hitsToKill).toBe(5);
    });

    it('gives no free hits when neither side outranges the other', () => {
        const attacker = makeStats({ range: 0 });
        const defender = makeStats({ range: 0 });

        const duel = combat.duel({ attacker, defender });

        expect([duel.attacker.freeHits, duel.defender.freeHits]).toEqual([0, 0]);
    });

    it('gives the longer-ranged side free hits while the gap is closed', () => {
        const attacker = makeStats({ range: 6, reloadTime: 2, attacks: { 'base-pierce': 5 } });
        const defender = makeStats({ hp: 200, range: 0, speed: 1 });

        const duel = combat.duel({ attacker, defender });

        expect(duel.attacker.freeHits).toBeGreaterThan(0);
    });

    it('ignores range entirely in the stand-and-fight model', () => {
        const attacker = makeStats({ range: 8, reloadTime: 2, attacks: { 'base-pierce': 5 } });
        const defender = makeStats({ hp: 200, range: 0, speed: 0.8 });

        const duel = combat.duel({ attacker, defender, model: 'stand' });

        expect(duel.attacker.freeHits).toBe(0);
    });
});

describe('CombatService single-use units', () => {
    const oneShot = new CombatService({
        damageCalculator: new DamageCalculator(),
        maxFreeHits: 6,
        kiteRepeats: 3,
    });

    it('reports no sustained damage for a unit that never reloads', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 25 }, reloadTime: 0 });
        const defender = makeStats({ armours: { 'base-melee': 0 } });

        const dps = oneShot.dps(attacker, defender);

        expect(dps).toBe(0);
    });

    it('still reports the damage that single blow deals', () => {
        const attacker = makeStats({ attacks: { 'base-melee': 25 }, reloadTime: 0 });
        const defender = makeStats({ armours: { 'base-melee': 3 } });

        const damage = oneShot.damage(attacker, defender);

        expect(damage.total).toBe(22);
    });
});

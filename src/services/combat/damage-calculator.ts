import type { ArmourClass } from '../../domain/enums/armour-class.ts';
import { BASE_MELEE, BASE_PIERCE } from '../../domain/enums/armour-class.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';

export interface DamageComponent {
    armourClass: ArmourClass;
    attack: number;
    armour: number;
    net: number;
}

export interface DamageBreakdown {
    total: number;
    components: DamageComponent[];
    baseType: 'melee' | 'pierce';
}

/**
 * The damage one hit deals, resolved the way the game resolves it.
 *
 * Every class the attacker strikes with is answered by the defender's armour of the same class, and
 * what a class contributes is floored at zero: armour cancels damage, it never turns it into
 * healing. The floor stops at zero rather than at the attack itself, because a handful of units
 * carry a *negative* amount in a class on purpose — it is how the game says "this weapon does less
 * against these", and how a technology can hand a unit resistance by giving it positive armour in a
 * class nobody has positive attack in. Those terms have to survive to the sum.
 *
 * A class the defender does not carry at all falls back to its base armour, which is the field the
 * game keeps for exactly that case; almost every unit sets it far above any attack, so the term
 * comes to nothing and only the units that leave it at zero take damage from everything.
 *
 * The total is floored at one: a hit always hurts.
 */
export class DamageCalculator {
    /**
     * Damage a single hit deals, before accuracy is taken into account.
     *
     * @param attacker - Stat line of the unit landing the hit.
     * @param defender - Stat line of the unit taking the hit.
     * @returns The clamped total plus the per-class breakdown behind it.
     */
    public between(attacker: UnitStats, defender: UnitStats): DamageBreakdown {
        const components: DamageComponent[] = [];

        for (const entry of attacker.attack.entries()) {
            const matched = defender.armour.belongsTo(entry.armourClass);
            const armour = matched ? defender.armour.valueFor(entry.armourClass) : defender.baseArmour;
            const net = matched
                ? Math.max(entry.amount - armour, Math.min(entry.amount, 0))
                : Math.max(entry.amount - armour, 0);

            if (net === 0 && (!matched || entry.amount === 0)) continue;

            components.push({ armourClass: entry.armourClass, attack: entry.amount, armour, net });
        }

        const raw = components.reduce((sum, component) => sum + component.net, 0);

        return {
            total: Math.max(1, raw),
            components: components.sort((left, right) => right.net - left.net),
            baseType: attacker.attack.pierce > attacker.attack.melee ? 'pierce' : 'melee',
        };
    }

    /**
     * Tells which base damage class an attack is built on.
     *
     * @param attacker - Stat line to inspect.
     * @returns The dominant base armour class of the attack.
     */
    public baseClassOf(attacker: UnitStats): ArmourClass {
        return attacker.attack.pierce > attacker.attack.melee ? BASE_PIERCE : BASE_MELEE;
    }
}

import type { ArmourClass } from '../../domain/enums/armour-class.ts';
import { BASE_MELEE, BASE_PIERCE } from '../../domain/enums/armour-class.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';

/** The classes that carry no bonus: the two base ones, and the one the game left behind. */
const UNRESISTED = new Set<ArmourClass>([BASE_MELEE, BASE_PIERCE, 'unused-31']);

/**
 * Whether a class is one of the two the whole damage system is built on.
 *
 * @param armourClass - Class to test.
 * @returns True for melee and pierce.
 */
function isBase(armourClass: ArmourClass): boolean {
    return armourClass === BASE_MELEE || armourClass === BASE_PIERCE;
}

/**
 * Whether a class contributes bonus damage, the kind resistance answers.
 *
 * @param armourClass - Class to test.
 * @returns True for every class except the base ones and the vestigial thirty-first.
 */
function isBonus(armourClass: ArmourClass): boolean {
    return !UNRESISTED.has(armourClass);
}

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
 * Two of the game's own exceptions ride on top. A weapon can be built to go through armour, which
 * skips the two base classes and nothing else, and a unit can be built to hold against exactly that
 * kind of weapon. And a unit can carry resistance to bonus damage — the damage every class except
 * the two base ones and the vestigial thirty-first contributes — which scales those classes down
 * after their armour has already been taken off, because what it resists is damage and not attack.
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
        const pierces = attacker.ignoresArmour && !defender.resistsArmourIgnore;

        for (const entry of attacker.attack.entries()) {
            const matched = defender.armour.belongsTo(entry.armourClass);
            const skipped = pierces && isBase(entry.armourClass);
            const armour = skipped ? 0 : matched ? defender.armour.valueFor(entry.armourClass) : defender.baseArmour;
            const net = matched
                ? Math.max(entry.amount - armour, Math.min(entry.amount, 0))
                : Math.max(entry.amount - armour, 0);

            if (net === 0 && (!matched || entry.amount === 0)) continue;

            components.push({ armourClass: entry.armourClass, attack: entry.amount, armour, net });
        }

        const keep = 1 - defender.bonusDamageResistance;
        const raw = components.reduce(
            (sum, component) => sum + (isBonus(component.armourClass) ? component.net * keep : component.net),
            0,
        );

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

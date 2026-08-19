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

/** The game's damage formula: matching attack and armour classes cancel, the rest is summed. */
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
            if (!defender.armour.belongsTo(entry.armourClass)) continue;

            const armour = defender.armour.valueFor(entry.armourClass);
            const net = entry.amount - armour;
            if (entry.amount === 0 && net === 0) continue;

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

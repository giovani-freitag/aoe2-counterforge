import { BASE_MELEE, BASE_PIERCE, type ArmourClass } from '../enums/armour-class.ts';
import type { ClassAmount } from './class-amount.ts';

export interface ArmourProfileConfig {
    entries: readonly ClassAmount[];
}

/** The armour side of the damage equation, plus the class tags an attacker can target. */
export class ArmourProfile {
    private readonly byClass: ReadonlyMap<ArmourClass, number>;

    constructor(config: ArmourProfileConfig) {
        this.byClass = new Map(config.entries.map((entry) => [entry.armourClass, entry.amount]));
    }

    public get melee(): number {
        return this.valueFor(BASE_MELEE);
    }

    public get pierce(): number {
        return this.valueFor(BASE_PIERCE);
    }

    /**
     * Armour points held against one class.
     *
     * @param armourClass - Class the incoming attack is tagged with.
     * @returns The armour value, or zero when the class is not carried.
     */
    public valueFor(armourClass: ArmourClass): number {
        return this.byClass.get(armourClass) ?? 0;
    }

    /**
     * Tells whether the unit is a member of an armour class at all.
     *
     * @param armourClass - Class to test membership for.
     * @returns True when the class is present, even with zero armour.
     */
    public belongsTo(armourClass: ArmourClass): boolean {
        return this.byClass.has(armourClass);
    }

    /**
     * Every armour class the unit belongs to.
     *
     * @returns The class list in declaration order.
     */
    public classes(): ArmourClass[] {
        return [...this.byClass.keys()];
    }

    /**
     * Scales single classes by a factor.
     *
     * @param factors - One factor per class, as a multiplier of the value already there.
     * @returns A new profile; the receiver is left untouched.
     */
    public scaled(factors: readonly ClassAmount[]): ArmourProfile {
        const merged = new Map(this.byClass);
        for (const factor of factors) {
            const current = merged.get(factor.armourClass);
            if (current !== undefined) merged.set(factor.armourClass, current * factor.amount);
        }

        return new ArmourProfile({ entries: [...merged].map(([armourClass, amount]) => ({ armourClass, amount })) });
    }

    /**
     * Adds armour points on top of the current values, keeping class membership intact.
     *
     * @param deltas - Amounts to add per class; unknown classes are appended.
     * @returns A new profile; the receiver is left untouched.
     */
    public plus(deltas: readonly ClassAmount[]): ArmourProfile {
        const merged = new Map(this.byClass);
        for (const delta of deltas) {
            merged.set(delta.armourClass, (merged.get(delta.armourClass) ?? 0) + delta.amount);
        }

        return new ArmourProfile({ entries: [...merged].map(([armourClass, amount]) => ({ armourClass, amount })) });
    }

    /**
     * Exposes the table as a plain list.
     *
     * @returns A defensive copy safe to hand to the render layer.
     */
    public entries(): ClassAmount[] {
        return [...this.byClass].map(([armourClass, amount]) => ({ armourClass, amount }));
    }
}

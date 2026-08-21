import type { ClassAmount } from '../../domain/values/class-amount.ts';

/** The stat changes a technology applies, expressed the same way the game applies them. */
export interface StatDelta {
    /**
     * Number of ages that each grant the change, when the game repeats the same one per age.
     *
     * The values above are the total, as they are everywhere else; this only says the total was
     * reached in equal steps, which is how the game itself words those bonuses.
     */
    perAge?: number;
    hp?: number;
    hpMultiplier?: number;
    /** Value the accuracy is raised to, for effects that set it outright. */
    accuracyFloor?: number;
    /** Value the line of sight is raised to, for effects that set it outright. */
    lineOfSightFloor?: number;
    range?: number;
    accuracy?: number;
    lineOfSight?: number;
    speed?: number;
    speedMultiplier?: number;
    reloadTime?: number;
    reloadTimeMultiplier?: number;
    trainTimeMultiplier?: number;
    blastWidth?: number;
    projectiles?: number;
    /** Hit points the unit gets back on its own, as the game counts them. */
    regeneration?: number;
    /**
     * Whether the unit's shots start leading a moving target.
     *
     * The game stores Ballistics as a flag rather than a number: the projectile aims where the
     * target is going instead of where it stands, which is worth saying even though no stat moves.
     */
    ballistics?: boolean;
    /** Population the unit takes up, which a technology can lower to nothing. */
    population?: number;
    /** Fraction of a melee hit the unit sends back to whoever landed it. */
    damageReflection?: number;
    /** Value the minimum range is brought down to, for an effect that sets it outright. */
    minRangeCeiling?: number;
    /** True once a technology has taught the unit's attacks to go through armour. */
    ignoresArmour?: boolean;
    /** Fraction of the damage from bonus classes the unit stops taking. */
    bonusDamageResistance?: number;
    /** What each resource of the price is multiplied by, keyed by resource or 'all'. */
    costMultipliers?: Readonly<Record<string, number>>;
    attack?: readonly ClassAmount[];
    attackMultipliers?: readonly ClassAmount[];
    armour?: readonly ClassAmount[];
    armourMultipliers?: readonly ClassAmount[];
}

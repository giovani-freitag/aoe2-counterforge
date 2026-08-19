import type { ClassAmount } from '../../domain/values/class-amount.ts';

/** The stat changes a technology applies, expressed the same way the game applies them. */
export interface StatDelta {
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
    attack?: readonly ClassAmount[];
    attackMultipliers?: readonly ClassAmount[];
    armour?: readonly ClassAmount[];
    armourMultipliers?: readonly ClassAmount[];
}

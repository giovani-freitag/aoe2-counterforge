import type { Resource } from '../../domain/enums/resource.ts';

export type FoodSource = 'farm' | 'sheep' | 'berries' | 'hunt' | 'shore-fish';

export const FOOD_SOURCES: readonly FoodSource[] = ['farm', 'sheep', 'berries', 'hunt', 'shore-fish'];

export interface GatherProfile {
    /** Resources per second at the resource itself, as the game states it. No walking in it. */
    gatherRate: number;
    /** How much the villager carries before walking back, as the game states it. */
    carryCapacity: number;
    /** Tiles between the resource and the drop-off. The one number the game does not state. */
    dropOffDistance: number;
}

export interface GatherRateTable {
    food: Record<FoodSource, GatherProfile>;
    wood: GatherProfile;
    gold: GatherProfile;
    stone: GatherProfile;
}

/** A technology that speeds up the act of gathering itself. */
export interface GatherUpgrade {
    tech: string;
    resource: Resource;
    /** Only set when the work is one particular way of getting food. */
    foodSource?: FoodSource;
    multiplier: number;
}

/** A technology that changes how much a villager carries or how fast it walks. */
export interface CarryUpgrade {
    tech: string;
    /** Fraction of the base capacity added; the game stacks these additively. */
    carryPercent?: number;
    carryFlat?: number;
    speedMultiplier?: number;
    resources?: readonly Resource[];
    foodSources?: readonly FoodSource[];
}

/** A technology that puts more food into every farm. */
export interface FarmUpgrade {
    tech: string;
    extraFood: number;
}

/** The technology tables the planner needs, as the extraction writes them. */
export interface EconomyTables {
    gatherUpgrades: readonly GatherUpgrade[];
    carryUpgrades: readonly CarryUpgrade[];
    farmUpgrades: readonly FarmUpgrade[];
}

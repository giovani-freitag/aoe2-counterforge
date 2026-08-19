import type { Resource } from '../../domain/enums/resource.ts';

export type FoodSource = 'farm' | 'sheep' | 'berries' | 'hunt' | 'shore-fish';

export const FOOD_SOURCES: readonly FoodSource[] = ['farm', 'sheep', 'berries', 'hunt', 'shore-fish'];

export interface GatherProfile {
    /** Effective resources per second for a villager with no upgrades, walking included. */
    baseRate: number;
    /** Tiles between the resource and the drop-off point. */
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

/**
 * How much a villager carries before walking back.
 *
 * The one figure here the data file does not state plainly: it lives in a per-unit storage table
 * the reader does not walk, and it has been ten since the game shipped.
 */
export const VILLAGER_CARRY_CAPACITY = 10;

/**
 * Effective villager gather rates in resources per second, walking to the drop-off included.
 *
 * These are the Definitive Edition averages the community build-order calculators use. The
 * drop-off distance is what lets the carrying technologies be derived from them instead of
 * guessed: the trip time implied by the base rate is split into gathering and walking.
 */
export const DEFAULT_GATHER_RATES: GatherRateTable = {
    food: {
        farm: { baseRate: 0.317, dropOffDistance: 2 },
        sheep: { baseRate: 0.33, dropOffDistance: 2 },
        berries: { baseRate: 0.31, dropOffDistance: 3 },
        hunt: { baseRate: 0.41, dropOffDistance: 4 },
        'shore-fish': { baseRate: 0.43, dropOffDistance: 3 },
    },
    wood: { baseRate: 0.39, dropOffDistance: 3 },
    gold: { baseRate: 0.38, dropOffDistance: 3 },
    stone: { baseRate: 0.36, dropOffDistance: 3 },
};

/** The technology tables the planner needs, as the extraction writes them. */
export interface EconomyTables {
    gatherUpgrades: readonly GatherUpgrade[];
    carryUpgrades: readonly CarryUpgrade[];
    farmUpgrades: readonly FarmUpgrade[];
}

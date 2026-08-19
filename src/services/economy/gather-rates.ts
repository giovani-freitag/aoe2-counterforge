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

export type GatherUpgradeTable = Record<Resource, readonly GatherUpgrade[]>;

export const VILLAGER_CARRY_CAPACITY = 10;
export const VILLAGER_WALK_SPEED = 0.8;
export const FARM_WOOD_COST = 60;
export const BASE_FARM_FOOD = 175;

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

/** Technologies the game describes as a straight percentage on the gathering work itself. */
export const DEFAULT_GATHER_UPGRADES: GatherUpgradeTable = {
    food: [],
    wood: [
        { tech: 'double-bit-axe', multiplier: 1.2 },
        { tech: 'bow-saw', multiplier: 1.2 },
        { tech: 'two-man-saw', multiplier: 1.1 },
    ],
    gold: [
        { tech: 'gold-mining', multiplier: 1.15 },
        { tech: 'gold-shaft-mining', multiplier: 1.15 },
    ],
    stone: [
        { tech: 'stone-mining', multiplier: 1.15 },
        { tech: 'stone-shaft-mining', multiplier: 1.15 },
    ],
};

/** Technologies that shorten the trip rather than the gathering. */
export const DEFAULT_CARRY_UPGRADES: readonly CarryUpgrade[] = [
    { tech: 'wheelbarrow', carryPercent: 0.25, speedMultiplier: 1.1 },
    { tech: 'hand-cart', carryPercent: 0.5, speedMultiplier: 1.1 },
    { tech: 'heavy-plow', carryFlat: 1, resources: ['food'], foodSources: ['farm'] },
];

/** Technologies that raise how much food a single farm holds before it has to be rebuilt. */
export const DEFAULT_FARM_UPGRADES: readonly FarmUpgrade[] = [
    { tech: 'horse-collar', extraFood: 75 },
    { tech: 'heavy-plow', extraFood: 125 },
    { tech: 'crop-rotation', extraFood: 175 },
];

/**
 * Every economy technology the planner models, in the order the game unlocks them.
 *
 * @returns Technology slugs, each appearing once even when it has more than one effect.
 */
export function economyTechKeys(): string[] {
    const keys = [
        ...Object.values(DEFAULT_GATHER_UPGRADES).flatMap((upgrades) => upgrades.map((upgrade) => upgrade.tech)),
        ...DEFAULT_CARRY_UPGRADES.map((upgrade) => upgrade.tech),
        ...DEFAULT_FARM_UPGRADES.map((upgrade) => upgrade.tech),
    ];

    return [...new Set(keys)];
}

import type { Unit } from '../../domain/entities/unit.ts';
import { RESOURCES, type Resource } from '../../domain/enums/resource.ts';
import { InvalidArgumentError } from '../../domain/errors/domain-error.ts';
import {
    BASE_FARM_FOOD,
    FARM_WOOD_COST,
    VILLAGER_CARRY_CAPACITY,
    VILLAGER_WALK_SPEED,
    type CarryUpgrade,
    type FarmUpgrade,
    type FoodSource,
    type GatherProfile,
    type GatherRateTable,
    type GatherUpgradeTable,
} from './gather-rates.ts';

export interface EconomyServiceConfig {
    rates: GatherRateTable;
    upgrades: GatherUpgradeTable;
    carryUpgrades: readonly CarryUpgrade[];
    farmUpgrades: readonly FarmUpgrade[];
}

export interface GatherRateQuery {
    resource: Resource;
    foodSource?: FoodSource;
    techs?: readonly string[];
}

export interface ProductionPlanQuery {
    unit: Unit;
    buildings?: number;
    trainTime?: number;
    foodSource?: FoodSource;
    gatherTechs?: readonly string[];
    /** Counts the wood spent rebuilding the farms that feed the queue. */
    includeFarmUpkeep?: boolean;
}

export interface ResourceDemand {
    resource: Resource;
    /** Drain caused by the training queue itself. */
    perSecond: number;
    /** Drain caused by keeping the gatherers working, such as rebuilding farms. */
    upkeepPerSecond: number;
    perMinute: number;
    gatherRate: number;
    villagers: number;
}

export interface FarmUpkeep {
    farms: number;
    foodPerFarm: number;
    woodPerSecond: number;
    villagers: number;
}

export interface ProductionPlan {
    unit: Unit;
    buildings: number;
    trainTime: number;
    unitsPerMinute: number;
    demands: ResourceDemand[];
    /** Exact villager count, fractions included. */
    totalVillagers: number;
    /** Villagers you actually have to assign, since none of them can be split across resources. */
    wholeVillagers: number;
    bottleneck: Resource | null;
    farmUpkeep: FarmUpkeep | null;
}

const SECONDS_PER_MINUTE = 60;
const MIN_TRIP_SECONDS = 0.1;

/** Turns a training queue into the villager count needed to keep it running without idle time. */
export class EconomyService {
    private readonly config: EconomyServiceConfig;

    constructor(config: EconomyServiceConfig) {
        this.config = config;
    }

    /**
     * Villager gather rate for one resource, in resources per second.
     *
     * @param query - Resource to gather, which food source to assume and which techs are in.
     * @returns The rate after gathering, carrying and walking upgrades are applied.
     */
    public gatherRate(query: GatherRateQuery): number {
        const foodSource = query.foodSource ?? 'farm';
        const profile = this.profileOf(query.resource, foodSource);
        const researched = new Set(query.techs ?? []);

        const workMultiplier = this.config.upgrades[query.resource]
            .filter((upgrade) => researched.has(upgrade.tech))
            .reduce((factor, upgrade) => factor * upgrade.multiplier, 1);

        const carry = this.config.carryUpgrades.filter(
            (upgrade) =>
                researched.has(upgrade.tech) &&
                (!upgrade.resources || upgrade.resources.includes(query.resource)) &&
                (!upgrade.foodSources || upgrade.foodSources.includes(foodSource)),
        );

        const capacity =
            VILLAGER_CARRY_CAPACITY * (1 + this.sum(carry, (upgrade) => upgrade.carryPercent ?? 0)) +
            this.sum(carry, (upgrade) => upgrade.carryFlat ?? 0);
        const walkSpeed = carry.reduce(
            (speed, upgrade) => speed * (upgrade.speedMultiplier ?? 1),
            VILLAGER_WALK_SPEED,
        );

        return this.tripRate(profile, { capacity, walkSpeed, workMultiplier });
    }

    /**
     * Villagers needed per resource to keep a set of production buildings busy forever.
     *
     * @param query - Unit to train, how many buildings run in parallel and the economy assumptions.
     * @returns The demand per resource plus the totals the interface headlines.
     * @throws InvalidArgumentError when the unit has no training time to spend resources over.
     */
    public plan(query: ProductionPlanQuery): ProductionPlan {
        const buildings = Math.max(1, query.buildings ?? 1);
        const trainTime = query.trainTime ?? query.unit.trainTime;
        if (trainTime <= 0) throw new InvalidArgumentError(`Unit "${query.unit.key}" has no training time.`);

        const foodSource = query.foodSource ?? 'farm';
        const cost = query.unit.cost.toRecord();
        const rates = Object.fromEntries(
            RESOURCES.map((resource) => [
                resource,
                this.gatherRate({ resource, foodSource, techs: query.gatherTechs }),
            ]),
        ) as Record<Resource, number>;

        const drain = Object.fromEntries(
            RESOURCES.map((resource) => [resource, (cost[resource] * buildings) / trainTime]),
        ) as Record<Resource, number>;

        const farmUpkeep = this.farmUpkeepFor({
            enabled: (query.includeFarmUpkeep ?? true) && foodSource === 'farm',
            foodPerSecond: drain.food,
            foodRate: rates.food,
            woodRate: rates.wood,
            techs: query.gatherTechs ?? [],
        });

        const demands = RESOURCES.map((resource) => {
            const upkeepPerSecond = resource === 'wood' ? (farmUpkeep?.woodPerSecond ?? 0) : 0;
            const perSecond = drain[resource];

            return {
                resource,
                perSecond,
                upkeepPerSecond,
                perMinute: (perSecond + upkeepPerSecond) * SECONDS_PER_MINUTE,
                gatherRate: rates[resource],
                villagers: (perSecond + upkeepPerSecond) / rates[resource],
            } satisfies ResourceDemand;
        }).filter((demand) => demand.perSecond > 0 || demand.upkeepPerSecond > 0);

        return {
            demands,
            farmUpkeep,
            unit: query.unit,
            buildings,
            trainTime,
            unitsPerMinute: (SECONDS_PER_MINUTE / trainTime) * buildings,
            totalVillagers: demands.reduce((sum, demand) => sum + demand.villagers, 0),
            wholeVillagers: demands.reduce((sum, demand) => sum + Math.ceil(demand.villagers), 0),
            bottleneck: this.bottleneckOf(demands),
        };
    }

    /**
     * How many production buildings a fixed number of villagers can keep supplied.
     *
     * @param query - The same assumptions as a plan; the buildings field is ignored.
     * @param villagerBudget - Villagers available to feed the queue.
     * @returns The largest whole number of buildings the economy sustains, at least zero.
     */
    public sustainableBuildings(query: ProductionPlanQuery, villagerBudget: number): number {
        const perBuilding = this.plan({ ...query, buildings: 1 }).totalVillagers;
        if (perBuilding <= 0) return 0;

        return Math.max(0, Math.floor(villagerBudget / perBuilding));
    }

    /**
     * Splits the base rate into gathering and walking, then rebuilds it with the upgrades applied.
     *
     * The published rate already includes the trip to the drop-off, so the gathering speed behind
     * it is recovered from the trip time rather than assumed.
     */
    private tripRate(
        profile: GatherProfile,
        modifiers: { capacity: number; walkSpeed: number; workMultiplier: number },
    ): number {
        const baseTrip = VILLAGER_CARRY_CAPACITY / profile.baseRate;
        const baseWalk = (2 * profile.dropOffDistance) / VILLAGER_WALK_SPEED;
        const baseGathering = baseTrip - baseWalk;
        if (baseGathering <= MIN_TRIP_SECONDS) return profile.baseRate * modifiers.workMultiplier;

        const gatherSpeed = (VILLAGER_CARRY_CAPACITY / baseGathering) * modifiers.workMultiplier;
        const trip = modifiers.capacity / gatherSpeed + (2 * profile.dropOffDistance) / modifiers.walkSpeed;

        return modifiers.capacity / Math.max(MIN_TRIP_SECONDS, trip);
    }

    private farmUpkeepFor(input: {
        enabled: boolean;
        foodPerSecond: number;
        foodRate: number;
        woodRate: number;
        techs: readonly string[];
    }): FarmUpkeep | null {
        if (!input.enabled || input.foodPerSecond <= 0) return null;

        const researched = new Set(input.techs);
        const foodPerFarm = this.config.farmUpgrades
            .filter((upgrade) => researched.has(upgrade.tech))
            .reduce((food, upgrade) => food + upgrade.extraFood, BASE_FARM_FOOD);
        const woodPerSecond = (input.foodPerSecond / foodPerFarm) * FARM_WOOD_COST;

        return {
            foodPerFarm,
            woodPerSecond,
            farms: Math.ceil(input.foodPerSecond / input.foodRate),
            villagers: woodPerSecond / input.woodRate,
        };
    }

    private sum<T>(values: readonly T[], pick: (value: T) => number): number {
        return values.reduce((total, value) => total + pick(value), 0);
    }

    private profileOf(resource: Resource, foodSource: FoodSource): GatherProfile {
        return resource === 'food' ? this.config.rates.food[foodSource] : this.config.rates[resource];
    }

    private bottleneckOf(demands: readonly ResourceDemand[]): Resource | null {
        if (demands.length === 0) return null;

        return demands.reduce((worst, demand) => (demand.villagers > worst.villagers ? demand : worst)).resource;
    }
}

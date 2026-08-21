import type { Unit } from '../../domain/entities/unit.ts';
import { RESOURCES, type Resource } from '../../domain/enums/resource.ts';
import { InvalidArgumentError } from '../../domain/errors/domain-error.ts';
import {
    type CarryUpgrade,
    type FarmUpgrade,
    type FoodSource,
    type GatherProfile,
    type GatherRateTable,
    type GatherUpgrade,
} from './gather-rates.ts';

export interface EconomyServiceConfig {
    rates: GatherRateTable;
    gatherUpgrades: readonly GatherUpgrade[];
    carryUpgrades: readonly CarryUpgrade[];
    farmUpgrades: readonly FarmUpgrade[];
    /** Tiles a second a villager walks with nothing carried. */
    walkSpeed: number;
    /** Food a farm holds before it has to be rebuilt, before any technology. */
    farmFood: number;
    farmWoodCost: number;
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

        const workMultiplier = this.config.gatherUpgrades
            .filter((upgrade) => researched.has(upgrade.tech))
            .filter((upgrade) => upgrade.resource === query.resource)
            .filter((upgrade) => !upgrade.foodSource || upgrade.foodSource === foodSource)
            .reduce((factor, upgrade) => factor * upgrade.multiplier, 1);

        const carry = this.config.carryUpgrades.filter(
            (upgrade) =>
                researched.has(upgrade.tech) &&
                (!upgrade.resources || upgrade.resources.includes(query.resource)) &&
                (!upgrade.foodSources || upgrade.foodSources.includes(foodSource)),
        );

        const capacity =
            profile.carryCapacity * (1 + this.sum(carry, (upgrade) => upgrade.carryPercent ?? 0)) +
            this.sum(carry, (upgrade) => upgrade.carryFlat ?? 0);
        const walkSpeed = carry.reduce(
            (speed, upgrade) => speed * (upgrade.speedMultiplier ?? 1),
            this.config.walkSpeed,
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
     * The rate a villager actually delivers, which is a load divided by a round trip.
     *
     * The game states how fast the villager works at the resource and how much it can carry away.
     * A trip is therefore the time to fill up plus the time to walk there and back, and the only
     * part of that the file is silent about is the distance.
     */
    private tripRate(
        profile: GatherProfile,
        modifiers: { capacity: number; walkSpeed: number; workMultiplier: number },
    ): number {
        const gathering = modifiers.capacity / (profile.gatherRate * modifiers.workMultiplier);
        const walking = (2 * profile.dropOffDistance) / modifiers.walkSpeed;

        return modifiers.capacity / Math.max(MIN_TRIP_SECONDS, gathering + walking);
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
            .reduce((food, upgrade) => food + upgrade.extraFood, this.config.farmFood);
        const woodPerSecond = (input.foodPerSecond / foodPerFarm) * this.config.farmWoodCost;

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

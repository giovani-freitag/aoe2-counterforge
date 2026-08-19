import { RESOURCES, type Resource, type ResourceAmounts } from '../enums/resource.ts';

export interface ResourceCostConfig {
    food?: number;
    wood?: number;
    gold?: number;
    stone?: number;
}

export type ResourceWeights = ResourceAmounts;

/** Immutable bundle of the four gatherable resources. */
export class ResourceCost {
    private readonly amounts: ResourceAmounts;

    constructor(config: ResourceCostConfig = {}) {
        this.amounts = {
            food: config.food ?? 0,
            wood: config.wood ?? 0,
            gold: config.gold ?? 0,
            stone: config.stone ?? 0,
        };
    }

    public get food(): number {
        return this.amounts.food;
    }

    public get wood(): number {
        return this.amounts.wood;
    }

    public get gold(): number {
        return this.amounts.gold;
    }

    public get stone(): number {
        return this.amounts.stone;
    }

    /**
     * Sums every resource without weighting.
     *
     * @returns The raw resource total.
     */
    public total(): number {
        return RESOURCES.reduce((sum, resource) => sum + this.amounts[resource], 0);
    }

    /**
     * Sums the resources after applying per-resource scarcity weights.
     *
     * @param weights - Relative value of one unit of each resource.
     * @returns The weighted total used to compare trades between units.
     */
    public weighted(weights: ResourceWeights): number {
        return RESOURCES.reduce((sum, resource) => sum + this.amounts[resource] * weights[resource], 0);
    }

    /**
     * Multiplies every resource by the same factor.
     *
     * @param factor - Multiplier applied to each slot.
     * @returns A new cost; the receiver is left untouched.
     */
    public scaled(factor: number): ResourceCost {
        return new ResourceCost({
            food: this.amounts.food * factor,
            wood: this.amounts.wood * factor,
            gold: this.amounts.gold * factor,
            stone: this.amounts.stone * factor,
        });
    }

    /**
     * Lists only the resources this cost actually spends.
     *
     * @returns Resource keys with a non-zero amount.
     */
    public spentResources(): Resource[] {
        return RESOURCES.filter((resource) => this.amounts[resource] > 0);
    }

    /**
     * Exposes the amounts as a plain record.
     *
     * @returns A defensive copy safe to hand to the render layer.
     */
    public toRecord(): ResourceAmounts {
        return { ...this.amounts };
    }
}

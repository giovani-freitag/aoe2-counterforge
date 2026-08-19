import type { AgeId } from '../enums/age.ts';
import type { ResourceCost } from '../values/resource-cost.ts';
import type { TechEffect } from '../values/tech-effect.ts';

export interface TechnologyConfig {
    id: number;
    key: string;
    icon: number | null;
    age: AgeId;
    building: string;
    cost: ResourceCost;
    researchTime: number;
    civs: readonly string[];
    effects: readonly TechEffect[];
}

/** A researchable technology, as listed in the tech tree. */
export class Technology {
    private readonly config: TechnologyConfig;
    private readonly civSet: ReadonlySet<string>;

    constructor(config: TechnologyConfig) {
        this.config = config;
        this.civSet = new Set(config.civs);
    }

    public get id(): number {
        return this.config.id;
    }

    public get key(): string {
        return this.config.key;
    }

    public get icon(): number | null {
        return this.config.icon;
    }

    public get age(): AgeId {
        return this.config.age;
    }

    public get building(): string {
        return this.config.building;
    }

    public get cost(): ResourceCost {
        return this.config.cost;
    }

    /** Every change the technology makes, in the game's own terms. */
    public get effects(): readonly TechEffect[] {
        return this.config.effects;
    }

    public get researchTime(): number {
        return this.config.researchTime;
    }

    public get civs(): readonly string[] {
        return this.config.civs;
    }

    /** True when a single civilization owns the technology. */
    public get isUnique(): boolean {
        return this.config.civs.length === 1;
    }

    /**
     * Tells whether a civilization can research this technology.
     *
     * @param civKey - Civilization slug, or null for the civilization-agnostic view.
     * @returns True when the technology is in that civilization's tech tree.
     */
    public availableTo(civKey: string | null): boolean {
        return civKey === null || this.civSet.has(civKey);
    }
}

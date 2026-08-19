import type { AgeId } from '../enums/age.ts';
import type { UnitCategory } from '../enums/unit-category.ts';
import type { ResourceCost } from '../values/resource-cost.ts';
import type { UnitStats } from '../values/unit-stats.ts';

export interface UnitUpgradeInfo {
    readonly techId: number;
    readonly cost: ResourceCost;
    readonly researchTime: number;
}

export interface UnitConfig {
    id: number;
    /** Class the game files the unit under; its own technologies target these. */
    classId: number;
    key: string;
    icon: number | null;
    category: UnitCategory;
    tags: readonly string[];
    age: AgeId;
    buildings: readonly string[];
    cost: ResourceCost;
    trainTime: number;
    stats: UnitStats;
    line: string;
    upgradesFrom: string | null;
    upgradesTo: readonly string[];
    upgrade: UnitUpgradeInfo | null;
    civs: readonly string[];
    uniqueTo: string | null;
}

/** A trainable unit: who can build it, what it costs and how it fights. */
export class Unit {
    private readonly config: UnitConfig;
    private readonly civSet: ReadonlySet<string>;
    private readonly tagSet: ReadonlySet<string>;

    constructor(config: UnitConfig) {
        this.config = config;
        this.civSet = new Set(config.civs);
        this.tagSet = new Set(config.tags);
    }

    public get id(): number {
        return this.config.id;
    }

    /** Class the game files the unit under, which is what its technologies name. */
    public get classId(): number {
        return this.config.classId;
    }

    public get key(): string {
        return this.config.key;
    }

    public get icon(): number | null {
        return this.config.icon;
    }

    public get category(): UnitCategory {
        return this.config.category;
    }

    public get tags(): readonly string[] {
        return this.config.tags;
    }

    public get age(): AgeId {
        return this.config.age;
    }

    public get buildings(): readonly string[] {
        return this.config.buildings;
    }

    public get cost(): ResourceCost {
        return this.config.cost;
    }

    public get trainTime(): number {
        return this.config.trainTime;
    }

    public get stats(): UnitStats {
        return this.config.stats;
    }

    public get line(): string {
        return this.config.line;
    }

    public get upgradesFrom(): string | null {
        return this.config.upgradesFrom;
    }

    public get upgradesTo(): readonly string[] {
        return this.config.upgradesTo;
    }

    public get upgrade(): UnitUpgradeInfo | null {
        return this.config.upgrade;
    }

    public get civs(): readonly string[] {
        return this.config.civs;
    }

    public get uniqueTo(): string | null {
        return this.config.uniqueTo;
    }

    /**
     * Tells whether a civilization can train this unit.
     *
     * @param civKey - Civilization slug, or null for the civilization-agnostic view.
     * @returns True when the unit is in that civilization's tech tree.
     */
    public availableTo(civKey: string | null): boolean {
        return civKey === null || this.civSet.has(civKey);
    }

    /**
     * Tells whether the unit carries a dataset tag such as gunpowder or unique-unit.
     *
     * @param tag - Tag to look for.
     * @returns True when the tag is present.
     */
    public hasTag(tag: string): boolean {
        return this.tagSet.has(tag);
    }

    /**
     * Replaces the stat line, typically with an upgraded one.
     *
     * @param stats - Stat line to attach.
     * @returns A new unit; the receiver is left untouched.
     */
    public withStats(stats: UnitStats): Unit {
        return new Unit({ ...this.config, stats });
    }
}

/** How a technology changes a number: it may replace it, add to it, or scale it. */
export type EffectMode = 'set' | 'add' | 'multiply';

export interface TechEffectConfig {
    mode: EffectMode;
    /** The one unit it reaches, or null when it reaches a whole class. */
    unit: number | null;
    /** The class it reaches, as the game files units, or null when it names a unit. */
    unitClass: number | null;
    attribute: string;
    value: number;
    /** For attack and armour, the damage class the value belongs to. */
    damageClass?: string;
}

/** One change a technology makes, taken from the game's own effect table. */
export class TechEffect {
    private readonly config: TechEffectConfig;

    constructor(config: TechEffectConfig) {
        this.config = config;
    }

    public get mode(): EffectMode {
        return this.config.mode;
    }

    public get attribute(): string {
        return this.config.attribute;
    }

    public get value(): number {
        return this.config.value;
    }

    public get damageClass(): string | undefined {
        return this.config.damageClass;
    }

    /**
     * Whether this command touches a given unit.
     *
     * @param unit - Identity and class of the unit, as the game files it.
     * @returns True when the command names that unit or its class.
     */
    public reaches(unit: { id: number; classId: number }): boolean {
        if (this.config.unit !== null) return this.config.unit === unit.id;

        return this.config.unitClass === unit.classId;
    }
}

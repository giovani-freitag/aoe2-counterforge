import type { TechEffect } from '../values/tech-effect.ts';

export interface CivilizationConfig {
    key: string;
    icon: string;
    era: string;
    uniqueUnits: readonly string[];
    uniqueTechs: readonly string[];
    bonuses: readonly TechEffect[];
}

/** A playable civilization and the pieces of the tech tree only it owns. */
export class Civilization {
    private readonly config: CivilizationConfig;

    constructor(config: CivilizationConfig) {
        this.config = config;
    }

    public get key(): string {
        return this.config.key;
    }

    public get icon(): string {
        return this.config.icon;
    }

    public get era(): string {
        return this.config.era;
    }

    public get uniqueUnits(): readonly string[] {
        return this.config.uniqueUnits;
    }

    public get uniqueTechs(): readonly string[] {
        return this.config.uniqueTechs;
    }

    /** Always-on effects the civilization starts with, with nothing to research. */
    public get bonuses(): readonly TechEffect[] {
        return this.config.bonuses;
    }
}

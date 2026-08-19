import type {
    CivilizationTextRecord,
    GameStringBundle,
    TechnologyTextRecord,
    UnitTextRecord,
} from '../../data/records.ts';

export interface GameTextServiceConfig {
    bundles: Record<string, GameStringBundle>;
    fallbackLocale: string;
}

const EMPTY_UNIT: UnitTextRecord = { name: '', role: '', strongVs: '', weakVs: '', upgradesHint: '' };
const EMPTY_TECH: TechnologyTextRecord = { name: '', description: '' };
const EMPTY_CIV: CivilizationTextRecord = { name: '', intro: '', bonuses: [], sections: [] };

/** Resolves the localized names and descriptions shipped with the dataset. */
export class GameTextService {
    private readonly config: GameTextServiceConfig;

    constructor(config: GameTextServiceConfig) {
        this.config = config;
    }

    /**
     * Localized text for a unit.
     *
     * @param locale - Requested locale tag.
     * @param key - Unit slug.
     * @returns The unit text, falling back to the configured fallback locale.
     */
    public unit(locale: string, key: string): UnitTextRecord {
        return this.resolve(locale, (bundle) => bundle.units[key]) ?? { ...EMPTY_UNIT, name: key };
    }

    /**
     * Localized text for a technology.
     *
     * @param locale - Requested locale tag.
     * @param key - Technology slug.
     * @returns The technology text, falling back to the configured fallback locale.
     */
    public technology(locale: string, key: string): TechnologyTextRecord {
        return this.resolve(locale, (bundle) => bundle.techs[key]) ?? { ...EMPTY_TECH, name: key };
    }

    /**
     * Localized text for a civilization.
     *
     * @param locale - Requested locale tag.
     * @param key - Civilization slug.
     * @returns The civilization text, falling back to the configured fallback locale.
     */
    public civilization(locale: string, key: string): CivilizationTextRecord {
        return this.resolve(locale, (bundle) => bundle.civs[key]) ?? { ...EMPTY_CIV, name: key };
    }

    /**
     * Locales the dataset actually ships strings for.
     *
     * @returns The available locale tags.
     */
    public locales(): string[] {
        return Object.keys(this.config.bundles);
    }

    private resolve<T>(locale: string, pick: (bundle: GameStringBundle) => T | undefined): T | undefined {
        const requested = this.config.bundles[locale];
        const fallback = this.config.bundles[this.config.fallbackLocale];

        return (requested ? pick(requested) : undefined) ?? (fallback ? pick(fallback) : undefined);
    }
}

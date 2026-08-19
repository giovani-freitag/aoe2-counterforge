import type { GameCatalogService } from '../game-catalog/game-catalog-service.ts';
import type { GameTextService } from '../game-text/game-text-service.ts';
import { normalize } from './fuzzy-matcher.ts';

export type SearchKind = 'unit' | 'civilization' | 'technology';

export interface SearchDocument {
    id: string;
    kind: SearchKind;
    key: string;
    title: string;
    normalizedTitle: string;
    subtitle: string;
    /** Unit category slug the interface localizes on its own. */
    categoryKey: string | null;
    keywords: readonly string[];
    icon: string | null;
    civs: readonly string[];
    weight: number;
}

export interface SearchIndexBuilderConfig {
    catalog: GameCatalogService;
    text: GameTextService;
    fallbackLocale: string;
}

const UNIT_WEIGHT = 1;
const CIVILIZATION_WEIGHT = 0.95;
const TECHNOLOGY_WEIGHT = 0.75;
const ROSTER_SIZE = 53;

/** Flattens the catalog into the documents the command palette ranks. */
export class SearchIndexBuilder {
    private readonly config: SearchIndexBuilderConfig;

    constructor(config: SearchIndexBuilderConfig) {
        this.config = config;
    }

    /**
     * Builds the searchable document list for one locale.
     *
     * @param locale - Locale whose names and descriptions should be indexed.
     * @returns Every unit, civilization and technology as a scored document.
     */
    public build(locale: string): SearchDocument[] {
        return [...this.unitDocuments(locale), ...this.civilizationDocuments(locale), ...this.technologyDocuments(locale)];
    }

    private unitDocuments(locale: string): SearchDocument[] {
        return this.config.catalog.units().map((unit) => {
            const text = this.config.text.unit(locale, unit.key);
            const english = this.config.text.unit(this.config.fallbackLocale, unit.key);
            const owner = unit.uniqueTo ? this.config.text.civilization(locale, unit.uniqueTo).name : '';

            return {
                id: `unit:${unit.key}`,
                kind: 'unit',
                key: unit.key,
                title: text.name,
                normalizedTitle: normalize(text.name),
                subtitle: owner,
                categoryKey: unit.category,
                keywords: this.keywords([english.name, unit.key, unit.category, ...unit.buildings, owner, ...unit.tags]),
                icon: unit.icon === null ? null : `Unit/${unit.icon}.png`,
                civs: unit.civs,
                weight: UNIT_WEIGHT + (unit.civs.length / ROSTER_SIZE) * 0.25,
            } satisfies SearchDocument;
        });
    }

    private civilizationDocuments(locale: string): SearchDocument[] {
        return this.config.catalog.civilizations().map((civilization) => {
            const text = this.config.text.civilization(locale, civilization.key);
            const english = this.config.text.civilization(this.config.fallbackLocale, civilization.key);

            return {
                id: `civilization:${civilization.key}`,
                kind: 'civilization',
                key: civilization.key,
                title: text.name,
                normalizedTitle: normalize(text.name),
                subtitle: text.intro,
                categoryKey: null,
                keywords: this.keywords([english.name, civilization.key, text.intro]),
                icon: `Civs/${civilization.icon}.png`,
                civs: [civilization.key],
                weight: CIVILIZATION_WEIGHT,
            } satisfies SearchDocument;
        });
    }

    private technologyDocuments(locale: string): SearchDocument[] {
        return this.config.catalog.technologies().map((technology) => {
            const text = this.config.text.technology(locale, technology.key);
            const english = this.config.text.technology(this.config.fallbackLocale, technology.key);

            return {
                id: `technology:${technology.key}`,
                kind: 'technology',
                key: technology.key,
                title: text.name,
                normalizedTitle: normalize(text.name),
                subtitle: text.description,
                categoryKey: null,
                keywords: this.keywords([english.name, technology.key, technology.building]),
                icon: technology.icon === null ? null : `Tech/${technology.icon}.png`,
                civs: technology.civs,
                weight: TECHNOLOGY_WEIGHT,
            } satisfies SearchDocument;
        });
    }

    private keywords(values: readonly string[]): string[] {
        return [...new Set(values.filter(Boolean).map(normalize))];
    }
}

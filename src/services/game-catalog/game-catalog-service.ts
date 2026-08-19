import type { Civilization } from '../../domain/entities/civilization.ts';
import type { Technology } from '../../domain/entities/technology.ts';
import type { Unit } from '../../domain/entities/unit.ts';
import type { AgeId } from '../../domain/enums/age.ts';
import type { UnitCategory } from '../../domain/enums/unit-category.ts';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import type { CivilizationRecord, TechnologyRecord, UnitRecord } from '../../data/records.ts';
import type { CatalogAssembler } from './catalog-assembler.ts';

export interface GameCatalogServiceConfig {
    assembler: CatalogAssembler;
    units: readonly UnitRecord[];
    technologies: readonly TechnologyRecord[];
    civilizations: readonly CivilizationRecord[];
}

export interface UnitQuery {
    civ?: string | null;
    categories?: readonly UnitCategory[];
    ages?: readonly AgeId[];
    line?: string;
    tags?: readonly string[];
    combatOnly?: boolean;
}

export interface TechnologyQuery {
    civ?: string | null;
    building?: string;
    uniqueOnly?: boolean;
}

/** Single read entrypoint to the shipped game data. */
export class GameCatalogService {
    private readonly unitsByKey: ReadonlyMap<string, Unit>;
    private readonly technologiesByKey: ReadonlyMap<string, Technology>;
    private readonly civilizationsByKey: ReadonlyMap<string, Civilization>;

    constructor(config: GameCatalogServiceConfig) {
        this.unitsByKey = new Map(
            config.units.map((record) => [record.key, config.assembler.toUnit(record)] as const),
        );
        this.technologiesByKey = new Map(
            config.technologies.map((record) => [record.key, config.assembler.toTechnology(record)] as const),
        );
        this.civilizationsByKey = new Map(
            config.civilizations.map((record) => [record.key, config.assembler.toCivilization(record)] as const),
        );
    }

    /**
     * Looks a unit up by slug.
     *
     * @param key - Unit slug such as "crossbowman".
     * @returns The matching unit.
     * @throws EntityNotFoundError when no unit carries that slug.
     */
    public unit(key: string): Unit {
        const unit = this.unitsByKey.get(key);
        if (!unit) throw new EntityNotFoundError('Unit', key);

        return unit;
    }

    /**
     * Lists units matching every constraint of the query.
     *
     * @param query - Optional filters; an empty query returns the whole roster.
     * @returns Units sorted by age and then by name slug.
     */
    public units(query: UnitQuery = {}): Unit[] {
        const categories = query.categories ? new Set(query.categories) : null;
        const ages = query.ages ? new Set<number>(query.ages) : null;

        return [...this.unitsByKey.values()]
            .filter((unit) => unit.availableTo(query.civ ?? null))
            .filter((unit) => !categories || categories.has(unit.category))
            .filter((unit) => !ages || ages.has(unit.age))
            .filter((unit) => !query.line || unit.line === query.line)
            .filter((unit) => !query.tags || query.tags.every((tag) => unit.hasTag(tag)))
            .filter((unit) => !query.combatOnly || unit.category !== 'civilian')
            .sort((left, right) => left.age - right.age || left.key.localeCompare(right.key));
    }

    /**
     * Looks a technology up by slug.
     *
     * @param key - Technology slug such as "bloodlines".
     * @returns The matching technology.
     * @throws EntityNotFoundError when no technology carries that slug.
     */
    public technology(key: string): Technology {
        const technology = this.technologiesByKey.get(key);
        if (!technology) throw new EntityNotFoundError('Technology', key);

        return technology;
    }

    /**
     * Lists technologies matching every constraint of the query.
     *
     * @param query - Optional filters; an empty query returns every technology.
     * @returns Technologies sorted by age and then by name slug.
     */
    public technologies(query: TechnologyQuery = {}): Technology[] {
        return [...this.technologiesByKey.values()]
            .filter((technology) => technology.availableTo(query.civ ?? null))
            .filter((technology) => !query.building || technology.building === query.building)
            .filter((technology) => !query.uniqueOnly || technology.isUnique)
            .sort((left, right) => left.age - right.age || left.key.localeCompare(right.key));
    }

    /**
     * Looks a civilization up by slug.
     *
     * @param key - Civilization slug such as "britons".
     * @returns The matching civilization.
     * @throws EntityNotFoundError when no civilization carries that slug.
     */
    public civilization(key: string): Civilization {
        const civilization = this.civilizationsByKey.get(key);
        if (!civilization) throw new EntityNotFoundError('Civilization', key);

        return civilization;
    }

    /**
     * Lists every civilization in the dataset.
     *
     * @returns Civilizations sorted by slug.
     */
    public civilizations(): Civilization[] {
        return [...this.civilizationsByKey.values()].sort((left, right) => left.key.localeCompare(right.key));
    }
}

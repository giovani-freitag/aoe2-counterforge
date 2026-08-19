import type { ResourceWeights } from './domain/values/resource-cost.ts';
import {
    CIVILIZATION_RECORDS,
    FALLBACK_LOCALE,
    GAME_STRING_BUNDLES,
    TECHNOLOGY_RECORDS,
    UNIT_RECORDS,
} from './data/dataset.ts';
import { CombatService } from './services/combat/combat-service.ts';
import { DamageCalculator } from './services/combat/damage-calculator.ts';
import { EconomyService } from './services/economy/economy-service.ts';
import {
    DEFAULT_CARRY_UPGRADES,
    DEFAULT_FARM_UPGRADES,
    DEFAULT_GATHER_RATES,
    DEFAULT_GATHER_UPGRADES,
} from './services/economy/gather-rates.ts';
import { CatalogAssembler } from './services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from './services/game-catalog/game-catalog-service.ts';
import { GameTextService } from './services/game-text/game-text-service.ts';
import { MatchupService, type MatchupThresholds } from './services/matchup/matchup-service.ts';
import { FuzzyMatcher } from './services/search/fuzzy-matcher.ts';
import { SearchIndexBuilder } from './services/search/search-index-builder.ts';
import { SearchService } from './services/search/search-service.ts';
import { UnitRankingService } from './services/unit-ranking/unit-ranking-service.ts';
import { UpgradeService } from './services/upgrade/upgrade-service.ts';

/**
 * How much one unit of each resource is worth when comparing two trades.
 *
 * Gold and stone are scarce and cannot be farmed, so a gold-heavy unit has to earn its keep.
 */
export const RESOURCE_WEIGHTS: ResourceWeights = { food: 1, wood: 1, gold: 1.6, stone: 1.6 };

export const MATCHUP_THRESHOLDS: MatchupThresholds = {
    dominant: 2,
    favourable: 1.25,
    even: 0.8,
    unfavourable: 0.5,
};

export interface AppServices {
    catalog: GameCatalogService;
    text: GameTextService;
    combat: CombatService;
    upgrades: UpgradeService;
    matchups: MatchupService;
    ranking: UnitRankingService;
    economy: EconomyService;
    search: SearchService;
}

/**
 * Wires every service against the shipped dataset.
 *
 * @returns A fully connected service graph, ready for the render layer to adapt.
 */
export function createServices(): AppServices {
    const catalog = new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: UNIT_RECORDS,
        technologies: TECHNOLOGY_RECORDS,
        civilizations: CIVILIZATION_RECORDS,
    });

    const text = new GameTextService({
        bundles: GAME_STRING_BUNDLES,
        fallbackLocale: FALLBACK_LOCALE,
    });

    const combat = new CombatService({
        damageCalculator: new DamageCalculator(),
        maxFreeHits: 6,
        kiteRepeats: 3,
    });

    const upgrades = new UpgradeService({ catalog });

    const matchups = new MatchupService({
        catalog,
        combat,
        upgrades,
        resourceWeights: RESOURCE_WEIGHTS,
        thresholds: MATCHUP_THRESHOLDS,
        commonOpponentCivs: 20,
        maxEfficiency: 99,
    });

    const ranking = new UnitRankingService({ upgrades, resourceWeights: RESOURCE_WEIGHTS });

    const economy = new EconomyService({
        rates: DEFAULT_GATHER_RATES,
        upgrades: DEFAULT_GATHER_UPGRADES,
        carryUpgrades: DEFAULT_CARRY_UPGRADES,
        farmUpgrades: DEFAULT_FARM_UPGRADES,
    });

    const search = new SearchService({
        indexBuilder: new SearchIndexBuilder({ catalog, text, fallbackLocale: FALLBACK_LOCALE }),
        matcher: new FuzzyMatcher(),
    });

    return { catalog, text, combat, upgrades, matchups, ranking, economy, search };
}

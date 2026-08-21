import { ASSUMPTIONS } from './assumptions.ts';
import type { ResourceWeights } from './domain/values/resource-cost.ts';
import {
    CIVILIZATION_RECORDS,
    ECONOMY_RECORD,
    FALLBACK_LOCALE,
    GAME_STRING_BUNDLES,
    TECHNOLOGY_RECORDS,
    UNIT_RECORDS,
} from './data/dataset.ts';
import { CombatService } from './services/combat/combat-service.ts';
import { DamageCalculator } from './services/combat/damage-calculator.ts';
import { EconomyService } from './services/economy/economy-service.ts';
import {
    type CarryUpgrade,
    type FoodSource,
    type GatherProfile,
    type GatherRateTable,
    type GatherUpgrade,
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
 * What a resource is worth against food, for weighing one unit's price against another's.
 *
 * Gold and stone are scarce and cannot be farmed, so a gold-heavy unit has to earn its keep.
 */
export const RESOURCE_WEIGHTS: ResourceWeights = {
    food: ASSUMPTIONS.foodWeight.value,
    wood: ASSUMPTIONS.woodWeight.value,
    gold: ASSUMPTIONS.goldWeight.value,
    stone: ASSUMPTIONS.stoneWeight.value,
};

export const MATCHUP_THRESHOLDS: MatchupThresholds = {
    dominant: ASSUMPTIONS.dominantTrade.value,
    favourable: ASSUMPTIONS.favourableTrade.value,
    even: ASSUMPTIONS.evenTrade.value,
    unfavourable: ASSUMPTIONS.unfavourableTrade.value,
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
/**
 * How far a villager walks to put its load down, which is the one economy number the game omits.
 *
 * @param foodSource - Which way food is being gathered, when it is food.
 * @returns Tiles between the resource and the drop-off.
 */
function dropOffTiles(foodSource?: string): number {
    if (foodSource === 'farm' || foodSource === 'sheep') return ASSUMPTIONS.dropOffTilesNearby.value;
    if (foodSource === 'hunt') return ASSUMPTIONS.dropOffTilesHunt.value;

    return ASSUMPTIONS.dropOffTilesOrdinary.value;
}

/**
 * Turns what the game says about each kind of work into the table the planner reads.
 *
 * @returns One profile per resource, with the food sources kept apart.
 */
export function gatherRates(): GatherRateTable {
    const food = {} as Record<FoodSource, GatherProfile>;
    const table = { food } as GatherRateTable;

    for (const job of ECONOMY_RECORD.jobs) {
        const profile: GatherProfile = {
            gatherRate: job.gatherRate,
            carryCapacity: job.carryCapacity,
            dropOffDistance: dropOffTiles(job.foodSource),
        };

        if (job.foodSource) food[job.foodSource as FoodSource] = profile;
        else if (job.resource === 'wood') table.wood = profile;
        else if (job.resource === 'gold') table.gold = profile;
        else if (job.resource === 'stone') table.stone = profile;
    }

    return table;
}

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
        maxFreeHits: ASSUMPTIONS.maxFreeHits.value,
        kiteRepeats: ASSUMPTIONS.kiteRepeats.value,
    });

    const upgrades = new UpgradeService({ catalog });

    const matchups = new MatchupService({
        catalog,
        combat,
        upgrades,
        resourceWeights: RESOURCE_WEIGHTS,
        thresholds: MATCHUP_THRESHOLDS,
        commonOpponentCivs: ASSUMPTIONS.commonOpponentCivs.value,
    });

    const ranking = new UnitRankingService({ upgrades, resourceWeights: RESOURCE_WEIGHTS });

    const economy = new EconomyService({
        rates: gatherRates(),
        gatherUpgrades: ECONOMY_RECORD.gatherUpgrades as GatherUpgrade[],
        carryUpgrades: ECONOMY_RECORD.carryUpgrades as CarryUpgrade[],
        farmUpgrades: ECONOMY_RECORD.farmUpgrades,
        walkSpeed: ECONOMY_RECORD.villagerWalkSpeed,
        farmFood: ECONOMY_RECORD.farmFood,
        farmWoodCost: ECONOMY_RECORD.farmWoodCost,
    });

    const search = new SearchService({
        indexBuilder: new SearchIndexBuilder({ catalog, text, fallbackLocale: FALLBACK_LOCALE }),
        matcher: new FuzzyMatcher(),
    });

    return { catalog, text, combat, upgrades, matchups, ranking, economy, search };
}

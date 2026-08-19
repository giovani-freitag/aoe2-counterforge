import type { Unit } from '../../domain/entities/unit.ts';
import type { ResourceWeights } from '../../domain/values/resource-cost.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import type { UpgradeService } from '../upgrade/upgrade-service.ts';

/** The orderings the roster screen offers, all of them derived from the shipped stats. */
export const UNIT_SORT_KEYS = [
    'age',
    'train-time',
    'cost',
    'hp',
    'attack',
    'dps',
    'speed',
    'range',
    'value',
] as const;

export type UnitSortKey = (typeof UNIT_SORT_KEYS)[number];

export interface UnitRankingServiceConfig {
    upgrades: UpgradeService;
    resourceWeights: ResourceWeights;
}

export interface UnitRankingQuery {
    units: readonly Unit[];
    sort: UnitSortKey;
    /** Rates every unit with all the technologies that reach it already researched. */
    upgraded?: boolean;
    civ?: string | null;
}

export interface RankedUnit {
    unit: Unit;
    stats: UnitStats;
    /** The number the ordering was made on, so the interface can show what it sorted by. */
    metric: number;
}

/** Orderings where the smaller number is the better one. */
const ASCENDING: ReadonlySet<UnitSortKey> = new Set(['age', 'train-time', 'cost']);

const MIN_RELOAD = 0.1;
const MIN_COST = 1;

/** Sorts a roster by any of the stat-derived orderings the interface exposes. */
export class UnitRankingService {
    private readonly config: UnitRankingServiceConfig;

    constructor(config: UnitRankingServiceConfig) {
        this.config = config;
    }

    /**
     * Orders units by one metric, best first.
     *
     * @param query - Units to order, which metric to use and whether upgrades count.
     * @returns Each unit with the stat line and the metric value behind its position.
     */
    public rank(query: UnitRankingQuery): RankedUnit[] {
        const ascending = ASCENDING.has(query.sort);

        return query.units
            .map((unit) => {
                const stats = query.upgraded
                    ? this.config.upgrades.fullyUpgraded(unit, query.civ ?? null).stats
                    : unit.stats;

                return { unit, stats, metric: this.metricOf(unit, stats, query.sort) };
            })
            .sort((left, right) =>
                ascending ? left.metric - right.metric || 0 : right.metric - left.metric || 0,
            );
    }

    /**
     * Sustained damage per second against an unarmoured target.
     *
     * A unit that never reloads spends itself in one blow, so it has no sustained output at all
     * rather than an enormous one.
     *
     * @param stats - Stat line to measure.
     * @returns Damage per second, accuracy included for ranged units.
     */
    public rawDps(stats: UnitStats): number {
        if (stats.reloadTime < MIN_RELOAD) return 0;

        return (stats.attack.displayValue * stats.hitChance()) / stats.reloadTime;
    }

    private metricOf(unit: Unit, stats: UnitStats, sort: UnitSortKey): number {
        switch (sort) {
            case 'age':
                return unit.age;
            case 'train-time':
                return unit.trainTime;
            case 'cost':
                return unit.cost.weighted(this.config.resourceWeights);
            case 'hp':
                return stats.hp;
            case 'attack':
                return stats.attack.displayValue;
            case 'dps':
                return this.rawDps(stats);
            case 'speed':
                return stats.speed;
            case 'range':
                return stats.range;
            case 'value': {
                // A unit an ally hands over for free has no cost to measure its power against.
                const cost = unit.cost.weighted(this.config.resourceWeights);

                return cost < MIN_COST ? 0 : (this.rawDps(stats) * stats.hp) / cost;
            }
        }
    }
}

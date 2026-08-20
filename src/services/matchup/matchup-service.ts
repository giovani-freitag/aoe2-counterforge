import type { Unit } from '../../domain/entities/unit.ts';
import type { UnitCategory } from '../../domain/enums/unit-category.ts';
import type { ResourceWeights } from '../../domain/values/resource-cost.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import type { CombatService, DuelResult, EngagementModel } from '../combat/combat-service.ts';
import type { DamageComponent } from '../combat/damage-calculator.ts';
import type { GameCatalogService } from '../game-catalog/game-catalog-service.ts';
import type { UpgradeService } from '../upgrade/upgrade-service.ts';

export type MatchupVerdict = 'dominant' | 'favourable' | 'even' | 'unfavourable' | 'countered';

export type MatchupNote =
    | 'out-ranges'
    | 'out-ranged'
    | 'faster'
    | 'slower'
    | 'blast'
    | 'faces-blast'
    | 'bonus-damage'
    | 'takes-bonus-damage'
    | 'min-range';

export interface MatchupThresholds {
    dominant: number;
    favourable: number;
    even: number;
    unfavourable: number;
}

export interface MatchupServiceConfig {
    catalog: GameCatalogService;
    combat: CombatService;
    upgrades: UpgradeService;
    resourceWeights: ResourceWeights;
    thresholds: MatchupThresholds;
    /** Minimum number of civilizations that must train a unit for it to count as a common opponent. */
    commonOpponentCivs: number;
}

export type UpgradeLevel = 'base' | 'full';

/**
 * How wide the opponent list is drawn.
 *
 * `common` keeps one age-appropriate unit per line and only the ones most civilizations train,
 * `all` adds the unique units, and `every` drops the per-line grouping so each upgrade step of
 * every line shows up on its own.
 */
export type OpponentPool = 'common' | 'all' | 'every';

export interface MatchupQuery {
    unit: Unit;
    civ?: string | null;
    model?: EngagementModel;
    upgradeLevel?: UpgradeLevel;
    categories?: readonly UnitCategory[];
    pool?: OpponentPool;
    limit?: number;
}

export interface Matchup {
    opponent: Unit;
    efficiency: number;
    verdict: MatchupVerdict;
    duel: DuelResult;
    notes: MatchupNote[];
}

export interface MatchupReport {
    subject: Unit;
    subjectStats: UnitStats;
    strongAgainst: Matchup[];
    weakAgainst: Matchup[];
    all: Matchup[];
}

const DEFAULT_LIMIT = 6;
const MIN_DPS = 0.05;

const MIN_SPEED = 0.1;

/** A unit that is both outranged and outrun keeps losing the approach it just finished. */
const KITE_PENALTY = 0.4;

/**
 * Where the fight stops growing in a straight line.
 *
 * A Rocket Cart needs eleven minutes to kill the cavalry that kills it in five seconds, and the
 * difference between a hundred to one and thirty to one is not something a reader can act on. Past
 * this knee the ratio grows by its logarithm instead: nothing is truncated, so the order still
 * holds and no two fights collapse into the same number, but the runaway end stops drowning out
 * the matchups close enough to think about.
 */
const FIGHT_KNEE = 4;
const MIN_EXPOSURE = 0.05;

/**
 * Bends a lopsided fight towards its logarithm, the same way in both directions.
 *
 * @param ratio - How much longer the opponent needs to win than this unit does.
 * @returns The ratio itself while the fight is close, its compressed form once it is not.
 */
function compress(ratio: number): number {
    if (ratio < 1) return 1 / compress(1 / ratio);
    if (ratio <= FIGHT_KNEE) return ratio;

    return FIGHT_KNEE * (1 + Math.log(ratio / FIGHT_KNEE));
}

/** Ranks every plausible opponent of a unit by how well the trade goes. */
export class MatchupService {
    private readonly config: MatchupServiceConfig;

    constructor(config: MatchupServiceConfig) {
        this.config = config;
    }

    /**
     * Ranks the roster against one unit.
     *
     * @param query - Subject unit plus the civilization, engagement and upgrade assumptions.
     * @returns The full ranking together with the best and worst matchups.
     */
    public rank(query: MatchupQuery): MatchupReport {
        const subjectStats = this.statsFor(query.unit, query.civ ?? null, query.upgradeLevel ?? 'full');
        const limit = query.limit ?? DEFAULT_LIMIT;

        const all = this.opponentsFor(query)
            .map((opponent) => this.compare(query, subjectStats, opponent))
            .sort((left, right) => right.efficiency - left.efficiency);

        return {
            subject: query.unit,
            subjectStats,
            all,
            strongAgainst: all.filter((matchup) => matchup.efficiency > this.config.thresholds.even).slice(0, limit),
            weakAgainst: all
                .filter((matchup) => matchup.efficiency < this.config.thresholds.even)
                .slice(-limit)
                .reverse(),
        };
    }

    /**
     * Resolves a single matchup between two units.
     *
     * @param query - Subject unit plus the civilization, engagement and upgrade assumptions.
     * @param opponent - Unit to trade against.
     * @returns The matchup with its efficiency, verdict and tactical notes.
     */
    public against(query: MatchupQuery, opponent: Unit): Matchup {
        const stats = this.statsFor(query.unit, query.civ ?? null, query.upgradeLevel ?? 'full');

        return this.compare(query, stats, opponent);
    }

    private compare(query: MatchupQuery, subjectStats: UnitStats, opponent: Unit): Matchup {
        // Opponents are rated at their generic fully upgraded strength: you can face any civilization.
        const opponentStats = this.statsFor(opponent, null, query.upgradeLevel ?? 'full');
        const duel = this.config.combat.duel({
            attacker: subjectStats,
            defender: opponentStats,
            model: query.model ?? 'skirmish',
        });

        const subjectValue = Math.max(1, query.unit.cost.weighted(this.config.resourceWeights));
        const opponentValue = Math.max(1, opponent.cost.weighted(this.config.resourceWeights));
        const efficiency = this.efficiencyOf({
            subject: { stats: subjectStats, dps: duel.attacker.dps, value: subjectValue },
            opponent: { stats: opponentStats, dps: duel.defender.dps, value: opponentValue },
            model: query.model ?? 'skirmish',
        });

        return {
            opponent,
            duel,
            efficiency,
            verdict: this.verdictFor(efficiency),
            notes: this.notesFor(subjectStats, opponentStats, duel),
        };
    }

    /**
     * Compares how fast each side burns through the other, weighted by what each side costs.
     *
     * Kill times are continuous rather than counted in whole hits: a discrete count turns into a
     * division by zero as soon as one side one-shots the other, which is exactly the case that
     * matters most.
     */
    private efficiencyOf(trade: {
        subject: { stats: UnitStats; dps: number; value: number };
        opponent: { stats: UnitStats; dps: number; value: number };
        model: EngagementModel;
    }): number {
        const subjectExposure = this.exposureOf(trade.subject.stats, trade.opponent.stats, trade.model);
        const opponentExposure = this.exposureOf(trade.opponent.stats, trade.subject.stats, trade.model);

        const subjectKill = trade.opponent.stats.hp / Math.max(MIN_DPS, trade.subject.dps * subjectExposure);
        const opponentKill = trade.subject.stats.hp / Math.max(MIN_DPS, trade.opponent.dps * opponentExposure);
        return compress(opponentKill / subjectKill) * (trade.opponent.value / trade.subject.value);
    }

    /**
     * The share of its damage a unit still lands once the other side's reach is accounted for.
     *
     * The outranged side spends the approach unable to answer, so its damage is scaled by the
     * slice of the engagement it actually spends in contact. Losing the speed race on top of the
     * range gap means the approach never ends, which is what kiting costs.
     */
    private exposureOf(victim: UnitStats, shooter: UnitStats, model: EngagementModel): number {
        if (model === 'stand') return 1;

        const gap = shooter.range - victim.range;
        if (gap < 1) return 1;

        const approachSeconds = gap / Math.max(MIN_SPEED, victim.speed);
        const contactSeconds = shooter.hp / Math.max(MIN_DPS, this.dpsOf(victim, shooter));
        const share = contactSeconds / (approachSeconds + contactSeconds);
        const kited = gap >= 2 && shooter.speed > victim.speed;

        return Math.max(MIN_EXPOSURE, kited ? share * KITE_PENALTY : share);
    }

    private dpsOf(attacker: UnitStats, defender: UnitStats): number {
        return this.config.combat.dps(attacker, defender);
    }

    private statsFor(unit: Unit, civ: string | null, level: UpgradeLevel): UnitStats {
        return level === 'base' ? unit.stats : this.config.upgrades.fullyUpgraded(unit, civ).stats;
    }

    /**
     * The opponents worth showing: one age-appropriate representative per upgrade line.
     *
     * Listing every line member would fill the screen with the same unit four times over, so the
     * member closest to the subject's own age stands in for the whole line.
     */
    private opponentsFor(query: MatchupQuery): Unit[] {
        const pool = query.pool ?? 'common';
        const isNaval = query.unit.category === 'naval';
        const candidates = this.config.catalog
            .units({ combatOnly: true, categories: query.categories })
            .filter((unit) => (unit.category === 'naval') === isNaval)
            .filter((unit) => (pool === 'every' ? unit.key !== query.unit.key : unit.line !== query.unit.line))
            .filter((unit) => unit.stats.canAttack())
            .filter((unit) => !unit.hasTag('demolition'))
            .filter((unit) => pool !== 'common' || unit.civs.length >= this.config.commonOpponentCivs);

        if (pool === 'every') return candidates;

        const byLine = new Map<string, Unit>();
        for (const candidate of candidates) {
            const current = byLine.get(candidate.line);
            if (!current || this.isCloserToAge(candidate, current, query.unit.age)) {
                byLine.set(candidate.line, candidate);
            }
        }

        return [...byLine.values()];
    }

    private isCloserToAge(candidate: Unit, current: Unit, age: number): boolean {
        const reachable = (unit: Unit) => unit.age <= age;
        if (reachable(candidate) !== reachable(current)) return reachable(candidate);

        return Math.abs(candidate.age - age) < Math.abs(current.age - age);
    }

    private verdictFor(efficiency: number): MatchupVerdict {
        const { dominant, favourable, even, unfavourable } = this.config.thresholds;
        if (efficiency >= dominant) return 'dominant';
        if (efficiency >= favourable) return 'favourable';
        if (efficiency >= even) return 'even';
        if (efficiency >= unfavourable) return 'unfavourable';

        return 'countered';
    }

    /**
     * What a reader should know about the number, most surprising first.
     *
     * A row shows two or three of these, so the order is the point: being faster is the least
     * surprising thing on the list, while a weapon built for crowds losing a duel is the one fact
     * that changes how the ratio should be read.
     */
    private notesFor(subject: UnitStats, opponent: UnitStats, duel: DuelResult): MatchupNote[] {
        const notes: MatchupNote[] = [];
        if (opponent.blastWidth > 0) notes.push('faces-blast');
        if (this.hasBonus(duel.attacker.breakdown.components)) notes.push('bonus-damage');
        if (this.hasBonus(duel.defender.breakdown.components)) notes.push('takes-bonus-damage');
        if (subject.range >= opponent.range + 2) notes.push('out-ranges');
        if (opponent.range >= subject.range + 2) notes.push('out-ranged');
        if (subject.blastWidth > 0) notes.push('blast');
        if (subject.minRange > 0) notes.push('min-range');
        if (subject.speed > opponent.speed) notes.push('faster');
        if (subject.speed < opponent.speed) notes.push('slower');

        return notes;
    }

    private hasBonus(components: readonly DamageComponent[]): boolean {
        return components.some(
            (component) =>
                component.armourClass !== 'base-melee' &&
                component.armourClass !== 'base-pierce' &&
                component.net > 0,
        );
    }
}

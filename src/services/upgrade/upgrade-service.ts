import type { Technology } from '../../domain/entities/technology.ts';
import type { Unit } from '../../domain/entities/unit.ts';
import type { ClassAmount } from '../../domain/values/class-amount.ts';
import type { TechEffect } from '../../domain/values/tech-effect.ts';
import type { UnitStats, UnitStatsPatch } from '../../domain/values/unit-stats.ts';
import type { GameCatalogService } from '../game-catalog/game-catalog-service.ts';
import type { StatDelta } from './tech-effect.ts';

export interface UpgradeServiceConfig {
    catalog: GameCatalogService;
}

export interface AppliedUpgrade {
    technology: Technology;
    /** What the technology does to this particular unit. */
    delta: StatDelta;
    /** Set when the technology reaches the unit but changes nothing this guide puts a number on. */
    qualitative: boolean;
}

export interface CivilizationBonus {
    civ: string;
    /** What the civilization's own bonuses do to the unit, with nothing researched. */
    delta: StatDelta;
    /** What its team bonus does to the unit, which needs it on the team rather than in the seat. */
    team: StatDelta;
}

export interface ChangedUnit {
    unit: Unit;
    /** What the technology does to this unit in particular. */
    delta: StatDelta;
    /** Set when it reaches the unit but changes nothing this guide puts a number on. */
    qualitative: boolean;
}

export interface UpgradeSelection {
    unit: Unit;
    techs: readonly string[];
    /** Civilization whose always-on bonuses count on top of what is researched. */
    civ?: string | null;
}

export interface UpgradeOutcome {
    stats: UnitStats;
    trainTime: number;
    applied: AppliedUpgrade[];
}

/**
 * The attributes the guide keeps in its stat line.
 *
 * The game's table also moves garrison size, projectile ids and work rates; those belong to
 * buildings and villagers rather than to how a soldier fights, so a technology that only touches
 * them counts as reaching the unit without carrying a number.
 */
const MODELLED = new Set([
    'hp',
    'attack',
    'armour',
    'range',
    'accuracy',
    'lineOfSight',
    'speed',
    'reloadTime',
    'blastWidth',
    'trainTime',
    'projectiles',
    'regeneration',
    'ballistics',
    'cost',
    'costFood',
    'costWood',
    'costGold',
    'costStone',
]);

/** The resource each cost attribute scales, with the whole price under its own name. */
const COST_OF: Record<string, string> = {
    cost: 'all',
    costFood: 'food',
    costWood: 'wood',
    costGold: 'gold',
    costStone: 'stone',
};

/** Attack and armour multipliers are written as whole percentages, unlike every other factor. */
const PERCENT = 100;

/** A stat delta written so that two equal deltas produce the same string, whatever their order. */
function canonical(delta: StatDelta): string {
    const scalars = [
        delta.hp,
        delta.hpMultiplier,
        delta.accuracyFloor,
        delta.lineOfSightFloor,
        delta.range,
        delta.accuracy,
        delta.lineOfSight,
        delta.speed,
        delta.speedMultiplier,
        delta.reloadTime,
        delta.reloadTimeMultiplier,
        delta.trainTimeMultiplier,
        delta.ballistics,
    ].map((value) => String(value ?? ''));

    const costs = Object.entries(delta.costMultipliers ?? {})
        .map(([resource, factor]) => `${resource}=${String(factor)}`)
        .sort()
        .join(',');

    const classes = [delta.attack, delta.attackMultipliers, delta.armour, delta.armourMultipliers].map((entries) =>
        (entries ?? [])
            .map((entry) => `${entry.armourClass}=${String(entry.amount)}`)
            .sort()
            .join(','),
    );

    return [...scalars, costs, ...classes].join('|');
}

/** Whether the change is a factor, which cannot be split into equal parts the way a sum can. */
function scaled(delta: StatDelta): boolean {
    return (
        delta.hpMultiplier !== undefined ||
        delta.speedMultiplier !== undefined ||
        delta.reloadTimeMultiplier !== undefined ||
        delta.trainTimeMultiplier !== undefined ||
        delta.attackMultipliers !== undefined ||
        delta.armourMultipliers !== undefined ||
        delta.costMultipliers !== undefined
    );
}

/** Answers which technologies touch a unit, and what the unit looks like once they are researched. */
export class UpgradeService {
    private readonly catalog: GameCatalogService;

    constructor(config: UpgradeServiceConfig) {
        this.catalog = config.catalog;
    }

    /**
     * Every technology whose own effect table names this unit or the class it belongs to.
     *
     * @param unit - Unit to inspect.
     * @param civ - Civilization slug to restrict availability to, or null for all civilizations.
     * @returns Upgrades ordered by age and then by research building.
     */
    public affecting(unit: Unit, civ: string | null = null): AppliedUpgrade[] {
        return this.catalog
            .technologies()
            .filter((technology) => technology.availableTo(civ))
            .map((technology) => this.upgradeFor(unit, technology))
            .filter((upgrade): upgrade is AppliedUpgrade => upgrade !== null)
            .sort(
                (left, right) =>
                    left.technology.age - right.technology.age ||
                    left.technology.building.localeCompare(right.technology.building) ||
                    left.technology.key.localeCompare(right.technology.key),
            );
    }

    /**
     * Every unit one technology reaches, which is the upgrades tab read backwards.
     *
     * @param technology - Technology to inspect.
     * @returns One entry per unit it changes, ordered the way the roster is.
     */
    public unitsChangedBy(technology: Technology): ChangedUnit[] {
        return this.catalog
            .units({ combatOnly: true })
            .map((unit) => ({ unit, applied: this.upgradeFor(unit, technology) }))
            .filter((entry): entry is { unit: Unit; applied: AppliedUpgrade } => entry.applied !== null)
            .map(({ unit, applied }) => ({ unit, delta: applied.delta, qualitative: applied.qualitative }));
    }

    /**
     * How much faster a building turns units out once a technology is researched.
     *
     * Conscription is written as work rate on the barracks, the stable and the range rather than
     * on the soldier, which is why it never shows up in a unit's own effects.
     *
     * @param key - Technology slug.
     * @returns The factor to divide a train time by, or one when the technology does not touch it.
     */
    public productionSpeed(key: string): number {
        const factors = this.catalog
            .technology(key)
            .effects.filter((effect) => effect.attribute === 'workRate' && effect.mode === 'multiply')
            .map((effect) => effect.value);

        return factors.length > 0 ? Math.max(...factors) : 1;
    }

    /**
     * Recomputes a unit's stat line with a set of technologies researched.
     *
     * @param selection - The unit plus the technology slugs to apply.
     * @returns The upgraded stat line, the resulting train time and what was actually applied.
     */
    public apply(selection: UpgradeSelection): UpgradeOutcome {
        const applied = selection.techs
            .map((key) => this.upgradeFor(selection.unit, this.catalog.technology(key)))
            .filter((upgrade): upgrade is AppliedUpgrade => upgrade !== null);

        const deltas = [...applied.map((upgrade) => upgrade.delta), this.bonusDelta(selection)];
        const faster = deltas.reduce((factor, delta) => factor * (delta.trainTimeMultiplier ?? 1), 1);

        return {
            applied,
            stats: selection.unit.stats.patched(this.mergePatch(deltas)),
            trainTime: selection.unit.trainTime * faster,
        };
    }

    /**
     * Applies every technology a civilization could research for this unit.
     *
     * @param unit - Unit to upgrade.
     * @param civ - Civilization slug to restrict availability to, or null for all civilizations.
     * @returns The fully upgraded outcome.
     */
    public fullyUpgraded(unit: Unit, civ: string | null = null): UpgradeOutcome {
        // With no civilization chosen, two civilizations' unique technologies would stack on the
        // same soldier, which no game ever allows.
        const techs = this.affecting(unit, civ)
            .filter(({ technology }) => civ !== null || !technology.isUnique)
            .map(({ technology }) => technology.key);

        return this.apply({ unit, techs, civ });
    }

    /**
     * Every civilization whose own bonuses change this unit, whether or not one is chosen.
     *
     * These are not technologies and never appear in a tech tree: the game hands them over at the
     * start of the match, which is why they are worth naming next to the ones you research.
     *
     * @param unit - Unit to inspect.
     * @returns One entry per civilization that changes the unit, ordered by slug.
     */
    public civilizationBonuses(unit: Unit): CivilizationBonus[] {
        return this.catalog
            .civilizations()
            .map((civilization) => ({
                civ: civilization.key,
                delta: this.toDelta(civilization.bonuses.filter((effect) => effect.reaches(unit))),
                team: this.toDelta(civilization.teamBonuses.filter((effect) => effect.reaches(unit))),
            }))
            .filter((entry) => Object.keys(entry.delta).length > 0 || Object.keys(entry.team).length > 0)
            .sort((left, right) => left.civ.localeCompare(right.civ));
    }

    /** What the chosen civilization hands the unit before anyone researches anything. */
    private bonusDelta(selection: UpgradeSelection): StatDelta {
        const civ = selection.civ ?? null;

        return civ === null ? {} : this.bonusFor(selection.unit, civ);
    }

    private bonusFor(unit: Unit, civ: string): StatDelta {
        return this.toDelta(this.catalog.civilization(civ).bonuses.filter((effect) => effect.reaches(unit)));
    }

    /** The change one technology makes to one unit, or null when it never reaches it. */
    private upgradeFor(unit: Unit, technology: Technology): AppliedUpgrade | null {
        const reaching = technology.effects.filter((effect) => effect.reaches({ id: unit.id, classId: unit.classId }));
        if (reaching.length === 0) return null;

        const delta = this.toDelta(reaching);

        return { technology, delta, qualitative: Object.keys(delta).length === 0 };
    }

    private toDelta(effects: readonly TechEffect[]): StatDelta {
        const delta = this.accumulate(effects);
        const ages = this.agesRepeating(effects);

        return ages === null ? delta : { ...delta, perAge: ages };
    }

    /**
     * How many ages hand out the same change, for a bonus the game grants once per age.
     *
     * Only an unbroken pattern counts: every effect carries an age, and every age contributes
     * exactly the same change. Anything else is a total that cannot be divided honestly.
     *
     * @param effects - Effects that reach one unit.
     * @returns The number of ages, or null when this is not that kind of bonus.
     */
    private agesRepeating(effects: readonly TechEffect[]): number | null {
        const byAge = new Map<number, TechEffect[]>();
        for (const effect of effects) {
            if (effect.age === null) return null;

            byAge.set(effect.age, [...(byAge.get(effect.age) ?? []), effect]);
        }

        if (byAge.size < 2) return null;

        const deltas = [...byAge.values()].map((group) => this.accumulate(group));
        const shapes = deltas.map(canonical);
        const uniform = shapes.every((shape) => shape === shapes[0]);

        return uniform && !deltas.some(scaled) ? byAge.size : null;
    }

    private accumulate(effects: readonly TechEffect[]): StatDelta {
        const delta: StatDelta = {};
        // The game states a class at a time, and often twice for the same one; a reader wants the
        // total, so the classes are accumulated here rather than listed as they arrive.
        const classed: Record<'attack' | 'armour', { added: Map<string, number>; scaled: Map<string, number> }> = {
            attack: { added: new Map(), scaled: new Map() },
            armour: { added: new Map(), scaled: new Map() },
        };

        for (const effect of effects) {
            if (!MODELLED.has(effect.attribute)) continue;

            if (effect.attribute === 'attack' || effect.attribute === 'armour') {
                if (effect.damageClass === undefined || effect.mode === 'set') continue;

                const scale = effect.mode === 'multiply';
                const table = classed[effect.attribute][scale ? 'scaled' : 'added'];
                const current = table.get(effect.damageClass);
                const value = scale ? effect.value / PERCENT : effect.value;
                table.set(effect.damageClass, scale ? (current ?? 1) * value : (current ?? 0) + value);

                continue;
            }

            if (effect.mode === 'multiply') {
                const resource = COST_OF[effect.attribute];
                if (resource !== undefined) {
                    const current = delta.costMultipliers ?? {};
                    delta.costMultipliers = { ...current, [resource]: (current[resource] ?? 1) * effect.value };
                }
                if (effect.attribute === 'trainTime') {
                    delta.trainTimeMultiplier = (delta.trainTimeMultiplier ?? 1) * effect.value;
                }
                if (effect.attribute === 'hp') delta.hpMultiplier = (delta.hpMultiplier ?? 1) * effect.value;
                if (effect.attribute === 'speed') delta.speedMultiplier = (delta.speedMultiplier ?? 1) * effect.value;
                if (effect.attribute === 'reloadTime') {
                    delta.reloadTimeMultiplier = (delta.reloadTimeMultiplier ?? 1) * effect.value;
                }

                continue;
            }

            // The table also carries a set to minus one, which is how the game marks an effect that
            // does nothing rather than a unit with no hit points.
            if (effect.mode === 'set') {
                if (effect.value < 0) continue;
                if (effect.attribute === 'ballistics' && effect.value >= 1) delta.ballistics = true;
                if (effect.attribute === 'accuracy') {
                    delta.accuracyFloor = Math.max(delta.accuracyFloor ?? 0, effect.value);
                }
                if (effect.attribute === 'lineOfSight') {
                    delta.lineOfSightFloor = Math.max(delta.lineOfSightFloor ?? 0, effect.value);
                }

                continue;
            }

            if (effect.attribute === 'hp') delta.hp = (delta.hp ?? 0) + effect.value;
            if (effect.attribute === 'range') delta.range = (delta.range ?? 0) + effect.value;
            if (effect.attribute === 'accuracy') delta.accuracy = (delta.accuracy ?? 0) + effect.value;
            if (effect.attribute === 'lineOfSight') delta.lineOfSight = (delta.lineOfSight ?? 0) + effect.value;
            if (effect.attribute === 'speed') delta.speed = (delta.speed ?? 0) + effect.value;
            if (effect.attribute === 'reloadTime') delta.reloadTime = (delta.reloadTime ?? 0) + effect.value;
            if (effect.attribute === 'blastWidth') delta.blastWidth = (delta.blastWidth ?? 0) + effect.value;
            if (effect.attribute === 'projectiles') delta.projectiles = (delta.projectiles ?? 0) + effect.value;
            if (effect.attribute === 'regeneration') delta.regeneration = (delta.regeneration ?? 0) + effect.value;
        }

        const list = (table: Map<string, number>): ClassAmount[] =>
            [...table].map(([armourClass, amount]) => ({ armourClass, amount }) as ClassAmount);

        if (classed.attack.added.size > 0) delta.attack = list(classed.attack.added);
        if (classed.attack.scaled.size > 0) delta.attackMultipliers = list(classed.attack.scaled);
        if (classed.armour.added.size > 0) delta.armour = list(classed.armour.added);
        if (classed.armour.scaled.size > 0) delta.armourMultipliers = list(classed.armour.scaled);

        return delta;
    }

    private mergePatch(deltas: readonly StatDelta[]): UnitStatsPatch {
        const attack: ClassAmount[] = [];
        const attackMultipliers: ClassAmount[] = [];
        const armour: ClassAmount[] = [];
        const armourMultipliers: ClassAmount[] = [];
        const patch: UnitStatsPatch = {
            hp: 0,
            hpMultiplier: 1,
            range: 0,
            accuracy: 0,
            lineOfSight: 0,
            speed: 0,
            speedMultiplier: 1,
            reloadTime: 0,
            reloadTimeMultiplier: 1,
        };

        for (const delta of deltas) {
            patch.hp = (patch.hp ?? 0) + (delta.hp ?? 0);
            patch.hpMultiplier = (patch.hpMultiplier ?? 1) * (delta.hpMultiplier ?? 1);
            patch.range = (patch.range ?? 0) + (delta.range ?? 0);
            patch.accuracy = (patch.accuracy ?? 0) + (delta.accuracy ?? 0);
            patch.accuracyFloor = Math.max(patch.accuracyFloor ?? 0, delta.accuracyFloor ?? 0);
            patch.lineOfSight = (patch.lineOfSight ?? 0) + (delta.lineOfSight ?? 0);
            patch.lineOfSightFloor = Math.max(patch.lineOfSightFloor ?? 0, delta.lineOfSightFloor ?? 0);
            patch.speed = (patch.speed ?? 0) + (delta.speed ?? 0);
            patch.speedMultiplier = (patch.speedMultiplier ?? 1) * (delta.speedMultiplier ?? 1);
            patch.reloadTime = (patch.reloadTime ?? 0) + (delta.reloadTime ?? 0);
            patch.reloadTimeMultiplier = (patch.reloadTimeMultiplier ?? 1) * (delta.reloadTimeMultiplier ?? 1);
            attack.push(...(delta.attack ?? []));
            attackMultipliers.push(...(delta.attackMultipliers ?? []));
            armour.push(...(delta.armour ?? []));
            armourMultipliers.push(...(delta.armourMultipliers ?? []));
        }

        return { ...patch, attack, attackMultipliers, armour, armourMultipliers };
    }
}

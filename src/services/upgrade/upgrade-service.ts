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
const MODELLED = new Set(['hp', 'attack', 'armour', 'range', 'accuracy', 'lineOfSight', 'speed', 'reloadTime']);

/** Attack and armour multipliers are written as whole percentages, unlike every other factor. */
const PERCENT = 100;

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

        return {
            applied,
            stats: selection.unit.stats.patched(this.mergePatch(deltas)),
            trainTime: selection.unit.trainTime,
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

    /** What the chosen civilization hands the unit before anyone researches anything. */
    private bonusDelta(selection: UpgradeSelection): StatDelta {
        const civ = selection.civ ?? null;
        if (civ === null) return {};

        return this.toDelta(this.catalog.civilization(civ).bonuses.filter((effect) => effect.reaches(selection.unit)));
    }

    /** The change one technology makes to one unit, or null when it never reaches it. */
    private upgradeFor(unit: Unit, technology: Technology): AppliedUpgrade | null {
        const reaching = technology.effects.filter((effect) => effect.reaches({ id: unit.id, classId: unit.classId }));
        if (reaching.length === 0) return null;

        const delta = this.toDelta(reaching);

        return { technology, delta, qualitative: Object.keys(delta).length === 0 };
    }

    private toDelta(effects: readonly TechEffect[]): StatDelta {
        const delta: StatDelta = {};
        const classed: Record<'attack' | 'armour', { added: ClassAmount[]; scaled: ClassAmount[] }> = {
            attack: { added: [], scaled: [] },
            armour: { added: [], scaled: [] },
        };

        for (const effect of effects) {
            if (!MODELLED.has(effect.attribute)) continue;

            if (effect.attribute === 'attack' || effect.attribute === 'armour') {
                if (effect.damageClass === undefined || effect.mode === 'set') continue;

                const scale = effect.mode === 'multiply';
                const amount = {
                    armourClass: effect.damageClass,
                    amount: scale ? effect.value / PERCENT : effect.value,
                } as ClassAmount;
                classed[effect.attribute][scale ? 'scaled' : 'added'].push(amount);

                continue;
            }

            if (effect.mode === 'multiply') {
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
        }

        if (classed.attack.added.length > 0) delta.attack = classed.attack.added;
        if (classed.attack.scaled.length > 0) delta.attackMultipliers = classed.attack.scaled;
        if (classed.armour.added.length > 0) delta.armour = classed.armour.added;
        if (classed.armour.scaled.length > 0) delta.armourMultipliers = classed.armour.scaled;

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

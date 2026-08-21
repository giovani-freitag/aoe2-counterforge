import type { ArmourClass } from '../enums/armour-class.ts';
import type { ArmourProfile } from './armour-profile.ts';
import type { AttackProfile } from './attack-profile.ts';
import type { ClassAmount } from './class-amount.ts';

export interface UnitStatsConfig {
    hp: number;
    attack: AttackProfile;
    armour: ArmourProfile;
    /** Stands in for any damage class the defender does not carry. */
    baseArmour: number;
    /** Fraction of the damage from bonus classes the unit does not take. */
    bonusDamageResistance: number;
    /** Whether this unit's attacks go through melee and pierce armour. */
    ignoresArmour: boolean;
    /** Missiles a single shot puts in the air beyond the first. */
    extraProjectiles: number;
    /** What each of those hits with, which is not what the shooter hits with. */
    secondaryAttack: AttackProfile;
    /** Whether this unit's armour holds against attacks that go through it. */
    resistsArmourIgnore: boolean;
    range: number;
    minRange: number;
    reloadTime: number;
    accuracy: number;
    blastWidth: number;
    speed: number;
    lineOfSight: number;
}

/**
 * Additive and multiplicative changes a set of technologies applies to a unit.
 *
 * A multiplier scales the number the unit was born with and the additions land on top, which is
 * the order a game plays out: a civilization is given its bonus before anyone researches anything.
 */
export interface UnitStatsPatch {
    /** Value an effect raises the accuracy to before anything is added on top. */
    accuracyFloor?: number;
    /** Value an effect raises the line of sight to before anything is added on top. */
    lineOfSightFloor?: number;
    hp?: number;
    hpMultiplier?: number;
    range?: number;
    accuracy?: number;
    lineOfSight?: number;
    speed?: number;
    speedMultiplier?: number;
    reloadTime?: number;
    reloadTimeMultiplier?: number;
    blastWidth?: number;
    /** The highest resistance any of the unit's bonuses grants; they do not stack. */
    bonusDamageResistance?: number;
    /** Value an effect brings the minimum range down to. */
    minRangeCeiling?: number;
    /** True once a technology has taught the unit's attacks to go through armour. */
    ignoresArmour?: boolean;
    attack?: readonly ClassAmount[];
    attackMultipliers?: readonly ClassAmount[];
    armour?: readonly ClassAmount[];
    armourMultipliers?: readonly ClassAmount[];
}

export interface UnitStatsRecord {
    hp: number;
    attack: number;
    meleeArmour: number;
    pierceArmour: number;
    range: number;
    minRange: number;
    reloadTime: number;
    accuracy: number;
    speed: number;
    lineOfSight: number;
    blastWidth: number;
}

/** Every number that decides how a unit performs in a fight. */
export class UnitStats {
    private readonly config: UnitStatsConfig;

    constructor(config: UnitStatsConfig) {
        this.config = config;
    }

    public get hp(): number {
        return this.config.hp;
    }

    public get attack(): AttackProfile {
        return this.config.attack;
    }

    public get baseArmour(): number {
        return this.config.baseArmour;
    }

    public get bonusDamageResistance(): number {
        return this.config.bonusDamageResistance;
    }

    public get extraProjectiles(): number {
        return this.config.extraProjectiles;
    }

    public get secondaryAttack(): AttackProfile {
        return this.config.secondaryAttack;
    }

    public get ignoresArmour(): boolean {
        return this.config.ignoresArmour;
    }

    public get resistsArmourIgnore(): boolean {
        return this.config.resistsArmourIgnore;
    }

    public get armour(): ArmourProfile {
        return this.config.armour;
    }

    public get range(): number {
        return this.config.range;
    }

    public get minRange(): number {
        return this.config.minRange;
    }

    public get reloadTime(): number {
        return this.config.reloadTime;
    }

    public get accuracy(): number {
        return this.config.accuracy;
    }

    public get blastWidth(): number {
        return this.config.blastWidth;
    }

    public get speed(): number {
        return this.config.speed;
    }

    public get lineOfSight(): number {
        return this.config.lineOfSight;
    }

    /**
     * Tells whether the unit fights from a distance.
     *
     * @returns True for anything with a real attack range.
     */
    public isRanged(): boolean {
        return this.config.range >= 2;
    }

    /**
     * Share of shots that actually land, as a factor between zero and one.
     *
     * A recorded accuracy of zero means the game resolves that unit's projectiles through a
     * special case instead of the accuracy roll, so it is read as always hitting rather than
     * never hitting.
     *
     * @returns One for melee units and for units with no meaningful accuracy value.
     */
    public hitChance(): number {
        if (!this.isRanged() || this.config.accuracy <= 0) return 1;

        return Math.min(100, this.config.accuracy) / 100;
    }

    /**
     * Tells whether the unit has any offensive output at all.
     *
     * @returns False for units such as Monks that win fights by other means.
     */
    public canAttack(): boolean {
        return this.config.attack.displayValue > 0;
    }

    /**
     * Tells whether the unit belongs to an armour class.
     *
     * @param armourClass - Class to test membership for.
     * @returns True when the class is carried.
     */
    public belongsTo(armourClass: ArmourClass): boolean {
        return this.config.armour.belongsTo(armourClass);
    }

    /**
     * Applies a technology patch and returns the resulting stat line.
     *
     * @param patch - Additive stat deltas plus multipliers for speed and attack rate.
     * @returns A new stat line; the receiver is left untouched.
     */
    public patched(patch: UnitStatsPatch): UnitStats {
        return new UnitStats({
            ...this.config,
            hp: Math.round(this.config.hp * (patch.hpMultiplier ?? 1)) + (patch.hp ?? 0),
            range: this.config.range + (patch.range ?? 0),
            accuracy: Math.min(100, Math.max(patch.accuracyFloor ?? 0, this.config.accuracy) + (patch.accuracy ?? 0)),
            lineOfSight:
                Math.max(patch.lineOfSightFloor ?? 0, this.config.lineOfSight) + (patch.lineOfSight ?? 0),
            speed: this.config.speed * (patch.speedMultiplier ?? 1) + (patch.speed ?? 0),
            reloadTime: this.config.reloadTime * (patch.reloadTimeMultiplier ?? 1) + (patch.reloadTime ?? 0),
            blastWidth: this.config.blastWidth + (patch.blastWidth ?? 0),
            bonusDamageResistance: Math.max(this.config.bonusDamageResistance, patch.bonusDamageResistance ?? 0),
            minRange: Math.min(this.config.minRange, patch.minRangeCeiling ?? Number.POSITIVE_INFINITY),
            ignoresArmour: this.config.ignoresArmour || (patch.ignoresArmour ?? false),
            attack: this.config.attack.scaled(patch.attackMultipliers ?? []).plus(patch.attack ?? []),
            armour: this.config.armour.scaled(patch.armourMultipliers ?? []).plus(patch.armour ?? []),
        });
    }

    /**
     * Flattens the stat line into the scalars the interface displays.
     *
     * @returns A plain record safe to hand to the render layer.
     */
    public toRecord(): UnitStatsRecord {
        return {
            hp: this.config.hp,
            attack: this.config.attack.displayValue,
            meleeArmour: this.config.armour.melee,
            pierceArmour: this.config.armour.pierce,
            range: this.config.range,
            minRange: this.config.minRange,
            reloadTime: this.config.reloadTime,
            accuracy: this.hitChance() * 100,
            speed: this.config.speed,
            lineOfSight: this.config.lineOfSight,
            blastWidth: this.config.blastWidth,
        };
    }
}

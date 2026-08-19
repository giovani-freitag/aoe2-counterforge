import { Unit, type UnitConfig } from '../../src/domain/entities/unit.ts';
import type { ArmourClass } from '../../src/domain/enums/armour-class.ts';
import { ArmourProfile } from '../../src/domain/values/armour-profile.ts';
import { AttackProfile } from '../../src/domain/values/attack-profile.ts';
import type { ClassAmount } from '../../src/domain/values/class-amount.ts';
import { ResourceCost, type ResourceCostConfig } from '../../src/domain/values/resource-cost.ts';
import { UnitStats } from '../../src/domain/values/unit-stats.ts';

export interface StatsOverrides {
    hp?: number;
    attacks?: Partial<Record<ArmourClass, number>>;
    armours?: Partial<Record<ArmourClass, number>>;
    range?: number;
    minRange?: number;
    reloadTime?: number;
    accuracy?: number;
    blastWidth?: number;
    speed?: number;
    lineOfSight?: number;
}

export interface UnitOverrides extends StatsOverrides {
    key?: string;
    id?: number;
    classId?: number;
    category?: UnitConfig['category'];
    tags?: readonly string[];
    age?: UnitConfig['age'];
    buildings?: string[];
    cost?: ResourceCostConfig;
    trainTime?: number;
    line?: string;
    civs?: readonly string[];
    uniqueTo?: string | null;
}

function toEntries(values: Partial<Record<ArmourClass, number>>): ClassAmount[] {
    return Object.entries(values).map(([armourClass, amount]) => ({
        armourClass: armourClass as ArmourClass,
        amount: amount ?? 0,
    }));
}

/**
 * Builds a stat line with only the fields a test cares about.
 *
 * @param overrides - Values that differ from the neutral defaults.
 * @returns A stat line usable by the combat services.
 */
export function makeStats(overrides: StatsOverrides = {}): UnitStats {
    return new UnitStats({
        hp: overrides.hp ?? 100,
        attack: new AttackProfile({ entries: toEntries(overrides.attacks ?? { 'base-melee': 10 }) }),
        armour: new ArmourProfile({
            entries: toEntries(overrides.armours ?? { 'base-melee': 0, 'base-pierce': 0 }),
        }),
        range: overrides.range ?? 0,
        minRange: overrides.minRange ?? 0,
        reloadTime: overrides.reloadTime ?? 2,
        accuracy: overrides.accuracy ?? 100,
        blastWidth: overrides.blastWidth ?? 0,
        speed: overrides.speed ?? 1,
        lineOfSight: overrides.lineOfSight ?? 5,
    });
}

/**
 * Builds a unit with only the fields a test cares about.
 *
 * @param overrides - Values that differ from the neutral defaults.
 * @returns A unit entity wired with the matching stat line.
 */
export function makeUnit(overrides: UnitOverrides = {}): Unit {
    const key = overrides.key ?? 'test-unit';

    return new Unit({
        id: overrides.id ?? 1,
        classId: overrides.classId ?? 6,
        key,
        icon: null,
        category: overrides.category ?? 'infantry',
        tags: overrides.tags ?? ['melee'],
        age: overrides.age ?? 2,
        buildings: overrides.buildings ?? ['barracks'],
        cost: new ResourceCost(overrides.cost ?? { food: 60, gold: 20 }),
        trainTime: overrides.trainTime ?? 20,
        stats: makeStats(overrides),
        line: overrides.line ?? key,
        upgradesFrom: null,
        upgradesTo: [],
        upgrade: null,
        civs: overrides.civs ?? ['britons'],
        uniqueTo: overrides.uniqueTo ?? null,
    });
}

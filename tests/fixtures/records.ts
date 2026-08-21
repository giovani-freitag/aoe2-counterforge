import type { ArmourClass } from '../../src/domain/enums/armour-class.ts';
import type {
    CivilizationRecord,
    ClassAmountRecord,
    CostRecord,
    TechEffectRecord,
    TechnologyRecord,
    UnitRecord,
} from '../../src/data/records.ts';

const NO_COST: CostRecord = { food: 0, wood: 0, gold: 0, stone: 0 };

function toClassAmounts(values: Partial<Record<ArmourClass, number>>): ClassAmountRecord[] {
    return Object.entries(values).map(([armourClass, amount]) => ({ class: armourClass, amount: amount ?? 0 }));
}

export interface UnitRecordOverrides {
    key: string;
    id?: number;
    classId?: number;
    category?: string;
    tags?: string[];
    age?: number;
    buildings?: string[];
    cost?: Partial<CostRecord>;
    trainTime?: number;
    hp?: number;
    attacks?: Partial<Record<ArmourClass, number>>;
    armours?: Partial<Record<ArmourClass, number>>;
    range?: number;
    reloadTime?: number;
    speed?: number;
    civs?: string[];
    line?: string;
    upgradesFrom?: string | null;
    upgradesTo?: string[];
    inTechTree?: boolean;
}

/**
 * Builds a raw unit row the catalog assembler can consume.
 *
 * @param overrides - Values that differ from the neutral defaults; the key is required.
 * @returns A complete unit record.
 */
export function unitRecord(overrides: UnitRecordOverrides): UnitRecord {
    return {
        id: overrides.id ?? 1,
        classId: overrides.classId ?? 6,
        key: overrides.key,
        icon: null,
        category: overrides.category ?? 'infantry',
        tags: overrides.tags ?? ['melee'],
        age: overrides.age ?? 2,
        buildings: overrides.buildings ?? ['barracks'],
        upgradeTechId: null,
        upgradeCost: null,
        upgradeResearchTime: null,
        cost: { ...NO_COST, ...overrides.cost },
        trainTime: overrides.trainTime ?? 20,
        hp: overrides.hp ?? 100,
        baseArmour: 10000,
        bonusDamageResistance: 0,
        extraProjectiles: 0,
        secondaryAttacks: [],
        ignoresArmour: false,
        resistsArmourIgnore: false,
        attacks: toClassAmounts(overrides.attacks ?? { 'base-melee': 10 }),
        armours: toClassAmounts(overrides.armours ?? { 'base-melee': 0, 'base-pierce': 0 }),
        range: overrides.range ?? 0,
        minRange: 0,
        reloadTime: overrides.reloadTime ?? 2,
        accuracy: 100,
        blastWidth: 0,
        speed: overrides.speed ?? 1,
        lineOfSight: 5,
        civs: overrides.civs ?? ['britons'],
        uniqueTo: null,
        upgradesFrom: overrides.upgradesFrom ?? null,
        upgradesTo: overrides.upgradesTo ?? [],
        line: overrides.line ?? overrides.key,
        inTechTree: overrides.inTechTree ?? true,
    };
}

export interface TechnologyRecordOverrides {
    effects?: TechEffectRecord[];
    key: string;
    id?: number;
    age?: number;
    building?: string;
    cost?: Partial<CostRecord>;
    researchTime?: number;
    civs?: string[];
}

/**
 * Builds a raw technology row the catalog assembler can consume.
 *
 * @param overrides - Values that differ from the neutral defaults; the key is required.
 * @returns A complete technology record.
 */
export function technologyRecord(overrides: TechnologyRecordOverrides): TechnologyRecord {
    return {
        id: overrides.id ?? 1,
        key: overrides.key,
        icon: null,
        age: overrides.age ?? 2,
        building: overrides.building ?? 'blacksmith',
        cost: { ...NO_COST, ...overrides.cost },
        researchTime: overrides.researchTime ?? 30,
        effects: overrides.effects ?? [],
        civs: overrides.civs ?? ['britons'],
    };
}

/**
 * Builds a raw civilization row the catalog assembler can consume.
 *
 * @param key - Civilization slug.
 * @param overrides - Unique unit and technology lists.
 * @returns A complete civilization record.
 */
export function civilizationRecord(
    key: string,
    overrides: Partial<
        Pick<CivilizationRecord, 'uniqueUnits' | 'uniqueTechs' | 'bonusEffects' | 'teamBonusEffects'>
    > = {},
): CivilizationRecord {
    return {
        key,
        icon: key,
        era: 'base',
        uniqueUnits: overrides.uniqueUnits ?? [],
        uniqueTechs: overrides.uniqueTechs ?? [],
        bonusEffects: overrides.bonusEffects ?? [],
        teamBonusEffects: overrides.teamBonusEffects ?? [],
    };
}

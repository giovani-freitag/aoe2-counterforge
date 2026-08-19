/** Raw record shapes emitted by the extraction scripts. */

export interface CostRecord {
    food: number;
    wood: number;
    gold: number;
    stone: number;
}

export interface ClassAmountRecord {
    class: string;
    amount: number;
}

export interface UnitRecord {
    id: number;
    key: string;
    /** Class the game files the unit under; technologies target these, not our categories. */
    classId: number;
    icon: number | null;
    category: string;
    tags: string[];
    age: number;
    buildings: string[];
    upgradeTechId: number | null;
    upgradeCost: CostRecord | null;
    upgradeResearchTime: number | null;
    cost: CostRecord;
    trainTime: number;
    hp: number;
    attacks: ClassAmountRecord[];
    armours: ClassAmountRecord[];
    range: number;
    minRange: number;
    reloadTime: number;
    accuracy: number;
    blastWidth: number;
    speed: number;
    lineOfSight: number;
    civs: string[];
    uniqueTo: string | null;
    upgradesFrom: string | null;
    upgradesTo: string[];
    line: string;
}

/** One change a technology makes, exactly as the game's own effect table states it. */
export interface TechEffectRecord {
    mode: 'set' | 'add' | 'multiply';
    /** The one unit it applies to, or null when it applies to a whole class. */
    unit: number | null;
    /** The class it applies to, or null when it names a single unit. */
    unitClass: number | null;
    attribute: string;
    value: number;
    /** For attack and armour, which damage class the value belongs to. */
    damageClass?: string;
    /** Age the change arrives in, for a bonus the game hands out once per age. */
    age?: number;
}

export interface TechnologyRecord {
    id: number;
    key: string;
    icon: number | null;
    age: number;
    building: string;
    cost: CostRecord;
    researchTime: number;
    civs: string[];
    effects: TechEffectRecord[];
}

/** A technology that speeds up the gathering itself, for one kind of work. */
export interface GatherUpgradeRecord {
    tech: string;
    /** Resource the work produces, and for food the source it comes from. */
    resource: string;
    foodSource?: string;
    multiplier: number;
}

/** A technology that changes how much a villager carries, or how fast it walks back. */
export interface CarryUpgradeRecord {
    tech: string;
    /** Fraction of the base capacity added. */
    carryPercent?: number;
    carryFlat?: number;
    speedMultiplier?: number;
    /** Kinds of work it reaches; absent means every villager. */
    resources?: string[];
    foodSources?: string[];
}

/** A technology that puts more food into a farm before it has to be rebuilt. */
export interface FarmUpgradeRecord {
    tech: string;
    extraFood: number;
}

/** The numbers behind the villager planner, read from the game rather than written by hand. */
export interface EconomyRecord {
    villagerWalkSpeed: number;
    farmFood: number;
    farmWoodCost: number;
    gatherUpgrades: GatherUpgradeRecord[];
    carryUpgrades: CarryUpgradeRecord[];
    farmUpgrades: FarmUpgradeRecord[];
}

export interface CivilizationRecord {
    key: string;
    icon: string;
    era: string;
    uniqueUnits: string[];
    uniqueTechs: string[];
    /** What the civilization is simply given, with no technology to research. */
    bonusEffects: TechEffectRecord[];
}

export interface UnitTextRecord {
    name: string;
    role: string;
    strongVs: string;
    weakVs: string;
    upgradesHint: string;
}

export interface TechnologyTextRecord {
    name: string;
    description: string;
}

export interface CivilizationSectionRecord {
    title: string;
    items: string[];
}

export interface CivilizationTextRecord {
    name: string;
    intro: string;
    bonuses: string[];
    sections: CivilizationSectionRecord[];
}

export interface GameStringBundle {
    units: Record<string, UnitTextRecord>;
    techs: Record<string, TechnologyTextRecord>;
    civs: Record<string, CivilizationTextRecord>;
}

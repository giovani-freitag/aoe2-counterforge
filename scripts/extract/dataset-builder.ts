import type {
    CarryUpgradeRecord,
    CivilizationRecord,
    CivilizationTextRecord,
    ClassAmountRecord,
    CostRecord,
    EconomyRecord,
    FarmUpgradeRecord,
    GatherUpgradeRecord,
    TechEffectRecord,
    TechnologyRecord,
    TechnologyTextRecord,
    UnitRecord,
    UnitTextRecord,
    VillagerJobRecord,
} from '../../src/data/records.ts';
import type { CivilizationTechTree, TechTreeNode } from './game-install.ts';
import { cleanText, parseCivilizationHelp, parseUnitHelp, slug } from './game-text.ts';
import { UNIT_TYPE, type ClassAmount, type GenieData, type GenieUnit } from './genie-dat.ts';

/** One civilization as the game's own metadata file describes it. */
export interface CivilizationMeta {
    internal_name: string;
    tech_tree_name: string;
    name_string_id: number;
    emblem_image_path?: string;
    era: string;
}

export interface DatasetBuilderConfig {
    game: GenieData;
    trees: CivilizationTechTree[];
    civilizations: CivilizationMeta[];
    /** Localized string tables, keyed by the locale tag the application uses. */
    strings: Map<string, Map<number, string>>;
    fallbackLocale: string;
    /**
     * Era the guide covers.
     *
     * The separate campaign mode reuses the same node identifiers for entirely different units,
     * so mixing its civilizations in would overwrite the roster with unrelated records.
     */
    era: string;
}

export interface GeneratedDataset {
    units: UnitRecord[];
    technologies: TechnologyRecord[];
    civilizations: CivilizationRecord[];
    economy: EconomyRecord;
    strings: Map<string, { units: Record<string, UnitTextRecord>; techs: Record<string, TechnologyTextRecord>; civs: Record<string, CivilizationTextRecord> }>;
}

/** Offset between a name string and the help text that describes it. */
const HELP_OFFSET = 21000;

/** Offset between a civilization name string and its bonus list. */
const CIVILIZATION_HELP_OFFSET = 109879;

const RESOURCE_BY_TYPE: Record<number, keyof CostRecord> = { 0: 'food', 1: 'wood', 2: 'stone', 3: 'gold' };

const BUILDINGS: Record<number, string> = {
    12: 'barracks',
    45: 'dock',
    49: 'siege-workshop',
    50: 'farm',
    68: 'mill',
    70: 'house',
    72: 'palisade-wall',
    79: 'watch-tower',
    82: 'castle',
    84: 'market',
    87: 'archery-range',
    101: 'stable',
    103: 'blacksmith',
    104: 'monastery',
    109: 'town-center',
    117: 'stone-wall',
    155: 'fortified-wall',
    209: 'university',
    234: 'guard-tower',
    235: 'keep',
    236: 'bombard-tower',
    276: 'wonder',
    487: 'gate',
    562: 'lumber-camp',
    584: 'mining-camp',
    598: 'outpost',
    621: 'town-center',
    792: 'palisade-gate',
    1021: 'feitoria',
    1251: 'krepost',
    1665: 'donjon',
    1734: 'folwark',
    1754: 'caravanserai',
    1806: 'fortified-church',
    1808: 'mule-cart',
    1889: 'pasture',
    2556: 'settlement',
};

/** Armour and attack class ids that carry meaning for the damage model. */
const CLASSES: Record<number, string> = {
    0: 'unused-0',
    1: 'infantry',
    2: 'capital-ship',
    3: 'base-pierce',
    4: 'base-melee',
    5: 'war-elephant',
    8: 'cavalry',
    11: 'all-buildings',
    13: 'stone-defense',
    14: 'predator-animal',
    15: 'archer',
    16: 'ship',
    17: 'ram',
    18: 'tree',
    19: 'unique-unit',
    20: 'siege-weapon',
    21: 'standard-building',
    22: 'wall-gate',
    23: 'gunpowder',
    24: 'boar',
    25: 'monk',
    26: 'castle',
    27: 'spearman',
    28: 'cavalry-archer',
    29: 'eagle-warrior',
    30: 'camel',
    31: 'unused-31',
    32: 'condottiero',
    34: 'fishing-ship',
    35: 'mameluke',
    36: 'hero-king',
    37: 'heavy-siege',
    38: 'skirmisher',
    39: 'royal-heir',
    40: 'unused-40',
    41: 'fire-ship',
    60: 'ship-secondary',
};

const BASE_CLASSES = ['base-melee', 'base-pierce'];

/**
 * The attributes an effect command can change that this guide has a name for.
 *
 * The game's table carries dozens more — graphics, projectiles, terrain rules — that say nothing
 * about how a unit fights, so they are left where they are.
 */
const ATTRIBUTES: Record<number, string> = {
    0: 'hp',
    1: 'lineOfSight',
    5: 'speed',
    8: 'armour',
    9: 'attack',
    10: 'reloadTime',
    11: 'accuracy',
    12: 'range',
    13: 'workRate',
    14: 'carryCapacity',
    19: 'ballistics',
    20: 'minRange',
    22: 'blastWidth',
    24: 'bonusDamageResistance',
    63: 'combatAbility',
    100: 'cost',
    101: 'trainTime',
    102: 'projectiles',
    103: 'costFood',
    104: 'costWood',
    105: 'costGold',
    106: 'costStone',
    109: 'regeneration',
    110: 'population',
    118: 'damageReflection',
};

/** Commands that change a number; the rest enable units, swap graphics or rename things. */
/**
 * Commands that change a number, and the same three again for a change the whole team receives.
 *
 * The file writes a team-wide change as the ordinary command plus ten. What it does to a unit is
 * identical; the difference is who else gets it, which the technology's own description says.
 */
const MODES: Record<number, TechEffectRecord['mode']> = {
    0: 'set',
    4: 'add',
    5: 'multiply',
    10: 'set',
    14: 'add',
    15: 'multiply',
};

/** Bits of the combat ability field: whether a unit's attacks skip armour, and whether they can be. */
const IGNORES_ARMOUR = 1;
const RESISTS_ARMOUR_IGNORE = 2;

/** Attack and armour pack the damage class into the value: class times 256, plus the amount. */
const PACKED = new Set(['attack', 'armour']);

/** The packed low byte, which a multiplying command writes as a whole percentage. */
const LOW_BYTE = 0xff;
const PERCENT = 100;

/**
 * Splits a packed attack or armour value into the class it names and what it does to it.
 *
 * The sign belongs to the amount, not to the class: the file writes a reduction as a negative
 * whole, so the class has to be read from the magnitude or a technology that takes damage away
 * lands on a class that does not exist and is thrown away. A multiplying command uses the same
 * two halves, except its low byte is a percentage rather than an amount.
 *
 * @param raw - The value exactly as the file stores it.
 * @param mode - How the command applies the value.
 * @returns The class id and the value in the guide's own terms.
 */
function unpack(raw: number, mode: TechEffectRecord['mode']): { classId: number; value: number } {
    const whole = Math.trunc(raw);
    const magnitude = Math.abs(whole);
    const low = magnitude & LOW_BYTE;

    return {
        classId: magnitude >> 8,
        value: mode === 'multiply' ? low / PERCENT : Math.sign(whole) * low,
    };
}

/**
 * Decimals kept from the file's 32-bit floats.
 *
 * The stored value of a speed the designers set to 0.96 reads back as 0.9599999785423279, and
 * carrying that noise into the dataset would only make every number harder to read.
 */
const FLOAT_DECIMALS = 3;
const CASTLE_LIKE = new Set([82, 1251, 1665]);

/**
 * What each villager gathers, read off the short name the designers gave the unit.
 *
 * The game keeps one unit per job — VMLUM is the male lumberjack, VFFAR the female farmer — and
 * an economy technology names those units directly, so this is what turns an effect into a kind
 * of work.
 */
const VILLAGER_JOBS: Record<string, { resource: string; foodSource?: string }> = {
    LUM: { resource: 'wood' },
    GLD: { resource: 'gold' },
    MIN: { resource: 'stone' },
    FAR: { resource: 'food', foodSource: 'farm' },
    SHE: { resource: 'food', foodSource: 'sheep' },
    FOR: { resource: 'food', foodSource: 'berries' },
    HUN: { resource: 'food', foodSource: 'hunt' },
    FIS: { resource: 'food', foodSource: 'shore-fish' },
};

/** Effect command types the economy reads, which are not the ones a soldier cares about. */
const RESOURCE_COMMAND = 1;

/** Second field of a resource command: zero sets the value, one adds to it. */
const ADD_MODE = 1;
const ADD_COMMAND = 4;
const MULTIPLY_COMMAND = 5;

/** Attribute and resource slots the villager planner depends on. */
const WORK_RATE = 13;
const CARRY_CAPACITY = 14;
const WALK_SPEED = 5;
const FARM_FOOD_SLOT = 36;

/** Command type that switches a unit on, with the second field set for "make available". */
const ENABLE_COMMAND = 2;
const ENABLE_MODE = 1;

/** Class every villager belongs to, which is how a technology reaches all of them at once. */
const CIVILIAN_CLASS = 4;

/** The age advances, in the order the game numbers the ages. */
const AGE_NAMES = ['Dark Age', 'Feudal Age', 'Castle Age', 'Imperial Age'];

interface LineUpgrade {
    techIndex: number;
    cost: CostRecord;
    researchTime: number;
}

/** Assembles the shipped dataset out of the pieces read from the game. */
export class DatasetBuilder {
    private readonly config: DatasetBuilderConfig;

    /** Age of every age advance, resolved once because every bonus asks for it. */
    private ages: Map<number, number> | null = null;
    private shooters: Map<number, number[]> | null = null;

    constructor(config: DatasetBuilderConfig) {
        this.config = config;
    }

    /**
     * Produces every record and every localized string the application ships.
     *
     * @returns The dataset, ready to be written to disk.
     */
    public build(): GeneratedDataset {
        const nodes = this.collectNodes();
        const upgrades = this.lineUpgrades(nodes);
        const stats = this.referenceUnits();

        const units: UnitRecord[] = [];
        const unitKeyById = new Map<number, string>();
        const usedKeys = new Set<string>();
        const unitStrings = this.emptyStringTables<UnitTextRecord>();

        for (const [id, entry] of [...nodes.units].sort((left, right) => left[0] - right[0])) {
            const unit = stats.get(id);
            if (!unit) continue;

            const englishName = this.text(this.config.fallbackLocale, entry.node['Name String ID']);
            const key = this.uniqueKey(englishName || `unit-${id}`, id, usedKeys);
            unitKeyById.set(id, key);
            units.push(this.unitRecord({ id, key, unit, entry, upgrades }));

            for (const locale of this.config.strings.keys()) {
                const help = parseUnitHelp(this.raw(locale, unit.nameStringId + HELP_OFFSET));
                unitStrings.get(locale)?.set(key, {
                    ...help,
                    name: this.text(locale, entry.node['Name String ID']) || englishName,
                });
            }
        }

        for (const found of this.offTreeUnits(nodes, stats)) {
            const englishName = this.text(this.config.fallbackLocale, found.unit.nameStringId);
            const key = this.uniqueKey(englishName || `unit-${String(found.unit.id)}`, found.unit.id, usedKeys);
            unitKeyById.set(found.unit.id, key);
            units.push(
                this.unitRecord({
                    id: found.unit.id,
                    key,
                    unit: found.unit,
                    entry: found.entry,
                    upgrades,
                    inTechTree: false,
                }),
            );

            for (const locale of this.config.strings.keys()) {
                const help = parseUnitHelp(this.raw(locale, found.unit.nameStringId + HELP_OFFSET));
                unitStrings.get(locale)?.set(key, {
                    ...help,
                    name: this.text(locale, found.unit.nameStringId) || englishName,
                });
            }
        }

        const merged = this.mergeDuplicates(units, unitStrings);
        this.linkLines(merged.units, merged.aliases);
        for (const table of unitStrings.values()) {
            for (const key of table.keys()) if (!merged.keys.has(key)) table.delete(key);
        }

        const techs = this.technologyRecords(nodes, usedKeys);
        const civilizations = this.civilizationRecords(nodes, unitKeyById, merged, techs.keyById, upgrades);

        return {
            units: merged.units,
            technologies: techs.records,
            civilizations: civilizations.records,
            economy: this.economyRecord(techs.keyById),
            strings: this.stringBundles(unitStrings, techs.strings, civilizations.strings),
        };
    }

    private raw(locale: string, id: number): string {
        return this.config.strings.get(locale)?.get(id) ?? '';
    }

    private text(locale: string, id: number): string {
        return cleanText(this.raw(locale, id));
    }

    private emptyStringTables<T>(): Map<string, Map<string, T>> {
        return new Map([...this.config.strings.keys()].map((locale) => [locale, new Map<string, T>()]));
    }

    private uniqueKey(name: string, id: number, used: Set<string>): string {
        const base = slug(name) || `unit-${id}`;
        const key = used.has(base) ? `${base}-${id}` : base;
        used.add(key);

        return key;
    }

    /**
     * Indexes every tech tree node by its id.
     *
     * A few civilizations swap a shared building for their own, so the node a single civilization
     * contributes is only representative when most civilizations agree with it.
     */
    private collectNodes(): CollectedNodes {
        const units = new Map<number, NodeEntry>();
        const techs = new Map<number, NodeEntry>();
        const byCiv = new Map<string, CivilizationTechTree>();
        const covered = new Set(this.civilizations().map((civ) => civ.tech_tree_name));

        for (const tree of this.config.trees) {
            if (!covered.has(tree.civ_id)) continue;

            byCiv.set(tree.civ_id, tree);
            const civKey = this.civKeyOf(tree.civ_id);

            for (const node of [...tree.civ_techs_units, ...tree.civ_techs_buildings]) {
                const registry = node['Use Type'] === 'Unit' ? units : node['Use Type'] === 'Tech' ? techs : null;
                if (!registry) continue;

                const entry = registry.get(node['Node ID']) ?? { node, candidates: [], civs: [] };
                entry.candidates.push(node);
                if (node['Node Status'] !== 'NotAvailable') entry.civs.push(civKey);
                registry.set(node['Node ID'], entry);
            }
        }

        for (const registry of [units, techs]) {
            for (const entry of registry.values()) {
                entry.node = this.representative(entry.candidates);
                entry.civs = [...new Set(entry.civs)].sort();
            }
        }

        return { units, techs, byCiv };
    }

    private representative(candidates: readonly TechTreeNode[]): TechTreeNode {
        const tally = new Map<number, number>();
        for (const node of candidates) tally.set(node['Building ID'], (tally.get(node['Building ID']) ?? 0) + 1);

        const [modal] = [...tally].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0];

        return candidates.find((node) => node['Building ID'] === modal) ?? candidates[0];
    }

    /** The civilizations this dataset covers, in the game's own order. */
    private civilizations(): CivilizationMeta[] {
        return this.config.civilizations.filter((civ) => civ.era === this.config.era && civ.emblem_image_path);
    }

    private civKeyOf(techTreeName: string): string {
        const meta = this.config.civilizations.find((civ) => civ.tech_tree_name === techTreeName);

        return meta ? this.civKey(meta) : slug(techTreeName);
    }

    /**
     * Identifier of a civilization, taken from the name players actually see.
     *
     * A few civilizations were renamed after release and the game kept the old internal name, so
     * keying on it would leave the guide talking about civilizations that no longer exist.
     */
    private civKey(meta: CivilizationMeta): string {
        return slug(this.text(this.config.fallbackLocale, meta.name_string_id) || meta.internal_name);
    }

    /** Emblem file the game ships for a civilization, which keeps the pre-rename name. */
    private civIcon(meta: CivilizationMeta): string {
        const emblem = meta.emblem_image_path?.split('/').pop()?.replace(/.png$/i, '');

        return slug(emblem ?? meta.internal_name);
    }

    /** Stats come from one civilization; the game stores the same numbers in every roster. */
    private referenceUnits(): Map<number, GenieUnit> {
        const civ = this.config.game.civilizations[1] ?? this.config.game.civilizations[0];

        return civ.units;
    }

    /**
     * Maps every unit reached by an upgrade to the technology that performs it.
     *
     * Each tech tree node names its own trigger, which is the mapping that stays correct: the
     * data file also carries retired copies of the same upgrade with costs no player can pay. A
     * few naval nodes still point at such a retired copy, and there the tech listed as their
     * prerequisite is the one actually sold at the dock.
     *
     * @param nodes - The indexed tech tree nodes.
     * @returns The upgrade behind each unit, keyed by the unit it produces.
     */
    private lineUpgrades(nodes: CollectedNodes): Map<number, LineUpgrade> {
        const upgrades = new Map<number, LineUpgrade>();

        for (const [id, entry] of nodes.units) {
            const upgrade = this.researchableUpgrade(entry.node);
            if (upgrade) upgrades.set(id, upgrade);
        }

        return this.shareReplacedUpgrades(nodes, upgrades);
    }

    /**
     * Lends the price of an upgrade to the unit that takes its place.
     *
     * A civilization whose own unit replaces one step of a shared line still buys the same
     * research, and the tech tree says so by pointing that node at a free stand-in of the
     * upgrade instead of at the upgrade itself.
     *
     * @param nodes - The indexed tech tree nodes.
     * @param upgrades - The upgrades found so far, extended in place.
     * @returns The same map, with the replacements priced.
     */
    private shareReplacedUpgrades(
        nodes: CollectedNodes,
        upgrades: Map<number, LineUpgrade>,
    ): Map<number, LineUpgrade> {
        const byPredecessor = new Map<number, LineUpgrade>();
        for (const [id, entry] of nodes.units) {
            const upgrade = upgrades.get(id);
            const predecessor = entry.node['Link ID'];
            if (upgrade && predecessor !== undefined) byPredecessor.set(predecessor, upgrade);
        }

        for (const [id, entry] of nodes.units) {
            if (upgrades.has(id) || entry.node['Link Node Type'] !== 'UnitUpgrade') continue;

            const shared = byPredecessor.get(entry.node['Link ID'] ?? -1);
            if (shared) upgrades.set(id, shared);
        }

        return upgrades;
    }

    private researchableUpgrade(node: TechTreeNode): LineUpgrade | null {
        // A plain unit node lists the technology that unlocks it, which is not an upgrade of
        // anything; only a node that replaces an earlier unit can fall back to its prerequisite.
        const prerequisites =
            node['Node Type'] === 'UnitUpgrade'
                ? (node['Prerequisite IDs'] ?? []).filter(
                      (_, index) => node['Prerequisite Types']?.[index] === 'Tech',
                  )
                : [];

        for (const techId of [node['Trigger Tech ID'], ...prerequisites]) {
            if (techId === undefined || techId < 0) continue;

            const tech = this.config.game.technologies[techId];
            if (!tech || tech.researchTime <= 0) continue;

            return { techIndex: techId, cost: this.cost(tech.costs), researchTime: tech.researchTime };
        }

        return null;
    }

    private round(value: number): number {
        return Number(value.toFixed(FLOAT_DECIMALS));
    }

    private cost(costs: readonly { type: number; amount: number }[]): CostRecord {
        const record: CostRecord = { food: 0, wood: 0, gold: 0, stone: 0 };
        for (const entry of costs) {
            const resource = RESOURCE_BY_TYPE[entry.type];
            if (resource) record[resource] = entry.amount;
        }

        return record;
    }

    private classList(entries: readonly ClassAmount[]): ClassAmountRecord[] {
        const byClass = new Map<string, number>();
        for (const entry of entries) {
            const name = CLASSES[entry.class];
            if (!name) continue;

            byClass.set(name, Math.max(byClass.get(name) ?? entry.amount, entry.amount));
        }

        return [...byClass].map(([armourClass, amount]) => ({ class: armourClass, amount }));
    }

    /**
     * Units a game produces that no tech tree lists.
     *
     * A tech tree is a menu, and one soldier is not on it: the Xolotl Warrior a converted Stable
     * turns out. What says so is a technology that switches the unit on — a statement in the file
     * that a game reaches it, which the scenario-editor leftovers around it never carry.
     *
     * @param nodes - The indexed tech tree nodes.
     * @param stats - The reference roster the attributes come from.
     * @returns Each such unit with a stand-in node describing where it appears.
     */
    private offTreeUnits(nodes: CollectedNodes, stats: Map<number, GenieUnit>): SwitchedOnUnit[] {
        // Every node of every tree, buildings included: a tech switches those on too, and a
        // building is not a unit however creatable the file says it is.
        const inTree = new Set(
            [...nodes.byCiv.values()].flatMap((tree) =>
                [...tree.civ_techs_units, ...tree.civ_techs_buildings].map((node) => node['Node ID']),
            ),
        );
        const switchedOn = new Map<number, number>();

        this.config.game.technologies.forEach((tech, id) => {
            for (const command of this.config.game.effects[tech.effectId]?.commands ?? []) {
                if (command.type === ENABLE_COMMAND && command.unitClass === ENABLE_MODE) {
                    switchedOn.set(command.unit, id);
                }
            }
        });

        const treeBuildings = new Set(
            [...nodes.byCiv.values()].flatMap((tree) => tree.civ_techs_units.map((node) => node['Building ID'])),
        );

        const found: SwitchedOnUnit[] = [];
        for (const [unitId, techId] of switchedOn) {
            const unit = stats.get(unitId);
            const building = unit?.trainLocationIds.find((id) => treeBuildings.has(id));

            if (!unit || unit.isHero || inTree.has(unitId) || building === undefined) continue;
            if (unit.type !== UNIT_TYPE.creatable || unit.classId === CIVILIAN_CLASS) continue;
            if (this.text(this.config.fallbackLocale, unit.nameStringId) === '') continue;

            // The unit stands in for what this civilization cannot train at that building.
            const civs = this.civsWithoutTheirOwn(unit, building);
            if (civs.length === 0) continue;

            found.push({
                unit,
                entry: {
                    node: {
                        Name: '',
                        'Node ID': unit.id,
                        'Name String ID': unit.nameStringId,
                        'Node Type': 'Unit',
                        'Link Node Type': 'BuildingTech',
                        'Use Type': 'Unit',
                        'Node Status': 'ResearchedCompleted',
                        'Age ID': this.ageOf(techId) ?? 1,
                        'Building ID': building,
                        'Picture Index': unit.iconId,
                    },
                    candidates: [],
                    civs,
                },
            });
        }

        return found;
    }

    /**
     * The civilizations a stand-in unit is actually for.
     *
     * The building trains whatever its owner knows how to train, so a unit that stands in at the
     * Stable only ever appears for the civilizations whose Stable has no cavalry of their own.
     *
     * @param unit - The unit that stands in.
     * @param building - Where it is produced.
     * @returns Slugs of the civilizations with nothing of that kind at that building.
     */
    private civsWithoutTheirOwn(unit: GenieUnit, building: number): string[] {
        const owners = new Set<string>();

        for (const meta of this.civilizations()) {
            const tree = this.config.trees.find((entry) => entry.civ_id === meta.tech_tree_name);
            if (!tree) continue;

            const trains = tree.civ_techs_units.some(
                (node) =>
                    node['Building ID'] === building &&
                    node['Node Status'] !== 'NotAvailable' &&
                    this.referenceUnits().get(node['Node ID'])?.classId === unit.classId,
            );
            if (!trains) owners.add(this.civKey(meta));
        }

        return [...owners].sort();
    }

    /**
     * The villager planner's inputs, read from the same effect table as everything else.
     *
     * @param techKeyById - Slug of every technology that reached the guide, by its id in the file.
     * @returns Gather, carrying and farm technologies, with the two figures they act on.
     */
    /**
     * What the game says about each kind of villager work.
     *
     * One unit record per job carries the rate and the load: the forager gathers at 0.31 a second
     * and carries ten, the hunter at 0.41 and carries thirty-five. Both are read rather than
     * assumed, and the walk to the drop-off is the only part of a trip the file is silent about.
     *
     * @returns One entry per job the planner knows, in the order the job table declares them.
     */
    private villagerJobs(): VillagerJobRecord[] {
        const byJob = new Map<string, VillagerJobRecord>();

        for (const unit of this.referenceUnits().values()) {
            const job = VILLAGER_JOBS[unit.internalName.slice(2, 5)];
            if (!job || !/^V[MF]/.test(unit.internalName) || unit.workRate <= 0) continue;

            const slot = `${job.resource}:${job.foodSource ?? ''}`;
            if (byJob.has(slot)) continue;

            byJob.set(slot, {
                ...job,
                gatherRate: this.round(unit.workRate),
                carryCapacity: unit.resourceCapacity,
            });
        }

        return [...byJob.values()];
    }

    private economyRecord(techKeyById: Map<number, string>): EconomyRecord {
        const gatherUpgrades: GatherUpgradeRecord[] = [];
        const carryUpgrades: CarryUpgradeRecord[] = [];
        const farmUpgrades: FarmUpgradeRecord[] = [];

        for (const [id, key] of techKeyById) {
            const commands = this.config.game.effects[this.config.game.technologies[id]?.effectId ?? -1]?.commands;
            if (!commands) continue;

            const carry: CarryUpgradeRecord = { tech: key };
            const jobs = new Map<string, GatherUpgradeRecord>();
            let extraFood = 0;

            for (const command of commands) {
                const job = this.jobOf(command.unit);

                if (command.type === MULTIPLY_COMMAND && command.attribute === WORK_RATE && job && command.value !== 1) {
                    const slot = `${job.resource}:${job.foodSource ?? ''}`;
                    jobs.set(slot, { tech: key, ...job, multiplier: this.round(command.value) });
                }

                // A fishing ship also carries and also walks home; only a villager belongs here.
                const villagers = command.unitClass === CIVILIAN_CLASS || job !== null;

                if (villagers && command.attribute === CARRY_CAPACITY && command.type === MULTIPLY_COMMAND) {
                    carry.carryPercent = this.round(command.value - 1);
                    if (job) this.restrict(carry, job);
                }

                if (villagers && command.attribute === CARRY_CAPACITY && command.type === ADD_COMMAND) {
                    if (command.value !== 0) carry.carryFlat = command.value;
                    if (job && command.value !== 0) this.restrict(carry, job);
                }

                if (villagers && command.attribute === WALK_SPEED && command.type === MULTIPLY_COMMAND) {
                    carry.speedMultiplier = this.round(command.value);
                }

                if (
                    command.type === RESOURCE_COMMAND &&
                    command.unit === FARM_FOOD_SLOT &&
                    command.unitClass === ADD_MODE
                ) {
                    extraFood += command.value;
                }
            }

            gatherUpgrades.push(...jobs.values());
            if (carry.carryPercent !== undefined || carry.carryFlat !== undefined || carry.speedMultiplier) {
                carryUpgrades.push(carry);
            }
            if (extraFood > 0) farmUpgrades.push({ tech: key, extraFood });
        }

        return {
            jobs: this.villagerJobs(),
            villagerWalkSpeed: this.round(this.villager()?.speed ?? 0),
            farmFood: this.config.game.civilizations[1]?.resources[FARM_FOOD_SLOT] ?? 0,
            farmWoodCost: this.cost(this.byInternalName('FARM')?.costs ?? []).wood,
            gatherUpgrades,
            carryUpgrades,
            farmUpgrades,
        };
    }

    /** The kind of work a villager unit does, or null when the unit is not a villager. */
    private jobOf(unitId: number): { resource: string; foodSource?: string } | null {
        const name = this.referenceUnits().get(unitId)?.internalName ?? '';
        if (!/^V[MF]/.test(name)) return null;

        return VILLAGER_JOBS[name.slice(2, 5)] ?? null;
    }

    /** Narrows a carrying technology to the work it actually reaches. */
    private restrict(carry: CarryUpgradeRecord, job: { resource: string; foodSource?: string }): void {
        carry.resources = [...new Set([...(carry.resources ?? []), job.resource])];
        if (job.foodSource) carry.foodSources = [...new Set([...(carry.foodSources ?? []), job.foodSource])];
    }

    private byInternalName(name: string): GenieUnit | undefined {
        return [...this.referenceUnits().values()].find((unit) => unit.internalName === name);
    }

    private villager(): GenieUnit | undefined {
        return this.byInternalName('VMFAR');
    }

    /**
     * Technology ids a player can actually pay for, gathered from every civilization's tech tree.
     *
     * A tech tree node about a technology is keyed by that technology's own id, and the node of
     * an upgraded unit names the technology that performs the upgrade.
     */
    private researchableTechIds(nodes: CollectedNodes, upgrades: Map<number, LineUpgrade>): Set<number> {
        const ids = new Set<number>(nodes.techs.keys());
        for (const upgrade of upgrades.values()) ids.add(upgrade.techIndex);

        return ids;
    }

    /**
     * The numbers behind a civilization's passive bonuses.
     *
     * The game implements each bonus as a technology bound to that civilization and researched for
     * free at the start, which is why they carry no name: the civilization description is where
     * the game writes them out. What is left after dropping everything a player researches, and
     * the bonus that only reaches allies, is the set that is simply true for that civilization.
     *
     * @param index - Position of the civilization in the data file, which is what its own
     *                technologies point at.
     * @param researchable - Technologies that already appear in a tech tree.
     * @returns Every modelled effect the civilization starts with.
     */
    private bonusEffects(index: number, researchable: ReadonlySet<number>): TechEffectRecord[] {
        if (index < 0) return [];

        const teamBonus = this.config.game.civilizations[index]?.teamBonusId ?? -1;

        return this.config.game.technologies.flatMap((tech, id) => {
            if (tech.civ !== index || tech.effectId === teamBonus || researchable.has(id)) return [];

            const age = this.ageOf(id);

            return this.effectsOf(tech.effectId).map((effect) => (age === null ? effect : { ...effect, age }));
        });
    }

    /**
     * The numbers behind a civilization's team bonus, which reaches its allies too.
     *
     * @param index - Position of the civilization in the data file.
     * @returns Every modelled effect of the one technology the file marks as the team bonus.
     */
    private teamBonusEffects(index: number): TechEffectRecord[] {
        return this.effectsOf(this.config.game.civilizations[index]?.teamBonusId ?? -1);
    }

    /**
     * The age a technology becomes true in, followed through what it waits for.
     *
     * A bonus handed out once per age is three technologies in the file, each waiting on a
     * different age advance, and that chain is the only place the age is written down.
     *
     * @param id - Technology to resolve.
     * @param seen - Technologies already visited, which stops a chain that loops.
     * @returns The age, or null when nothing in the chain names one.
     */
    private ageOf(id: number, seen = new Set<number>()): number | null {
        if (seen.has(id)) return null;
        seen.add(id);

        const direct = this.ageTechs().get(id);
        if (direct !== undefined) return direct;

        for (const prerequisite of this.config.game.technologies[id]?.prerequisites ?? []) {
            const age = this.ageOf(prerequisite, seen);
            if (age !== null) return age;
        }

        return null;
    }

    /** The four age advances, found by the names the game gives them. */
    private ageTechs(): Map<number, number> {
        if (!this.ages) {
            const names = new Map(AGE_NAMES.map((name, index) => [name, index + 1]));
            this.ages = new Map(
                this.config.game.technologies.flatMap((tech, id) => {
                    const age = names.get(this.text(this.config.fallbackLocale, tech.nameStringId));

                    return age === undefined ? [] : [[id, age] as const];
                }),
            );
        }

        return this.ages;
    }

    /**
     * Which units fire each missile in the file.
     *
     * Ballistics does not touch a single archer: it sets a flag on the arrows, and the reader who
     * opens the Crossbowman is asking about the archer. Reading the missile each unit carries is
     * what lets an effect aimed at the projectile be shown on the unit that shoots it.
     *
     * @returns Missile id mapped to the units that fire it.
     */
    private shootersByProjectile(): Map<number, number[]> {
        if (this.shooters) return this.shooters;

        this.shooters = new Map<number, number[]>();
        for (const unit of this.referenceUnits().values()) {
            if (unit.projectileUnitId < 0 || unit.type < UNIT_TYPE.creatable) continue;

            const firing = this.shooters.get(unit.projectileUnitId) ?? [];
            firing.push(unit.id);
            this.shooters.set(unit.projectileUnitId, firing);
        }

        return this.shooters;
    }

    /** Turns the game's own effect commands into the guide's vocabulary. */
    private effectsOf(effectId: number): TechEffectRecord[] {
        const effect = this.config.game.effects[effectId];
        if (!effect) return [];

        const records: TechEffectRecord[] = [];

        // A unit can be named by the effect and reached again through the missile it fires, and a
        // unit that fires several missiles is reached once per missile. Both would hand it the same
        // change twice, so a change that arrives by way of a projectile is only kept if it is new.
        const emitted = new Set<string>();
        const add = (record: TechEffectRecord, derived: boolean): void => {
            const key = [record.unit, record.unitClass, record.attribute, record.damageClass, record.mode].join('|');
            if (derived && emitted.has(key)) return;

            emitted.add(key);
            records.push(record);
        };

        const commands = effect.commands.map((command) => ({
            command,
            mode: MODES[command.type],
            attribute: ATTRIBUTES[command.attribute],
        }));

        for (const pass of ['direct', 'derived'] as const) {
            for (const { command, mode, attribute } of commands) {
                if (!mode || !attribute) continue;

                const shooters = command.unit >= 0 ? this.shootersByProjectile().get(command.unit) : undefined;
                if ((shooters !== undefined) !== (pass === 'derived')) continue;

                const packed = PACKED.has(attribute) ? unpack(command.value, mode) : null;
                const damageClass = packed === null ? undefined : CLASSES[packed.classId];
                if (packed !== null && !damageClass) continue;

                for (const target of shooters ?? [command.unit >= 0 ? command.unit : null]) {
                    add(
                        {
                            mode,
                            unit: target,
                            unitClass: command.unitClass >= 0 ? command.unitClass : null,
                            attribute,
                            value: packed === null ? this.round(command.value) : packed.value,
                            ...(damageClass ? { damageClass } : {}),
                        },
                        pass === 'derived',
                    );
                }
            }
        }

        return records;
    }

    private unitRecord(input: {
        id: number;
        key: string;
        unit: GenieUnit;
        entry: NodeEntry;
        upgrades: Map<number, LineUpgrade>;
        /** False when the entry was assembled for a unit no tech tree names. */
        inTechTree?: boolean;
    }): UnitRecord {
        const { id, key, unit, entry, upgrades } = input;
        const buildingId = entry.node['Building ID'];
        const building = BUILDINGS[buildingId] ?? `building-${buildingId}`;
        const attacks = this.classList(unit.attacks);
        const armours = this.classList(unit.armours);
        const upgrade = upgrades.get(id);
        const predecessor = entry.node['Link Node Type'] === 'BuildingTech' ? null : (entry.node['Link ID'] ?? null);

        return {
            id,
            key,
            classId: unit.classId,
            icon: entry.node['Picture Index'] ?? null,
            category: this.categoryOf(armours, building, unit),
            tags: this.tagsOf({ unit, attacks, armours, node: entry.node }),
            age: entry.node['Age ID'],
            buildings: [building],
            upgradeTechId: upgrade?.techIndex ?? null,
            upgradeCost: upgrade?.cost ?? null,
            upgradeResearchTime: upgrade?.researchTime ?? null,
            cost: this.cost(unit.costs),
            trainTime: unit.trainTime,
            hp: unit.hitPoints,
            baseArmour: unit.baseArmour,
            bonusDamageResistance: this.round(unit.bonusDamageResistance),
            ignoresArmour: (unit.combatAbility & IGNORES_ARMOUR) !== 0,
            resistsArmourIgnore: (unit.combatAbility & RESISTS_ARMOUR_IGNORE) !== 0,
            attacks,
            armours,
            range: this.round(unit.displayedRange),
            minRange: this.round(unit.minRange),
            reloadTime: this.round(unit.reloadTime),
            accuracy: unit.accuracyPercent,
            blastWidth: this.round(unit.blastWidth),
            speed: this.round(unit.speed),
            lineOfSight: this.round(unit.lineOfSight),
            civs: entry.civs,
            uniqueTo: entry.node['Node Type'] === 'UniqueUnit' && entry.civs.length === 1 ? entry.civs[0] : null,
            upgradesFrom: predecessor === null ? null : String(predecessor),
            upgradesTo: [],
            line: key,
            inTechTree: input.inTechTree ?? true,
        };
    }

    private categoryOf(armours: readonly ClassAmountRecord[], building: string, unit: GenieUnit): string {
        const classes = new Set(armours.map((entry) => entry.class));
        if (classes.has('monk')) return 'monk';
        if (classes.has('ship') || classes.has('fire-ship') || building === 'dock') return 'naval';
        if (classes.has('siege-weapon') || classes.has('ram') || classes.has('armored-elephant')) return 'siege';
        if (classes.has('cavalry-archer')) return 'cavalry-archer';
        if (classes.has('camel') || classes.has('mameluke')) return 'camel';
        if (classes.has('war-elephant')) return 'elephant';
        if (classes.has('cavalry')) return 'cavalry';
        if (classes.has('archer') || classes.has('skirmisher')) return 'archer';
        if (classes.has('infantry') || classes.has('eagle-warrior') || classes.has('spearman')) return 'infantry';
        if (building === 'siege-workshop' || unit.blastWidth > 0) return 'siege';

        return 'civilian';
    }

    private tagsOf(input: {
        unit: GenieUnit;
        attacks: readonly ClassAmountRecord[];
        armours: readonly ClassAmountRecord[];
        node: TechTreeNode;
    }): string[] {
        const classes = new Set(input.armours.map((entry) => entry.class));
        const tags: string[] = [];

        if (this.isDemolitionOnly(input.unit, input.attacks)) tags.push('demolition');
        if (classes.has('gunpowder')) tags.push('gunpowder');
        if (classes.has('eagle-warrior')) tags.push('eagle');
        if (classes.has('spearman')) tags.push('spearman');
        if (classes.has('skirmisher')) tags.push('skirmisher');
        if (classes.has('unique-unit')) tags.push('unique-unit');
        tags.push(input.unit.displayedRange >= 2 ? 'ranged' : 'melee');
        if (input.unit.blastWidth > 0) tags.push('blast');
        if (input.node['Node Type'] === 'UnitUpgrade') tags.push('upgrade');
        if (input.node['Node Type'] === 'RegionalUnit') tags.push('regional');

        return tags;
    }

    /**
     * Units that cannot meaningfully trade with an army.
     *
     * A unit that never reloads spends itself in a single blow, and a trebuchet cannot track
     * anything that moves. Both would report an absurd sustained output if measured like a
     * regular soldier.
     */
    private isDemolitionOnly(unit: GenieUnit, attacks: readonly ClassAmountRecord[]): boolean {
        const baseDamage = Math.max(
            0,
            ...attacks.filter((entry) => BASE_CLASSES.includes(entry.class)).map((entry) => entry.amount),
        );

        return (unit.reloadTime === 0 && baseDamage > 0) || (unit.minRange >= 4 && unit.reloadTime >= 8);
    }

    /**
     * Collapses the entries the game keeps twice for the same unit.
     *
     * Several units are trainable from a second building and the game models each as its own id
     * with identical stats, so a guide wants one entry listing both places. A free copy handed to
     * allies is dropped instead of merged, since nobody trains it. Training time is left out of
     * the comparison and the fastest one is kept, because the second building sometimes works a
     * few seconds slower without the unit itself being any different.
     */
    private mergeDuplicates(
        units: UnitRecord[],
        strings: Map<string, Map<string, UnitTextRecord>>,
    ): { units: UnitRecord[]; aliases: Map<string, string>; keys: Set<string> } {
        const names = strings.get(this.config.fallbackLocale) ?? new Map<string, UnitTextRecord>();
        const groups = new Map<string, UnitRecord[]>();
        for (const unit of units) {
            const name = names.get(unit.key)?.name ?? unit.key;
            groups.set(name, [...(groups.get(name) ?? []), unit]);
        }

        const aliases = new Map<string, string>();
        const dropped = new Set<string>();

        for (const group of groups.values()) {
            if (group.length < 2) continue;

            const paid = group.filter((unit) => Object.values(unit.cost).some((amount) => amount > 0));
            for (const unit of group) if (paid.length > 0 && !paid.includes(unit)) dropped.add(unit.key);

            const bySignature = new Map<string, UnitRecord[]>();
            for (const unit of paid) {
                const signature = this.signatureOf(unit);
                bySignature.set(signature, [...(bySignature.get(signature) ?? []), unit]);
            }

            for (const twins of bySignature.values()) {
                if (twins.length < 2) continue;

                const [canonical, ...rest] = [...twins].sort(
                    (left, right) => right.civs.length - left.civs.length || left.id - right.id,
                );
                for (const duplicate of rest) {
                    canonical.buildings = [...new Set([...canonical.buildings, ...duplicate.buildings])];
                    canonical.civs = [...new Set([...canonical.civs, ...duplicate.civs])].sort();
                    canonical.age = Math.min(canonical.age, duplicate.age);
                    canonical.trainTime = Math.min(canonical.trainTime, duplicate.trainTime);
                    aliases.set(duplicate.key, canonical.key);
                    dropped.add(duplicate.key);
                }
            }
        }

        const survivors = units.filter((unit) => !dropped.has(unit.key));

        return { units: survivors, aliases, keys: new Set(survivors.map((unit) => unit.key)) };
    }

    private signatureOf(unit: UnitRecord): string {
        return JSON.stringify([
            unit.cost,
            unit.hp,
            unit.attacks,
            unit.armours,
            unit.range,
            unit.minRange,
            unit.reloadTime,
            unit.accuracy,
            unit.speed,
        ]);
    }

    /** Turns the numeric predecessor ids into keys and rebuilds every upgrade line. */
    private linkLines(units: UnitRecord[], aliases: Map<string, string>): void {
        const byId = new Map(units.map((unit) => [unit.id, unit.key]));
        const survivors = new Set(units.map((unit) => unit.key));
        const resolve = (key: string | null): string | null => {
            const canonical = key === null ? null : (aliases.get(key) ?? key);

            return canonical && survivors.has(canonical) ? canonical : null;
        };

        for (const unit of units) {
            const predecessorId = unit.upgradesFrom === null ? null : Number(unit.upgradesFrom);
            unit.upgradesFrom = resolve(predecessorId === null ? null : (byId.get(predecessorId) ?? null));
        }

        const byKey = new Map(units.map((unit) => [unit.key, unit]));
        for (const unit of units) {
            unit.upgradesTo = units.filter((other) => other.upgradesFrom === unit.key).map((other) => other.key);
            unit.line = this.lineRootOf(unit, byKey);
        }
    }

    private lineRootOf(unit: UnitRecord, byKey: Map<string, UnitRecord>): string {
        let current = unit;
        const guard = new Set<string>();

        while (current.upgradesFrom && byKey.has(current.upgradesFrom) && !guard.has(current.key)) {
            guard.add(current.key);
            current = byKey.get(current.upgradesFrom) as UnitRecord;
        }

        return current.key;
    }

    private technologyRecords(
        nodes: CollectedNodes,
        usedKeys: Set<string>,
    ): { records: TechnologyRecord[]; keyById: Map<number, string>; strings: Map<string, Map<string, TechnologyTextRecord>> } {
        const records: TechnologyRecord[] = [];
        const keyById = new Map<number, string>();
        const strings = this.emptyStringTables<TechnologyTextRecord>();

        for (const [id, entry] of [...nodes.techs].sort((left, right) => left[0] - right[0])) {
            const tech = this.config.game.technologies[id];
            if (!tech) continue;

            const englishName = this.text(this.config.fallbackLocale, entry.node['Name String ID']);
            const key = this.uniqueKey(englishName || `tech-${id}`, id, usedKeys);
            keyById.set(id, key);

            const buildingId = entry.node['Building ID'];
            records.push({
                id,
                key,
                icon: entry.node['Picture Index'] ?? null,
                age: entry.node['Age ID'],
                building: BUILDINGS[buildingId] ?? `building-${buildingId}`,
                cost: this.cost(tech.costs),
                researchTime: tech.researchTime,
                civs: entry.civs,
                effects: this.effectsOf(tech.effectId),
            });

            for (const locale of this.config.strings.keys()) {
                const help = parseUnitHelp(this.raw(locale, tech.nameStringId + HELP_OFFSET));
                strings.get(locale)?.set(key, {
                    name: this.text(locale, entry.node['Name String ID']) || englishName,
                    description: [help.role, help.strongVs, help.weakVs].filter(Boolean).join(' '),
                });
            }
        }

        return { records, keyById, strings };
    }

    private civilizationRecords(
        nodes: CollectedNodes,
        unitKeyById: Map<number, string>,
        merged: { aliases: Map<string, string>; keys: Set<string> },
        techKeyById: Map<number, string>,
        upgrades: Map<number, LineUpgrade>,
    ): { records: CivilizationRecord[]; strings: Map<string, Map<string, CivilizationTextRecord>> } {
        const researchable = this.researchableTechIds(nodes, upgrades);
        const records: CivilizationRecord[] = [];
        const strings = this.emptyStringTables<CivilizationTextRecord>();
        const uniqueTechCivs = new Map<string, number>();

        for (const entry of nodes.techs.values()) {
            const key = techKeyById.get(entry.node['Node ID']);
            if (key) uniqueTechCivs.set(key, entry.civs.length);
        }

        for (const meta of this.civilizations()) {
            const tree = nodes.byCiv.get(meta.tech_tree_name);
            if (!tree) continue;

            const key = this.civKey(meta);
            const available = [...tree.civ_techs_units, ...tree.civ_techs_buildings].filter(
                (node) => node['Node Status'] !== 'NotAvailable',
            );

            const uniqueUnits = new Set<string>();
            for (const node of available) {
                if (node['Node Type'] !== 'UniqueUnit') continue;

                const unitKey = unitKeyById.get(node['Node ID']);
                const canonical = unitKey ? (merged.aliases.get(unitKey) ?? unitKey) : null;
                if (canonical && merged.keys.has(canonical)) uniqueUnits.add(canonical);
            }

            const uniqueTechs = new Set<string>();
            for (const node of available) {
                if (node['Use Type'] !== 'Tech' || !CASTLE_LIKE.has(node['Building ID'])) continue;

                const techKey = techKeyById.get(node['Node ID']);
                if (techKey && uniqueTechCivs.get(techKey) === 1) uniqueTechs.add(techKey);
            }

            records.push({
                key,
                icon: this.civIcon(meta),
                era: meta.era,
                uniqueUnits: [...uniqueUnits],
                uniqueTechs: [...uniqueTechs],
                bonusEffects: this.bonusEffects(this.config.civilizations.indexOf(meta), researchable),
                teamBonusEffects: this.teamBonusEffects(this.config.civilizations.indexOf(meta)),
            });

            for (const locale of this.config.strings.keys()) {
                strings.get(locale)?.set(key, {
                    name: this.text(locale, meta.name_string_id) || meta.internal_name,
                    ...parseCivilizationHelp(this.raw(locale, meta.name_string_id + CIVILIZATION_HELP_OFFSET)),
                });
            }
        }

        return { records, strings };
    }

    private stringBundles(
        units: Map<string, Map<string, UnitTextRecord>>,
        techs: Map<string, Map<string, TechnologyTextRecord>>,
        civs: Map<string, Map<string, CivilizationTextRecord>>,
    ): GeneratedDataset['strings'] {
        const bundles: GeneratedDataset['strings'] = new Map();

        for (const locale of this.config.strings.keys()) {
            bundles.set(locale, {
                units: Object.fromEntries(units.get(locale) ?? []),
                techs: Object.fromEntries(techs.get(locale) ?? []),
                civs: Object.fromEntries(civs.get(locale) ?? []),
            });
        }

        return bundles;
    }
}

interface SwitchedOnUnit {
    unit: GenieUnit;
    entry: NodeEntry;
}

interface NodeEntry {
    node: TechTreeNode;
    candidates: TechTreeNode[];
    civs: string[];
}

interface CollectedNodes {
    units: Map<number, NodeEntry>;
    techs: Map<number, NodeEntry>;
    byCiv: Map<string, CivilizationTechTree>;
}

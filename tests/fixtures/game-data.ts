import { DatasetBuilder, type CivilizationMeta } from '../../scripts/extract/dataset-builder.ts';
import type { CivilizationTechTree, TechTreeNode } from '../../scripts/extract/game-install.ts';
import { blankUnitFields } from '../../scripts/extract/genie-dat.ts';
import type { GenieData, GenieTech, GenieUnit } from '../../scripts/extract/genie-dat.ts';

/** String ids of the sample roster, spaced like the ones the game itself uses. */
export const STRING_IDS = {
    militiaName: 14079,
    manAtArmsName: 14080,
    forgingName: 17067,
    britonsName: 10271,
    militiaUnit: 5079,
    manAtArmsUnit: 5080,
    forgingTech: 7067,
    standInUnit: 5082,
} as const;

const HELP_OFFSET = 21000;

/** Starting resources with the farm food slot filled, which is the only one the guide reads. */
const FARM_FOOD_SLOT_RESOURCES = Array.from({ length: 40 }, (_, index) => (index === 36 ? 175 : 0));
const CIV_HELP_OFFSET = 109879;

/**
 * A creatable unit with the stats of a Militia.
 *
 * @param overrides - Fields to replace, on top of an identity and a name.
 * @returns The unit record as the binary reader would have produced it.
 */
/**
 * A technology record with everything the reader would have filled in.
 *
 * @param overrides - The fields a test cares about.
 * @returns A complete record.
 */
export function genieTech(overrides: Partial<GenieTech>): GenieTech {
    return {
        prerequisites: [],
        requiredTechCount: 0,
        costs: [],
        civ: -1,
        fullTechMode: 0,
        nameStringId: 0,
        descriptionStringId: 0,
        effectId: -1,
        type: 0,
        iconId: -1,
        helpStringId: 0,
        techTreeStringId: 0,
        internalName: '',
        repeatable: 0,
        researchTime: 0,
        researchLocationIds: [],
        locations: [],
        ...overrides,
    };
}

export function genieUnit(overrides: Partial<GenieUnit> & Pick<GenieUnit, 'id' | 'nameStringId'>): GenieUnit {
    return {
        ...blankUnitFields(),
        internalName: 'SAMPLE',
        creatableType: 2,
        isHero: false,
        type: 70,
        creationStringId: 0,
        helpStringId: 0,
        classId: 6,
        hitPoints: 40,
        lineOfSight: 4,
        garrisonCapacity: 0,
        iconId: 8,
        speed: 0.9,
        attacks: [{ class: 4, amount: 4 }],
        armours: [
            { class: 1, amount: 0 },
            { class: 3, amount: 1 },
            { class: 4, amount: 0 },
        ],
        baseArmour: 0,
        maxRange: 0,
        minRange: 0,
        blastWidth: 0,
        reloadTime: 2,
        projectileUnitId: -1,
        bonusDamageResistance: 0,
        combatAbility: 0,
        accuracyPercent: 100,
        frameDelay: 0,
        displayedAttack: 4,
        displayedMeleeArmour: 0,
        displayedPierceArmour: 1,
        displayedRange: 0,
        displayedReloadTime: 2,
        costs: [
            { type: 0, amount: 50, flag: 0 },
            { type: 3, amount: 20, flag: 0 },
        ],
        trainTime: 21,
        trainLocationIds: [12],
        ...overrides,
    };
}

/**
 * A tech tree node for a Feudal Age unit trained at the Barracks.
 *
 * @param overrides - Fields to replace, on top of an identity and a name.
 * @returns The node as the game writes it in a civilization tech tree.
 */
export function techTreeNode(
    overrides: Partial<TechTreeNode> & Pick<TechTreeNode, 'Node ID' | 'Name String ID'>,
): TechTreeNode {
    return {
        Name: 'Node',
        'Node Type': 'Unit',
        'Link Node Type': 'BuildingTech',
        'Use Type': 'Unit',
        'Node Status': 'ResearchedCompleted',
        'Age ID': 1,
        'Building ID': 12,
        'Picture Index': 8,
        ...overrides,
    };
}

/**
 * A builder loaded with one civilization, one upgrade line and one technology.
 *
 * @param overrides - Parts of the input to replace, to exercise a single decision at a time.
 * @returns The builder, ready to run.
 */
export function datasetBuilderFixture(overrides: Partial<DatasetFixtureInput> = {}): DatasetBuilder {
    const input = { ...defaultFixtureInput(), ...overrides };

    return new DatasetBuilder({
        game: input.game,
        trees: input.trees,
        civilizations: input.civilizations,
        strings: new Map([['en', input.strings]]),
        fallbackLocale: 'en',
        era: input.era,
    });
}

export interface DatasetFixtureInput {
    game: GenieData;
    trees: CivilizationTechTree[];
    civilizations: CivilizationMeta[];
    strings: Map<number, string>;
    era: string;
}

function defaultFixtureInput(): DatasetFixtureInput {
    return {
        game: sampleGameData(),
        trees: [sampleTechTree()],
        civilizations: [gaiaCivilization(), sampleCivilization()],
        strings: sampleStrings(),
        era: 'base',
    };
}

/** The binary tables, with the roster stored under the first playable civilization. */
export function sampleGameData(): GenieData {
    return {
        version: 'VER 8.9',
        effects: [
            { name: 'Forging', commands: [{ type: 4, unit: -1, unitClass: 6, attribute: 9, value: 1025 }] },
            { name: 'Man-at-Arms', commands: [] },
            { name: 'Britons bonus', commands: [{ type: 5, unit: -1, unitClass: 6, attribute: 0, value: 1.2 }] },
            { name: 'Stand-in', commands: [{ type: 2, unit: 77, unitClass: 1, attribute: -1, value: 0 }] },
        ],
        civilizations: [
            {
                name: 'Gaia',
                playerType: 1,
                iconSet: 0,
                techTreeId: 0,
                teamBonusId: -1,
                resources: [],
                units: new Map(),
            },
            {
                name: 'British',
                playerType: 1,
        iconSet: 0,
        techTreeId: 1,
                teamBonusId: 1,
                resources: FARM_FOOD_SLOT_RESOURCES,
                units: new Map([
                    [74, genieUnit({ id: 74, nameStringId: STRING_IDS.militiaUnit })],
                    [77, genieUnit({ id: 77, nameStringId: STRING_IDS.standInUnit, classId: 12, trainLocationIds: [12] })],
                    [
                        75,
                        genieUnit({
                            id: 75,
                            nameStringId: STRING_IDS.manAtArmsUnit,
                            hitPoints: 45,
                            iconId: 9,
                        }),
                    ],
                ]),
            },
        ],
        terrainRestrictions: [],
        playerColours: [],
        sounds: [],
        graphics: [],
        terrains: [],
        unitHeaders: [],
        counters: {
            timeSlice: 30,
            unitKillRate: 7,
            unitKillTotal: 14,
            unitHitPointRate: 700,
            unitHitPointTotal: 1400,
            razingKillRate: 5,
            razingKillTotal: 10,
        },
        techTree: { totalUnitTechGroups: 0, ages: [], buildings: [], units: [], researches: [] },
        sections: {},
        bytesRemaining: 0,
        technologies: [
            genieTech({
                effectId: 0,
                prerequisites: [],
                nameStringId: STRING_IDS.forgingTech,
                descriptionStringId: 0,
                iconId: 1,
                civ: -1,
                researchTime: 50,
                researchLocationIds: [103],
                costs: [{ type: 0, amount: 150, flag: 0 }],
            }),
            genieTech({
                effectId: 1,
                prerequisites: [],
                nameStringId: 7068,
                descriptionStringId: 0,
                iconId: 2,
                civ: -1,
                researchTime: 40,
                researchLocationIds: [12],
                costs: [
                    { type: 0, amount: 100, flag: 0 },
                    { type: 3, amount: 40, flag: 0 },
                ],
            }),
            genieTech({
                effectId: 3,
                prerequisites: [],
                nameStringId: 0,
                descriptionStringId: 0,
                iconId: -1,
                civ: -1,
                researchTime: 0,
                researchLocationIds: [],
                costs: [],
            }),
            genieTech({
                effectId: 2,
                prerequisites: [],
                nameStringId: 0,
                descriptionStringId: 0,
                iconId: -1,
                civ: 1,
                researchTime: 0,
                researchLocationIds: [],
                costs: [],
            }),
        ],
    };
}

export function sampleTechTree(): CivilizationTechTree {
    return {
        civ_id: 'BRITONS',
        civ_techs_buildings: [],
        civ_techs_units: [
            techTreeNode({ 'Node ID': 74, 'Name String ID': STRING_IDS.militiaName }),
            techTreeNode({
                'Node ID': 75,
                'Name String ID': STRING_IDS.manAtArmsName,
                'Node Type': 'UnitUpgrade',
                'Link Node Type': 'Unit',
                'Link ID': 74,
                'Trigger Tech ID': 1,
                'Age ID': 2,
                'Picture Index': 9,
            }),
            techTreeNode({
                'Node ID': 0,
                'Name String ID': STRING_IDS.forgingName,
                'Use Type': 'Tech',
                'Node Type': 'Research',
                'Building ID': 103,
                'Age ID': 2,
            }),
        ],
    };
}

/**
 * The first entry of the game's civilization list, which is not playable.
 *
 * Its place matters: a technology names the civilization it belongs to by its position in this
 * list, so a fixture that starts at the first playable civilization would shift every bonus.
 *
 * @returns The metadata of the untouched first slot.
 */
export function gaiaCivilization(): CivilizationMeta {
    return { internal_name: 'Gaia', tech_tree_name: 'GAIA', name_string_id: 10102, era: 'base' };
}

export function sampleCivilization(): CivilizationMeta {
    return {
        internal_name: 'Britons',
        tech_tree_name: 'BRITONS',
        name_string_id: STRING_IDS.britonsName,
        emblem_image_path: '/resources/civ_emblems/britons.png',
        era: 'base',
    };
}

export function sampleStrings(): Map<number, string> {
    return new Map([
        [STRING_IDS.militiaName, 'Militia'],
        [STRING_IDS.manAtArmsName, 'Man-at-Arms'],
        [STRING_IDS.forgingName, 'Forging'],
        [STRING_IDS.britonsName, 'Britons'],
        [STRING_IDS.standInUnit, 'Stand-in Rider'],
        [
            STRING_IDS.militiaUnit + HELP_OFFSET,
            'Create <b>Militia<b> (<cost>)\nAll-purpose Infantry. Strong vs. buildings.\n<i>Upgrades: attack.<i>',
        ],
        [STRING_IDS.manAtArmsUnit + HELP_OFFSET, 'Create <b>Man-at-Arms<b> (<cost>)\nUpgraded Infantry.'],
        [STRING_IDS.forgingTech + HELP_OFFSET, 'Research <b>Forging<b> (<cost>)\nInfantry +1 attack.'],
        [STRING_IDS.britonsName + CIV_HELP_OFFSET, 'Foot Archer civilization\n\n• Shepherds work +25% faster'],
    ]);
}

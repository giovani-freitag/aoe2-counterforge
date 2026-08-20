import { BinaryReader } from './binary-reader.ts';

/**
 * The one revision of the data file this reader understands.
 *
 * Every conditional the format carries was resolved for this revision once, by hand, and the
 * resolved layout is what the code below implements. A reader that re-derived those conditions at
 * run time would re-open every one of them; a reader that implements one layout and refuses
 * anything else cannot quietly read a different revision wrong.
 */
const SUPPORTED_VERSION = 'VER 8.9';

const VERSION_SIZE = 8;
const TILE_TYPE_COUNT = 19;
const TERRAIN_COUNT = 200;
const TERRAIN_UNITS_SIZE = 30;
const REQUIRED_TECH_COUNT = 6;
const RESOURCE_STORAGE_COUNT = 3;
const COST_COUNT = 3;
const ANNEX_COUNT = 4;
const LOOT_COUNT = 6;
const CONNECTION_SLOTS = 10;
const ZONE_COUNT = 10;
const GRAPHIC_DELTA_SIZE = 16;
const ANGLE_SOUND_SIZE = 24;

/** Unit record types, which decide how many of the tail blocks a record carries. */
export const UNIT_TYPE = {
    eyeCandy: 10,
    flag: 20,
    dopplegangerAnimated: 25,
    deadFish: 30,
    bird: 40,
    combatant: 50,
    projectile: 60,
    creatable: 70,
    building: 80,
} as const;

export interface ClassAmount {
    class: number;
    amount: number;
}

export interface ResourceAmount {
    type: number;
    amount: number;
    flag: number;
}

export interface ResourceStorage {
    type: number;
    amount: number;
    flag: number;
}

export interface DamageGraphic {
    graphicId: number;
    damagePercent: number;
    applyMode: number;
}

export interface TrainLocation {
    trainTime: number;
    unitId: number;
    buttonId: number;
    hotKeyId: number;
}

export interface ResearchLocation {
    locationId: number;
    researchTime: number;
    buttonId: number;
    hotKeyId: number;
}

export interface Annex {
    unitId: number;
    x: number;
    y: number;
}

/**
 * One thing a unit knows how to do.
 *
 * The action type is the verb — gather, convert, heal, build, attack ground — and the class and
 * unit ids say what it may be pointed at. This is where a villager's gather rates live, and where
 * the monk's conversion window is written as a pair of times.
 */
export interface Task {
    taskType: number;
    id: number;
    isDefault: number;
    actionType: number;
    classId: number;
    unitId: number;
    terrainId: number;
    resourceIn: number;
    resourceMultiplier: number;
    resourceOut: number;
    unusedResource: number;
    workValue1: number;
    workValue2: number;
    workRange: number;
    autoSearchTargets: number;
    searchWaitTime: number;
    enableTargeting: number;
    combatLevelFlag: number;
    gatherType: number;
    workFlag2: number;
    targetDiplomacy: number;
    carryCheck: number;
    pickForConstruction: number;
    movingGraphicId: number;
    proceedingGraphicId: number;
    workingGraphicId: number;
    carryingGraphicId: number;
    gatherSoundId: number;
    depositSoundId: number;
    wwiseGatherSoundId: number;
    wwiseDepositSoundId: number;
    /** A resource slot rather than a flag: the task runs only while that resource is above zero. */
    enabled: number;
}

export interface GenieUnit {
    type: number;
    id: number;
    nameStringId: number;
    creationStringId: number;
    classId: number;
    standingGraphics: number[];
    dyingGraphic: number;
    undeadGraphic: number;
    undeadMode: number;
    hitPoints: number;
    lineOfSight: number;
    garrisonCapacity: number;
    collisionSize: number[];
    trainSound: number;
    damageSound: number;
    deadUnitId: number;
    bloodUnitId: number;
    sortNumber: number;
    canBeBuiltOn: number;
    iconId: number;
    hideInEditor: number;
    oldPortrait: number;
    enabled: number;
    disabled: number;
    placementSideTerrain: number[];
    placementTerrain: number[];
    clearanceSize: number[];
    hillMode: number;
    fogVisibility: number;
    /** Row index into the terrain restriction table: where this unit may stand and build. */
    terrainRestriction: number;
    flyMode: number;
    resourceCapacity: number;
    resourceDecay: number;
    blastDefenseLevel: number;
    combatLevel: number;
    interactionMode: number;
    minimapMode: number;
    interfaceKind: number;
    multipleAttributeMode: number;
    minimapColour: number;
    helpStringId: number;
    hotkeyTextStringId: number;
    recyclable: number;
    enableAutoGather: number;
    createDoppelgangerOnDeath: number;
    resourceGatherGroup: number;
    occlusionMode: number;
    obstructionType: number;
    obstructionClass: number;
    /** Bit field the data outruns the known names of; never treat an unknown bit as an error. */
    trait: number;
    civilization: number;
    traitPiece: number;
    selectionEffect: number;
    editorSelectionColour: number;
    outlineSize: number[];
    /** Two constants the file carries on every record, which is what makes them a useful canary. */
    triggerWord0: number;
    triggerWord1: number;
    resourceStorages: ResourceStorage[];
    damageGraphics: DamageGraphic[];
    selectionSound: number;
    dyingSound: number;
    wwiseTrainSoundId: number;
    wwiseDamageSoundId: number;
    wwiseSelectionSoundId: number;
    wwiseDyingSoundId: number;
    oldAttackReaction: number;
    convertTerrain: number;
    internalName: string;
    copyId: number;
    baseId: number;

    speed: number;

    walkingGraphic: number;
    runningGraphic: number;
    rotationSpeed: number;
    oldSizeClass: number;
    trackingUnit: number;
    trackingUnitMode: number;
    trackingUnitDensity: number;
    oldMoveAlgorithm: number;
    turnRadius: number;
    turnRadiusSpeed: number;
    maxYawPerSecondMoving: number;
    stationaryYawRevolutionTime: number;
    maxYawPerSecondStationary: number;
    minCollisionSizeMultiplier: number;

    defaultTaskId: number;
    searchRadius: number;
    workRate: number;
    /** Buildings this unit may return a carried resource to, the town centre always first. */
    dropSites: number[];
    taskSwapGroup: number;
    attackSound: number;
    moveSound: number;
    wwiseAttackSoundId: number;
    wwiseMoveSoundId: number;
    runPattern: number;
    tasks: Task[];

    baseArmour: number;
    attacks: ClassAmount[];
    armours: ClassAmount[];
    defenseTerrainBonus: number;
    /** Fraction of the damage from bonus classes this unit does not take. */
    bonusDamageResistance: number;
    maxRange: number;
    blastWidth: number;
    reloadTime: number;
    projectileUnitId: number;
    accuracyPercent: number;
    /** Bit field: 1 the unit's attacks ignore armour, 2 it resists attacks that do. */
    combatAbility: number;
    frameDelay: number;
    graphicDisplacement: number[];
    blastAttackLevel: number;
    minRange: number;
    accuracyDispersion: number;
    attackGraphic: number;
    displayedMeleeArmour: number;
    displayedAttack: number;
    displayedRange: number;
    displayedReloadTime: number;
    blastDamage: number;
    damageReflection: number;
    friendlyFireDamage: number;
    interruptFrame: number;
    garrisonFirepower: number;
    attackGraphic2: number;

    projectileType: number;
    /** Whether the missile leads a moving target, and what a miss still hits. */
    smartMode: number;
    hitMode: number;
    vanishMode: number;
    areaEffectSpecials: number;
    projectileArc: number;

    costs: ResourceAmount[];
    trainLocations: TrainLocation[];
    trainTime: number;
    trainLocationIds: number[];
    rearAttackModifier: number;
    flankAttackModifier: number;
    creatableType: number;
    /** Bit field whose lowest bit marks a campaign character; the rest mark unrelated things. */
    heroMode: number;
    isHero: boolean;
    garrisonGraphic: number;
    spawningGraphic: number;
    upgradeGraphic: number;
    heroGlowGraphic: number;
    idleAttackGraphic: number;
    maxCharge: number;
    rechargeRate: number;
    chargeEvent: number;
    chargeType: number;
    chargeTarget: number;
    chargeProjectileUnit: number;
    attackPriority: number;
    invulnerabilityLevel: number;
    buttonIconId: number;
    buttonShortTooltipId: number;
    buttonExtendedTooltipId: number;
    buttonHotkeyAction: number;
    minConversionTimeModifier: number;
    maxConversionTimeModifier: number;
    conversionChanceModifier: number;
    totalProjectiles: number;
    maxTotalProjectiles: number;
    projectileSpawningArea: number[];
    secondaryProjectileUnit: number;
    specialGraphic: number;
    specialAbility: number;
    displayedPierceArmour: number;

    constructionGraphicId: number;
    snowGraphicId: number;
    destructionGraphicId: number;
    destructionRubbleGraphicId: number;
    researchingGraphic: number;
    researchCompletedGraphic: number;
    adjacentMode: number;
    iconAngle: number;
    disappearsWhenBuilt: number;
    stackUnitId: number;
    foundationTerrainId: number;
    oldOverlayId: number;
    /** The technology this building's existence stands for in the tree. */
    techId: number;
    canBurn: number;
    annexes: Annex[];
    headUnit: number;
    /** The pack or unpack partner: trebuchet to packed trebuchet, gate to gate. */
    transformUnit: number;
    transformSound: number;
    constructionSound: number;
    wwiseTransformSoundId: number;
    wwiseConstructionSoundId: number;
    /** Bit field: 1 villager, 2 infantry, 4 cavalry, 8 monk, 16 livestock, 64 ships. */
    garrisonType: number;
    garrisonHealRate: number;
    garrisonRepairRate: number;
    pileUnit: number;
    lootingTable: number[];
}

export interface EffectCommand {
    type: number;
    unit: number;
    unitClass: number;
    attribute: number;
    value: number;
}

export interface GenieEffect {
    name: string;
    commands: EffectCommand[];
}

export interface GenieCivilization {
    playerType: number;
    name: string;
    /** Starting value of every resource slot, including the ones that are really settings. */
    resources: number[];
    techTreeId: number;
    teamBonusId: number;
    iconSet: number;
    units: Map<number, GenieUnit>;
}

export interface GenieTech {
    prerequisites: number[];
    requiredTechCount: number;
    costs: ResourceAmount[];
    civ: number;
    fullTechMode: number;
    nameStringId: number;
    descriptionStringId: number;
    effectId: number;
    type: number;
    iconId: number;
    helpStringId: number;
    techTreeStringId: number;
    internalName: string;
    repeatable: number;
    researchTime: number;
    researchLocationIds: number[];
    locations: ResearchLocation[];
}

export interface UnitHeader {
    exists: number;
    tasks: Task[];
}

export interface GameCounters {
    timeSlice: number;
    unitKillRate: number;
    unitKillTotal: number;
    unitHitPointRate: number;
    unitHitPointTotal: number;
    razingKillRate: number;
    razingKillTotal: number;
}

export interface ConnectionCommon {
    slotsUsed: number;
    unitResearch: number[];
    mode: number[];
}

export interface AgeConnection {
    id: number;
    status: number;
    buildings: number[];
    units: number[];
    techs: number[];
    common: ConnectionCommon;
    numBuildingLevels: number;
    buildingsPerZone: number[];
    groupLengthPerZone: number[];
    maxAgeLength: number;
    lineMode: number;
}

export interface BuildingConnection {
    id: number;
    status: number;
    buildings: number[];
    units: number[];
    techs: number[];
    common: ConnectionCommon;
    locationInAge: number;
    unitsTechsTotal: number[];
    unitsTechsFirst: number[];
    lineMode: number;
    enablingResearch: number;
}

export interface UnitConnection {
    id: number;
    status: number;
    upperBuilding: number;
    common: ConnectionCommon;
    verticalLine: number;
    units: number[];
    locationInAge: number;
    requiredResearch: number;
    lineMode: number;
    enablingResearch: number;
}

export interface ResearchConnection {
    id: number;
    status: number;
    upperBuilding: number;
    buildings: number[];
    units: number[];
    techs: number[];
    common: ConnectionCommon;
    verticalLine: number;
    locationInAge: number;
    lineMode: number;
}

export interface GenieTechTree {
    totalUnitTechGroups: number;
    ages: AgeConnection[];
    buildings: BuildingConnection[];
    units: UnitConnection[];
    researches: ResearchConnection[];
}

export interface GenieData {
    version: string;
    terrainRestrictions: TerrainRestriction[];
    playerColours: PlayerColour[];
    sounds: Sound[];
    graphics: Graphic[];
    terrains: Terrain[];
    effects: GenieEffect[];
    unitHeaders: UnitHeader[];
    civilizations: GenieCivilization[];
    technologies: GenieTech[];
    counters: GameCounters;
    techTree: GenieTechTree;
    /** Where each table ended, which is how a drift is traced back to the table that caused it. */
    sections: Record<string, number>;
    /** Bytes the walk did not consume. Zero, or the layout no longer matches the file. */
    bytesRemaining: number;
}

export interface TerrainRestriction {
    /** One factor per terrain in use: zero is impassable, and the rest scale movement. */
    multipliers: number[];
    passGraphics: {
        exitTileSprite: number;
        enterTileSprite: number;
        walkTileSprite: number;
        walkSpriteRate: number;
    }[];
}

export interface PlayerColour {
    id: number;
    palette: number;
    colour: number;
    minimapColour: number;
    statisticsText: number;
}

export interface SoundItem {
    fileName: string;
    resourceId: number;
    probability: number;
    civilization: number;
    iconSet: number;
}

export interface Sound {
    id: number;
    playDelay: number;
    cacheTime: number;
    totalProbability: number;
    items: SoundItem[];
}

export interface Graphic {
    name: string;
    fileName: string;
    particleEffectName: string;
    slpId: number;
    layer: number;
    soundId: number;
    frameCount: number;
    angleCount: number;
    speedMultiplier: number;
    /** Seconds one frame is held, so frames times duration is how long the animation runs. */
    frameDuration: number;
    replayDelay: number;
    sequenceType: number;
    id: number;
    mirroringMode: number;
}

export interface Terrain {
    enabled: number;
    name: string;
    fileName: string;
    slpId: number;
    soundId: number;
}

/** The part of a unit record the reader always has before it knows the unit's type. */
export type UnitHeaderFields = Pick<
    GenieUnit,
    | 'id'
    | 'type'
    | 'internalName'
    | 'nameStringId'
    | 'creationStringId'
    | 'helpStringId'
    | 'classId'
    | 'hitPoints'
    | 'lineOfSight'
    | 'garrisonCapacity'
    | 'iconId'
>;

/**
 * Every field of a unit record that the type dispatch may leave unread, at rest.
 *
 * A tree stops after the header; a missile never reaches the creatable block. Rather than leave
 * those fields absent, a record starts complete and the reader overwrites what the file carries,
 * so the shape is the same whatever the unit turns out to be.
 *
 * @returns A fresh set of defaults, safe to mutate.
 */
export function blankUnitFields(): Omit<GenieUnit, 'id' | 'type'> {
    return {
        nameStringId: 0,
        creationStringId: 0,
        classId: -1,
        standingGraphics: [],
        dyingGraphic: -1,
        undeadGraphic: -1,
        undeadMode: 0,
        hitPoints: 0,
        lineOfSight: 0,
        garrisonCapacity: 0,
        collisionSize: [],
        trainSound: -1,
        damageSound: -1,
        deadUnitId: -1,
        bloodUnitId: -1,
        sortNumber: 0,
        canBeBuiltOn: 0,
        iconId: -1,
        hideInEditor: 0,
        oldPortrait: -1,
        enabled: 0,
        disabled: 0,
        placementSideTerrain: [],
        placementTerrain: [],
        clearanceSize: [],
        hillMode: 0,
        fogVisibility: 0,
        terrainRestriction: -1,
        flyMode: 0,
        resourceCapacity: 0,
        resourceDecay: 0,
        blastDefenseLevel: 0,
        combatLevel: 0,
        interactionMode: 0,
        minimapMode: 0,
        interfaceKind: 0,
        multipleAttributeMode: 0,
        minimapColour: 0,
        helpStringId: 0,
        hotkeyTextStringId: 0,
        recyclable: 0,
        enableAutoGather: 0,
        createDoppelgangerOnDeath: 0,
        resourceGatherGroup: 0,
        occlusionMode: 0,
        obstructionType: 0,
        obstructionClass: 0,
        trait: 0,
        civilization: 0,
        traitPiece: 0,
        selectionEffect: 0,
        editorSelectionColour: 0,
        outlineSize: [],
        triggerWord0: 0,
        triggerWord1: 0,
        resourceStorages: [],
        damageGraphics: [],
        selectionSound: -1,
        dyingSound: -1,
        wwiseTrainSoundId: 0,
        wwiseDamageSoundId: 0,
        wwiseSelectionSoundId: 0,
        wwiseDyingSoundId: 0,
        oldAttackReaction: 0,
        convertTerrain: 0,
        internalName: '',
        copyId: -1,
        baseId: -1,

        speed: 0,

        walkingGraphic: -1,
        runningGraphic: -1,
        rotationSpeed: 0,
        oldSizeClass: 0,
        trackingUnit: -1,
        trackingUnitMode: 0,
        trackingUnitDensity: 0,
        oldMoveAlgorithm: 0,
        turnRadius: 0,
        turnRadiusSpeed: 0,
        maxYawPerSecondMoving: 0,
        stationaryYawRevolutionTime: 0,
        maxYawPerSecondStationary: 0,
        minCollisionSizeMultiplier: 0,

        defaultTaskId: -1,
        searchRadius: 0,
        workRate: 0,
        dropSites: [],
        taskSwapGroup: 0,
        attackSound: -1,
        moveSound: -1,
        wwiseAttackSoundId: 0,
        wwiseMoveSoundId: 0,
        runPattern: 0,
        tasks: [],

        baseArmour: 0,
        attacks: [],
        armours: [],
        defenseTerrainBonus: 0,
        bonusDamageResistance: 0,
        maxRange: 0,
        blastWidth: 0,
        reloadTime: 0,
        projectileUnitId: -1,
        accuracyPercent: 0,
        combatAbility: 0,
        frameDelay: 0,
        graphicDisplacement: [],
        blastAttackLevel: 0,
        minRange: 0,
        accuracyDispersion: 0,
        attackGraphic: -1,
        displayedMeleeArmour: 0,
        displayedAttack: 0,
        displayedRange: 0,
        displayedReloadTime: 0,
        blastDamage: 0,
        damageReflection: 0,
        friendlyFireDamage: 0,
        interruptFrame: -1,
        garrisonFirepower: 0,
        attackGraphic2: -1,

        projectileType: 0,
        smartMode: 0,
        hitMode: 0,
        vanishMode: 0,
        areaEffectSpecials: 0,
        projectileArc: 0,

        costs: [],
        trainLocations: [],
        trainTime: 0,
        trainLocationIds: [],
        rearAttackModifier: 0,
        flankAttackModifier: 0,
        creatableType: 0,
        heroMode: 0,
        isHero: false,
        garrisonGraphic: -1,
        spawningGraphic: -1,
        upgradeGraphic: -1,
        heroGlowGraphic: -1,
        idleAttackGraphic: -1,
        maxCharge: 0,
        rechargeRate: 0,
        chargeEvent: 0,
        chargeType: 0,
        chargeTarget: 0,
        chargeProjectileUnit: -1,
        attackPriority: 0,
        invulnerabilityLevel: 0,
        buttonIconId: -1,
        buttonShortTooltipId: 0,
        buttonExtendedTooltipId: 0,
        buttonHotkeyAction: 0,
        minConversionTimeModifier: 0,
        maxConversionTimeModifier: 0,
        conversionChanceModifier: 0,
        totalProjectiles: 0,
        maxTotalProjectiles: 0,
        projectileSpawningArea: [],
        secondaryProjectileUnit: -1,
        specialGraphic: -1,
        specialAbility: 0,
        displayedPierceArmour: 0,

        constructionGraphicId: -1,
        snowGraphicId: -1,
        destructionGraphicId: -1,
        destructionRubbleGraphicId: -1,
        researchingGraphic: -1,
        researchCompletedGraphic: -1,
        adjacentMode: 0,
        iconAngle: 0,
        disappearsWhenBuilt: 0,
        stackUnitId: -1,
        foundationTerrainId: -1,
        oldOverlayId: -1,
        techId: -1,
        canBurn: 0,
        annexes: [],
        headUnit: -1,
        transformUnit: -1,
        transformSound: -1,
        constructionSound: -1,
        wwiseTransformSoundId: 0,
        wwiseConstructionSoundId: 0,
        garrisonType: 0,
        garrisonHealRate: 0,
        garrisonRepairRate: 0,
        pileUnit: -1,
        lootingTable: [],
    };
}

/**
 * Reads the decompressed game data file, whole.
 *
 * The file is one long positional sequence with no index and no field names: every record is as
 * long as its own contents say, so the only way to reach the last table is to read every field of
 * every record before it. That is also what proves the reading — the walk ends exactly on the last
 * byte, and it could not if any width above were wrong.
 */
export class GenieDatReader {
    private readonly reader: BinaryReader;

    constructor(config: { buffer: Buffer }) {
        this.reader = new BinaryReader({ buffer: config.buffer });
    }

    /**
     * Parses the whole file.
     *
     * @returns Every table the file carries, plus how many bytes were left over.
     * @throws Error when the revision is not the one this reader implements, or when a section
     *     header falls outside a plausible range, which means the layout no longer matches.
     */
    public read(): GenieData {
        const version = this.version();
        if (version !== SUPPORTED_VERSION) {
            throw new Error(`Unsupported data file revision ${version}; this reader implements ${SUPPORTED_VERSION}.`);
        }

        const sections: Record<string, number> = { version: this.reader.position };
        const mark = <T>(name: string, read: () => T): T => {
            const value = read();
            sections[name] = this.reader.position;

            return value;
        };

        const terrainRestrictions = mark('terrainRestrictions', () => this.terrainRestrictions());
        const playerColours = mark('playerColours', () => this.playerColours());
        const sounds = mark('sounds', () => this.sounds());
        const graphics = mark('graphics', () => this.graphics());
        const terrains = mark('terrains', () => this.terrainBlock());
        mark('randomMaps', () => { this.randomMaps(); });
        const effects = mark('effects', () => this.effects());
        const unitHeaders = mark('unitHeaders', () => this.unitHeaders());
        const civilizations = mark('civilizations', () => this.civilizations());
        const technologies = mark('technologies', () => this.technologies());
        const counters = mark('counters', () => this.counters());
        const techTree = mark('techTree', () => this.techTree());

        return {
            version,
            terrainRestrictions,
            playerColours,
            sounds,
            graphics,
            terrains,
            effects,
            unitHeaders,
            civilizations,
            technologies,
            counters,
            techTree,
            sections,
            bytesRemaining: this.reader.remaining,
        };
    }

    private version(): string {
        const raw = this.reader.list(VERSION_SIZE, () => this.reader.uint8());

        return String.fromCharCode(...raw).replace(/\0.*$/, '');
    }

    private expect(value: number, max: number, section: string): number {
        if (!Number.isInteger(value) || value < 0 || value > max) {
            throw new Error(`Implausible ${section} count ${value} at byte ${this.reader.position}.`);
        }

        return value;
    }

    /**
     * Where each kind of unit may stand, and what a projectile leaves behind when it lands.
     *
     * The row width is the number of terrains actually in use, which is smaller than the terrain
     * table; taking the larger number walks the cursor off the table.
     */
    private terrainRestrictions(): TerrainRestriction[] {
        const restrictionCount = this.expect(this.reader.int16(), 1000, 'terrain restriction');
        const terrainsUsed = this.expect(this.reader.int16(), 1000, 'terrain in use');

        // Two arrays of stale runtime pointers: the width matters, the contents do not.
        this.reader.skip(restrictionCount * 4 * 2);

        return this.reader.list(restrictionCount, () => ({
            multipliers: this.reader.list(terrainsUsed, () => this.reader.float()),
            passGraphics: this.reader.list(terrainsUsed, () => ({
                exitTileSprite: this.reader.int32(),
                enterTileSprite: this.reader.int32(),
                walkTileSprite: this.reader.int32(),
                walkSpriteRate: this.reader.int32(),
            })),
        }));
    }

    private playerColours(): PlayerColour[] {
        const count = this.expect(this.reader.int16(), 1000, 'player colour');

        // Nine consecutive words; three of them are zero throughout and carry no meaning here.
        return this.reader.list(count, () => {
            const id = this.reader.int32();
            const palette = this.reader.int32();
            const colour = this.reader.int32();
            this.reader.skip(4 + 4);
            const minimapColour = this.reader.int32();
            this.reader.skip(4 + 4);
            const statisticsText = this.reader.int32();

            return { id, palette, colour, minimapColour, statisticsText };
        });
    }

    private sounds(): Sound[] {
        const count = this.expect(this.reader.int16(), 20000, 'sound');

        return this.reader.list(count, () => {
            const id = this.reader.int16();
            const playDelay = this.reader.int16();
            const itemCount = this.reader.int16();
            const cacheTime = this.reader.int32();
            const totalProbability = this.reader.int16();

            return {
                id,
                playDelay,
                cacheTime,
                totalProbability,
                items: this.reader.list(itemCount, () => {
                    const fileName = this.reader.string();
                    const resourceId = this.reader.int32();
                    const probability = this.reader.int16();
                    const civilization = this.reader.int16();
                    const iconSet = this.reader.int16();

                    return { fileName, resourceId, probability, civilization, iconSet };
                }),
            };
        });
    }

    private graphics(): Graphic[] {
        const count = this.expect(this.reader.int16(), 100000, 'graphic');
        const pointers = this.reader.list(count, () => this.reader.int32());

        return pointers.flatMap((pointer) => (pointer ? [this.graphic()] : []));
    }

    private graphic(): Graphic {
        const name = this.reader.string();
        const fileName = this.reader.string();
        const particleEffectName = this.reader.string();
        const slpId = this.reader.int32();
        this.reader.skip(1 + 1);
        const layer = this.reader.uint8();
        this.reader.skip(2 + 1);
        this.reader.skip(2 * 4);
        const deltaCount = this.reader.int16();
        const soundId = this.reader.int16();
        this.reader.skip(4);
        const angleSoundsUsed = this.reader.uint8();
        const frameCount = this.reader.int16();
        const angleCount = this.reader.int16();
        const speedMultiplier = this.reader.float();
        const frameDuration = this.reader.float();
        const replayDelay = this.reader.float();
        const sequenceType = this.reader.uint8();
        const id = this.reader.int16();
        const mirroringMode = this.reader.uint8();
        this.reader.skip(1);
        this.reader.skip(deltaCount * GRAPHIC_DELTA_SIZE);
        // A value gate rather than a version one: the sounds are written only when the flag is set.
        if (angleSoundsUsed !== 0) this.reader.skip(angleCount * ANGLE_SOUND_SIZE);

        return {
            name,
            fileName,
            particleEffectName,
            slpId,
            layer,
            soundId,
            frameCount,
            angleCount,
            speedMultiplier,
            frameDuration,
            replayDelay,
            sequenceType,
            id,
            mirroringMode,
        };
    }

    private terrainBlock(): Terrain[] {
        this.reader.skip(4 + 4 + 4 * 4);
        this.reader.skip(TILE_TYPE_COUNT * 6 + 2);
        const terrains = this.reader.list(TERRAIN_COUNT, () => this.terrain());
        this.reader.skip(4 * 6);
        this.reader.skip(14 * 2);
        this.reader.skip(4 + 4 + 1);
        this.reader.skip(1 + 1);

        return terrains;
    }

    private terrain(): Terrain {
        const enabled = this.reader.int16();
        this.reader.skip(2 + 4);
        const name = this.reader.string();
        const fileName = this.reader.string();
        const slpId = this.reader.int32();
        this.reader.skip(4 + 4 + 4 + 4 + 4 + 4);
        this.reader.string();
        this.reader.skip(3 + 2 + 1 + 1 + 1 + 2 + 2);
        const soundId = this.reader.int32();
        this.reader.skip(4 + 2 + 2 + 4 + 1 + 1);
        this.reader.skip(TILE_TYPE_COUNT * 6);
        this.reader.skip(2 + 4);
        this.reader.skip(TERRAIN_UNITS_SIZE * 2 * 3 + TERRAIN_UNITS_SIZE);
        this.reader.skip(2 + 2);

        return { enabled, name, fileName, slpId, soundId };
    }

    private randomMaps(): void {
        const count = this.expect(this.reader.int32(), 10000, 'random map');
        this.reader.skip(4);

        const sizes = this.reader.list(count, () => {
            this.reader.skip(4 + 4 * 9);

            return this.reader.list(4, () => {
                const entries = this.reader.int32();
                this.reader.skip(4);

                return entries;
            });
        });

        const RECORD_SIZES = [40, 24, 52, 24];
        for (const map of sizes) {
            this.reader.skip(4 * 9);
            for (const [index, entries] of map.entries()) {
                this.reader.skip(4 + 4);
                this.reader.skip(entries * RECORD_SIZES[index]);
            }
        }
    }

    private effects(): GenieEffect[] {
        const count = this.expect(this.reader.int32(), 100000, 'effect');

        return this.reader.list(count, (): GenieEffect => {
            const name = this.reader.string();
            const commands = this.reader.int16();

            return {
                name,
                commands: this.reader.list(commands, (): EffectCommand => {
                    const type = this.reader.uint8();
                    const unit = this.reader.int16();
                    const unitClass = this.reader.int16();
                    const attribute = this.reader.int16();
                    const value = this.reader.float();

                    return { type, unit, unitClass, attribute, value };
                }),
            };
        });
    }

    private unitHeaders(): UnitHeader[] {
        const count = this.expect(this.reader.int32(), 100000, 'unit header');

        return this.reader.list(count, (): UnitHeader => {
            const exists = this.reader.uint8();
            if (exists === 0) return { exists, tasks: [] };

            const taskCount = this.reader.int16();

            return { exists, tasks: this.reader.list(taskCount, () => this.task()) };
        });
    }

    private task(): Task {
        return {
            taskType: this.reader.int16(),
            id: this.reader.int16(),
            isDefault: this.reader.uint8(),
            actionType: this.reader.int16(),
            classId: this.reader.int16(),
            unitId: this.reader.int16(),
            terrainId: this.reader.int16(),
            resourceIn: this.reader.int16(),
            resourceMultiplier: this.reader.int16(),
            resourceOut: this.reader.int16(),
            unusedResource: this.reader.int16(),
            workValue1: this.reader.float(),
            workValue2: this.reader.float(),
            workRange: this.reader.float(),
            autoSearchTargets: this.reader.uint8(),
            searchWaitTime: this.reader.float(),
            enableTargeting: this.reader.uint8(),
            combatLevelFlag: this.reader.uint8(),
            gatherType: this.reader.int16(),
            workFlag2: this.reader.int16(),
            targetDiplomacy: this.reader.uint8(),
            carryCheck: this.reader.uint8(),
            pickForConstruction: this.reader.uint8(),
            movingGraphicId: this.reader.int16(),
            proceedingGraphicId: this.reader.int16(),
            workingGraphicId: this.reader.int16(),
            carryingGraphicId: this.reader.int16(),
            gatherSoundId: this.reader.int16(),
            depositSoundId: this.reader.int16(),
            wwiseGatherSoundId: this.reader.uint32(),
            wwiseDepositSoundId: this.reader.uint32(),
            enabled: this.reader.int16(),
        };
    }

    private civilizations(): GenieCivilization[] {
        const count = this.expect(this.reader.int16(), 200, 'civilization');

        return this.reader.list(count, () => this.civilization());
    }

    private civilization(): GenieCivilization {
        const playerType = this.reader.uint8();
        const name = this.reader.string();
        const resourceCount = this.reader.int16();
        const techTreeId = this.reader.int16();
        const teamBonusId = this.reader.int16();
        const resources = this.reader.list(resourceCount, () => this.reader.float());
        const iconSet = this.reader.uint8();

        const unitCount = this.expect(this.reader.int16(), 20000, 'unit');
        const pointers = this.reader.list(unitCount, () => this.reader.int32());
        const units = new Map<number, GenieUnit>();

        for (const pointer of pointers) {
            if (!pointer) continue;

            const unit = this.unit();
            units.set(unit.id, unit);
        }

        return { playerType, name, resources, techTreeId, teamBonusId, iconSet, units };
    }

    private unit(): GenieUnit {
        const type = this.reader.uint8();
        const id = this.reader.int16();
        const unit: GenieUnit = { type, id, ...blankUnitFields() };

        unit.nameStringId = this.reader.int32();
        unit.creationStringId = this.reader.int32();
        unit.classId = this.reader.int16();
        unit.standingGraphics = this.reader.list(2, () => this.reader.int16());
        unit.dyingGraphic = this.reader.int16();
        unit.undeadGraphic = this.reader.int16();
        unit.undeadMode = this.reader.uint8();
        unit.hitPoints = this.reader.int16();
        unit.lineOfSight = this.reader.float();
        unit.garrisonCapacity = this.reader.uint8();
        unit.collisionSize = this.reader.list(3, () => this.reader.float());
        unit.trainSound = this.reader.int16();
        unit.damageSound = this.reader.int16();
        unit.deadUnitId = this.reader.int16();
        unit.bloodUnitId = this.reader.int16();
        unit.sortNumber = this.reader.uint8();
        unit.canBeBuiltOn = this.reader.uint8();
        unit.iconId = this.reader.int16();
        unit.hideInEditor = this.reader.uint8();
        unit.oldPortrait = this.reader.int16();
        unit.enabled = this.reader.uint8();
        unit.disabled = this.reader.uint8();
        unit.placementSideTerrain = this.reader.list(2, () => this.reader.int16());
        unit.placementTerrain = this.reader.list(2, () => this.reader.int16());
        unit.clearanceSize = this.reader.list(2, () => this.reader.float());
        unit.hillMode = this.reader.uint8();
        unit.fogVisibility = this.reader.uint8();
        unit.terrainRestriction = this.reader.int16();
        unit.flyMode = this.reader.uint8();
        unit.resourceCapacity = this.reader.int16();
        unit.resourceDecay = this.reader.float();
        unit.blastDefenseLevel = this.reader.uint8();
        unit.combatLevel = this.reader.uint8();
        unit.interactionMode = this.reader.uint8();
        unit.minimapMode = this.reader.uint8();
        unit.interfaceKind = this.reader.uint8();
        unit.multipleAttributeMode = this.reader.float();
        unit.minimapColour = this.reader.uint8();
        unit.helpStringId = this.reader.int32();
        unit.hotkeyTextStringId = this.reader.int32();
        unit.recyclable = this.reader.uint8();
        unit.enableAutoGather = this.reader.uint8();
        unit.createDoppelgangerOnDeath = this.reader.uint8();
        unit.resourceGatherGroup = this.reader.uint8();
        unit.occlusionMode = this.reader.uint8();
        unit.obstructionType = this.reader.uint8();
        unit.obstructionClass = this.reader.uint8();
        unit.trait = this.reader.uint8();
        unit.civilization = this.reader.uint8();
        unit.traitPiece = this.reader.int16();
        unit.selectionEffect = this.reader.uint8();
        unit.editorSelectionColour = this.reader.uint8();
        unit.outlineSize = this.reader.list(3, () => this.reader.float());
        unit.triggerWord0 = this.reader.int32();
        unit.triggerWord1 = this.reader.int32();
        unit.resourceStorages = this.reader.list(RESOURCE_STORAGE_COUNT, () => ({
            type: this.reader.int16(),
            amount: this.reader.float(),
            flag: this.reader.uint8(),
        }));

        const damageGraphicCount = this.reader.uint8();
        unit.damageGraphics = this.reader.list(damageGraphicCount, () => ({
            graphicId: this.reader.int16(),
            damagePercent: this.reader.int16(),
            applyMode: this.reader.uint8(),
        }));

        unit.selectionSound = this.reader.int16();
        unit.dyingSound = this.reader.int16();
        unit.wwiseTrainSoundId = this.reader.uint32();
        unit.wwiseDamageSoundId = this.reader.uint32();
        unit.wwiseSelectionSoundId = this.reader.uint32();
        unit.wwiseDyingSoundId = this.reader.uint32();
        unit.oldAttackReaction = this.reader.uint8();
        unit.convertTerrain = this.reader.uint8();
        unit.internalName = this.reader.string();
        unit.copyId = this.reader.int16();
        unit.baseId = this.reader.int16();

        if (type < UNIT_TYPE.flag) return unit;

        unit.speed = this.reader.float();
        if (type >= UNIT_TYPE.deadFish) this.deadFish(unit);
        if (type >= UNIT_TYPE.bird) this.bird(unit);
        if (type >= UNIT_TYPE.combatant) this.combatant(unit);
        if (type === UNIT_TYPE.projectile) this.projectile(unit);
        if (type >= UNIT_TYPE.creatable) this.creatable(unit);
        if (type === UNIT_TYPE.building) this.building(unit);

        return unit;
    }

    private deadFish(unit: GenieUnit): void {
        unit.walkingGraphic = this.reader.int16();
        unit.runningGraphic = this.reader.int16();
        unit.rotationSpeed = this.reader.float();
        unit.oldSizeClass = this.reader.uint8();
        unit.trackingUnit = this.reader.int16();
        unit.trackingUnitMode = this.reader.uint8();
        unit.trackingUnitDensity = this.reader.float();
        unit.oldMoveAlgorithm = this.reader.uint8();
        unit.turnRadius = this.reader.float();
        unit.turnRadiusSpeed = this.reader.float();
        unit.maxYawPerSecondMoving = this.reader.float();
        unit.stationaryYawRevolutionTime = this.reader.float();
        unit.maxYawPerSecondStationary = this.reader.float();
        unit.minCollisionSizeMultiplier = this.reader.float();
    }

    private bird(unit: GenieUnit): void {
        unit.defaultTaskId = this.reader.int16();
        unit.searchRadius = this.reader.float();
        unit.workRate = this.reader.float();
        const dropSiteCount = this.reader.int16();
        unit.dropSites = this.reader.list(dropSiteCount, () => this.reader.int16());
        unit.taskSwapGroup = this.reader.uint8();
        unit.attackSound = this.reader.int16();
        unit.moveSound = this.reader.int16();
        unit.wwiseAttackSoundId = this.reader.uint32();
        unit.wwiseMoveSoundId = this.reader.uint32();
        unit.runPattern = this.reader.uint8();
        const taskCount = this.reader.int16();
        unit.tasks = this.reader.list(taskCount, () => this.task());
    }

    private combatant(unit: GenieUnit): void {
        unit.baseArmour = this.reader.int16();
        unit.attacks = this.classAmounts();
        unit.armours = this.classAmounts();
        unit.defenseTerrainBonus = this.reader.int16();
        unit.bonusDamageResistance = this.reader.float();
        unit.maxRange = this.reader.float();
        unit.blastWidth = this.reader.float();
        unit.reloadTime = this.reader.float();
        unit.projectileUnitId = this.reader.int16();
        unit.accuracyPercent = this.reader.int16();
        unit.combatAbility = this.reader.uint8();
        unit.frameDelay = this.reader.int16();
        unit.graphicDisplacement = this.reader.list(3, () => this.reader.float());
        unit.blastAttackLevel = this.reader.uint8();
        unit.minRange = this.reader.float();
        unit.accuracyDispersion = this.reader.float();
        unit.attackGraphic = this.reader.int16();
        unit.displayedMeleeArmour = this.reader.int16();
        unit.displayedAttack = this.reader.int16();
        unit.displayedRange = this.reader.float();
        unit.displayedReloadTime = this.reader.float();
        unit.blastDamage = this.reader.float();
        unit.damageReflection = this.reader.float();
        unit.friendlyFireDamage = this.reader.float();
        unit.interruptFrame = this.reader.int16();
        unit.garrisonFirepower = this.reader.float();
        unit.attackGraphic2 = this.reader.int16();
    }

    private projectile(unit: GenieUnit): void {
        unit.projectileType = this.reader.uint8();
        unit.smartMode = this.reader.uint8();
        unit.hitMode = this.reader.uint8();
        unit.vanishMode = this.reader.uint8();
        unit.areaEffectSpecials = this.reader.uint8();
        unit.projectileArc = this.reader.float();
    }

    private classAmounts(): ClassAmount[] {
        const count = this.reader.int16();

        return this.reader.list(count, () => ({ class: this.reader.int16(), amount: this.reader.int16() }));
    }

    private creatable(unit: GenieUnit): void {
        unit.costs = this.reader.list(COST_COUNT, () => ({
            type: this.reader.int16(),
            amount: this.reader.int16(),
            flag: this.reader.int16(),
        }));

        const locationCount = this.reader.int16();
        unit.trainLocations = this.reader.list(locationCount, () => ({
            trainTime: this.reader.int16(),
            unitId: this.reader.int16(),
            buttonId: this.reader.uint8(),
            hotKeyId: this.reader.int32(),
        }));
        unit.trainTime = unit.trainLocations[0]?.trainTime ?? 0;
        unit.trainLocationIds = unit.trainLocations.map((location) => location.unitId);

        unit.rearAttackModifier = this.reader.float();
        unit.flankAttackModifier = this.reader.float();
        unit.creatableType = this.reader.uint8();
        unit.heroMode = this.reader.uint8();
        // The lowest bit marks a campaign character; the rest of the byte marks unrelated things.
        unit.isHero = (unit.heroMode & 1) !== 0;
        unit.garrisonGraphic = this.reader.int32();
        unit.spawningGraphic = this.reader.int16();
        unit.upgradeGraphic = this.reader.int16();
        unit.heroGlowGraphic = this.reader.int16();
        unit.idleAttackGraphic = this.reader.int16();
        unit.maxCharge = this.reader.float();
        unit.rechargeRate = this.reader.float();
        unit.chargeEvent = this.reader.int16();
        unit.chargeType = this.reader.int16();
        unit.chargeTarget = this.reader.int16();
        unit.chargeProjectileUnit = this.reader.int32();
        unit.attackPriority = this.reader.uint8();
        unit.invulnerabilityLevel = this.reader.float();
        unit.buttonIconId = this.reader.int16();
        unit.buttonShortTooltipId = this.reader.int32();
        unit.buttonExtendedTooltipId = this.reader.int32();
        unit.buttonHotkeyAction = this.reader.int16();
        unit.minConversionTimeModifier = this.reader.float();
        unit.maxConversionTimeModifier = this.reader.float();
        unit.conversionChanceModifier = this.reader.float();
        unit.totalProjectiles = this.reader.float();
        unit.maxTotalProjectiles = this.reader.uint8();
        unit.projectileSpawningArea = this.reader.list(3, () => this.reader.float());
        unit.secondaryProjectileUnit = this.reader.int32();
        unit.specialGraphic = this.reader.int32();
        unit.specialAbility = this.reader.uint8();
        unit.displayedPierceArmour = this.reader.int16();
    }

    private building(unit: GenieUnit): void {
        unit.constructionGraphicId = this.reader.int16();
        unit.snowGraphicId = this.reader.int16();
        unit.destructionGraphicId = this.reader.int16();
        unit.destructionRubbleGraphicId = this.reader.int16();
        unit.researchingGraphic = this.reader.int16();
        unit.researchCompletedGraphic = this.reader.int16();
        unit.adjacentMode = this.reader.uint8();
        unit.iconAngle = this.reader.int16();
        unit.disappearsWhenBuilt = this.reader.uint8();
        unit.stackUnitId = this.reader.int16();
        unit.foundationTerrainId = this.reader.int16();
        unit.oldOverlayId = this.reader.int16();
        unit.techId = this.reader.int16();
        unit.canBurn = this.reader.uint8();
        unit.annexes = this.reader.list(ANNEX_COUNT, () => ({
            unitId: this.reader.int16(),
            x: this.reader.float(),
            y: this.reader.float(),
        }));
        unit.headUnit = this.reader.int16();
        unit.transformUnit = this.reader.int16();
        unit.transformSound = this.reader.int16();
        unit.constructionSound = this.reader.int16();
        unit.wwiseTransformSoundId = this.reader.uint32();
        unit.wwiseConstructionSoundId = this.reader.uint32();
        unit.garrisonType = this.reader.uint8();
        unit.garrisonHealRate = this.reader.float();
        unit.garrisonRepairRate = this.reader.float();
        unit.pileUnit = this.reader.int16();
        unit.lootingTable = this.reader.list(LOOT_COUNT, () => this.reader.uint8());
    }

    private technologies(): GenieTech[] {
        const count = this.expect(this.reader.int16(), 20000, 'technology');

        return this.reader.list(count, (): GenieTech => {
            const prerequisites = this.reader.list(REQUIRED_TECH_COUNT, () => this.reader.int16());
            const costs = this.reader.list(COST_COUNT, () => ({
                type: this.reader.int16(),
                amount: this.reader.int16(),
                flag: this.reader.uint8(),
            }));
            const requiredTechCount = this.reader.int16();
            const civ = this.reader.int16();
            const fullTechMode = this.reader.int16();
            const nameStringId = this.reader.int32();
            const descriptionStringId = this.reader.int32();
            const effectId = this.reader.int16();
            const type = this.reader.int16();
            const iconId = this.reader.int16();
            const helpStringId = this.reader.int32();
            const techTreeStringId = this.reader.int32();
            const internalName = this.reader.string();
            const repeatable = this.reader.uint8();

            const locationCount = this.reader.int16();
            const locations = this.reader.list(locationCount, () => ({
                locationId: this.reader.int16(),
                researchTime: this.reader.int16(),
                buttonId: this.reader.uint8(),
                hotKeyId: this.reader.int32(),
            }));

            return {
                prerequisites: prerequisites.filter((id) => id >= 0),
                requiredTechCount,
                costs,
                civ,
                fullTechMode,
                nameStringId,
                descriptionStringId,
                effectId,
                type,
                iconId,
                helpStringId,
                techTreeStringId,
                internalName,
                repeatable,
                researchTime: locations[0]?.researchTime ?? 0,
                researchLocationIds: locations.map((location) => location.locationId),
                locations,
            };
        });
    }

    private counters(): GameCounters {
        return {
            timeSlice: this.reader.int32(),
            unitKillRate: this.reader.int32(),
            unitKillTotal: this.reader.int32(),
            unitHitPointRate: this.reader.int32(),
            unitHitPointTotal: this.reader.int32(),
            razingKillRate: this.reader.int32(),
            razingKillTotal: this.reader.int32(),
        };
    }

    private techTree(): GenieTechTree {
        const ageCount = this.expect(this.reader.uint8(), 20, 'tech tree age');
        const buildingCount = this.expect(this.reader.uint8(), 200, 'tech tree building');
        // Widened at this revision, because the unit count had already reached a byte's ceiling.
        const unitCount = this.expect(this.reader.int16(), 20000, 'tech tree unit');
        // Not widened, which leaves the format a hard ceiling of 255 research connections.
        const researchCount = this.expect(this.reader.uint8(), 250, 'tech tree research');
        const totalUnitTechGroups = this.reader.int32();

        return {
            totalUnitTechGroups,
            ages: this.reader.list(ageCount, () => this.ageConnection()),
            buildings: this.reader.list(buildingCount, () => this.buildingConnection()),
            units: this.reader.list(unitCount, () => this.unitConnection()),
            researches: this.reader.list(researchCount, () => this.researchConnection()),
        };
    }

    private connectionCommon(): ConnectionCommon {
        return {
            slotsUsed: this.reader.int32(),
            unitResearch: this.reader.list(CONNECTION_SLOTS, () => this.reader.int32()),
            mode: this.reader.list(CONNECTION_SLOTS, () => this.reader.int32()),
        };
    }

    private countedIds(): number[] {
        const count = this.reader.uint8();

        return this.reader.list(count, () => this.reader.int32());
    }

    private ageConnection(): AgeConnection {
        const id = this.reader.int32();
        const status = this.reader.uint8();
        const buildings = this.countedIds();
        const units = this.countedIds();
        const techs = this.countedIds();
        const common = this.connectionCommon();
        const numBuildingLevels = this.reader.uint8();
        const buildingsPerZone = this.reader.list(ZONE_COUNT, () => this.reader.uint8());
        const groupLengthPerZone = this.reader.list(ZONE_COUNT, () => this.reader.uint8());
        const maxAgeLength = this.reader.uint8();
        const lineMode = this.reader.int32();

        return {
            id,
            status,
            buildings,
            units,
            techs,
            common,
            numBuildingLevels,
            buildingsPerZone,
            groupLengthPerZone,
            maxAgeLength,
            lineMode,
        };
    }

    private buildingConnection(): BuildingConnection {
        const id = this.reader.int32();
        const status = this.reader.uint8();
        const buildings = this.countedIds();
        const units = this.countedIds();
        const techs = this.countedIds();
        const common = this.connectionCommon();
        const locationInAge = this.reader.uint8();
        const unitsTechsTotal = this.reader.list(5, () => this.reader.uint8());
        const unitsTechsFirst = this.reader.list(5, () => this.reader.uint8());
        const lineMode = this.reader.int32();
        const enablingResearch = this.reader.int32();

        return {
            id,
            status,
            buildings,
            units,
            techs,
            common,
            locationInAge,
            unitsTechsTotal,
            unitsTechsFirst,
            lineMode,
            enablingResearch,
        };
    }

    private unitConnection(): UnitConnection {
        const id = this.reader.int32();
        const status = this.reader.uint8();
        const upperBuilding = this.reader.int32();
        const common = this.connectionCommon();
        const verticalLine = this.reader.int32();
        const units = this.countedIds();
        const locationInAge = this.reader.int32();
        const requiredResearch = this.reader.int32();
        const lineMode = this.reader.int32();
        const enablingResearch = this.reader.int32();

        return {
            id,
            status,
            upperBuilding,
            common,
            verticalLine,
            units,
            locationInAge,
            requiredResearch,
            lineMode,
            enablingResearch,
        };
    }

    private researchConnection(): ResearchConnection {
        const id = this.reader.int32();
        const status = this.reader.uint8();
        const upperBuilding = this.reader.int32();
        const buildings = this.countedIds();
        const units = this.countedIds();
        const techs = this.countedIds();
        const common = this.connectionCommon();
        const verticalLine = this.reader.int32();
        const locationInAge = this.reader.int32();
        const lineMode = this.reader.int32();

        return {
            id,
            status,
            upperBuilding,
            buildings,
            units,
            techs,
            common,
            verticalLine,
            locationInAge,
            lineMode,
        };
    }
}

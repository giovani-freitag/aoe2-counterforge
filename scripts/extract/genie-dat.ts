import { BinaryReader } from './binary-reader.ts';

/** Unit type tiers; each tier adds a block of fields to the record. */
export const UNIT_TYPE = {
    flag: 20,
    deadFish: 30,
    bird: 40,
    combatant: 50,
    projectile: 60,
    creatable: 70,
    building: 80,
    tree: 90,
} as const;

export interface ClassAmount {
    class: number;
    amount: number;
}

export interface ResourceAmount {
    type: number;
    amount: number;
}

export interface GenieUnit {
    /** Short name the designers use in the files, such as "VILLAGER_LUMBERJACK". */
    internalName: string;
    /** What kind of thing the game thinks it is: a villager, a soldier, a trade cart, a ship. */
    creatableType: number;
    /** Set for the named characters of the campaigns, which no skirmish ever produces. */
    isHero: boolean;
    id: number;
    type: number;
    nameStringId: number;
    creationStringId: number;
    helpStringId: number;
    classId: number;
    hitPoints: number;
    lineOfSight: number;
    garrisonCapacity: number;
    iconId: number;
    speed: number;
    attacks: ClassAmount[];
    armours: ClassAmount[];
    baseArmour: number;
    maxRange: number;
    minRange: number;
    blastWidth: number;
    reloadTime: number;
    /** The missile record this unit fires, or a negative id when it fires none. */
    projectileUnitId: number;
    accuracyPercent: number;
    frameDelay: number;
    displayedAttack: number;
    displayedMeleeArmour: number;
    displayedPierceArmour: number;
    displayedRange: number;
    displayedReloadTime: number;
    costs: ResourceAmount[];
    trainTime: number;
    trainLocationIds: number[];
}

export interface GenieCivilization {
    name: string;
    /** Starting value of every resource slot, including the ones that are really settings. */
    resources: number[];
    techTreeId: number;
    teamBonusId: number;
    units: Map<number, GenieUnit>;
}

export interface EffectCommand {
    /** 0 sets an attribute, 4 adds to it, 5 multiplies it; the rest are not about units. */
    type: number;
    /** Unit the command applies to, or -1 for every unit of the class. */
    unit: number;
    /** Class the command applies to, or -1 when it names a single unit. */
    unitClass: number;
    /** Which attribute is touched, such as hit points or attack. */
    attribute: number;
    value: number;
}

export interface GenieEffect {
    name: string;
    commands: EffectCommand[];
}

export interface GenieTech {
    /** Index into the effect table, or -1 for a technology that changes nothing directly. */
    effectId: number;
    /** Technologies that must be researched first; -1 fills the unused slots. */
    prerequisites: number[];
    nameStringId: number;
    descriptionStringId: number;
    iconId: number;
    civ: number;
    researchTime: number;
    researchLocationIds: number[];
    costs: ResourceAmount[];
}

export interface GenieData {
    version: string;
    civilizations: GenieCivilization[];
    technologies: GenieTech[];
    effects: GenieEffect[];
}

const VERSION_SIZE = 8;
const TILE_TYPE_COUNT = 19;
const TERRAIN_COUNT = 200;
const TERRAIN_UNITS_SIZE = 30;
const TASK_SIZE = 69;
const REQUIRED_TECH_COUNT = 6;
const ANGLE_SOUND_SIZE = 24;
const GRAPHIC_DELTA_SIZE = 16;

/**
 * Reads the decompressed game data file.
 *
 * The file is one long sequence with no index, so every section has to be walked in order even
 * when the guide only needs the last two. Sections that carry nothing useful are stepped over by
 * their exact size rather than searched for, and each one ends with a sanity check on the count
 * that follows it, so a layout change surfaces as a clear error instead of silent garbage.
 */
export class GenieDatReader {
    private readonly reader: BinaryReader;

    constructor(config: { buffer: Buffer }) {
        this.reader = new BinaryReader({ buffer: config.buffer });
    }

    /**
     * Parses the file down to the civilization and technology tables.
     *
     * @returns The unit stats per civilization plus every technology.
     * @throws Error when a section header falls outside a plausible range, which means the layout
     *     no longer matches the one this reader was written for.
     */
    public read(): GenieData {
        const version = this.version();

        this.terrainRestrictions();
        this.playerColours();
        this.sounds();
        this.graphics();
        this.terrainBlock();
        this.randomMaps();
        const effects = this.effects();
        this.unitHeaders();

        const civilizations = this.civilizations();
        const technologies = this.technologies();

        return { version, civilizations, technologies, effects };
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

    private terrainRestrictions(): void {
        const restrictionCount = this.expect(this.reader.int16(), 1000, 'terrain restriction');
        const terrainCount = this.expect(this.reader.int16(), 1000, 'terrain');

        this.reader.skip(restrictionCount * 4 * 2);
        this.reader.skip(restrictionCount * terrainCount * (4 + 16));
    }

    private playerColours(): void {
        const count = this.expect(this.reader.int16(), 1000, 'player colour');
        this.reader.skip(count * 36);
    }

    private sounds(): void {
        const count = this.expect(this.reader.int16(), 20000, 'sound');
        for (let index = 0; index < count; index += 1) {
            this.reader.skip(4);
            const files = this.reader.int16();
            this.reader.skip(6);
            for (let file = 0; file < files; file += 1) {
                this.reader.string();
                this.reader.skip(10);
            }
        }
    }

    private graphics(): void {
        const count = this.expect(this.reader.int16(), 100000, 'graphic');
        const pointers = this.reader.list(count, () => this.reader.int32());

        for (const pointer of pointers) {
            if (!pointer) continue;
            this.graphic();
        }
    }

    private graphic(): void {
        this.reader.string();
        this.reader.string();
        this.reader.string();
        this.reader.skip(4 + 1 + 1 + 1 + 2 + 1 + 8);
        const deltaCount = this.reader.int16();
        this.reader.skip(2 + 4);
        const angleSoundsUsed = this.reader.uint8();
        this.reader.skip(2);
        const angleCount = this.reader.int16();
        this.reader.skip(4 + 4 + 4 + 1 + 2 + 1 + 1);
        this.reader.skip(deltaCount * GRAPHIC_DELTA_SIZE);
        if (angleSoundsUsed !== 0) this.reader.skip(angleCount * ANGLE_SOUND_SIZE);
    }

    private terrainBlock(): void {
        this.reader.skip(4 + 4 + 4 * 4);
        this.reader.skip(TILE_TYPE_COUNT * 6 + 2);
        for (let index = 0; index < TERRAIN_COUNT; index += 1) this.terrain();
        this.reader.skip(4 * 6);
        this.reader.skip(14 * 2);
        this.reader.skip(4 + 4 + 1);
        this.reader.skip(1 + 1);
    }

    private terrain(): void {
        this.reader.skip(2 + 2 + 4);
        this.reader.string();
        this.reader.string();
        this.reader.skip(4 + 4 + 4 + 4 + 4 + 4 + 4);
        this.reader.string();
        this.reader.skip(3 + 2 + 1 + 1 + 1 + 2 + 2 + 4 + 4 + 2 + 2 + 4 + 1 + 1);
        this.reader.skip(TILE_TYPE_COUNT * 6);
        this.reader.skip(2 + 4);
        this.reader.skip(TERRAIN_UNITS_SIZE * 2 * 3 + TERRAIN_UNITS_SIZE);
        this.reader.skip(2 + 2);
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

    private unitHeaders(): void {
        const count = this.expect(this.reader.int32(), 100000, 'unit header');
        for (let index = 0; index < count; index += 1) {
            if (this.reader.uint8() === 0) continue;

            const tasks = this.reader.int16();
            this.reader.skip(tasks * TASK_SIZE);
        }
    }

    private civilizations(): GenieCivilization[] {
        const count = this.expect(this.reader.int16(), 200, 'civilization');

        return this.reader.list(count, () => this.civilization());
    }

    private civilization(): GenieCivilization {
        this.reader.skip(1);
        const name = this.reader.string();
        const resourceCount = this.reader.int16();
        const techTreeId = this.reader.int16();
        const teamBonusId = this.reader.int16();
        const resources = this.reader.list(resourceCount, () => this.reader.float());
        this.reader.skip(1);

        const unitCount = this.expect(this.reader.int16(), 20000, 'unit');
        const pointers = this.reader.list(unitCount, () => this.reader.int32());
        const units = new Map<number, GenieUnit>();

        for (const pointer of pointers) {
            if (!pointer) continue;

            const unit = this.unit();
            units.set(unit.id, unit);
        }

        return { name, techTreeId, teamBonusId, resources, units };
    }

    private unit(): GenieUnit {
        const type = this.reader.uint8();
        const id = this.reader.int16();
        const nameStringId = this.reader.int32();
        const creationStringId = this.reader.int32();
        const classId = this.reader.int16();
        this.reader.skip(4 + 2 + 2 + 1);
        const hitPoints = this.reader.int16();
        const lineOfSight = this.reader.float();
        const garrisonCapacity = this.reader.uint8();
        this.reader.skip(12 + 2 + 2 + 2 + 2 + 1 + 1);
        const iconId = this.reader.int16();
        this.reader.skip(1 + 2 + 1 + 1 + 4 + 4 + 8 + 1 + 1 + 2 + 1 + 2 + 4 + 1 + 1 + 1 + 1 + 1 + 4 + 1);
        const helpStringId = this.reader.int32();
        this.reader.skip(4);
        this.reader.skip(1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 2 + 1 + 1 + 12 + 8);
        this.reader.skip(3 * 7);

        const damageGraphics = this.reader.uint8();
        this.reader.skip(damageGraphics * 5);
        this.reader.skip(2 + 2 + 16 + 1 + 1);
        const internalName = this.reader.string();
        this.reader.skip(2 + 2);

        const unit = this.emptyUnit({
            id,
            type,
            internalName,
            nameStringId,
            creationStringId,
            helpStringId,
            classId,
            hitPoints,
            lineOfSight,
            garrisonCapacity,
            iconId,
        });

        if (type === UNIT_TYPE.tree || type < UNIT_TYPE.flag) return unit;

        unit.speed = this.reader.float();
        if (type >= UNIT_TYPE.deadFish) this.deadFish();
        if (type >= UNIT_TYPE.bird) this.bird();
        if (type >= UNIT_TYPE.combatant) this.combatant(unit);
        if (type === UNIT_TYPE.projectile) this.reader.skip(5 + 4);
        if (type >= UNIT_TYPE.creatable) this.creatable(unit);
        if (type === UNIT_TYPE.building) this.building();

        return unit;
    }

    private emptyUnit(header: Pick<
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
    >): GenieUnit {
        return {
            ...header,
            speed: 0,
            attacks: [],
            armours: [],
            creatableType: 0,
            isHero: false,
            baseArmour: 0,
            maxRange: 0,
            minRange: 0,
            blastWidth: 0,
            reloadTime: 0,
            projectileUnitId: -1,
            accuracyPercent: 0,
            frameDelay: 0,
            displayedAttack: 0,
            displayedMeleeArmour: 0,
            displayedPierceArmour: 0,
            displayedRange: 0,
            displayedReloadTime: 0,
            costs: [],
            trainTime: 0,
            trainLocationIds: [],
        };
    }

    private deadFish(): void {
        this.reader.skip(2 + 2 + 4 + 1 + 2 + 1 + 4 + 1 + 4 * 5 + 4);
    }

    private bird(): void {
        this.reader.skip(2 + 4 + 4);
        const dropSites = this.reader.int16();
        this.reader.skip(dropSites * 2);
        this.reader.skip(1 + 2 + 2 + 4 + 4 + 1);
        const tasks = this.reader.int16();
        this.reader.skip(tasks * TASK_SIZE);
    }

    private combatant(unit: GenieUnit): void {
        unit.baseArmour = this.reader.int16();
        unit.attacks = this.classAmounts();
        unit.armours = this.classAmounts();
        this.reader.skip(2 + 4);
        unit.maxRange = this.reader.float();
        unit.blastWidth = this.reader.float();
        unit.reloadTime = this.reader.float();
        unit.projectileUnitId = this.reader.int16();
        unit.accuracyPercent = this.reader.int16();
        this.reader.skip(1);
        unit.frameDelay = this.reader.int16();
        this.reader.skip(12 + 1);
        unit.minRange = this.reader.float();
        this.reader.skip(4 + 2);
        unit.displayedMeleeArmour = this.reader.int16();
        unit.displayedAttack = this.reader.int16();
        unit.displayedRange = this.reader.float();
        unit.displayedReloadTime = this.reader.float();
        this.reader.skip(4 + 4 + 4 + 2 + 4 + 2);
    }

    private classAmounts(): ClassAmount[] {
        const count = this.reader.int16();

        return this.reader.list(count, () => ({ class: this.reader.int16(), amount: this.reader.int16() }));
    }

    private creatable(unit: GenieUnit): void {
        unit.costs = this.reader.list(3, () => {
            const type = this.reader.int16();
            const amount = this.reader.int16();
            this.reader.skip(2);

            return { type, amount };
        });

        const locationCount = this.reader.int16();
        const locations = this.reader.list(locationCount, () => {
            const trainTime = this.reader.int16();
            const unitId = this.reader.int16();
            this.reader.skip(1 + 4);

            return { trainTime, unitId };
        });
        unit.trainTime = locations[0]?.trainTime ?? 0;
        unit.trainLocationIds = locations.map((location) => location.unitId);

        this.reader.skip(4 + 4);
        unit.creatableType = this.reader.uint8();
        unit.isHero = this.reader.uint8() === 1;
        this.reader.skip(4 + 2 + 2 + 2 + 2 + 4 + 4 + 2 + 2 + 2 + 4 + 1 + 4);
        this.reader.skip(2 + 4 + 4 + 2 + 4 + 4 + 4);
        this.reader.skip(4 + 1 + 12 + 4 + 4 + 1);
        unit.displayedPierceArmour = this.reader.int16();
    }

    private building(): void {
        this.reader.skip(2 * 6 + 1 + 2 + 1 + 2 + 2 + 2 + 2 + 1 + 40 + 2 + 2 + 2 + 2 + 4 + 4 + 1 + 4 + 4 + 2 + 6);
    }

    private technologies(): GenieTech[] {
        const count = this.expect(this.reader.int16(), 20000, 'technology');

        return this.reader.list(count, (): GenieTech => {
            const prerequisites = this.reader.list(REQUIRED_TECH_COUNT, () => this.reader.int16());
            const costs = this.reader.list(3, () => {
                const type = this.reader.int16();
                const amount = this.reader.int16();
                this.reader.skip(1);

                return { type, amount };
            });
            this.reader.skip(2);
            const civ = this.reader.int16();
            this.reader.skip(2);
            const nameStringId = this.reader.int32();
            const descriptionStringId = this.reader.int32();
            const effectId = this.reader.int16();
            this.reader.skip(2);
            const iconId = this.reader.int16();
            this.reader.skip(4 + 4);
            this.reader.string();
            this.reader.skip(1);

            const locationCount = this.reader.int16();
            const locations = this.reader.list(locationCount, () => {
                const locationId = this.reader.int16();
                const researchTime = this.reader.int16();
                this.reader.skip(1 + 4);

                return { locationId, researchTime };
            });

            return {
                effectId,
                prerequisites: prerequisites.filter((id) => id >= 0),
                costs,
                civ,
                nameStringId,
                descriptionStringId,
                iconId,
                researchTime: locations[0]?.researchTime ?? 0,
                researchLocationIds: locations.map((location) => location.locationId),
            };
        });
    }
}

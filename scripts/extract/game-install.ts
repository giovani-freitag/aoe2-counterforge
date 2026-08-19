import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { GenieDatReader, type GenieData } from './genie-dat.ts';

/** Node in a civilization tech tree, as the game writes it. */
export interface TechTreeNode {
    Name: string;
    'Node Type': string;
    'Link Node Type'?: string;
    'Use Type': string;
    'Node Status': string;
    'Name String ID': number;
    'Age ID': number;
    'Building ID': number;
    'Help String ID'?: number;
    'Link ID'?: number;
    'Trigger Tech ID'?: number;
    'Prerequisite IDs'?: number[];
    'Prerequisite Types'?: string[];
    'Node ID': number;
    'Picture Index'?: number;
}

export interface CivilizationTechTree {
    civ_id: string;
    civ_techs_buildings: TechTreeNode[];
    civ_techs_units: TechTreeNode[];
}

export interface GameInstallConfig {
    /** Root of the installed game, the folder holding resources/ and widgetui/. */
    root: string;
}

const DATA_FILE = 'resources/_common/dat/empires2_x2_p1.dat';
const TECH_TREE_DIR = 'resources/_common/dat/CivTechTrees';
const STRING_FILE = 'strings/key-value/key-value-strings-utf8.txt';
const MAX_INFLATED_BYTES = 1 << 30;

/** A string line is an id, whitespace, then the text in double quotes. */
const STRING_LINE = /^(\d+)\s+"(.*)"\s*$/;

/** Reads the three things the guide needs out of an installed copy of the game. */
export class GameInstall {
    private readonly root: string;

    constructor(config: GameInstallConfig) {
        this.root = config.root;

        if (!existsSync(join(this.root, DATA_FILE))) {
            throw new Error(`No game data file under "${this.root}". Point AOE2_GAME_ROOT at the install folder.`);
        }
    }

    /**
     * Parses the binary data file holding every unit and technology stat.
     *
     * @returns The civilization, technology and effect tables.
     */
    public readGameData(): GenieData {
        const compressed = readFileSync(join(this.root, DATA_FILE));
        const raw = inflateRawSync(compressed, { maxOutputLength: MAX_INFLATED_BYTES });

        return new GenieDatReader({ buffer: raw }).read();
    }

    /**
     * Reads the tech tree layout of every civilization.
     *
     * @returns One entry per civilization, keyed by the game's own identifier.
     */
    public readTechTrees(): CivilizationTechTree[] {
        const directory = join(this.root, TECH_TREE_DIR);

        return readdirSync(directory)
            .filter((entry) => entry.endsWith('.json'))
            .map((entry) => JSON.parse(readFileSync(join(directory, entry), 'utf8')) as CivilizationTechTree);
    }

    /**
     * Reads one localized string table.
     *
     * @param language - Folder name of the language inside resources, such as "br" or "en".
     * @returns Every numbered string, with the escape sequences resolved.
     */
    public readStrings(language: string): Map<number, string> {
        const file = join(this.root, 'resources', language, STRING_FILE);
        const strings = new Map<number, string>();

        for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
            const match = STRING_LINE.exec(line);
            if (!match) continue;

            strings.set(Number(match[1]), match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
        }

        return strings;
    }

    /**
     * Absolute path of a folder inside the install.
     *
     * @param parts - Path segments below the install root.
     * @returns The joined absolute path.
     */
    public path(...parts: string[]): string {
        return join(this.root, ...parts);
    }
}

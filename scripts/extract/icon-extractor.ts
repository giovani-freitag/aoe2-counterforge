import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GameInstall } from './game-install.ts';
import { paintPlayerColour, resizeImage, saturateImage, sharpenImage, type Image } from './image.ts';
import { encodePng } from './png-encoder.ts';
import { TextureConverter } from './texture-converter.ts';

export interface IconExtractorConfig {
    install: GameInstall;
    /** Folder the shipped icons live in, one subfolder per kind. */
    outputDirectory: string;
}

const CONVERTER = 'Tools_Builds/texconv.exe';
const UNIT_TEXTURES = 'widgetui/textures/ingame/units';
const TECH_TEXTURES = 'widgetui/textures/ingame/tech';
const EMBLEMS = 'widgetui/textures/menu/civs';
const PANELS = 'widgetui/textures/ingame/panels';
const HUD_ICONS = 'widgetui/textures/ingame/icons';
const CIV_PANELS = 'widgetui/textures/ingame/panels/WEST';

/**
 * Pieces of the game's own interface the guide reuses.
 *
 * They ship at the size the game drew them: the shields are not square, so scaling them here
 * would only squash the crest.
 */
const INTERFACE_PIECES = [
    { folder: CIV_PANELS, file: 'shield_dark_age_west_normal.png', name: 'age-1.png' },
    { folder: CIV_PANELS, file: 'shield_feudal_age_west_normal.png', name: 'age-2.png' },
    { folder: CIV_PANELS, file: 'shield_castle_age_west_normal.png', name: 'age-3.png' },
    { folder: CIV_PANELS, file: 'shield_imperial_age_west_normal.png', name: 'age-4.png' },
    { folder: PANELS, file: 'blank_icon.png', name: 'slot.png' },
    { folder: HUD_ICONS, file: 'resource_food_transparent.png', name: 'food.png' },
    { folder: HUD_ICONS, file: 'resource_wood_transparent.png', name: 'wood.png' },
    { folder: HUD_ICONS, file: 'resource_gold_transparent.png', name: 'gold.png' },
    { folder: HUD_ICONS, file: 'resource_stone_transparent.png', name: 'stone.png' },
];

/**
 * Largest side an icon is written at.
 *
 * The textures are 256 pixels wide, so this keeps every one of them whole: nothing is averaged
 * away and no screen can ask for more detail than the game itself drew.
 */
const ICON_SIZE = 256;

/**
 * Correction applied after scaling an icon down from the 256 pixel texture.
 *
 * Averaging four by four pixels into one softens every edge and pulls the colours towards the
 * middle, which at icon size reads as a washed out picture.
 */
const SHARPEN = 0.6;
const SATURATE = 1.2;

/**
 * Colour the guide paints the player-owned parts of a unit with.
 *
 * It is the blue the game gives the first player, entry 21 of its own interface palette. Nothing
 * on a page belongs to anybody, so every unit wears the colour the game opens with.
 */
const PLAYER_COLOUR = [110, 166, 235] as const;

/** A texture file opens with the index the data file refers to it by. */
const INDEXED_TEXTURE = /^(\d+)_/;

/**
 * Maps the leading index of every texture file to its name.
 *
 * @param fileNames - Names of the files in one texture folder.
 * @returns The file behind each index, ignoring anything not numbered.
 */
export function textureIndex(fileNames: readonly string[]): Map<number, string> {
    const index = new Map<number, string>();

    for (const name of fileNames) {
        const match = INDEXED_TEXTURE.exec(name);
        if (match) index.set(Number(match[1]), name);
    }

    return index;
}

/** Copies the artwork the guide displays out of an installed copy of the game. */
export class IconExtractor {
    private readonly config: IconExtractorConfig;

    constructor(config: IconExtractorConfig) {
        this.config = config;
    }

    /**
     * Writes the icon of every unit the dataset points at.
     *
     * @param indices - Picture indices taken from the unit records.
     * @returns How many icons were written.
     */
    public async renderUnits(indices: readonly number[]): Promise<number> {
        return this.emit({
            sources: this.indexedSources(UNIT_TEXTURES, indices, 'Unit'),
            target: 'Unit',
            prepare: (image) => this.toIcon(image, ICON_SIZE),
        });
    }

    /**
     * Writes the icon of every technology the dataset points at.
     *
     * @param indices - Picture indices taken from the technology records.
     * @returns How many icons were written.
     */
    public async renderTechnologies(indices: readonly number[]): Promise<number> {
        return this.emit({
            sources: this.indexedSources(TECH_TEXTURES, indices, 'Tech'),
            target: 'Tech',
            prepare: (image) => this.toIcon(image, ICON_SIZE),
        });
    }

    /**
     * Writes the emblem of every civilization the dataset lists.
     *
     * @param slugs - Emblem names taken from the civilization records.
     * @returns How many emblems were written.
     */
    public async renderEmblems(slugs: readonly string[]): Promise<number> {
        const available = new Map(
            readdirSync(this.config.install.path(EMBLEMS)).map((name) => [name.toLowerCase(), name]),
        );

        const sources = new Map<string, string>();
        for (const slug of new Set(slugs)) {
            const source = available.get(`${slug}.png`);
            if (!source) {
                process.stderr.write(`skip Civs/${slug}: the install ships no such emblem\n`);
                continue;
            }

            sources.set(this.config.install.path(EMBLEMS, source), `${slug}.png`);
        }

        return this.emit({ sources, target: 'Civs', prepare: (image) => image });
    }

    /**
     * Writes the pieces of the game's own interface that the guide reuses.
     *
     * @returns How many pieces were written.
     */
    public async renderInterface(): Promise<number> {
        const sources = new Map(
            INTERFACE_PIECES.map((piece) => [this.config.install.path(piece.folder, piece.file), piece.name]),
        );

        return this.emit({ sources, target: 'ui', prepare: (image) => image });
    }

    /** Textures behind a list of picture indices, warning about the ones the install lacks. */
    private indexedSources(folder: string, indices: readonly number[], label: string): Map<string, string> {
        const index = textureIndex(readdirSync(this.config.install.path(folder)));
        const sources = new Map<string, string>();

        for (const picture of new Set(indices)) {
            const name = index.get(picture);
            if (!name) {
                process.stderr.write(`skip ${label}/${String(picture)}: the install ships no such texture\n`);
                continue;
            }

            sources.set(this.config.install.path(folder, name), `${String(picture)}.png`);
        }

        return sources;
    }

    /**
     * Turns a texture into an icon.
     *
     * A texture that already fits is only painted; one that has to be scaled down also gets back
     * the edge definition and the colour that averaging its pixels takes away.
     */
    private toIcon(image: Image, size: number): Image {
        const painted = paintPlayerColour(image, PLAYER_COLOUR);
        if (image.width <= size) return painted;

        return saturateImage(sharpenImage(resizeImage(painted, size), SHARPEN), SATURATE);
    }

    private async emit(input: {
        sources: Map<string, string>;
        target: string;
        prepare: (image: Image) => Image;
    }): Promise<number> {
        const destination = join(this.config.outputDirectory, input.target);
        mkdirSync(destination, { recursive: true });
        const workspace = mkdtempSync(join(tmpdir(), 'aoe2-icons-'));

        try {
            const converter = new TextureConverter({
                executable: this.config.install.path(CONVERTER),
                workingDirectory: workspace,
            });
            const decoded = converter.decode([...input.sources.keys()]);

            let written = 0;
            for (const [source, name] of input.sources) {
                const image = decoded.get(source);
                if (!image) continue;

                writeFileSync(join(destination, name), await encodePng(input.prepare(image)));
                written += 1;
            }

            return written;
        } finally {
            rmSync(workspace, { recursive: true, force: true });
        }
    }
}

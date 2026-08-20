/**
 * Writes everything the game's data files carry into readable JSON.
 *
 * This is not the dataset the application ships — that one is curated, small and committed. This
 * one is faithful and large: every field of every record, under the ids the game itself uses, so
 * that a question about the game can be answered by reading a file instead of by opening the
 * binary again. Point AOE2_GAME_ROOT at the install and pass an output folder.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameInstall } from './extract/game-install.ts';
import type { GenieUnit } from './extract/genie-dat.ts';

if (existsSync('.env')) process.loadEnvFile('.env');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, process.argv[2] ?? 'exports');

/** Locale tags to write, mapped to the language folder inside the install. */
const LOCALES: Record<string, string> = { en: 'en', 'pt-BR': 'br' };

/** Files the game keeps beside the binary, which carry data rather than assets. */
const SIBLINGS: Record<string, string[]> = {
    'unit-lines.json': ['resources', '_common', 'dat', 'unitlines.json'],
    'civilization-list.json': ['resources', '_common', 'dat', 'civilizations.json'],
    'eras.json': ['resources', '_common', 'dat', 'eras.json'],
    'drop-sites.json': ['resources', '_common', 'dat', 'dropsites.json'],
};

function write(name: string, payload: unknown): number {
    const body = `${JSON.stringify(payload, null, 1)}\n`;
    writeFileSync(join(OUT, name), body, 'utf8');

    return body.length;
}

/**
 * The fields of one record that differ from the same record in the reference table.
 *
 * Sixty civilizations each carry the whole roster, and all but a few hundred entries are identical
 * copies. Writing the reference once and the differences beside it keeps every byte of what the
 * game says without repeating it sixty times.
 *
 * @param unit - The civilization's copy of the record.
 * @param reference - The same record in the reference table.
 * @returns Only the fields that changed, or null when nothing did.
 */
function differences(unit: GenieUnit, reference: GenieUnit | undefined): Partial<GenieUnit> | null {
    if (!reference) return unit;

    const changed = Object.entries(unit).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(reference[key as keyof GenieUnit]),
    );

    return changed.length === 0 ? null : (Object.fromEntries(changed));
}

const root = process.env.AOE2_GAME_ROOT;
if (!root) throw new Error('Set AOE2_GAME_ROOT in .env, or in the environment, to the game folder.');

const install = new GameInstall({ root });
const game = install.readGameData();

mkdirSync(OUT, { recursive: true });

const reference = game.civilizations[0];
const written: Record<string, number> = {};

written['units.json'] = write('units.json', [...reference.units.values()]);

written['unit-overrides.json'] = write(
    'unit-overrides.json',
    game.civilizations.map((civilization, index) => ({
        civ: index,
        name: civilization.name,
        units: [...civilization.units.entries()].flatMap(([id, unit]) => {
            const changed = index === 0 ? null : differences(unit, reference.units.get(id));

            return changed === null ? [] : [{ id, ...changed }];
        }),
    })),
);

written['tasks.json'] = write(
    'tasks.json',
    [...reference.units.values()].flatMap((unit) =>
        unit.tasks.map((task) => ({ unit: unit.id, ...task })),
    ),
);

written['unit-headers.json'] = write(
    'unit-headers.json',
    game.unitHeaders.flatMap((header, slot) => (header.exists === 0 ? [] : [{ slot, tasks: header.tasks }])),
);

written['tech-tree.json'] = write('tech-tree.json', game.techTree);

written['terrain-restrictions.json'] = write('terrain-restrictions.json', game.terrainRestrictions);

written['terrains.json'] = write(
    'terrains.json',
    game.terrains.map((terrain, id) => ({ id, ...terrain })),
);

written['graphics.json'] = write('graphics.json', game.graphics);

written['sounds.json'] = write('sounds.json', game.sounds);

written['player-colours.json'] = write('player-colours.json', game.playerColours);

written['effects.json'] = write(
    'effects.json',
    game.effects.map((effect, id) => ({ id, ...effect })),
);

written['technologies.json'] = write(
    'technologies.json',
    game.technologies.map((technology, id) => ({ id, ...technology })),
);

written['civilizations.json'] = write(
    'civilizations.json',
    game.civilizations.map((civilization, id) => ({
        id,
        name: civilization.name,
        techTreeId: civilization.techTreeId,
        teamBonusId: civilization.teamBonusId,
        resources: civilization.resources,
        unitCount: civilization.units.size,
    })),
);

for (const [locale, language] of Object.entries(LOCALES)) {
    written[`strings.${locale}.json`] = write(
        `strings.${locale}.json`,
        Object.fromEntries(install.readStrings(language)),
    );
}

for (const [name, parts] of Object.entries(SIBLINGS)) {
    written[name] = write(name, JSON.parse(readFileSync(install.path(...parts), 'utf8')));
}

written['tech-trees.json'] = write('tech-trees.json', install.readTechTrees());

write('manifest.json', {
    gameVersion: game.version,
    exportedFrom: 'the installed game data files',
    counts: {
        referenceUnits: reference.units.size,
        civilizations: game.civilizations.length,
        effects: game.effects.length,
        technologies: game.technologies.length,
        unitHeaders: game.unitHeaders.length,
        graphics: game.graphics.length,
        sounds: game.sounds.length,
        terrains: game.terrains.length,
        terrainRestrictions: game.terrainRestrictions.length,
        techTreeConnections:
            game.techTree.ages.length +
            game.techTree.buildings.length +
            game.techTree.units.length +
            game.techTree.researches.length,
    },
    /** Where each table ended. Nothing here is fixed width, so these are the proof of the walk. */
    sections: game.sections,
    /** Zero, or a field above was read at the wrong width. */
    bytesNotDecoded: game.bytesRemaining,
    counters: game.counters,
    files: written,
});

const total = Object.values(written).reduce((sum, size) => sum + size, 0);
process.stdout.write(
    `wrote ${String(Object.keys(written).length + 1)} files, ${String(Math.round(total / 1024 / 1024))} MB, into ${OUT}\n`,
);

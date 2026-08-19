/**
 * Copies the artwork of the shipped dataset out of an installed copy of the game.
 *
 * Point AOE2_GAME_ROOT at the install folder, the one holding resources/ and widgetui/. Only the
 * icons a unit, technology or civilization record actually points at are written, so the asset
 * folder stays close to the size of the roster.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameInstall } from './extract/game-install.ts';
import { IconExtractor } from './extract/icon-extractor.ts';
import type { CivilizationRecord, TechnologyRecord, UnitRecord } from '../src/data/records.ts';

/** The game folder lives in .env; the guard keeps a missing file from being an error. */
if (existsSync('.env')) process.loadEnvFile('.env');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src', 'data', 'generated');
const OUT = join(ROOT, 'public', 'img');

function read<T>(name: string): T {
    return JSON.parse(readFileSync(join(DATA, name), 'utf8')) as T;
}

function pictures(records: readonly { icon: number | null }[]): number[] {
    return records.flatMap((record) => (record.icon === null ? [] : [record.icon]));
}

const root = process.env.AOE2_GAME_ROOT;
if (!root) throw new Error('Set AOE2_GAME_ROOT in .env, or in the environment, to the game folder.');

const extractor = new IconExtractor({ install: new GameInstall({ root }), outputDirectory: OUT });

const units = await extractor.renderUnits(pictures(read<UnitRecord[]>('units.json')));
const technologies = await extractor.renderTechnologies(pictures(read<TechnologyRecord[]>('technologies.json')));
const emblems = await extractor.renderEmblems(read<CivilizationRecord[]>('civilizations.json').map((civ) => civ.icon));
const pieces = await extractor.renderInterface();

process.stdout.write(
    `icons: ${units} units, ${technologies} technologies, ${emblems} civilizations, ${pieces} interface\n`,
);

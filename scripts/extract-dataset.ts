/**
 * Rebuilds the shipped dataset straight from an installed copy of the game.
 *
 * Point AOE2_GAME_ROOT at the install folder, the one holding resources/ and widgetui/. The
 * output lands in src/data/generated and is committed, so the application itself never reads
 * anything outside its own repository.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatasetBuilder, type CivilizationMeta } from './extract/dataset-builder.ts';
import { GameInstall } from './extract/game-install.ts';

/** The game folder lives in .env; the guard keeps a missing file from being an error. */
if (existsSync('.env')) process.loadEnvFile('.env');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'generated');

/** Locale tags the application ships, mapped to the language folder inside the install. */
const LOCALES: Record<string, string> = { en: 'en', 'pt-BR': 'br' };
const FALLBACK_LOCALE = 'en';

/** The guide covers the main game; the separate campaign mode ships its own unrelated roster. */
const ERA = 'base';

function write(name: string, payload: unknown): void {
    writeFileSync(join(OUT, name), `${JSON.stringify(payload)}\n`, 'utf8');
}

const root = process.env.AOE2_GAME_ROOT;
if (!root) throw new Error('Set AOE2_GAME_ROOT in .env, or in the environment, to the game folder.');

const install = new GameInstall({ root });
const meta = JSON.parse(
    readFileSync(install.path('resources', '_common', 'dat', 'civilizations.json'), 'utf8'),
) as { civilization_list: CivilizationMeta[] };

const strings = new Map(
    Object.entries(LOCALES).map(([locale, language]) => [locale, install.readStrings(language)]),
);

const game = install.readGameData();

const dataset = new DatasetBuilder({
    game,
    trees: install.readTechTrees(),
    civilizations: meta.civilization_list,
    strings,
    fallbackLocale: FALLBACK_LOCALE,
    era: ERA,
}).build();

mkdirSync(OUT, { recursive: true });
write('units.json', dataset.units);
write('technologies.json', dataset.technologies);
write('civilizations.json', dataset.civilizations);
write('economy.json', dataset.economy);
for (const [locale, bundle] of dataset.strings) write(`strings.${locale}.json`, bundle);
write('meta.json', {
    // The version the data file itself declares, so a committed dataset can be traced to a patch.
    gameVersion: game.version,
    unitCount: dataset.units.length,
    techCount: dataset.technologies.length,
    civCount: dataset.civilizations.length,
    locales: [...dataset.strings.keys()],
});

process.stdout.write(
    `units=${dataset.units.length} techs=${dataset.technologies.length} civs=${dataset.civilizations.length}\n`,
);

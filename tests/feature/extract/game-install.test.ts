import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { DatasetBuilder, type CivilizationMeta } from '../../../scripts/extract/dataset-builder.ts';
import { GameInstall } from '../../../scripts/extract/game-install.ts';
import {
    CIVILIZATION_RECORDS,
    GAME_STRING_BUNDLES,
    TECHNOLOGY_RECORDS,
    UNIT_RECORDS,
} from '../../../src/data/dataset.ts';
import type { GeneratedDataset } from '../../../scripts/extract/dataset-builder.ts';

/**
 * The install is only present on a machine that owns the game, so this suite proves the shipped
 * dataset still reproduces from it whenever the folder is available and stays out of the way
 * everywhere else.
 */
if (existsSync('.env')) process.loadEnvFile('.env');

const GAME_ROOT = process.env.AOE2_GAME_ROOT;
const EXTRACTION_TIMEOUT_MS = 120_000;

let dataset: GeneratedDataset;

/** Compares against the committed JSON the way the application reads it back. */
function plain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

describe.skipIf(!GAME_ROOT)('extraction from an installed game', () => {
    beforeAll(() => {
        const install = new GameInstall({ root: GAME_ROOT as string });
        const meta = JSON.parse(
            readFileSync(install.path('resources', '_common', 'dat', 'civilizations.json'), 'utf8'),
        ) as { civilization_list: CivilizationMeta[] };

        dataset = new DatasetBuilder({
            game: install.readGameData(),
            trees: install.readTechTrees(),
            civilizations: meta.civilization_list,
            strings: new Map([
                ['en', install.readStrings('en')],
                ['pt-BR', install.readStrings('br')],
            ]),
            fallbackLocale: 'en',
            era: 'base',
        }).build();
    }, EXTRACTION_TIMEOUT_MS);

    it('reproduces every shipped unit record', () => {
        expect(plain(dataset.units)).toEqual(UNIT_RECORDS);
    });

    it('reproduces every shipped technology record', () => {
        expect(plain(dataset.technologies)).toEqual(TECHNOLOGY_RECORDS);
    });

    it('reproduces every shipped civilization record', () => {
        expect(plain(dataset.civilizations)).toEqual(CIVILIZATION_RECORDS);
    });

    it('reproduces the shipped strings of every locale', () => {
        const extracted = Object.fromEntries([...dataset.strings].map(([locale, bundle]) => [locale, plain(bundle)]));

        expect(extracted).toEqual(GAME_STRING_BUNDLES);
    });
});

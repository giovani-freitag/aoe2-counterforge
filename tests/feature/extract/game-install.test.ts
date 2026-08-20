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

/** Command type that switches a unit on, with the second field set for "make available". */
const ENABLE_UNIT = 2;
const ENABLE_MODE = 1;

/** The civilizations in the order the data file numbers them, which is how a technology names one. */
function civilizationList(): CivilizationMeta[] {
    const install = new GameInstall({ root: GAME_ROOT ?? '' });
    const file = JSON.parse(readFileSync(install.path('resources', '_common', 'dat', 'civilizations.json'), 'utf8')) as {
        civilization_list: CivilizationMeta[];
    };

    return file.civilization_list;
}
const EXTRACTION_TIMEOUT_MS = 120_000;

let dataset: GeneratedDataset;

/** Compares against the committed JSON the way the application reads it back. */
function plain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

describe.skipIf(!GAME_ROOT)('unit availability against the effect table', () => {
    it('lists a unit for the civilization its enabling technology names', () => {
        const game = new GameInstall({ root: GAME_ROOT ?? '' }).readGameData();

        /** A technology that switches a unit on names the civilization that gets it. */
        const owner = new Map<number, number>();
        for (const tech of game.technologies) {
            for (const command of game.effects[tech.effectId]?.commands ?? []) {
                if (command.type === ENABLE_UNIT && command.unitClass === ENABLE_MODE && tech.civ >= 0) {
                    owner.set(command.unit, tech.civ);
                }
            }
        }

        // The emblem keeps the name the file uses, which is what joins a renamed civilization —
        // Hindustanis to Indians, Maya to Mayans — back to its place in the game's own list.
        const byEmblem = new Map(CIVILIZATION_RECORDS.map((civ) => [civ.icon, civ.key]));
        const mismatches = UNIT_RECORDS.flatMap((unit) => {
            const index = owner.get(unit.id);
            if (index === undefined) return [];

            const internal = (civilizationList()[index]?.internal_name ?? '').toLowerCase();
            const expected = byEmblem.get(internal);
            if (expected === undefined) return [];

            return unit.civs.length === 1 && unit.civs[0] === expected
                ? []
                : [`${unit.key}: shipped [${unit.civs.join()}], the technology names ${expected}`];
        });

        expect(mismatches).toEqual([]);
    });
});

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

    it('lands on the connection table with counts only a correct walk could produce', () => {
        const game = new GameInstall({ root: GAME_ROOT ?? '' }).readGameData();

        // Nothing before this point is fixed width: every unit, effect and technology record is as
        // long as its own contents say. Four small, sane numbers here mean every width was right.
        expect(game.techTree).toEqual({ ages: 4, buildings: 37, units: 255, researches: 233 });
    }, EXTRACTION_TIMEOUT_MS);

    it('reads the pierce armour the game itself displays, at the end of the creatable block', () => {
        const game = new GameInstall({ root: GAME_ROOT ?? '' }).readGameData();
        const table = game.civilizations[0].units;

        // The last field of a long fixed run: it can only agree with the armour list if the whole
        // run was read at the right widths.
        const trainable = [...table.values()].filter((unit) => unit.type >= 70 && unit.creatableType > 0);
        const agreeing = trainable.filter((unit) => {
            const pierce = unit.armours.find((entry) => entry.class === 3);

            return pierce !== undefined && pierce.amount === unit.displayedPierceArmour;
        });

        expect(agreeing.length).toBeGreaterThan(trainable.length * 0.5);
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

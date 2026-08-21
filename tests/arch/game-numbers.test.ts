/**
 * @vitest-environment node
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = 'src';

/**
 * The two places in the application a number may be written by hand.
 *
 * Everything else the guide shows is a fact about the game, and a fact about the game belongs in
 * the generated dataset where the extraction can be held to it. These two are different: one holds
 * the vocabulary the game numbers its own concepts with, the other holds the choices this project
 * made where the game states nothing.
 */
const NUMBER_HOMES = ['src/assumptions.ts', 'src/domain/enums'];

/**
 * Bindings that still carry hand-written game numbers, on their way out.
 *
 * The list is asserted by equality in both directions: a new one fails the test, and so does a
 * fixed one whose line was not removed. It can only ever shrink.
 */
const QUARANTINE = [
    'src/services/economy/gather-rates.ts:DEFAULT_GATHER_RATES',
    'src/services/economy/gather-rates.ts:VILLAGER_CARRY_CAPACITY',
];

/** Data a build step generates, and the translations, which are text rather than measurements. */
const DATA_HOMES = ['src/data/generated', 'src/i18n/locales'];

function sourceFiles(root: string, extensions: readonly string[]): string[] {
    return readdirSync(root).flatMap((entry) => {
        const path = join(root, entry);
        if (statSync(path).isDirectory()) return sourceFiles(path, extensions);

        return extensions.some((extension) => entry.endsWith(extension)) ? [path] : [];
    });
}

function posix(path: string): string {
    return path.split(String.fromCharCode(92)).join('/');
}

function parse(path: string): ts.SourceFile {
    return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
}

/**
 * Every exported binding whose value contains a number written into the source.
 *
 * A service is handed its numbers through its configuration, so a service that publishes one is
 * telling on itself: the export exists because something has to wire the value back in.
 *
 * @param path - File to read.
 * @returns One entry per offending export, as `file:name`.
 */
function exportedNumbers(path: string): string[] {
    const found: string[] = [];

    const walk = (node: ts.Node): void => {
        if (ts.isVariableStatement(node) && node.modifiers?.some((it) => it.kind === ts.SyntaxKind.ExportKeyword)) {
            for (const declaration of node.declarationList.declarations) {
                if (!declaration.initializer) continue;

                let hasNumber = false;
                const scan = (child: ts.Node): void => {
                    if (ts.isNumericLiteral(child)) hasNumber = true;
                    ts.forEachChild(child, scan);
                };
                scan(declaration.initializer);

                if (hasNumber) found.push(`${posix(path)}:${declaration.name.getText()}`);
            }
        }

        ts.forEachChild(node, walk);
    };

    walk(parse(path));

    return found;
}

describe('numbers in the source tree', () => {
    it('lets no file publish a number the game could have told us', () => {
        const offenders = sourceFiles(SOURCE_ROOT, ['.ts', '.tsx'])
            .filter((path) => !NUMBER_HOMES.some((home) => posix(path).startsWith(home)))
            .flatMap((path) => exportedNumbers(path))
            .sort();

        expect(offenders).toEqual([...QUARANTINE].sort());
    });

    it('keeps data out of the source tree, so a table cannot move house', () => {
        const strays = sourceFiles(SOURCE_ROOT, ['.json', '.csv', '.tsv', '.yaml', '.yml'])
            .map(posix)
            .filter((path) => !DATA_HOMES.some((home) => path.startsWith(home)));

        expect(strays).toEqual([]);
    });

    it('wires the services without writing a single number down', () => {
        const root = parse(join(SOURCE_ROOT, 'composition-root.ts'));
        const literals: string[] = [];

        const walk = (node: ts.Node): void => {
            if (ts.isNumericLiteral(node)) literals.push(node.getText());
            ts.forEachChild(node, walk);
        };
        walk(root);

        expect(literals).toEqual([]);
    });
});

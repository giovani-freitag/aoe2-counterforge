import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = join(process.cwd(), 'src');

async function collect(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) return collect(path);

            return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [path] : [];
        }),
    );

    return files.flat();
}

async function importsOf(paths: readonly string[]): Promise<{ path: string; specifier: string }[]> {
    const found: { path: string; specifier: string }[] = [];
    for (const path of paths) {
        const source = await readFile(path, 'utf8');
        for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
            found.push({ path, specifier: match[1] });
        }
    }

    return found;
}

describe('layering', () => {
    it('keeps the domain free of framework imports', async () => {
        const imports = await importsOf(await collect(join(SOURCE_ROOT, 'domain')));

        expect(imports.filter((entry) => /^react|^i18next|\/react\//.test(entry.specifier))).toEqual([]);
    });

    it('keeps the services free of framework imports', async () => {
        const imports = await importsOf(await collect(join(SOURCE_ROOT, 'services')));

        expect(imports.filter((entry) => /^react|^i18next|\/react\//.test(entry.specifier))).toEqual([]);
    });

    it('keeps the domain from depending on the services', async () => {
        const imports = await importsOf(await collect(join(SOURCE_ROOT, 'domain')));

        expect(imports.filter((entry) => entry.specifier.includes('/services/'))).toEqual([]);
    });

    it('puts every service entrypoint in its own domain folder', async () => {
        const files = await collect(join(SOURCE_ROOT, 'services'));

        const misplaced = files.filter((path) => {
            const relative = path.slice(join(SOURCE_ROOT, 'services').length + 1).split(String.fromCharCode(92)).join('/');

            return relative.endsWith('-service.ts') && relative.split('/').length !== 2;
        });

        expect(misplaced).toEqual([]);
    });

    it('names every service folder after its entrypoint', async () => {
        const entries = await readdir(join(SOURCE_ROOT, 'services'), { withFileTypes: true });
        const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

        const missing = await Promise.all(
            folders.map(async (folder) => {
                const files = await readdir(join(SOURCE_ROOT, 'services', folder));

                return files.includes(`${folder}-service.ts`) ? null : folder;
            }),
        );

        expect(missing.filter(Boolean)).toEqual([]);
    });
});

import { describe, expect, it } from 'vitest';
import { createServices } from '../../src/composition-root.ts';
import { pagePaths, prerenderPage } from '../../src/prerender.tsx';

const SITE = 'https://giovani-freitag.github.io/aoe2-counterforge/';
const { catalog } = createServices();

describe('prerenderPage', () => {
    it('writes a unit page with its content in the language asked for', async () => {
        const page = await prerenderPage({ path: '/unit/knight', locale: 'en' });

        expect(page.html).toMatch(/<h1[^>]*>Knight<\/h1>/);
        expect(page.head.title).toBe('Knight counters, stats and cost | AoE2 Counterforge');
        expect(page.head.canonical).toBe(`${SITE}en/unit/knight`);
    });

    it('describes a unit with the summary the game gives it', async () => {
        const page = await prerenderPage({ path: '/unit/knight', locale: 'pt-BR' });

        expect(page.head.description).toContain('Forte contra Infantaria');
    });

    it('links every row of a list, which a live page only mounts as it scrolls', async () => {
        const page = await prerenderPage({ path: '/civs', locale: 'en' });

        const links = new Set(page.html.match(/href="\/en\/civ\/[^"]+"/g));

        expect(links.size).toBe(catalog.civilizations().length);
    });

    it('keeps a missing page out of the index', async () => {
        const page = await prerenderPage({ path: '/404', locale: 'pt-BR' });

        expect(page.head.indexable).toBe(false);
    });
});

describe('pagePaths', () => {
    it('gives every unit, technology and civilization a page of its own', () => {
        const paths = pagePaths();

        expect(paths).toEqual(
            expect.arrayContaining([
                ...catalog.units().map((unit) => `/unit/${unit.key}`),
                ...catalog.technologies().map((technology) => `/tech/${technology.key}`),
                ...catalog.civilizations().map((civilization) => `/civ/${civilization.key}`),
            ]),
        );
    });
});

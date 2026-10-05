/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { applyPageHead, buildPageHead, headTags, renderHeadMarkup } from '../../../src/react/page-head.ts';
import { pageHeadInput } from '../../fixtures/page-head.ts';

const SITE = 'https://giovani-freitag.github.io/aoe2-counterforge/';

describe('buildPageHead', () => {
    it('names the site after the page', () => {
        const head = buildPageHead(pageHeadInput());

        expect(head.title).toBe('Knight counters, stats and cost | AoE2 Counterforge');
    });

    it('points the canonical address at the page in its own language', () => {
        const head = buildPageHead(pageHeadInput());

        expect(head.canonical).toBe(`${SITE}en/unit/knight`);
    });

    it('lists the page in every language and the default one for everybody else', () => {
        const head = buildPageHead(pageHeadInput());

        expect(head.alternates).toEqual([
            { hreflang: 'pt-BR', href: `${SITE}unit/knight` },
            { hreflang: 'en', href: `${SITE}en/unit/knight` },
            { hreflang: 'es', href: `${SITE}es/unit/knight` },
            { hreflang: 'it', href: `${SITE}it/unit/knight` },
            { hreflang: 'x-default', href: `${SITE}unit/knight` },
        ]);
    });

    it('trims a long description at a word', () => {
        const head = buildPageHead(pageHeadInput({ description: 'cavalry '.repeat(40) }));

        expect(head.description).toMatch(/^cavalry( cavalry)*…$/);
        expect(head.description.length).toBeLessThanOrEqual(160);
    });

    it('describes the home page as the website', () => {
        const head = buildPageHead(pageHeadInput({ path: '/', trail: [] }));

        expect(head.structuredData[0]).toMatchObject({ '@type': 'WebSite', url: `${SITE}en/` });
    });

    it('places any other page in a breadcrumb under its section', () => {
        const head = buildPageHead(pageHeadInput());

        expect(head.structuredData[0]).toMatchObject({
            '@type': 'BreadcrumbList',
            itemListElement: [
                { position: 1, name: 'Home', item: `${SITE}en/` },
                { position: 2, name: 'Units', item: `${SITE}en/units` },
                { position: 3, name: 'Knight', item: `${SITE}en/unit/knight` },
            ],
        });
    });

    it('gives a page left out of the index no address to rank', () => {
        const head = buildPageHead(pageHeadInput({ indexable: false }));

        expect(head.canonical).toBeNull();
        expect(head.alternates).toEqual([]);
        expect(head.structuredData).toEqual([]);
    });
});

describe('headTags', () => {
    it('asks search engines to skip a page left out of the index', () => {
        const tags = headTags(buildPageHead(pageHeadInput({ indexable: false })));

        expect(tags).toContainEqual({ tag: 'meta', attributes: { name: 'robots', content: 'noindex' } });
    });
});

describe('renderHeadMarkup', () => {
    it('escapes the page words inside attributes', () => {
        const head = buildPageHead(pageHeadInput({ description: 'Strong vs. "Infantry" & <Archers>' }));

        const markup = renderHeadMarkup(head);

        expect(markup).toContain('content="Strong vs. &quot;Infantry&quot; &amp; &lt;Archers&gt;"');
    });

    it('keeps structured data from closing its own script element', () => {
        const head = buildPageHead(pageHeadInput({ name: '</script><b>' }));

        const markup = renderHeadMarkup(head);

        expect(markup).not.toContain('</script><b>');
        expect(markup).toContain('\\u003c/script>\\u003cb>');
    });
});

describe('applyPageHead', () => {
    it('replaces the head of the previous page and leaves the rest of the document alone', () => {
        document.head.innerHTML = '<meta name="theme-color" content="#000">';
        applyPageHead(document, buildPageHead(pageHeadInput({ path: '/units', name: 'Units' })));

        applyPageHead(document, buildPageHead(pageHeadInput()));

        expect(document.title).toBe('Knight counters, stats and cost | AoE2 Counterforge');
        expect(document.documentElement.lang).toBe('en');
        expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
        expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE}en/unit/knight`);
        expect(document.querySelector('meta[name="theme-color"]')).not.toBeNull();
    });
});

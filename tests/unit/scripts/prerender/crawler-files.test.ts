import { describe, expect, it } from 'vitest';
import { buildPageHead } from '../../../../src/react/page-head.ts';
import { robotsTxt, sitemapXml } from '../../../../scripts/prerender/crawler-files.ts';
import { pageHeadInput } from '../../../fixtures/page-head.ts';

const SITE = 'https://giovani-freitag.github.io/aoe2-counterforge/';

describe('sitemapXml', () => {
    it('lists a page with the same page in every language', () => {
        const sitemap = sitemapXml([buildPageHead(pageHeadInput())]);

        expect(sitemap).toContain(`<loc>${SITE}en/unit/knight</loc>`);
        expect(sitemap).toContain(`<xhtml:link rel="alternate" hreflang="pt-BR" href="${SITE}unit/knight"/>`);
        expect(sitemap).toContain(`<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}unit/knight"/>`);
    });

    it('leaves out a page that asks not to be indexed', () => {
        const sitemap = sitemapXml([buildPageHead(pageHeadInput({ indexable: false }))]);

        expect(sitemap).not.toContain('<url>');
    });
});

describe('robotsTxt', () => {
    it('lets every crawler in and points it at the sitemap', () => {
        const robots = robotsTxt(`${SITE}sitemap.xml`);

        expect(robots).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
    });
});

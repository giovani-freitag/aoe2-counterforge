import type { PageHead } from '../../src/react/page-head.ts';

function escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * The sitemap of every indexable page, each listed with the same page in the other languages.
 *
 * @param heads - Heads of the pages written; those asking not to be indexed are left out.
 * @returns The sitemap document.
 */
export function sitemapXml(heads: readonly PageHead[]): string {
    const entries = heads
        .filter((head) => head.indexable && head.canonical !== null)
        .map((head) => {
            const alternates = head.alternates.map(
                (alternate) =>
                    `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}"/>`,
            );

            return ['  <url>', `    <loc>${escapeXml(head.canonical ?? '')}</loc>`, ...alternates, '  </url>'].join('\n');
        });

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...entries,
        '</urlset>',
        '',
    ].join('\n');
}

/**
 * The crawler rules: everything may be read, and the sitemap is here.
 *
 * @param sitemapUrl - Absolute address of the sitemap.
 * @returns The robots.txt document.
 */
export function robotsTxt(sitemapUrl: string): string {
    return ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemapUrl}`, ''].join('\n');
}

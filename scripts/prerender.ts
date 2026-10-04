/**
 * Writes a page for every address the guide answers, in every language, over the built bundle.
 *
 * Search engines judge a page by the markup it arrives with, so each address gets a file of its own
 * carrying its content, title, description and the links to the same page in the other language.
 * The bundle then takes over in the browser exactly as it would on an empty page. Run after
 * `vite build`, which leaves the template this fills in.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE } from '../src/data/dataset.ts';
import { SUPPORTED_LOCALES } from '../src/i18n/index.ts';
import { sitePath } from '../src/i18n/locale-path.ts';
import { pagePaths, prerenderPage } from '../src/prerender.tsx';
import type { PageHead } from '../src/react/page-head.ts';
import { robotsTxt, sitemapXml } from './prerender/crawler-files.ts';
import { fillTemplate, pageFile } from './prerender/page-template.ts';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

/** An address no route answers, which renders the page for a missing one. */
const MISSING_PAGE = '/404';

function write(file: string, content: string): void {
    const path = join(DIST, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
}

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
const paths = pagePaths();
const heads: PageHead[] = [];

for (const locale of SUPPORTED_LOCALES) {
    for (const path of paths) {
        const page = await prerenderPage({ path, locale });
        write(pageFile(sitePath(path, locale)), fillTemplate(template, page));
        heads.push(page.head);
    }
}

// GitHub Pages answers every unknown address with this file and a 404 status; the bundle then reads
// the address and shows the missing page in whichever language it asked for.
write('404.html', fillTemplate(template, await prerenderPage({ path: MISSING_PAGE, locale: DEFAULT_LOCALE })));

write('sitemap.xml', sitemapXml(heads));
write('robots.txt', robotsTxt(new URL('sitemap.xml', __SITE_URL__).href));

process.stdout.write(`prerender: ${String(heads.length)} pages in ${String(SUPPORTED_LOCALES.length)} languages\n`);

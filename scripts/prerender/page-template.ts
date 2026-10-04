import { renderHeadMarkup, type PageHead } from '../../src/react/page-head.ts';

const HEAD_MARKER = '<!--page-head-->';
const ROOT_MARKER = '<!--page-root-->';
const HTML_LANG = /<html lang="[^"]*">/;

export interface TemplatePage {
    html: string;
    head: PageHead;
}

/**
 * File a page is written to, relative to the build folder.
 *
 * A page is a file named after its address rather than a folder holding an index, because static
 * hosts answer "/unit/knight" from "unit/knight.html" directly, while a folder makes them redirect
 * every address without a trailing slash to one with it.
 *
 * @param sitePath - Address below the site root, such as "en/unit/knight", or "en/" for a home page.
 * @returns The file path, such as "en/unit/knight.html" or "en/index.html".
 */
export function pageFile(sitePath: string): string {
    return sitePath === '' || sitePath.endsWith('/') ? `${sitePath}index.html` : `${sitePath}.html`;
}

/**
 * The built index page with one page's head, language and markup written in.
 *
 * @param template - The index page the bundler wrote, markers included.
 * @param page - The rendered root and the head it asked for.
 * @returns A complete document for that page.
 * @throws Error when the template has lost a marker, which would ship pages without content.
 */
export function fillTemplate(template: string, page: TemplatePage): string {
    for (const marker of [HEAD_MARKER, ROOT_MARKER]) {
        if (!template.includes(marker)) throw new Error(`The index page is missing its ${marker} marker.`);
    }
    if (!HTML_LANG.test(template)) throw new Error('The index page is missing the lang attribute on <html>.');

    // Replacer functions, because a string replacement would read any "$&" in the markup as a pattern.
    return template
        .replace(HTML_LANG, () => `<html lang="${page.head.lang}">`)
        .replace(HEAD_MARKER, () => renderHeadMarkup(page.head))
        .replace(ROOT_MARKER, () => page.html);
}

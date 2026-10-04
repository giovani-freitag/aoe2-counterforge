import { DEFAULT_LOCALE } from '../data/dataset.ts';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n/index.ts';
import { sitePath } from '../i18n/locale-path.ts';

/** One step of the trail from the home page down to the page being read. */
export interface Crumb {
    name: string;
    /** Path inside the app, such as "/units". */
    path: string;
}

export interface PageHeadInput {
    /** What the page is about, without the site name. */
    title: string;
    description: string;
    /** What the page is called in a breadcrumb, usually shorter than its title. */
    name: string;
    /** Path inside the app, without the query string. */
    path: string;
    locale: SupportedLocale;
    siteName: string;
    /** Steps above the page, home first; empty on the home page itself. */
    trail: readonly Crumb[];
    indexable: boolean;
}

/** The same page in one language, as a search engine is told about it. */
export interface AlternateAddress {
    hreflang: string;
    href: string;
}

export interface PageHead {
    lang: SupportedLocale;
    title: string;
    description: string;
    siteName: string;
    /** Absent on a page that asks not to be indexed. */
    canonical: string | null;
    alternates: readonly AlternateAddress[];
    indexable: boolean;
    image: string;
    structuredData: readonly Record<string, unknown>[];
}

/** An element of the document head, described independently of whether it ends up as text or a node. */
export interface HeadTag {
    tag: 'meta' | 'link' | 'script';
    attributes: Record<string, string>;
    content?: string;
}

/** Marks the elements a page owns, so the next page can take them down before putting its own up. */
const OWNED_ATTRIBUTE = 'data-page-head';

/** Search results cut a snippet around this many characters, so a longer one is trimmed at a word. */
const DESCRIPTION_LIMIT = 160;

/** Open Graph wants a territory beside the language. */
const OPEN_GRAPH_LOCALES: Record<SupportedLocale, string> = { 'pt-BR': 'pt_BR', en: 'en_US' };

function absoluteUrl(appPath: string, locale: SupportedLocale): string {
    return new URL(sitePath(appPath, locale), __SITE_URL__).href;
}

function clampDescription(text: string): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= DESCRIPTION_LIMIT) return flat;

    const cut = flat.slice(0, DESCRIPTION_LIMIT - 1);

    return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.]+$/, '')}…`;
}

function structuredData(input: PageHeadInput, canonical: string): Record<string, unknown>[] {
    if (input.trail.length === 0) {
        return [
            {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: input.siteName,
                url: canonical,
                inLanguage: input.locale,
                description: clampDescription(input.description),
            },
        ];
    }

    const steps = [...input.trail, { name: input.name, path: input.path }];

    return [
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: steps.map((step, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: step.name,
                item: absoluteUrl(step.path, input.locale),
            })),
        },
    ];
}

/**
 * Everything the document head says about one page in one language.
 *
 * @param input - The page's own words and where it sits in the site.
 * @returns The head, with every address made absolute.
 */
export function buildPageHead(input: PageHeadInput): PageHead {
    const canonical = input.indexable ? absoluteUrl(input.path, input.locale) : null;

    return {
        lang: input.locale,
        title: `${input.title} | ${input.siteName}`,
        description: clampDescription(input.description),
        siteName: input.siteName,
        canonical,
        alternates: canonical
            ? [
                  ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: locale, href: absoluteUrl(input.path, locale) })),
                  { hreflang: 'x-default', href: absoluteUrl(input.path, DEFAULT_LOCALE) },
              ]
            : [],
        indexable: input.indexable,
        image: new URL('og-image.png', __SITE_URL__).href,
        structuredData: canonical ? structuredData(input, canonical) : [],
    };
}

/**
 * The elements a page puts in the document head, the title aside.
 *
 * @param head - What the page says about itself.
 * @returns Description, robots directive, addresses, sharing card and structured data.
 */
export function headTags(head: PageHead): HeadTag[] {
    const meta = (key: 'name' | 'property', name: string, content: string): HeadTag => ({
        tag: 'meta',
        attributes: { [key]: name, content },
    });

    return [
        meta('name', 'description', head.description),
        ...(head.indexable ? [] : [meta('name', 'robots', 'noindex')]),
        ...(head.canonical ? [{ tag: 'link' as const, attributes: { rel: 'canonical', href: head.canonical } }] : []),
        ...head.alternates.map((alternate) => ({
            tag: 'link' as const,
            attributes: { rel: 'alternate', hreflang: alternate.hreflang, href: alternate.href },
        })),
        meta('property', 'og:type', 'website'),
        meta('property', 'og:site_name', head.siteName),
        meta('property', 'og:title', head.title),
        meta('property', 'og:description', head.description),
        meta('property', 'og:locale', OPEN_GRAPH_LOCALES[head.lang]),
        ...(head.canonical ? [meta('property', 'og:url', head.canonical)] : []),
        meta('property', 'og:image', head.image),
        meta('name', 'twitter:card', 'summary_large_image'),
        ...head.structuredData.map((data) => ({
            tag: 'script' as const,
            attributes: { type: 'application/ld+json' },
            // A closing script tag inside a string would end the element early.
            content: JSON.stringify(data).replace(/</g, '\\u003c'),
        })),
    ];
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * The head of a page as markup, for a page written ahead of time.
 *
 * @param head - What the page says about itself.
 * @returns The title and every head element, one per line.
 */
export function renderHeadMarkup(head: PageHead): string {
    const tags = headTags(head).map((tag) => {
        const attributes = Object.entries({ ...tag.attributes, [OWNED_ATTRIBUTE]: '' })
            .map(([name, value]) => (value === '' ? name : `${name}="${escapeHtml(value)}"`))
            .join(' ');

        return tag.tag === 'meta' || tag.tag === 'link'
            ? `<${tag.tag} ${attributes} />`
            : `<${tag.tag} ${attributes}>${tag.content ?? ''}</${tag.tag}>`;
    });

    return [`<title>${escapeHtml(head.title)}</title>`, ...tags].join('\n        ');
}

/**
 * Replaces the head the previous page left in a live document.
 *
 * @param document - Document the reader is looking at.
 * @param head - What the page now on screen says about itself.
 */
export function applyPageHead(document: Document, head: PageHead): void {
    document.title = head.title;
    document.documentElement.lang = head.lang;

    for (const stale of document.head.querySelectorAll(`[${OWNED_ATTRIBUTE}]`)) stale.remove();

    for (const tag of headTags(head)) {
        const element = document.createElement(tag.tag);
        for (const [name, value] of Object.entries(tag.attributes)) element.setAttribute(name, value);
        element.setAttribute(OWNED_ATTRIBUTE, '');
        if (tag.content !== undefined) element.textContent = tag.content;
        document.head.append(element);
    }
}

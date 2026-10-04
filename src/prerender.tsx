import { renderToString } from 'react-dom/server';
import { createServices } from './composition-root.ts';
import { DEFAULT_LOCALE } from './data/dataset.ts';
import { createI18n, type SupportedLocale } from './i18n/index.ts';
import { localizedPath } from './i18n/locale-path.ts';
import { App } from './react/app.tsx';
import type { PageHead } from './react/page-head.ts';
import { PageHeadContext } from './react/providers/page-head-context.ts';

export interface PrerenderOptions {
    /** Path inside the app, such as "/unit/knight". */
    path: string;
    locale: SupportedLocale;
}

export interface PrerenderedPage {
    /** Markup of the application root. */
    html: string;
    head: PageHead;
}

const i18n = createI18n(DEFAULT_LOCALE);

/**
 * Every address the guide answers on its own, one per page worth finding in a search.
 *
 * @returns Paths inside the app: the sections, then one per unit, technology and civilization.
 */
export function pagePaths(): string[] {
    const { catalog } = createServices();

    return [
        '/',
        '/units',
        '/compare',
        '/techs',
        '/civs',
        ...catalog.units().map((unit) => `/unit/${unit.key}`),
        ...catalog.technologies().map((technology) => `/tech/${technology.key}`),
        ...catalog.civilizations().map((civilization) => `/civ/${civilization.key}`),
    ];
}

/**
 * Renders one page the way a browser that has not stored anything would first see it.
 *
 * @param options - Which page, in which language.
 * @returns The root markup and the head the page asked for.
 * @throws Error when the page rendered without declaring its head.
 */
export async function prerenderPage(options: PrerenderOptions): Promise<PrerenderedPage> {
    if (i18n.language !== options.locale) await i18n.changeLanguage(options.locale);

    const recorded: { head: PageHead | null } = { head: null };
    const html = renderToString(
        <PageHeadContext value={(head) => { recorded.head = head; }}>
            <App locale={options.locale} location={localizedPath(options.path, options.locale)} />
        </PageHeadContext>,
    );

    if (!recorded.head) throw new Error(`The page at ${options.path} rendered without a head.`);

    return { html, head: recorded.head };
}

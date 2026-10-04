import { DEFAULT_LOCALE } from '../data/dataset.ts';
import { SUPPORTED_LOCALES, type SupportedLocale } from './index.ts';

/**
 * Folder a language is served from, relative to the site root.
 *
 * The default language owns the bare address, so every link shared before the languages had
 * addresses of their own still lands on a page.
 */
function folderOf(locale: SupportedLocale): string {
    return locale === DEFAULT_LOCALE ? '' : `${locale.toLowerCase()}/`;
}

/** The part of a browser path below the folder the site is deployed in. */
function belowBase(pathname: string): string {
    const base = import.meta.env.BASE_URL;

    return `${pathname}/`.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\/+/, '');
}

/**
 * Address of a page relative to the site root, in the given language.
 *
 * @param appPath - Path inside the app, such as "/unit/knight", query string included.
 * @param locale - Language the page is served in.
 * @returns The address without a leading slash, such as "en/unit/knight".
 */
export function sitePath(appPath: string, locale: SupportedLocale): string {
    return `${folderOf(locale)}${appPath.replace(/^\/+/, '')}`;
}

/**
 * Path the browser requests for a page in the given language.
 *
 * @param appPath - Path inside the app, such as "/unit/knight", query string included.
 * @param locale - Language the page is served in.
 * @returns The absolute path, deployment folder included.
 */
export function localizedPath(appPath: string, locale: SupportedLocale): string {
    return `${import.meta.env.BASE_URL}${sitePath(appPath, locale)}`;
}

/**
 * Where the router mounts for the given language.
 *
 * @param locale - Language the pages are served in.
 * @returns The path every route of that language sits under.
 */
export function routerBasename(locale: SupportedLocale): string {
    return localizedPath('/', locale);
}

/**
 * Language a browser path is served in.
 *
 * @param pathname - Path from the address bar, deployment folder included.
 * @returns The language whose folder the path sits in, or the default language.
 */
export function localeFromPath(pathname: string): SupportedLocale {
    const relative = `${belowBase(pathname)}/`;

    return SUPPORTED_LOCALES.find((locale) => folderOf(locale) !== '' && relative.startsWith(folderOf(locale))) ?? DEFAULT_LOCALE;
}

/**
 * Path inside the app a browser path points at, whatever language it is served in.
 *
 * @param pathname - Path from the address bar, deployment folder included.
 * @returns The route path, such as "/unit/knight".
 */
export function appPathOf(pathname: string): string {
    const relative = belowBase(pathname);
    const folder = folderOf(localeFromPath(pathname));

    return `/${relative.slice(Math.min(folder.length, relative.length))}`;
}

export interface BrowserAddress {
    pathname: string;
    search: string;
    hash: string;
}

/**
 * The address a reader should be shown instead of the one they opened, if any.
 *
 * @param address - What the address bar holds.
 * @param preferred - The language the reader chose on an earlier visit, if they ever did.
 * @returns A path in the reader's language, or null when the address already is one.
 */
export function correctedPath(address: BrowserAddress, preferred: SupportedLocale | null): string | null {
    const locale = localeFromPath(address.pathname);
    const target = preferred ?? locale;

    // Links shared while every route lived behind a hash still circulate.
    if (address.hash.startsWith('#/')) return localizedPath(address.hash.slice(1), target);
    if (target === locale) return null;

    return localizedPath(`${appPathOf(address.pathname)}${address.search}${address.hash}`, target);
}

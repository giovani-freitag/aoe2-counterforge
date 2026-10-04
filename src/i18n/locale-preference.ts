import { SUPPORTED_LOCALES, type SupportedLocale } from './index.ts';

/** The key predates languages having addresses, so readers who picked one before keep it. */
const STORAGE_KEY = 'aoe2-guide.locale';

/**
 * The language this reader last chose, if they ever did.
 *
 * @returns A supported locale, or null when nothing usable is stored.
 */
export function preferredLocale(): SupportedLocale | null {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        return SUPPORTED_LOCALES.find((locale) => locale === stored) ?? null;
    } catch {
        return null;
    }
}

/**
 * Keeps the reader's language for their next visit.
 *
 * @param locale - Language the reader picked.
 */
export function rememberLocale(locale: SupportedLocale): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
        // A blocked storage quota only costs the reader their choice on the next visit.
    }
}

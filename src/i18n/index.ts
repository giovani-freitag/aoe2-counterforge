import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, FALLBACK_LOCALE } from '../data/dataset.ts';
import en from './locales/en.json';
import es from './locales/es.json';
import it from './locales/it.json';
import ptBr from './locales/pt-BR.json';

export const SUPPORTED_LOCALES = [DEFAULT_LOCALE, FALLBACK_LOCALE, 'es', 'it'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const RESOURCES: Record<SupportedLocale, { translation: Record<string, unknown> }> = {
    'pt-BR': { translation: ptBr },
    en: { translation: en },
    es: { translation: es },
    it: { translation: it },
};

/**
 * Boots i18next in the language the address is served in.
 *
 * @param locale - Language of the page being shown.
 * @returns The initialised i18next instance the React provider consumes.
 */
export function createI18n(locale: SupportedLocale): i18n {
    void i18next.use(initReactI18next).init({
        resources: RESOURCES,
        lng: locale,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: [...SUPPORTED_LOCALES],
        load: 'currentOnly',
        // The strings ship inside the bundle, and a page written ahead of time is rendered in one
        // synchronous pass that cannot wait for a deferred start.
        initAsync: false,
        interpolation: { escapeValue: false },
    });

    return i18next;
}

/**
 * Narrows an i18next language tag to a locale the dataset has strings for.
 *
 * @param language - Raw language tag reported by i18next.
 * @returns The closest supported locale.
 */
export function toSupportedLocale(language: string): SupportedLocale {
    const tag = language.toLowerCase();
    const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === tag);
    if (exact) return exact;

    // A regional variant the dataset has no strings for still reads best in its own language.
    const [base] = tag.split('-');

    return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase().split('-')[0] === base) ?? FALLBACK_LOCALE;
}

import i18next, { type i18n } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, FALLBACK_LOCALE } from '../data/dataset.ts';
import en from './locales/en.json';
import ptBr from './locales/pt-BR.json';

export const SUPPORTED_LOCALES = [DEFAULT_LOCALE, FALLBACK_LOCALE] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const RESOURCES: Record<SupportedLocale, { translation: Record<string, unknown> }> = {
    'pt-BR': { translation: ptBr },
    en: { translation: en },
};

/**
 * Boots i18next with the two locales the dataset ships strings for.
 *
 * @returns The initialised i18next instance the React provider consumes.
 */
export function createI18n(): i18n {
    void i18next
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources: RESOURCES,
            fallbackLng: DEFAULT_LOCALE,
            supportedLngs: [...SUPPORTED_LOCALES],
            load: 'currentOnly',
            interpolation: { escapeValue: false },
            detection: {
                order: ['localStorage', 'navigator'],
                lookupLocalStorage: 'aoe2-guide.locale',
                caches: ['localStorage'],
                convertDetectedLanguage: toSupportedLocale,
            },
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
    const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === language.toLowerCase());
    if (exact) return exact;

    return language.toLowerCase().startsWith('pt') ? DEFAULT_LOCALE : FALLBACK_LOCALE;
}

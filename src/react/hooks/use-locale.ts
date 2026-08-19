import { useTranslation } from 'react-i18next';
import { toSupportedLocale, type SupportedLocale } from '../../i18n/index.ts';

/**
 * The dataset locale matching the interface language.
 *
 * @returns A locale tag the game text service has strings for.
 */
export function useLocale(): SupportedLocale {
    const { i18n } = useTranslation();

    return toSupportedLocale(i18n.language);
}

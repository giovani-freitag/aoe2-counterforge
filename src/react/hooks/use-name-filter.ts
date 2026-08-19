import { useCallback } from 'react';
import { FALLBACK_LOCALE } from '../../data/dataset.ts';
import { normalize } from '../../services/search/fuzzy-matcher.ts';
import { useLocale } from './use-locale.ts';
import { useServices } from './use-services.ts';

export type NameFilter = (unitKey: string, needle: string) => boolean;

/**
 * Matches a typed fragment against a unit name in the interface language and in English.
 *
 * Players know units by both names, so typing "kipchak" has to find the Quipchaco.
 *
 * @returns A predicate usable directly inside a list filter.
 */
export function useNameFilter(): NameFilter {
    const { text } = useServices();
    const locale = useLocale();

    return useCallback(
        (unitKey: string, needle: string) => {
            const fragment = normalize(needle.trim());
            if (!fragment) return true;

            return [text.unit(locale, unitKey).name, text.unit(FALLBACK_LOCALE, unitKey).name, unitKey].some(
                (candidate) => normalize(candidate).includes(fragment),
            );
        },
        [text, locale],
    );
}

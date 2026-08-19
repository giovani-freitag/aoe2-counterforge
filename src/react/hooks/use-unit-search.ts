import { useMemo } from 'react';
import type { SearchOutcome } from '../../services/search/search-service.ts';
import { useDebouncedValue } from './use-debounced-value.ts';
import { useLocale } from './use-locale.ts';
import { useServices } from './use-services.ts';

const DEBOUNCE_MS = 90;
const RESULT_LIMIT = 24;

/**
 * Runs the command palette query against the search index.
 *
 * @param query - Raw text typed by the user.
 * @param civ - Civilization filter already active in the interface, if any.
 * @returns The ranked hits and the civilization the query narrowed itself to.
 */
export function useUnitSearch(query: string, civ: string | null = null): SearchOutcome {
    const { search } = useServices();
    const locale = useLocale();
    const settled = useDebouncedValue(query, DEBOUNCE_MS);

    return useMemo(
        () => search.search({ text: settled, locale, civ, limit: RESULT_LIMIT }),
        [search, settled, locale, civ],
    );
}

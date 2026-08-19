import { useCallback, useSyncExternalStore } from 'react';

/**
 * Follows a media query and re-renders when the answer changes.
 *
 * @param query - Media query text, such as "(max-width: 40rem)".
 * @returns Whether the query matches right now.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);

            return () => {
                list.removeEventListener('change', onChange);
            };
        },
        [query],
    );

    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(query).matches,
        () => false,
    );
}

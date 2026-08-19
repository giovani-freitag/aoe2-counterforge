import { useContext } from 'react';
import { PreferencesContext, type PreferencesStore } from '../providers/preferences-context.ts';

/**
 * Reads the persisted civilization and simulation choices.
 *
 * @returns The current preferences plus the updater.
 * @throws Error when called outside of the preferences provider.
 */
export function usePreferences(): PreferencesStore {
    const store = useContext(PreferencesContext);
    if (!store) throw new Error('usePreferences must be used inside <PreferencesProvider>.');

    return store;
}

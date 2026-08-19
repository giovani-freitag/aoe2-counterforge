import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    DEFAULT_PREFERENCES,
    PreferencesContext,
    type Preferences,
    type PreferencesStore,
} from './preferences-context.ts';

const STORAGE_KEY = 'aoe2-guide.preferences';

function readStored(): Preferences {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_PREFERENCES;

        return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
    } catch {
        return DEFAULT_PREFERENCES;
    }
}

export interface PreferencesProviderProps {
    children: ReactNode;
}

/** Keeps the civilization and simulation choices alive across reloads. */
export function PreferencesProvider({ children }: PreferencesProviderProps) {
    const [preferences, setPreferences] = useState<Preferences>(readStored);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch {
            // A blocked storage quota must never take the page down with it.
        }
    }, [preferences]);

    const update = useCallback((patch: Partial<Preferences>) => {
        setPreferences((current) => ({ ...current, ...patch }));
    }, []);

    const store = useMemo<PreferencesStore>(() => ({ preferences, update }), [preferences, update]);

    return <PreferencesContext value={store}>{children}</PreferencesContext>;
}

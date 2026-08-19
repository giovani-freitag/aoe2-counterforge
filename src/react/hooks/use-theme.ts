import { useEffect } from 'react';
import type { ThemeChoice } from '../providers/preferences-context.ts';
import { usePreferences } from './use-preferences.ts';

export interface Theme {
    choice: ThemeChoice;
    set: (choice: ThemeChoice) => void;
}

/**
 * Applies the stored theme to the document.
 *
 * @returns The current choice and a way to change it.
 */
export function useTheme(): Theme {
    const { preferences, update } = usePreferences();
    const choice = preferences.theme;

    useEffect(() => {
        if (choice === 'system') delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = choice;
    }, [choice]);

    return {
        choice,
        set: (next) => {
            update({ theme: next });
        },
    };
}

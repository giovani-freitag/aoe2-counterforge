import { createContext } from 'react';
import type { EngagementModel } from '../../services/combat/combat-service.ts';
import type { OpponentPool, UpgradeLevel } from '../../services/matchup/matchup-service.ts';

/** Follow the system, or override it. */
export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Preferences {
    civ: string | null;
    theme: ThemeChoice;
    model: EngagementModel;
    upgradeLevel: UpgradeLevel;
    pool: OpponentPool;
}

export interface PreferencesStore {
    preferences: Preferences;
    update: (patch: Partial<Preferences>) => void;
}

export const DEFAULT_PREFERENCES: Preferences = {
    civ: null,
    theme: 'system',
    model: 'skirmish',
    upgradeLevel: 'full',
    pool: 'common',
};

export const PreferencesContext = createContext<PreferencesStore | null>(null);

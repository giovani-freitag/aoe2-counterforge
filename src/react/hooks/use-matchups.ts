import { useMemo } from 'react';
import type { Unit } from '../../domain/entities/unit.ts';
import type { MatchupReport, OpponentPool } from '../../services/matchup/matchup-service.ts';
import { usePreferences } from './use-preferences.ts';
import { useServices } from './use-services.ts';

const LIST_LIMIT = 8;

export interface MatchupOptions {
    /** Opponent pool to rank against, or undefined to follow the reader's preference. */
    pool?: OpponentPool;
    /**
     * Whose unit the subject is.
     *
     * Defaults to the reader's civilization, which is right on that unit's own page and wrong when
     * the subject is the enemy: nobody wants their own bonuses handed to what they are fighting.
     */
    subjectCiv?: string | null;
    /** Whose units the opposition is drawn from, or null for every civilization's. */
    opponentCiv?: string | null;
}

/**
 * Ranks the roster against a unit using the active simulation preferences.
 *
 * @param unit - Unit to rank, or null while the page has nothing selected.
 * @param options - Which pool to use and which civilization stands on each side.
 * @returns The matchup report, or null when there is no unit.
 */
export function useMatchups(unit: Unit | null, options: MatchupOptions = {}): MatchupReport | null {
    const { matchups } = useServices();
    const { preferences } = usePreferences();
    const { pool, subjectCiv, opponentCiv = null } = options;

    return useMemo(() => {
        if (!unit) return null;

        return matchups.rank({
            unit,
            civ: subjectCiv === undefined ? preferences.civ : subjectCiv,
            opponentCiv,
            model: preferences.model,
            upgradeLevel: preferences.upgradeLevel,
            pool: pool ?? preferences.pool,
            limit: LIST_LIMIT,
        });
    }, [
        matchups,
        unit,
        pool,
        subjectCiv,
        opponentCiv,
        preferences.civ,
        preferences.model,
        preferences.upgradeLevel,
        preferences.pool,
    ]);
}

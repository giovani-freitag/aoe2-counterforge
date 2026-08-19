import { useMemo } from 'react';
import type { Unit } from '../../domain/entities/unit.ts';
import type { MatchupReport, OpponentPool } from '../../services/matchup/matchup-service.ts';
import { usePreferences } from './use-preferences.ts';
import { useServices } from './use-services.ts';

const LIST_LIMIT = 8;

/**
 * Ranks the roster against a unit using the active simulation preferences.
 *
 * @param unit - Unit to rank, or null while the page has nothing selected.
 * @param pool - Opponent pool to rank against, or undefined to follow the reader's preference.
 * @returns The matchup report, or null when there is no unit.
 */
export function useMatchups(unit: Unit | null, pool?: OpponentPool): MatchupReport | null {
    const { matchups } = useServices();
    const { preferences } = usePreferences();

    return useMemo(() => {
        if (!unit) return null;

        return matchups.rank({
            unit,
            civ: preferences.civ,
            model: preferences.model,
            upgradeLevel: preferences.upgradeLevel,
            pool: pool ?? preferences.pool,
            limit: LIST_LIMIT,
        });
    }, [matchups, unit, pool, preferences.civ, preferences.model, preferences.upgradeLevel, preferences.pool]);
}

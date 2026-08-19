import { useMemo } from 'react';
import type { Unit } from '../../domain/entities/unit.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import type { AppliedUpgrade } from '../../services/upgrade/upgrade-service.ts';
import { usePreferences } from './use-preferences.ts';
import { useServices } from './use-services.ts';

/** The unique technologies of one civilization that reach the unit. */
export interface CivilizationUpgrades {
    civ: string;
    upgrades: AppliedUpgrade[];
}

export interface UnitUpgradeView {
    generic: AppliedUpgrade[];
    /** Every civilization whose own technologies change this unit, whether or not one is chosen. */
    byCivilization: CivilizationUpgrades[];
    upgradedStats: UnitStats;
    upgradedTrainTime: number;
}

/**
 * Everything the upgrades tab shows for a unit.
 *
 * The unique technologies do not wait for a civilization to be picked: the guide asks the game
 * which ones reach this unit and files them under whoever owns them.
 *
 * @param unit - Unit to inspect, or null while the page has nothing selected.
 * @returns Shared upgrades, the unique ones by civilization, and the upgraded stat line.
 */
export function useUnitUpgrades(unit: Unit | null): UnitUpgradeView | null {
    const { upgrades } = useServices();
    const { preferences } = usePreferences();

    return useMemo(() => {
        if (!unit) return null;

        const outcome = upgrades.fullyUpgraded(unit, preferences.civ);
        const reaching = upgrades.affecting(unit, preferences.civ);

        const byCiv = new Map<string, AppliedUpgrade[]>();
        for (const upgrade of reaching) {
            if (!upgrade.technology.isUnique) continue;

            const civ = upgrade.technology.civs[0];
            byCiv.set(civ, [...(byCiv.get(civ) ?? []), upgrade]);
        }

        return {
            generic: reaching.filter((upgrade) => !upgrade.technology.isUnique),
            byCivilization: [...byCiv]
                .map(([civ, list]) => ({ civ, upgrades: list }))
                .sort((left, right) => left.civ.localeCompare(right.civ)),
            upgradedStats: outcome.stats,
            upgradedTrainTime: outcome.trainTime,
        };
    }, [upgrades, unit, preferences.civ]);
}

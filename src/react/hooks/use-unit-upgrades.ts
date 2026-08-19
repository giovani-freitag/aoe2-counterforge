import { useMemo } from 'react';
import type { Unit } from '../../domain/entities/unit.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import type { AppliedUpgrade } from '../../services/upgrade/upgrade-service.ts';
import type { StatDelta } from '../../services/upgrade/tech-effect.ts';
import { usePreferences } from './use-preferences.ts';
import { useServices } from './use-services.ts';

/** What one civilization, and only that civilization, does to the unit. */
export interface CivilizationUpgrades {
    civ: string;
    upgrades: AppliedUpgrade[];
    /** The bonus it is given at the start of the match, when it has one that reaches the unit. */
    bonus: StatDelta | null;
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

        const byCiv = new Map<string, CivilizationUpgrades>();
        const entryFor = (civ: string) => {
            const known = byCiv.get(civ) ?? { civ, upgrades: [], bonus: null };
            byCiv.set(civ, known);

            return known;
        };

        for (const { civ, delta } of upgrades.civilizationBonuses(unit)) entryFor(civ).bonus = delta;
        for (const upgrade of reaching) {
            if (!upgrade.technology.isUnique) continue;

            entryFor(upgrade.technology.civs[0]).upgrades.push(upgrade);
        }

        return {
            generic: reaching.filter((upgrade) => !upgrade.technology.isUnique),
            byCivilization: [...byCiv.values()].sort((left, right) => left.civ.localeCompare(right.civ)),
            upgradedStats: outcome.stats,
            upgradedTrainTime: outcome.trainTime,
        };
    }, [upgrades, unit, preferences.civ]);
}

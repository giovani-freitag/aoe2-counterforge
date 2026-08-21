import { ECONOMY_RECORD } from '../../src/data/dataset.ts';
import type { EconomyServiceConfig } from '../../src/services/economy/economy-service.ts';
import { gatherRates } from '../../src/composition-root.ts';
import type { CarryUpgrade, GatherUpgrade } from '../../src/services/economy/gather-rates.ts';

/**
 * The planner wired the way the application wires it.
 *
 * The technology figures come from the game, so a test that made them up would be checking the
 * fixture instead of the model.
 *
 * @returns A configuration ready to hand to the service.
 */
export function economyConfig(): EconomyServiceConfig {
    return {
        rates: gatherRates(),
        gatherUpgrades: ECONOMY_RECORD.gatherUpgrades as GatherUpgrade[],
        carryUpgrades: ECONOMY_RECORD.carryUpgrades as CarryUpgrade[],
        farmUpgrades: ECONOMY_RECORD.farmUpgrades,
        walkSpeed: ECONOMY_RECORD.villagerWalkSpeed,
        farmFood: ECONOMY_RECORD.farmFood,
        farmWoodCost: ECONOMY_RECORD.farmWoodCost,
    };
}

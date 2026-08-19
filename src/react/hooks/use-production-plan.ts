import { useMemo } from 'react';
import type { Unit } from '../../domain/entities/unit.ts';
import type { FoodSource } from '../../services/economy/gather-rates.ts';
import type { ProductionPlan } from '../../services/economy/economy-service.ts';
import { useServices } from './use-services.ts';

export interface ProductionPlanOptions {
    buildings: number;
    foodSource: FoodSource;
    gatherTechs: readonly string[];
    trainTime: number;
    includeFarmUpkeep: boolean;
}

/**
 * Turns the economy form into a villager plan.
 *
 * @param unit - Unit being produced, or null while the page has nothing selected.
 * @param options - Buildings, food source, technologies, train time and whether farms are charged.
 * @returns The plan, or null when there is no unit.
 */
export function useProductionPlan(unit: Unit | null, options: ProductionPlanOptions): ProductionPlan | null {
    const { economy } = useServices();

    return useMemo(() => {
        if (!unit || unit.cost.total() === 0) return null;

        return economy.plan({
            unit,
            buildings: options.buildings,
            foodSource: options.foodSource,
            gatherTechs: options.gatherTechs,
            trainTime: options.trainTime,
            includeFarmUpkeep: options.includeFarmUpkeep,
        });
    }, [
        economy,
        unit,
        options.buildings,
        options.foodSource,
        options.gatherTechs,
        options.trainTime,
        options.includeFarmUpkeep,
    ]);
}

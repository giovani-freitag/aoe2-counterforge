import { useMemo } from 'react';
import type { Unit } from '../../domain/entities/unit.ts';
import { useServices } from './use-services.ts';

/**
 * The upgrade line a unit belongs to, in steps.
 *
 * @param unit - Unit whose line should be resolved.
 * @returns One entry per step, each holding the alternatives at that point; empty without a unit.
 */
export function useUnitLine(unit: Unit | null): Unit[][] {
    const { catalog } = useServices();

    return useMemo(() => (unit ? catalog.upgradeSteps(unit.line) : []), [catalog, unit]);
}

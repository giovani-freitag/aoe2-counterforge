import { useMemo } from 'react';
import type { Unit } from '../../domain/entities/unit.ts';
import { useServices } from './use-services.ts';

/**
 * The full upgrade line a unit belongs to, in training order.
 *
 * @param unit - Unit whose line should be resolved.
 * @returns Every member of the line, earliest age first.
 */
export function useUnitLine(unit: Unit | null): Unit[] {
    const { catalog } = useServices();

    return useMemo(() => (unit ? catalog.units({ line: unit.line }) : []), [catalog, unit]);
}

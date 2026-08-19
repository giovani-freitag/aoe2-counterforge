import { useMemo } from 'react';
import type { Unit } from '../../domain/entities/unit.ts';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import { useServices } from './use-services.ts';

/**
 * Looks a unit up without throwing on an unknown slug.
 *
 * @param key - Unit slug taken from the route.
 * @returns The unit, or null when the slug does not exist.
 */
export function useUnit(key: string | undefined): Unit | null {
    const { catalog } = useServices();

    return useMemo(() => {
        if (!key) return null;

        try {
            return catalog.unit(key);
        } catch (error) {
            if (error instanceof EntityNotFoundError) return null;
            throw error;
        }
    }, [catalog, key]);
}

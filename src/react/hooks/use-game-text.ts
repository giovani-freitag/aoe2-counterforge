import { useMemo } from 'react';
import type { CivilizationTextRecord, TechnologyTextRecord, UnitTextRecord } from '../../data/records.ts';
import { useLocale } from './use-locale.ts';
import { useServices } from './use-services.ts';

export interface GameTextReader {
    unit: (key: string) => UnitTextRecord;
    technology: (key: string) => TechnologyTextRecord;
    civilization: (key: string) => CivilizationTextRecord;
}

/**
 * Binds the game string service to the interface language.
 *
 * @returns Readers that resolve names and descriptions for the active locale.
 */
export function useGameText(): GameTextReader {
    const { text } = useServices();
    const locale = useLocale();

    return useMemo(
        () => ({
            unit: (key: string) => text.unit(locale, key),
            technology: (key: string) => text.technology(locale, key),
            civilization: (key: string) => text.civilization(locale, key),
        }),
        [text, locale],
    );
}

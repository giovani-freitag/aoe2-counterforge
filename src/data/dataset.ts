import civilizationsJson from './generated/civilizations.json';
import economyJson from './generated/economy.json';
import stringsEnJson from './generated/strings.en.json';
import stringsPtBrJson from './generated/strings.pt-BR.json';
import technologiesJson from './generated/technologies.json';
import unitsJson from './generated/units.json';
import type {
    CivilizationRecord,
    EconomyRecord,
    GameStringBundle,
    TechnologyRecord,
    UnitRecord,
} from './records.ts';

export const UNIT_RECORDS = unitsJson as UnitRecord[];
export const TECHNOLOGY_RECORDS = technologiesJson as TechnologyRecord[];
export const CIVILIZATION_RECORDS = civilizationsJson as CivilizationRecord[];
export const ECONOMY_RECORD = economyJson as EconomyRecord;

export const GAME_STRING_BUNDLES: Record<string, GameStringBundle> = {
    en: stringsEnJson,
    'pt-BR': stringsPtBrJson,
};

export const DEFAULT_LOCALE = 'pt-BR' as const;
export const FALLBACK_LOCALE = 'en' as const;

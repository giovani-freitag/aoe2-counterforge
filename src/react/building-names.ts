import type { TFunction } from 'i18next';

/**
 * Joins the buildings a unit can be trained at into one readable label.
 *
 * @param buildings - Building slugs, primary first.
 * @param t - Translator bound to the active interface language.
 * @returns The localized names separated by a slash.
 */
export function buildingNames(buildings: readonly string[], t: TFunction): string {
    return buildings.map((building) => t(`buildings.${building}`, building)).join(' / ');
}

export const UNIT_CATEGORIES = [
    'infantry',
    'archer',
    'cavalry',
    'cavalry-archer',
    'camel',
    'elephant',
    'siege',
    'monk',
    'naval',
    'civilian',
] as const;

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

/** Categories a land army is actually built from, in the order the browse screen shows them. */
export const LAND_CATEGORIES: readonly UnitCategory[] = [
    'infantry',
    'archer',
    'cavalry',
    'cavalry-archer',
    'camel',
    'elephant',
    'siege',
    'monk',
];

const KNOWN = new Set<string>(UNIT_CATEGORIES);

/**
 * Narrows an arbitrary string to a known unit category.
 *
 * @param value - Raw category identifier coming from the generated dataset.
 * @returns True when the value is part of the modelled category list.
 */
export function isUnitCategory(value: string): value is UnitCategory {
    return KNOWN.has(value);
}

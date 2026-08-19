/**
 * Armour classes drive every damage calculation in the game: an attack entry and an armour
 * entry of the same class cancel each other out before the total is applied.
 */
export const ARMOUR_CLASSES = [
    'base-melee',
    'base-pierce',
    'infantry',
    'archer',
    'skirmisher',
    'spearman',
    'eagle-warrior',
    'cavalry',
    'cavalry-archer',
    'camel',
    'mameluke',
    'war-elephant',
    'armored-elephant',
    'monk',
    'siege-weapon',
    'ram',
    'gunpowder',
    'unique-unit',
    'ship',
    'ship-secondary',
    'fire-ship',
    'standard-building',
    'all-buildings',
    'stone-defense',
    'castle',
    'wall-gate',
    'tree',
] as const;

export type ArmourClass = (typeof ARMOUR_CLASSES)[number];

export const BASE_MELEE = 'base-melee' satisfies ArmourClass;
export const BASE_PIERCE = 'base-pierce' satisfies ArmourClass;

/** Classes that describe scenery or structures, never a trainable opponent. */
export const NON_UNIT_CLASSES: readonly ArmourClass[] = [
    'standard-building',
    'all-buildings',
    'stone-defense',
    'castle',
    'wall-gate',
    'tree',
];

const KNOWN = new Set<string>(ARMOUR_CLASSES);

/**
 * Narrows an arbitrary string to a known armour class.
 *
 * @param value - Raw class identifier coming from the generated dataset.
 * @returns True when the value is part of the modelled class list.
 */
export function isArmourClass(value: string): value is ArmourClass {
    return KNOWN.has(value);
}

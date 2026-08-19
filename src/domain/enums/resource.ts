export const RESOURCES = ['food', 'wood', 'gold', 'stone'] as const;

export type Resource = (typeof RESOURCES)[number];

export type ResourceAmounts = Record<Resource, number>;

/**
 * Builds a resource record with every slot initialised.
 *
 * @param value - Amount assigned to each resource.
 * @returns A full record so callers never deal with undefined slots.
 */
export function emptyAmounts(value = 0): ResourceAmounts {
    return { food: value, wood: value, gold: value, stone: value };
}

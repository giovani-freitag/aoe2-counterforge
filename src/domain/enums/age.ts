export const AGE_IDS = [1, 2, 3, 4] as const;

export type AgeId = (typeof AGE_IDS)[number];

export const AGE_KEYS = {
    1: 'dark',
    2: 'feudal',
    3: 'castle',
    4: 'imperial',
} as const satisfies Record<AgeId, string>;

export type AgeKey = (typeof AGE_KEYS)[AgeId];

/**
 * Clamps an arbitrary number to a valid age id.
 *
 * @param value - Age index coming from the generated dataset.
 * @returns The matching age id, defaulting to the Dark Age.
 */
export function toAgeId(value: number): AgeId {
    return (AGE_IDS as readonly number[]).includes(value) ? (value as AgeId) : 1;
}

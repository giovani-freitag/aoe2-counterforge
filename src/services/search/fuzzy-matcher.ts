export interface FuzzyMatch {
    score: number;
    positions: number[];
}

const EXACT_BONUS = 400;
const PREFIX_BONUS = 260;
const WORD_START_BONUS = 90;
const SUBSTRING_BONUS = 120;
const CONSECUTIVE_BONUS = 24;
const GAP_PENALTY = 2;
const MAX_GAP_PENALTY = 40;
const LENGTH_PENALTY = 0.4;

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const WORD_SEPARATOR = /[\s\-_/(),.]/;

/**
 * Folds a string into the form the index compares against.
 *
 * @param value - Raw text, possibly accented and mixed case.
 * @returns Lowercase, accent-free text.
 */
export function normalize(value: string): string {
    return value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/** Scores how well a typed fragment matches a candidate string, fzf style. */
export class FuzzyMatcher {
    /**
     * Matches a normalized needle against a normalized haystack.
     *
     * @param needle - Already normalized query fragment; must not be empty.
     * @param haystack - Already normalized candidate text.
     * @returns The score with the matched character positions, or null when there is no match.
     */
    public match(needle: string, haystack: string): FuzzyMatch | null {
        if (needle.length === 0) return { score: 0, positions: [] };
        if (needle.length > haystack.length) return null;

        const exact = this.exactMatch(needle, haystack);
        if (exact) return exact;

        return this.subsequenceMatch(needle, haystack);
    }

    private exactMatch(needle: string, haystack: string): FuzzyMatch | null {
        const index = haystack.indexOf(needle);
        if (index < 0) return null;

        const positions = Array.from({ length: needle.length }, (_, offset) => index + offset);
        const atWordStart = index === 0 || WORD_SEPARATOR.test(haystack[index - 1]);
        const base =
            needle.length === haystack.length
                ? EXACT_BONUS
                : index === 0
                  ? PREFIX_BONUS
                  : atWordStart
                    ? WORD_START_BONUS + SUBSTRING_BONUS
                    : SUBSTRING_BONUS;

        return { score: base + needle.length * CONSECUTIVE_BONUS - haystack.length * LENGTH_PENALTY, positions };
    }

    private subsequenceMatch(needle: string, haystack: string): FuzzyMatch | null {
        const positions: number[] = [];
        let score = 0;
        let cursor = 0;
        let previous = -1;

        for (const character of needle) {
            const found = haystack.indexOf(character, cursor);
            if (found < 0) return null;

            const isWordStart = found === 0 || WORD_SEPARATOR.test(haystack[found - 1]);
            if (isWordStart) score += WORD_START_BONUS;
            if (found === previous + 1) score += CONSECUTIVE_BONUS;
            else score -= Math.min(MAX_GAP_PENALTY, (found - previous - 1) * GAP_PENALTY);

            positions.push(found);
            previous = found;
            cursor = found + 1;
        }

        return { score: score - haystack.length * LENGTH_PENALTY, positions };
    }
}

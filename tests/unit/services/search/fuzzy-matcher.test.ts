import { describe, expect, it } from 'vitest';
import { FuzzyMatcher, normalize } from '../../../../src/services/search/fuzzy-matcher.ts';

describe('normalize', () => {
    it('strips accents and case so typing without accents still matches', () => {
        expect(normalize('Milícia')).toBe('milicia');
    });
});

describe('FuzzyMatcher', () => {
    const matcher = new FuzzyMatcher();

    it('returns no match when a character is missing', () => {
        expect(matcher.match('zzz', 'cavaleiro')).toBeNull();
    });

    it('ranks an exact title above a prefix of a longer title', () => {
        const exact = matcher.match('arqueiro', 'arqueiro');
        const prefix = matcher.match('arqueiro', 'arqueiro de arco longo');

        expect(exact?.score).toBeGreaterThan(prefix?.score ?? 0);
    });

    it('ranks a prefix above a match in the middle of the text', () => {
        const prefix = matcher.match('cav', 'cavaleiro');
        const middle = matcher.match('cav', 'batedor a cavalo');

        expect(prefix?.score).toBeGreaterThan(middle?.score ?? 0);
    });

    it('reports the matched character positions for highlighting', () => {
        const match = matcher.match('bes', 'besteiro');

        expect(match?.positions).toEqual([0, 1, 2]);
    });

    it('still matches when the typed letters are spread out', () => {
        const match = matcher.match('mgl', 'mangonel');

        expect(match?.positions).toEqual([0, 3, 7]);
    });
});

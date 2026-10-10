import type { MatchupVerdict } from '../services/matchup/matchup-service.ts';

/** The tint every trade ratio and verdict is written in, wherever the guide shows one. */
export const VERDICT_COLOUR: Record<MatchupVerdict, string> = {
    dominant: 'var(--good)',
    favourable: 'var(--good)',
    even: 'var(--even)',
    unfavourable: 'var(--bad)',
    countered: 'var(--bad)',
};

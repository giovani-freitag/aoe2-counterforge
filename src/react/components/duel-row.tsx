import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Duel } from '../../services/matchup/matchup-service.ts';
import { efficiency } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { VERDICT_COLOUR } from '../verdict-colour.ts';
import { DuelBreakdown } from './duel-breakdown.tsx';
import { GameIcon } from './game-icon.tsx';
import { Icon } from './icon.tsx';

export interface DuelRowProps {
    duel: Duel;
}

/**
 * How far past the middle the winner pulls the rope.
 *
 * Each half of the track stands for a factor of ten, so an even trade sits on the centre line and
 * a tenfold one reaches the loser's end.
 */
function leanOf(ratio: number): number {
    return Math.min(100, 50 + 50 * Math.log10(Math.max(1, ratio)));
}

/** One pair of the group as a tug of war, winner on the left, unfolding into its arithmetic. */
export function DuelRow({ duel }: DuelRowProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const [isOpen, setIsOpen] = useState(false);

    const winnerName = text.unit(duel.winner.key).name;
    const loserName = text.unit(duel.loser.key).name;
    const { verdict } = duel.matchup;
    const colour = VERDICT_COLOUR[verdict];

    // The layout carries the sentence for the eye; a screen reader gets the sentence itself.
    const label = t(verdict === 'even' ? 'compare.duels.trades' : 'compare.duels.beats', {
        winner: winnerName,
        loser: loserName,
        value: efficiency(duel.matchup.efficiency),
        verdict: t(`counters.verdicts.${verdict}`),
    });

    return (
        <div className="matchup" data-open={isOpen}>
            <button
                type="button"
                className="duel__summary"
                aria-label={label}
                aria-expanded={isOpen}
                onClick={() => { setIsOpen((open) => !open); }}
            >
                <span className="duel__names">
                    <span className="duel__side duel__side--winner">
                        <GameIcon
                            path={duel.winner.icon === null ? null : `Unit/${duel.winner.icon}.png`}
                            alt=""
                            size="sm"
                        />
                        <span className="duel__name">{winnerName}</span>
                    </span>
                    <span className="duel__side duel__side--loser">
                        <span className="duel__name">{loserName}</span>
                        <GameIcon
                            path={duel.loser.icon === null ? null : `Unit/${duel.loser.icon}.png`}
                            alt=""
                            size="sm"
                        />
                    </span>
                </span>
                <span className="duel__track" aria-hidden="true">
                    <span className="duel__fill" style={{ width: `${leanOf(duel.matchup.efficiency)}%`, background: colour }} />
                </span>
                <span className="matchup__score duel__score">
                    <span className="matchup__value" style={{ color: colour }}>
                        {efficiency(duel.matchup.efficiency)}
                    </span>
                    <span className="matchup__verdict" style={{ color: colour }}>
                        {t(`counters.verdicts.${verdict}`)}
                    </span>
                </span>
                <span className="matchup__caret duel__caret" aria-hidden="true">
                    <Icon name="next" />
                </span>
            </button>

            {isOpen ? (
                <div className="matchup__detail">
                    <DuelBreakdown matchup={duel.matchup} subjectName={winnerName} opponentName={loserName} />
                </div>
            ) : null}
        </div>
    );
}

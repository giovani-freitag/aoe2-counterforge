import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { DuelSide } from '../../services/combat/combat-service.ts';
import type { Matchup } from '../../services/matchup/matchup-service.ts';
import { efficiency, precise, short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { GameIcon } from './game-icon.tsx';
import { Icon } from './icon.tsx';

export interface MatchupRowProps {
    matchup: Matchup;
    subjectName: string;
    /**
     * Reads the trade from the opponent's side.
     *
     * A list of answers to a unit is the same set of matchups seen from the other end: the number
     * a reader wants there is how well the answer does, not how badly the subject does.
     */
    fromOpponent?: boolean;
}

const VERDICT_COLOUR = {
    dominant: 'var(--good)',
    favourable: 'var(--good)',
    even: 'var(--even)',
    unfavourable: 'var(--bad)',
    countered: 'var(--bad)',
} as const;

/** The same verdict said by the other side of the fight. */
const MIRRORED = {
    dominant: 'countered',
    favourable: 'unfavourable',
    even: 'even',
    unfavourable: 'favourable',
    countered: 'dominant',
} as const;

/** Maps a ratio that spans two orders of magnitude onto a readable bar. */
function barWidth(efficiency: number): number {
    return Math.min(100, Math.max(4, 50 + 25 * Math.log10(Math.max(0.01, efficiency))));
}

function DuelColumn({ title, side }: { title: string; side: DuelSide }) {
    const { t } = useTranslation();

    return (
        <div>
            <div className="section-label">{title}</div>
            <table className="damage-table">
                <tbody>
                    <tr>
                        <td>{t('counters.duel.damagePerHit')}</td>
                        <td>{short(side.damagePerHit)}</td>
                    </tr>
                    <tr>
                        <td>{t('stats.dps')}</td>
                        <td>{precise(side.dps)}</td>
                    </tr>
                    <tr>
                        <td>{t('counters.duel.hitsToKill')}</td>
                        <td>{side.hitsToKill}</td>
                    </tr>
                    <tr>
                        <td>{t('counters.duel.timeToKill')}</td>
                        <td>{t('counters.seconds', { value: short(side.timeToKill) })}</td>
                    </tr>
                    {side.freeHits > 0 ? (
                        <tr>
                            <td>{t('counters.duel.freeHits')}</td>
                            <td>{side.freeHits}</td>
                        </tr>
                    ) : null}
                </tbody>
            </table>
        </div>
    );
}

/** One opponent row that unfolds in place to show the full arithmetic behind its verdict. */
export function MatchupRow({ matchup, subjectName, fromOpponent = false }: MatchupRowProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const [isOpen, setIsOpen] = useState(false);

    const opponentName = text.unit(matchup.opponent.key).name;
    const verdict = fromOpponent ? MIRRORED[matchup.verdict] : matchup.verdict;
    const score = fromOpponent ? 1 / matchup.efficiency : matchup.efficiency;
    const colour = VERDICT_COLOUR[verdict];
    const notes = matchup.notes.slice(0, 3);

    return (
        <div className="matchup" data-open={isOpen}>
            <button
                type="button"
                className="matchup__summary"
                aria-expanded={isOpen}
                onClick={() => { setIsOpen((open) => !open); }}
            >
                <GameIcon path={matchup.opponent.icon === null ? null : `Unit/${matchup.opponent.icon}.png`} alt="" />
                <span className="list-item__body">
                    <span className="list-item__title">{opponentName}</span>
                    <span className="matchup__notes">
                        {notes.map((note) => (
                            <span key={note} className="note-chip">
                                {t(`counters.notes.${note}`)}
                            </span>
                        ))}
                    </span>
                </span>
                <span className="matchup__score">
                    <span className="matchup__value" style={{ color: colour }}>
                        {efficiency(score)}
                    </span>
                    <span className="matchup__verdict" style={{ color: colour }}>
                        {t(`counters.verdicts.${verdict}`)}
                    </span>
                    <span className="matchup__bar">
                        <span
                            className="matchup__fill"
                            style={{ width: `${barWidth(score)}%`, background: colour }}
                        />
                    </span>
                </span>
                <span className="matchup__caret" aria-hidden="true">
                    <Icon name="next" />
                </span>
            </button>

            {isOpen ? (
                <div className="matchup__detail">
                    <div className="section-label">{t('counters.duel.title')}</div>
                    <div className="demand-grid" style={{ marginTop: 'var(--space-2)' }}>
                        <DuelColumn title={`${subjectName} →`} side={matchup.duel.attacker} />
                        <DuelColumn title={`${opponentName} →`} side={matchup.duel.defender} />
                    </div>

                    <hr className="divider" />

                    <div className="section-label">{t('counters.duel.breakdown')}</div>
                    <div className="scroll-x">
                        <table className="damage-table">
                            <tbody>
                                {matchup.duel.attacker.breakdown.components.map((component) => (
                                    <tr key={component.armourClass}>
                                        <td>{t(`armourClasses.${component.armourClass}`)}</td>
                                        <td>
                                            {component.attack} - {component.armour}
                                        </td>
                                        <td>{component.net}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                {matchup.duel.attacker.breakdown.volley.extra === 0 ? null : (
                                    <tr>
                                        <td>
                                            {t('counters.duel.volley', {
                                                count: matchup.duel.attacker.breakdown.volley.extra,
                                            })}
                                        </td>
                                        <td />
                                        <td>
                                            {matchup.duel.attacker.breakdown.volley.extra *
                                                matchup.duel.attacker.breakdown.volley.each}
                                        </td>
                                    </tr>
                                )}
                                <tr>
                                    <td>{t('counters.duel.damagePerHit')}</td>
                                    <td />
                                    <td>{matchup.duel.attacker.damagePerHit}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <p className="card__hint" style={{ marginTop: 'var(--space-2)' }}>
                        {t('counters.duel.minimumDamage')}
                    </p>

                    <div className="matchup__actions">
                        <Link className="chip" to={`/unit/${matchup.opponent.key}`}>
                            {t('counters.openUnit', { unit: opponentName })}
                        </Link>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

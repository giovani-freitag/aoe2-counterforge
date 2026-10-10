import { useTranslation } from 'react-i18next';
import type { DuelSide } from '../../services/combat/combat-service.ts';
import type { Matchup } from '../../services/matchup/matchup-service.ts';
import { precise, short } from '../format.ts';

export interface DuelBreakdownProps {
    matchup: Matchup;
    subjectName: string;
    opponentName: string;
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

/** The arithmetic behind one matchup: both sides of the duel and the subject's damage per class. */
export function DuelBreakdown({ matchup, subjectName, opponentName }: DuelBreakdownProps) {
    const { t } = useTranslation();

    return (
        <>
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
        </>
    );
}

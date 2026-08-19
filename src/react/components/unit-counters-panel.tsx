import { useTranslation } from 'react-i18next';
import type { Unit } from '../../domain/entities/unit.ts';
import type { EngagementModel } from '../../services/combat/combat-service.ts';
import type { Matchup, OpponentPool, UpgradeLevel } from '../../services/matchup/matchup-service.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useMatchups } from '../hooks/use-matchups.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { MatchupExplorer } from './matchup-explorer.tsx';
import { MatchupRow } from './matchup-row.tsx';
import { SegmentedControl } from './segmented-control.tsx';
import { Icon } from './icon.tsx';

export interface UnitCountersPanelProps {
    unit: Unit;
}

function MatchupSection({ title, items, subjectName }: { title: string; items: Matchup[]; subjectName: string }) {
    const { t } = useTranslation();

    return (
        <section className="card">
            <div className="card__title">
                <h2>{title}</h2>
            </div>
            {items.length === 0 ? (
                <p className="empty">{t('counters.empty')}</p>
            ) : (
                <div className="list">
                    {items.map((matchup) => (
                        <MatchupRow key={matchup.opponent.key} matchup={matchup} subjectName={subjectName} />
                    ))}
                </div>
            )}
        </section>
    );
}

/** Computed counter lists plus the switches that drive the simulation. */
export function UnitCountersPanel({ unit }: UnitCountersPanelProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const { preferences, update } = usePreferences();
    const report = useMatchups(unit);
    const complete = useMatchups(unit, 'every');
    const subjectName = text.unit(unit.key).name;

    if (!unit.stats.canAttack() || unit.hasTag('demolition')) {
        const reason = unit.hasTag('demolition') ? 'counters.demolition' : 'counters.noAttack';

        return (
            <section className="card">
                <p className="prose">{t(reason, { unit: subjectName })}</p>
            </section>
        );
    }

    return (
        <div className="stack">
            <section className="card">
                <div className="card__title">
                    <h2>
                        <Icon name="strongAgainst" />
                        {t('counters.title')}
                    </h2>
                </div>
                <p className="card__hint">{t('counters.explain')}</p>
                <div className="controls" style={{ marginTop: 'var(--space-3)' }}>
                    <SegmentedControl<EngagementModel>
                        label={t('counters.model')}
                        value={preferences.model}
                        onChange={(model) => { update({ model }); }}
                        options={[
                            { value: 'skirmish', label: t('counters.models.skirmish') },
                            { value: 'stand', label: t('counters.models.stand') },
                        ]}
                    />
                    <SegmentedControl<UpgradeLevel>
                        label={t('counters.upgradeLevel')}
                        value={preferences.upgradeLevel}
                        onChange={(upgradeLevel) => { update({ upgradeLevel }); }}
                        options={[
                            { value: 'full', label: t('counters.upgradeLevels.full') },
                            { value: 'base', label: t('counters.upgradeLevels.base') },
                        ]}
                    />
                    <SegmentedControl<OpponentPool>
                        label={t('counters.pool')}
                        value={preferences.pool}
                        onChange={(pool) => { update({ pool }); }}
                        options={[
                            { value: 'common', label: t('counters.pools.common') },
                            { value: 'all', label: t('counters.pools.all') },
                            { value: 'every', label: t('counters.pools.every') },
                        ]}
                    />
                </div>
                <p className="card__hint" style={{ marginTop: 'var(--space-2)' }}>
                    {t(`counters.modelHelp.${preferences.model}`)}
                </p>
            </section>

            <MatchupSection
                title={t('counters.strong')}
                items={report?.strongAgainst ?? []}
                subjectName={subjectName}
            />
            <MatchupSection title={t('counters.weak')} items={report?.weakAgainst ?? []} subjectName={subjectName} />
            <MatchupExplorer matchups={complete?.all ?? []} subjectName={subjectName} />
        </div>
    );
}

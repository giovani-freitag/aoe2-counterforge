import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Unit } from '../../domain/entities/unit.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useUnitLine } from '../hooks/use-unit-line.ts';
import { SegmentedControl } from './segmented-control.tsx';
import { StatGrid } from './stat-grid.tsx';
import { UnitCivilizationsCard } from './unit-civilizations-card.tsx';
import { UnitLineDiagram } from './unit-line-diagram.tsx';

export interface UnitOverviewPanelProps {
    unit: Unit;
    upgradedStats: UnitStats;
}

type StatsMode = 'base' | 'upgraded';

/** Role, official matchup summary, stat block and upgrade line of a unit. */
export function UnitOverviewPanel({ unit, upgradedStats }: UnitOverviewPanelProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const steps = useUnitLine(unit);
    const { preferences } = usePreferences();
    const [mode, setMode] = useState<StatsMode>('base');

    const unitText = text.unit(unit.key);
    const base = unit.stats.toRecord();
    const upgraded = upgradedStats.toRecord();
    const bonuses = unit.stats.attack.bonuses();
    const classes = unit.stats.armour.classes().filter((armourClass) => !armourClass.startsWith('base-'));

    return (
        <div className="stack">
            <section className="card">
                <div className="card__title">
                    <h2>{t('unit.officialSummary')}</h2>
                </div>
                {unitText.role ? <p className="prose">{unitText.role}</p> : null}
                <div className="stack stack--tight" style={{ marginTop: 'var(--space-3)' }}>
                    {unitText.strongVs ? <p className="verdict verdict--good">{unitText.strongVs}</p> : null}
                    {unitText.weakVs ? <p className="verdict verdict--bad">{unitText.weakVs}</p> : null}
                </div>
            </section>

            <section className="card">
                <div className="card__title">
                    <h2>{t('unit.stats')}</h2>
                    <SegmentedControl<StatsMode>
                        label={t('unit.stats')}
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'base', label: t('unit.statsBase') },
                            { value: 'upgraded', label: t('unit.statsUpgraded') },
                        ]}
                    />
                </div>
                {mode === 'upgraded' && preferences.civ !== null ? (
                    <p className="card__hint">
                        {t('unit.statsWithCiv', { civ: text.civilization(preferences.civ).name })}
                    </p>
                ) : null}
                <StatGrid stats={mode === 'base' ? base : upgraded} compareWith={mode === 'base' ? undefined : base} />
            </section>

            <section className="card">
                <div className="card__title">
                    <h2>{t('unit.bonusDamage')}</h2>
                </div>
                {bonuses.length === 0 ? (
                    <p className="prose">{t('unit.noBonusDamage')}</p>
                ) : (
                    <ul className="bullets">
                        {bonuses.map((bonus) => (
                            <li key={bonus.armourClass}>
                                <span>
                                    <strong>+{bonus.amount}</strong> {t(`armourClasses.${bonus.armourClass}`)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {classes.length > 0 ? (
                    <>
                        <hr className="divider" />
                        <div className="section-label">{t('unit.armourClasses')}</div>
                        <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                            {classes.map((armourClass) => (
                                <span key={armourClass} className="badge">
                                    {t(`armourClasses.${armourClass}`)}
                                </span>
                            ))}
                        </div>
                    </>
                ) : null}
            </section>

            {steps.length > 1 ? (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('unit.line')}</h2>
                    </div>
                    <UnitLineDiagram steps={steps} current={unit} />
                </section>
            ) : null}

            <UnitCivilizationsCard unit={unit} />
        </div>
    );
}

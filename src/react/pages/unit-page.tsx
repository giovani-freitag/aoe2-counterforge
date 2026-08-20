import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import { UnitForge } from '../components/unit-forge.tsx';
import { ResourceCostRow } from '../components/resource-cost-row.tsx';
import { UnitCountersPanel } from '../components/unit-counters-panel.tsx';
import { UnitEconomyPanel } from '../components/unit-economy-panel.tsx';
import { UnitOverviewPanel } from '../components/unit-overview-panel.tsx';
import { UnitUpgradesPanel } from '../components/unit-upgrades-panel.tsx';
import { buildingNames } from '../building-names.ts';
import { short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useUnit } from '../hooks/use-unit.ts';
import { useUnitUpgrades } from '../hooks/use-unit-upgrades.ts';
import { NotFoundPage } from './not-found-page.tsx';
import { BackLink } from '../components/back-link.tsx';

const TABS = ['overview', 'counters', 'upgrades', 'economy'] as const;

type TabKey = (typeof TABS)[number];

function isTabKey(value: string | null): value is TabKey {
    return TABS.includes((value ?? '') as TabKey);
}

/** Detail page of a single unit, split into overview, counters, upgrades and economy. */
export function UnitPage() {
    const { t } = useTranslation();
    const { key } = useParams<{ key: string }>();
    const [params, setParams] = useSearchParams();
    const unit = useUnit(key);
    const text = useGameText();
    const { preferences } = usePreferences();
    const upgrades = useUnitUpgrades(unit);

    if (!unit || !upgrades) return <NotFoundPage />;

    const tab: TabKey = isTabKey(params.get('tab')) ? (params.get('tab') as TabKey) : 'overview';
    const unitText = text.unit(unit.key);
    const civName = preferences.civ ? text.civilization(preferences.civ).name : '';
    const unavailable = preferences.civ !== null && !unit.availableTo(preferences.civ);

    return (
        <div className="stack">
            <BackLink to="/units" label={t('nav.units')} />
            <header className="card">
                <UnitForge
                    unit={unit}
                    name={unitText.name}
                    subtitle={`${t(`categories.${unit.category}`)} · ${buildingNames(unit.buildings, t)}`}
                    meta={
                        <>
                            <span className="badge">{t(`ages.${unit.age}`)}</span>
                            {unit.uniqueTo ? (
                                <span className="badge badge--gold">
                                    {t('unit.uniqueTo', { civ: text.civilization(unit.uniqueTo).name })}
                                </span>
                            ) : (
                                <span className="badge">{t('unit.availableIn', { count: unit.civs.length })}</span>
                            )}
                        </>
                    }
                />

                <div className="row" style={{ justifyContent: 'space-between' }}>
                    <ResourceCostRow
                        cost={unit.cost}
                        trailing={`${t('unit.trainTime')}: ${t('common.seconds', { value: short(unit.trainTime) })}`}
                    />
                    <Link className="chip" to={`/compare?units=${unit.key}`}>
                        {t('compare.addToCompare')}
                    </Link>
                </div>

                {unavailable ? (
                    <p className="verdict verdict--bad" style={{ marginTop: 'var(--space-3)' }}>
                        {t('unit.notAvailable', { civ: civName })}
                    </p>
                ) : null}
            </header>

            <div className="tabs" role="tablist">
                {TABS.map((entry) => (
                    <button
                        key={entry}
                        type="button"
                        role="tab"
                        className="tabs__item"
                        aria-selected={entry === tab}
                        onClick={() => { setParams(entry === 'overview' ? {} : { tab: entry }, { replace: true }); }}
                    >
                        {t(`unit.tabs.${entry}`)}
                    </button>
                ))}
            </div>

            {tab === 'overview' ? <UnitOverviewPanel unit={unit} upgradedStats={upgrades.upgradedStats} /> : null}
            {tab === 'counters' ? <UnitCountersPanel key={unit.key} unit={unit} /> : null}
            {tab === 'upgrades' ? <UnitUpgradesPanel unit={unit} /> : null}
            {tab === 'economy' ? <UnitEconomyPanel unit={unit} /> : null}
        </div>
    );
}

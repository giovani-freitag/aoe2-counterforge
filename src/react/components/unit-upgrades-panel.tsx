import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Technology } from '../../domain/entities/technology.ts';
import type { Unit } from '../../domain/entities/unit.ts';
import type { AppliedUpgrade } from '../../services/upgrade/upgrade-service.ts';
import { describeEffect } from '../effect-description.ts';
import { iconUrl, short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useServices } from '../hooks/use-services.ts';
import { useUnitLine } from '../hooks/use-unit-line.ts';
import { useUnitUpgrades } from '../hooks/use-unit-upgrades.ts';
import { GameIcon } from './game-icon.tsx';
import { Icon } from './icon.tsx';
import { ResourceCostRow } from './resource-cost-row.tsx';

export interface UnitUpgradesPanelProps {
    unit: Unit;
}

function TechnologyItem({ technology, effects }: { technology: Technology; effects: string[] }) {
    const { t } = useTranslation();
    const text = useGameText();
    const technologyText = text.technology(technology.key);

    return (
        <li className="upgrade-item">
            <GameIcon path={technology.icon === null ? null : `Tech/${technology.icon}.png`} alt="" />
            <div className="upgrade-item__body">
                <Link to={`/tech/${technology.key}`} className="list-item__title">
                    {technologyText.name}
                </Link>
                <p className="card__hint">{technologyText.description}</p>
                <div className="upgrade-item__effects">
                    {effects.length === 0 ? (
                        <span className="effect-chip effect-chip--muted">{t('upgrades.qualitative')}</span>
                    ) : (
                        effects.map((effect) => (
                            <span key={effect} className="effect-chip">
                                {effect}
                            </span>
                        ))
                    )}
                </div>
                <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                    <ResourceCostRow
                        cost={technology.cost}
                        trailing={t('upgrades.researchTime', { value: short(technology.researchTime) })}
                    />
                    <span className="badge">{t(`ages.${technology.age}`)}</span>
                    <span className="badge">{t(`buildings.${technology.building}`, technology.building)}</span>
                </div>
            </div>
        </li>
    );
}

/** Line upgrades, generic technologies and the civilization's unique technologies. */
export function UnitUpgradesPanel({ unit }: UnitUpgradesPanelProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const { catalog } = useServices();
    const view = useUnitUpgrades(unit);
    const steps = useUnitLine(unit);

    const grouped = useMemo(() => {
        const byBuilding = new Map<string, AppliedUpgrade[]>();
        for (const upgrade of view?.generic ?? []) {
            const key = upgrade.technology.building;
            if (!byBuilding.has(key)) byBuilding.set(key, []);
            byBuilding.get(key)?.push(upgrade);
        }

        return [...byBuilding.entries()];
    }, [view]);

    const unitText = text.unit(unit.key);
    const lineUpgrades = steps.flat().filter((member) => member.upgrade !== null && member.key !== unit.line);

    return (
        <div className="stack">
            {unitText.upgradesHint ? (
                <section className="card">
                    <div className="card__title">
                        <h2>
                            <Icon name="upgrades" />
                            {t('upgrades.officialHint')}
                        </h2>
                    </div>
                    <p className="prose">{unitText.upgradesHint}</p>
                </section>
            ) : null}

            {lineUpgrades.length > 0 ? (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('upgrades.lineTitle')}</h2>
                    </div>
                    <ul className="list">
                        {lineUpgrades.map((member) => (
                            <li key={member.key} className="upgrade-item">
                                <GameIcon
                                    path={member.icon === null ? null : `Unit/${member.icon}.png`}
                                    alt=""
                                />
                                <div className="upgrade-item__body">
                                    <Link to={`/unit/${member.key}`} className="list-item__title">
                                        {text.unit(member.key).name}
                                    </Link>
                                    <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                                        {member.upgrade ? (
                                            <ResourceCostRow
                                                cost={member.upgrade.cost}
                                                trailing={t('upgrades.researchTime', {
                                                    value: short(member.upgrade.researchTime),
                                                })}
                                            />
                                        ) : null}
                                        <span className="badge">{t(`ages.${member.age}`)}</span>
                                        {member.key === unit.key ? (
                                            <span className="badge badge--gold">{t('unit.lineCurrent')}</span>
                                        ) : null}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <section className="card">
                <div className="card__title">
                    <h2>
                        <Icon name="upgrades" />
                        {t('upgrades.genericTitle')}
                    </h2>
                </div>
                {grouped.length === 0 ? (
                    <p className="empty">{t('upgrades.empty')}</p>
                ) : (
                    grouped.map(([building, upgrades]) => (
                        <div key={building} style={{ marginBottom: 'var(--space-4)' }}>
                            <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>
                                {t(`buildings.${building}`, building)}
                            </div>
                            <ul className="list">
                                {upgrades.map((upgrade) => (
                                    <TechnologyItem
                                        key={upgrade.technology.key}
                                        technology={upgrade.technology}
                                        effects={upgrade.qualitative ? [] : describeEffect(upgrade.delta, t)}
                                    />
                                ))}
                            </ul>
                        </div>
                    ))
                )}
            </section>

            <section className="card">
                <div className="card__title">
                    <h2>
                        <Icon name="civilizations" />
                        {t('upgrades.uniqueTitle')}
                    </h2>
                </div>
                <p className="card__hint">{t('upgrades.uniqueHint')}</p>

                {(view?.byCivilization ?? []).length === 0 ? (
                    <p className="empty">{t('upgrades.noUnique')}</p>
                ) : (
                    (view?.byCivilization ?? []).map((entry) => (
                        <div key={entry.civ} style={{ marginTop: 'var(--space-4)' }}>
                            <div className="section-label civ-heading">
                                <img
                                    className="civ-heading__emblem"
                                    src={iconUrl(`Civs/${catalog.civilization(entry.civ).icon}.png`)}
                                    alt=""
                                    loading="lazy"
                                />
                                <Link to={`/civ/${entry.civ}`}>{text.civilization(entry.civ).name}</Link>
                            </div>
                            <ul className="list">
                                {entry.bonus === null ? null : (
                                    <li className="upgrade-item">
                                        <Icon name="civilizations" className="upgrade-item__mark" />
                                        <div className="upgrade-item__body">
                                            <span className="list-item__title">{t('upgrades.civBonus')}</span>
                                            <p className="card__hint">{t('upgrades.civBonusHint')}</p>
                                            <div className="upgrade-item__effects">
                                                {describeEffect(entry.bonus, t).map((effect) => (
                                                    <span key={effect} className="effect-chip">
                                                        {effect}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </li>
                                )}
                                {entry.upgrades.map((upgrade) => (
                                    <TechnologyItem
                                        key={upgrade.technology.key}
                                        technology={upgrade.technology}
                                        effects={upgrade.qualitative ? [] : describeEffect(upgrade.delta, t)}
                                    />
                                ))}
                            </ul>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
}

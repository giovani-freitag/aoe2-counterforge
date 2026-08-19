import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import { GameIcon } from '../components/game-icon.tsx';
import { ResourceCostRow } from '../components/resource-cost-row.tsx';
import { UnitListItem } from '../components/unit-list-item.tsx';
import { describeEffect } from '../effect-description.ts';
import { iconUrl, short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useServices } from '../hooks/use-services.ts';
import { NotFoundPage } from './not-found-page.tsx';

/** Technology profile: what it costs, every unit it changes, and who gets to research it. */
export function TechnologyPage() {
    const { t } = useTranslation();
    const { key } = useParams<{ key: string }>();
    const { catalog, upgrades } = useServices();
    const text = useGameText();

    const technology = useMemo(() => {
        if (!key) return null;

        try {
            return catalog.technology(key);
        } catch (error) {
            if (error instanceof EntityNotFoundError) return null;
            throw error;
        }
    }, [catalog, key]);

    const changed = useMemo(() => (technology ? upgrades.unitsChangedBy(technology) : []), [upgrades, technology]);

    const civilizations = useMemo(
        () =>
            (technology?.civs ?? [])
                .map((civ) => ({ key: civ, name: text.civilization(civ).name }))
                .sort((left, right) => left.name.localeCompare(right.name)),
        [technology, text],
    );

    if (!technology) return <NotFoundPage />;

    const technologyText = text.technology(technology.key);

    return (
        <div className="stack">
            <header className="card">
                <div className="unit-hero">
                    <GameIcon
                        path={technology.icon === null ? null : `Tech/${technology.icon}.png`}
                        alt=""
                        size="lg"
                    />
                    <div className="unit-hero__body">
                        <h1 className="unit-hero__name">{technologyText.name}</h1>
                        <p className="card__hint">{technologyText.description}</p>
                        <div className="unit-hero__meta">
                            <span className="badge">{t(`ages.${technology.age}`)}</span>
                            <span className="badge">{t(`buildings.${technology.building}`, technology.building)}</span>
                            <span className="badge">
                                {technology.isUnique
                                    ? t('tech.uniqueTo', { civ: civilizations[0]?.name ?? '' })
                                    : t('tech.civCount', { count: technology.civs.length })}
                            </span>
                        </div>
                    </div>
                </div>
                <hr className="divider" />
                <ResourceCostRow
                    cost={technology.cost}
                    trailing={t('upgrades.researchTime', { value: short(technology.researchTime) })}
                />
            </header>

            <section className="card">
                <div className="card__title">
                    <h2>{t('tech.changes')}</h2>
                    <span className="card__hint">{t('tech.changesCount', { count: changed.length })}</span>
                </div>

                {changed.length === 0 ? (
                    <p className="empty">{t('tech.changesNothing')}</p>
                ) : (
                    <ul className="list">
                        {changed.map((entry) => (
                            <li key={entry.unit.key}>
                                <UnitListItem
                                    unit={entry.unit}
                                    subtitle={t(`categories.${entry.unit.category}`)}
                                    trailing={
                                        <span className="upgrade-item__effects">
                                            {entry.qualitative ? (
                                                <span className="effect-chip effect-chip--muted">
                                                    {t('upgrades.qualitative')}
                                                </span>
                                            ) : (
                                                describeEffect(entry.delta, t).map((effect) => (
                                                    <span key={effect} className="effect-chip">
                                                        {effect}
                                                    </span>
                                                ))
                                            )}
                                        </span>
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="card">
                <div className="card__title">
                    <h2>{t('tech.researchedBy')}</h2>
                    <span className="card__hint">{t('tech.civCount', { count: civilizations.length })}</span>
                </div>
                <div className="row">
                    {civilizations.map((civ) => (
                        <Link key={civ.key} className="chip" to={`/civ/${civ.key}`}>
                            <img
                                className="picker__emblem"
                                src={iconUrl(`Civs/${catalog.civilization(civ.key).icon}.png`)}
                                alt=""
                                loading="lazy"
                            />
                            {civ.name}
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

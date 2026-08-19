import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import type { Unit } from '../../domain/entities/unit.ts';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import { GameIcon } from '../components/game-icon.tsx';
import { ResourceCostRow } from '../components/resource-cost-row.tsx';
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

    // Bloodlines reaches eighty-three units with the same twenty hit points; that is one fact, not
    // eighty-three rows, so the units are gathered under the change they share.
    const groups = useMemo(() => {
        const byEffect = new Map<string, { effects: string[]; units: Unit[] }>();

        for (const entry of changed) {
            const effects = entry.qualitative ? [] : describeEffect(entry.delta, t);
            const key = effects.join('|');
            const group = byEffect.get(key) ?? { effects, units: [] };
            group.units.push(entry.unit);
            byEffect.set(key, group);
        }

        return [...byEffect.values()].sort((left, right) => right.units.length - left.units.length);
    }, [changed, t]);

    const faster = technology ? upgrades.productionSpeed(technology.key) : 1;

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

            {changed.length === 0 && faster === 1 ? null : (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('tech.changes')}</h2>
                        {changed.length === 0 ? null : (
                            <span className="card__hint">{t('tech.changesCount', { count: changed.length })}</span>
                        )}
                    </div>

                    {faster === 1 ? null : (
                        <p className="card__hint">
                            {t('tech.trainsFaster', { value: short((faster - 1) * 100) })}
                        </p>
                    )}

                    {groups.map((group) => (
                        <div key={group.effects.join('|')} style={{ marginTop: 'var(--space-4)' }}>
                            <div className="upgrade-item__effects">
                                {group.effects.length === 0 ? (
                                    <span className="effect-chip effect-chip--muted">{t('upgrades.qualitative')}</span>
                                ) : (
                                    group.effects.map((effect) => (
                                        <span key={effect} className="effect-chip">
                                            {effect}
                                        </span>
                                    ))
                                )}
                            </div>
                            <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                                {group.units.map((unit) => (
                                    <Link key={unit.key} className="chip" to={`/unit/${unit.key}`}>
                                        <GameIcon
                                            path={unit.icon === null ? null : `Unit/${unit.icon}.png`}
                                            alt=""
                                            size="sm"
                                        />
                                        {text.unit(unit.key).name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

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

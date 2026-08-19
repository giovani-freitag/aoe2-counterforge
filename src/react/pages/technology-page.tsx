import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import { GameIcon } from '../components/game-icon.tsx';
import { ResourceCostRow } from '../components/resource-cost-row.tsx';
import { UnitListItem } from '../components/unit-list-item.tsx';
import { describeEffect } from '../effect-description.ts';
import { short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useServices } from '../hooks/use-services.ts';
import { NotFoundPage } from './not-found-page.tsx';
import { BackLink } from '../components/back-link.tsx';

/** Technology profile: cost, effect and every unit it changes. */
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

    const affected = useMemo(() => {
        if (!technology) return [];

        return catalog
            .units({ combatOnly: true })
            .filter((unit) => upgrades.affecting(unit).some((entry) => entry.technology.key === technology.key));
    }, [catalog, upgrades, technology]);

    const effects = useMemo(() => {
        if (!technology) return [];

        const match = affected
            .flatMap((unit) => upgrades.affecting(unit))
            .find((entry) => entry.technology.key === technology.key);

        return match && !match.qualitative ? describeEffect(match.delta, t) : [];
    }, [affected, upgrades, technology, t]);

    if (!technology) return <NotFoundPage />;

    const technologyText = text.technology(technology.key);

    return (
        <div className="stack">
            <BackLink to="/units" label={t('nav.units')} />
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
                            <span className="badge">{t('unit.availableIn', { count: technology.civs.length })}</span>
                        </div>
                    </div>
                </div>
                <hr className="divider" />
                <ResourceCostRow
                    cost={technology.cost}
                    trailing={t('upgrades.researchTime', { value: short(technology.researchTime) })}
                />
                {effects.length > 0 ? (
                    <div className="upgrade-item__effects" style={{ marginTop: 'var(--space-3)' }}>
                        {effects.map((effect) => (
                            <span key={effect} className="effect-chip">
                                {effect}
                            </span>
                        ))}
                    </div>
                ) : null}
            </header>

            {affected.length > 0 ? (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('upgrades.genericTitle')}</h2>
                    </div>
                    <ul className="list">
                        {affected.map((unit) => (
                            <li key={unit.key}>
                                <UnitListItem unit={unit} subtitle={t(`categories.${unit.category}`)} />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}

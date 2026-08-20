import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { LAND_CATEGORIES } from '../../domain/enums/unit-category.ts';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import { Forge } from '../components/forge.tsx';
import { GameIcon } from '../components/game-icon.tsx';
import { UnitListItem } from '../components/unit-list-item.tsx';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';
import { NotFoundPage } from './not-found-page.tsx';
import { BackLink } from '../components/back-link.tsx';

/** Civilization profile: bonuses, unique units and technologies, and the roster by category. */
export function CivilizationPage() {
    const { t } = useTranslation();
    const { key } = useParams<{ key: string }>();
    const { catalog } = useServices();
    const text = useGameText();
    const { preferences, update } = usePreferences();

    const civilization = useMemo(() => {
        if (!key) return null;

        try {
            return catalog.civilization(key);
        } catch (error) {
            if (error instanceof EntityNotFoundError) return null;
            throw error;
        }
    }, [catalog, key]);

    // The banner names a signature unit, and the elite step is the same one further along.
    const signature = useMemo(() => {
        const byLine = new Map<string, string>();
        for (const unitKey of civilization?.uniqueUnits ?? []) {
            const unit = catalog.unit(unitKey);
            if (!byLine.has(unit.line)) byLine.set(unit.line, unitKey);
        }

        return [...byLine.values()];
    }, [catalog, civilization]);

    const roster = useMemo(
        () =>
            civilization
                ? LAND_CATEGORIES.map((category) => ({
                      category,
                      units: catalog.units({ civ: civilization.key, categories: [category] }),
                  })).filter((group) => group.units.length > 0)
                : [],
        [catalog, civilization],
    );

    if (!civilization) return <NotFoundPage />;

    const civText = text.civilization(civilization.key);
    const isActive = preferences.civ === civilization.key;

    // The help text repeats the unique units and technologies that the linked lists below already
    // show with their icons, so only the sections it adds on top of those are worth rendering.
    // One recognised entry is enough to drop a section: the shipped translations sometimes leave a
    // single name in English, and a section only ever lists one kind of thing.
    const listed = [
        ...civilization.uniqueUnits.map((unitKey) => text.unit(unitKey).name),
        ...civilization.uniqueTechs.map((techKey) => text.technology(techKey).name),
    ].filter(Boolean);
    const extraSections = civText.sections.filter(
        (section) => !section.items.some((item) => listed.some((name) => item.startsWith(name))),
    );

    return (
        <div className="stack">
            <BackLink to="/civs" label={t('nav.civilizations')} />
            <header className="card">
                <Forge
                    name={civText.name}
                    subtitle={civText.intro}
                    portrait={
                        <GameIcon path={`Civs/${civilization.icon}.png`} alt="" size="lg" className="icon--civ" />
                    }
                    meta={
                        signature.length === 0
                            ? undefined
                            : signature.map((unitKey) => (
                                  <Link className="badge badge--gold" key={unitKey} to={`/unit/${unitKey}`}>
                                      <GameIcon
                                          path={
                                              catalog.unit(unitKey).icon === null
                                                  ? null
                                                  : `Unit/${String(catalog.unit(unitKey).icon)}.png`
                                          }
                                          alt=""
                                          size="sm"
                                      />
                                      {text.unit(unitKey).name}
                                  </Link>
                              ))
                    }
                />
                <button
                    type="button"
                    className="chip"
                    aria-pressed={isActive}
                    onClick={() => { update({ civ: isActive ? null : civilization.key }); }}
                >
                    {isActive ? t('civ.clear') : t('civ.select')}
                </button>
            </header>

            {civText.bonuses.length > 0 ? (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('civ.bonuses')}</h2>
                    </div>
                    <ul className="bullets">
                        {civText.bonuses.map((bonus) => (
                            <li key={bonus}>
                                <span>{bonus}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {extraSections.map((section) => (
                <section className="card" key={section.title}>
                    <div className="card__title">
                        <h2>{section.title}</h2>
                    </div>
                    <ul className="bullets">
                        {section.items.map((item) => (
                            <li key={item}>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            {civilization.uniqueUnits.length > 0 ? (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('civ.uniqueUnits')}</h2>
                    </div>
                    <ul className="list">
                        {civilization.uniqueUnits.map((unitKey) => (
                            <li key={unitKey}>
                                <UnitListItem unit={catalog.unit(unitKey)} />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {civilization.uniqueTechs.length > 0 ? (
                <section className="card">
                    <div className="card__title">
                        <h2>{t('civ.uniqueTechs')}</h2>
                    </div>
                    <ul className="list">
                        {civilization.uniqueTechs.map((techKey) => {
                            const technology = catalog.technology(techKey);
                            const technologyText = text.technology(techKey);

                            return (
                                <li key={techKey}>
                                    <Link className="list-item" to={`/tech/${techKey}`}>
                                        <GameIcon
                                            path={technology.icon === null ? null : `Tech/${technology.icon}.png`}
                                            alt=""
                                        />
                                        <span className="list-item__body">
                                            <span className="list-item__title">{technologyText.name}</span>
                                            <span className="list-item__subtitle">{technologyText.description}</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ) : null}

            <section className="card">
                <div className="card__title">
                    <h2>{t('civ.roster')}</h2>
                </div>
                {roster.map((group) => (
                    <div key={group.category} style={{ marginBottom: 'var(--space-4)' }}>
                        <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>
                            {t(`categories.${group.category}`)}
                        </div>
                        <ul className="list">
                            {group.units.map((unit) => (
                                <li key={unit.key}>
                                    <UnitListItem unit={unit} subtitle={t(`ages.${unit.age}`)} />
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
        </div>
    );
}

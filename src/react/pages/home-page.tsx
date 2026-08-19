import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LAND_CATEGORIES } from '../../domain/enums/unit-category.ts';
import { UnitListItem } from '../components/unit-list-item.tsx';
import { useCommandPalette } from '../hooks/use-command-palette.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';
import { Icon } from '../components/icon.tsx';

/** Units players look up most often, used as the landing shortcuts. */
const HIGHLIGHTS = [
    'knight',
    'crossbowman',
    'pikeman',
    'champion',
    'elite-skirmisher',
    'mangonel',
    'monk',
    'light-cavalry',
];

/** Landing screen: search, civilization scope, category tiles and popular units. */
export function HomePage() {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const { open } = useCommandPalette();
    const { preferences } = usePreferences();

    const counts = useMemo(() => {
        const map = new Map<string, number>();
        for (const category of LAND_CATEGORIES) {
            map.set(category, catalog.units({ civ: preferences.civ, categories: [category] }).length);
        }

        return map;
    }, [catalog, preferences.civ]);

    const highlights = useMemo(() => {
        const byKey = new Map(catalog.units().map((unit) => [unit.key, unit] as const));

        return HIGHLIGHTS.map((key) => byKey.get(key)).filter((unit) => unit !== undefined);
    }, [catalog]);

    return (
        <div className="stack">
            <header className="stack stack--tight">
                <h1>{t('home.title')}</h1>
                <p className="prose">{t('app.tagline')}</p>
            </header>

            <button type="button" className="searchbutton" style={{ width: '100%' }} onClick={open}>
                <Icon name="search" />
                <span style={{ flex: 1, textAlign: 'left' }}>{t('search.placeholder')}</span>
            </button>

            <section>
                <div className="card__title">
                    <h2>{t('home.browseByCategory')}</h2>
                </div>
                <div className="category-grid">
                    {LAND_CATEGORIES.map((category) => (
                        <Link key={category} className="category-tile" to={`/units?category=${category}`}>
                            <span className="category-tile__name">{t(`categories.${category}`)}</span>
                            <span className="category-tile__count">
                                {t('civ.count', { count: counts.get(category) ?? 0 })}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            <section>
                <div className="card__title">
                    <h2>{t('home.popular')}</h2>
                </div>
                <ul className="list">
                    {highlights.map((unit) => (
                        <li key={unit.key}>
                            <UnitListItem unit={unit} subtitle={t(`categories.${unit.category}`)} />
                        </li>
                    ))}
                </ul>
            </section>

            <section className="card colophon">
                <div className="card__title">
                    <h2>
                        <Icon name="about" />
                        {t('about.title')}
                    </h2>
                </div>
                <p className="prose">{t('about.howCountersBody')}</p>
                <p className="card__hint">{t('about.creditsBody')}</p>
            </section>
        </div>
    );
}

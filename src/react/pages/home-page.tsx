import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LAND_CATEGORIES } from '../../domain/enums/unit-category.ts';
import { Icon } from '../components/icon.tsx';
import { MatchupRow } from '../components/matchup-row.tsx';
import { PickerField } from '../components/picker-field.tsx';
import { iconUrl } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useMatchups } from '../hooks/use-matchups.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';

/** The unit the landing page answers before anyone types anything. */
const OPENING_QUESTION = 'knight';

/** Landing screen: the question the guide exists to answer, with the roster behind it. */
export function HomePage() {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const text = useGameText();
    const { preferences } = usePreferences();
    const [enemyKey, setEnemyKey] = useState(OPENING_QUESTION);

    const options = useMemo(
        () =>
            catalog
                .units({ combatOnly: true })
                .filter((unit) => unit.stats.canAttack())
                .map((unit) => ({
                    value: unit.key,
                    label: text.unit(unit.key).name,
                    visual: (
                        <img
                            className="picker__emblem"
                            src={iconUrl(`Unit/${String(unit.icon)}.png`)}
                            alt=""
                            loading="lazy"
                        />
                    ),
                }))
                .sort((left, right) => left.label.localeCompare(right.label)),
        [catalog, text],
    );

    const enemy = useMemo(() => catalog.units().find((unit) => unit.key === enemyKey) ?? null, [catalog, enemyKey]);
    const report = useMatchups(enemy);
    const answers = report?.weakAgainst ?? [];
    const enemyName = enemy ? text.unit(enemy.key).name : '';

    const counts = useMemo(() => {
        const map = new Map<string, number>();
        for (const category of LAND_CATEGORIES) {
            map.set(category, catalog.units({ civ: preferences.civ, categories: [category] }).length);
        }

        return map;
    }, [catalog, preferences.civ]);

    return (
        <div className="stack">
            <header className="stack stack--tight">
                <h1>{t('home.facing')}</h1>
                <p className="card__hint">{t('home.facingHint')}</p>
            </header>

            <section className="card">
                <div className="form-grid">
                    <PickerField
                        id="home-enemy"
                        label={t('home.enemy')}
                        value={enemyKey}
                        options={options}
                        onChange={setEnemyKey}
                    />
                </div>
            </section>

            {enemy === null ? null : (
                <section className="card">
                    <div className="card__title">
                        <h2>
                            <Icon name="strongAgainst" />
                            {t('home.answerWith', { unit: enemyName })}
                        </h2>
                        <Link className="card__hint" to={`/unit/${enemy.key}?tab=counters`}>
                            {t('home.seeAll')}
                        </Link>
                    </div>

                    {answers.length === 0 ? (
                        <p className="empty">{t('counters.empty')}</p>
                    ) : (
                        <div className="list">
                            {answers.map((matchup) => (
                                <MatchupRow
                                    key={matchup.opponent.key}
                                    matchup={matchup}
                                    subjectName={enemyName}
                                    fromOpponent
                                    showVerdict
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

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

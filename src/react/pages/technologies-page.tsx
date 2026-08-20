import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AGE_IDS } from '../../domain/enums/age.ts';
import { GameIcon } from '../components/game-icon.tsx';
import { Picker } from '../components/picker.tsx';
import { VirtualList } from '../components/virtual-list.tsx';
import { useGameText } from '../hooks/use-game-text.ts';
import { useNameFilter } from '../hooks/use-name-filter.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';

/** Directory of every technology, filtered the way the roster is. */
export function TechnologiesPage() {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const text = useGameText();
    const matchesName = useNameFilter();
    const { preferences } = usePreferences();
    const [term, setTerm] = useState('');
    const [age, setAge] = useState('');
    const [building, setBuilding] = useState('');

    const technologies = useMemo(
        () => catalog.technologies().filter((technology) => technology.availableTo(preferences.civ)),
        [catalog, preferences.civ],
    );

    const buildings = useMemo(
        () =>
            [...new Set(technologies.map((technology) => technology.building))]
                .map((key) => ({ key, label: t(`buildings.${key}`, key) }))
                .sort((left, right) => left.label.localeCompare(right.label)),
        [technologies, t],
    );

    const visible = useMemo(
        () =>
            technologies
                .filter((technology) => !age || technology.age === Number(age))
                .filter((technology) => !building || technology.building === building)
                .filter((technology) => matchesName(technology.key, term))
                .sort(
                    (left, right) =>
                        left.age - right.age ||
                        text.technology(left.key).name.localeCompare(text.technology(right.key).name),
                ),
        [technologies, age, building, term, matchesName, text],
    );

    return (
        <div className="stack">
            <header className="stack stack--tight">
                <h1>{t('nav.technologies')}</h1>
                <p className="card__hint">{t('techs.count', { count: visible.length })}</p>
            </header>

            <section className="card">
                <div className="form-grid">
                    <div className="field">
                        <label className="field__label" htmlFor="tech-filter">
                            {t('techs.filter')}
                        </label>
                        <input
                            id="tech-filter"
                            type="search"
                            className="input"
                            value={term}
                            placeholder={t('techs.filterHint')}
                            onChange={(event) => {
                                setTerm(event.target.value);
                            }}
                        />
                    </div>

                    <div className="field">
                        <label className="field__label" htmlFor="tech-age">
                            {t('unit.age')}
                        </label>
                        <Picker
                            id="tech-age"
                            block
                            label={t('unit.age')}
                            value={age}
                            options={[
                                { value: '', label: t('common.all') },
                                ...AGE_IDS.map((entry) => ({ value: String(entry), label: t(`ages.${entry}`) })),
                            ]}
                            onChange={setAge}
                        />
                    </div>

                    <div className="field">
                        <label className="field__label" htmlFor="tech-building">
                            {t('techs.building')}
                        </label>
                        <Picker
                            id="tech-building"
                            block
                            label={t('techs.building')}
                            value={building}
                            options={[
                                { value: '', label: t('common.all') },
                                ...buildings.map((entry) => ({ value: entry.key, label: entry.label })),
                            ]}
                            onChange={setBuilding}
                        />
                    </div>
                </div>
            </section>

            {visible.length === 0 ? (
                <p className="empty">{t('techs.empty')}</p>
            ) : (
                <VirtualList items={visible} estimate={72} keyOf={(technology) => technology.key}>
                    {(technology) => (
                        <Link className="list-item" to={`/tech/${technology.key}`}>
                            <GameIcon path={technology.icon === null ? null : `Tech/${technology.icon}.png`} alt="" />
                            <span className="list-item__body">
                                <span className="list-item__title">{text.technology(technology.key).name}</span>
                                <span className="list-item__subtitle">
                                    {t(`ages.${technology.age}`)} ·{' '}
                                    {t(`buildings.${technology.building}`, technology.building)}
                                </span>
                            </span>
                            {technology.isUnique ? <span className="badge">{t('techs.unique')}</span> : null}
                        </Link>
                    )}
                </VirtualList>
            )}
        </div>
    );
}

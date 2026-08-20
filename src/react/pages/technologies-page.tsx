import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AGE_IDS } from '../../domain/enums/age.ts';
import { Directory } from '../components/directory.tsx';
import { GameIcon } from '../components/game-icon.tsx';
import { FilterPicker } from '../components/filter-picker.tsx';
import { SearchField } from '../components/search-field.tsx';
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
        <Directory
            title={t('nav.technologies')}
            summary={t('techs.count', { count: visible.length })}
            items={visible}
            keyOf={(technology) => technology.key}
            estimate={72}
            empty={t('techs.empty')}
            search={
                <SearchField
                    hideLabel
                    id="tech-filter"
                    label={t('techs.filter')}
                    placeholder={t('techs.filterHint')}
                    value={term}
                    onChange={setTerm}
                />
            }
            filters={
                <>
                    <FilterPicker
                        label={t('unit.age')}
                        value={age}
                        options={[
                            { value: '', label: t('common.all') },
                            ...AGE_IDS.map((entry) => ({ value: String(entry), label: t(`ages.${entry}`) })),
                        ]}
                        onChange={setAge}
                    />
                    <FilterPicker
                        label={t('techs.building')}
                        value={building}
                        options={[
                            { value: '', label: t('common.all') },
                            ...buildings.map((entry) => ({ value: entry.key, label: entry.label })),
                        ]}
                        onChange={setBuilding}
                    />
                </>
            }
        >
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
        </Directory>
    );
}

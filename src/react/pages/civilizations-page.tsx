import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Directory } from '../components/directory.tsx';
import { GameIcon } from '../components/game-icon.tsx';
import { SearchField } from '../components/search-field.tsx';
import { useGameText } from '../hooks/use-game-text.ts';
import { useNameFilter } from '../hooks/use-name-filter.ts';
import { useServices } from '../hooks/use-services.ts';

/** Directory of every civilization in the dataset. */
export function CivilizationsPage() {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const text = useGameText();
    const matchesName = useNameFilter();
    const [term, setTerm] = useState('');

    const civilizations = useMemo(
        () =>
            catalog
                .civilizations()
                .map((civilization) => ({ civilization, text: text.civilization(civilization.key) }))
                .filter((entry) => matchesName(entry.civilization.key, term) || entry.text.name.includes(term))
                .sort((left, right) => left.text.name.localeCompare(right.text.name)),
        [catalog, text, matchesName, term],
    );

    return (
        <Directory
            title={t('nav.civilizations')}
            summary={t('civs.count', { count: civilizations.length })}
            items={civilizations}
            keyOf={(entry) => entry.civilization.key}
            estimate={72}
            empty={t('civs.empty')}
            search={
                <SearchField
                    hideLabel
                    id="civ-filter"
                    label={t('civs.filter')}
                    placeholder={t('civs.filterHint')}
                    value={term}
                    onChange={setTerm}
                />
            }
        >
            {(entry) => (
                <Link className="list-item" to={`/civ/${entry.civilization.key}`}>
                    <GameIcon path={`Civs/${entry.civilization.icon}.png`} alt="" className="icon--civ" />
                    <span className="list-item__body">
                        <span className="list-item__title">{entry.text.name}</span>
                        <span className="list-item__subtitle">{entry.text.intro}</span>
                    </span>
                </Link>
            )}
        </Directory>
    );
}

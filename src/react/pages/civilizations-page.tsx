import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { GameIcon } from '../components/game-icon.tsx';
import { useGameText } from '../hooks/use-game-text.ts';
import { useServices } from '../hooks/use-services.ts';

/** Directory of every civilization in the dataset. */
export function CivilizationsPage() {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const text = useGameText();

    const civilizations = useMemo(
        () =>
            catalog
                .civilizations()
                .map((civilization) => ({ civilization, text: text.civilization(civilization.key) }))
                .sort((left, right) => left.text.name.localeCompare(right.text.name)),
        [catalog, text],
    );

    return (
        <div className="stack">
            <header>
                <h1>{t('nav.civilizations')}</h1>
            </header>
            <ul className="list">
                {civilizations.map((entry) => (
                    <li key={entry.civilization.key}>
                        <Link className="list-item" to={`/civ/${entry.civilization.key}`}>
                            <GameIcon
                                path={`Civs/${entry.civilization.icon}.png`}
                                alt=""
                                className="icon--civ"
                            />
                            <span className="list-item__body">
                                <span className="list-item__title">{entry.text.name}</span>
                                <span className="list-item__subtitle">{entry.text.intro}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

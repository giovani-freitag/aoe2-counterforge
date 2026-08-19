import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Unit } from '../../domain/entities/unit.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';
import { GameIcon } from './game-icon.tsx';

export interface UnitCivilizationsCardProps {
    unit: Unit;
}

/** Above this many civilizations the list is collapsed, since it stops being scannable. */
const COLLAPSE_THRESHOLD = 12;

/** Every civilization that can train the unit, each one a shortcut to its page. */
export function UnitCivilizationsCard({ unit }: UnitCivilizationsCardProps) {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const text = useGameText();
    const { preferences } = usePreferences();

    const civilizations = useMemo(
        () =>
            unit.civs
                .map((key) => ({ key, icon: catalog.civilization(key).icon, name: text.civilization(key).name }))
                .sort((left, right) => left.name.localeCompare(right.name)),
        [unit, catalog, text],
    );

    if (civilizations.length === 0) return null;

    return (
        <section className="card">
            <details open={civilizations.length <= COLLAPSE_THRESHOLD}>
                <summary className="card__title" style={{ marginBottom: 0 }}>
                    <h2>{t('unit.trainedBy')}</h2>
                    <span className="card__hint">{t('unit.availableIn', { count: civilizations.length })}</span>
                </summary>
                <div className="civ-grid">
                    {civilizations.map((civilization) => (
                        <Link
                            key={civilization.key}
                            className="civ-chip"
                            to={`/civ/${civilization.key}`}
                            aria-current={civilization.key === preferences.civ ? 'true' : undefined}
                        >
                            <GameIcon path={`Civs/${civilization.icon}.png`} alt="" size="sm" className="icon--civ" />
                            {civilization.name}
                        </Link>
                    ))}
                </div>
            </details>
        </section>
    );
}

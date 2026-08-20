import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Unit } from '../../domain/entities/unit.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useMatchups } from '../hooks/use-matchups.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { MatchupBoard } from './matchup-board.tsx';

export interface UnitCountersPanelProps {
    unit: Unit;
}

/** The ranking of a unit against the roster, or why it has none. */
export function UnitCountersPanel({ unit }: UnitCountersPanelProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const { preferences } = usePreferences();
    const [choice, setChoice] = useState<boolean | null>(null);

    const civ = preferences.civ;
    // Nobody opens a unit their own civilization cannot build in order to read how it fights for them.
    const restricted = civ !== null && (choice ?? !unit.availableTo(civ));
    const report = useMatchups(unit, { opponentCiv: restricted ? civ : null });
    const subjectName = text.unit(unit.key).name;

    if (!unit.stats.canAttack() || unit.hasTag('demolition')) {
        const reason = unit.hasTag('demolition') ? 'counters.demolition' : 'counters.noAttack';

        return (
            <section className="card">
                <p className="prose">{t(reason, { unit: subjectName })}</p>
            </section>
        );
    }

    return (
        <MatchupBoard
            matchups={report?.all ?? []}
            subjectName={subjectName}
            ownRoster={
                civ === null
                    ? null
                    : { civ: text.civilization(civ).name, active: restricted, toggle: setChoice }
            }
        />
    );
}

import { useTranslation } from 'react-i18next';
import type { Unit } from '../../domain/entities/unit.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useMatchups } from '../hooks/use-matchups.ts';
import { MatchupBoard } from './matchup-board.tsx';

export interface UnitCountersPanelProps {
    unit: Unit;
}

/** The ranking of a unit against the roster, or why it has none. */
export function UnitCountersPanel({ unit }: UnitCountersPanelProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const report = useMatchups(unit);
    const subjectName = text.unit(unit.key).name;

    if (!unit.stats.canAttack() || unit.hasTag('demolition')) {
        const reason = unit.hasTag('demolition') ? 'counters.demolition' : 'counters.noAttack';

        return (
            <section className="card">
                <p className="prose">{t(reason, { unit: subjectName })}</p>
            </section>
        );
    }

    return <MatchupBoard matchups={report?.all ?? []} subjectName={subjectName} />;
}

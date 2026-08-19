import { Link } from 'react-router';
import type { Unit } from '../../domain/entities/unit.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { GameIcon } from './game-icon.tsx';

export interface UnitListItemProps {
    unit: Unit;
    subtitle?: string;
    trailing?: React.ReactNode;
}

/** One unit row, linking to its detail page. */
export function UnitListItem({ unit, subtitle, trailing }: UnitListItemProps) {
    const text = useGameText();
    const unitText = text.unit(unit.key);

    return (
        <Link className="list-item" to={`/unit/${unit.key}`}>
            <GameIcon path={unit.icon === null ? null : `Unit/${unit.icon}.png`} alt="" />
            <span className="list-item__body">
                <span className="list-item__title">{unitText.name}</span>
                {subtitle ? <span className="list-item__subtitle">{subtitle}</span> : null}
            </span>
            {trailing}
        </Link>
    );
}

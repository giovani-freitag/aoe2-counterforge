import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Unit } from '../../domain/entities/unit.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { GameIcon } from './game-icon.tsx';

export interface UnitLineTrackProps {
    line: readonly Unit[];
    current: Unit;
}

/** The upgrade path of a unit, from the first trainable version to the last. */
export function UnitLineTrack({ line, current }: UnitLineTrackProps) {
    const { t } = useTranslation();
    const text = useGameText();

    if (line.length < 2) return null;

    return (
        <div className="line-track">
            {line.map((member) => (
                <Link
                    key={member.key}
                    className="line-node"
                    to={`/unit/${member.key}`}
                    data-current={member.key === current.key}
                >
                    <GameIcon path={member.icon === null ? null : `Unit/${member.icon}.png`} alt="" />
                    <span className="line-node__name">{text.unit(member.key).name}</span>
                    <span>{member.key === current.key ? t('unit.lineCurrent') : t(`ages.${member.age}`)}</span>
                </Link>
            ))}
        </div>
    );
}

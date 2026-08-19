import { useTranslation } from 'react-i18next';
import type { UnitStatsRecord } from '../../domain/values/unit-stats.ts';
import { delta, short } from '../format.ts';
import { Icon, type IconName } from './icon.tsx';

export interface StatGridProps {
    stats: UnitStatsRecord;
    compareWith?: UnitStatsRecord;
}

type StatKey = keyof UnitStatsRecord;

const ORDER: readonly StatKey[] = [
    'hp',
    'attack',
    'meleeArmour',
    'pierceArmour',
    'range',
    'reloadTime',
    'speed',
    'accuracy',
    'lineOfSight',
    'minRange',
    'blastWidth',
];

const GLYPHS: Partial<Record<StatKey, IconName>> = {
    hp: 'hitPoints',
    attack: 'attack',
    meleeArmour: 'armour',
    pierceArmour: 'armour',
    range: 'range',
    reloadTime: 'trainTime',
    speed: 'speed',
    lineOfSight: 'lineOfSight',
    minRange: 'range',
    blastWidth: 'weakAgainst',
};

/** Lower is better for these, so an increase must not be painted as a gain. */
const INVERTED: ReadonlySet<StatKey> = new Set(['reloadTime', 'minRange']);

/**
 * Stats that only clutter the grid when they are zero.
 */
function isHidden(key: StatKey, value: number): boolean {
    return value === 0 && (key === 'range' || key === 'minRange' || key === 'blastWidth');
}

/** The stat block, optionally annotated with the gain each upgrade brings. */
export function StatGrid({ stats, compareWith }: StatGridProps) {
    const { t } = useTranslation();

    return (
        <div className="stat-grid">
            {ORDER.filter((key) => !isHidden(key, stats[key])).map((key) => {
                const difference = compareWith ? stats[key] - compareWith[key] : 0;
                const isGain = INVERTED.has(key) ? difference < 0 : difference > 0;

                return (
                    <div className="stat" key={key}>
                        <div className="stat__label">
                            {GLYPHS[key] ? <Icon name={GLYPHS[key]} /> : null}
                            {t(`stats.${key}`)}
                        </div>
                        <div className="stat__value">
                            {short(stats[key])}
                            {difference !== 0 ? (
                                <span className={isGain ? 'stat__delta' : 'stat__delta stat__delta--down'}>
                                    {delta(difference)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

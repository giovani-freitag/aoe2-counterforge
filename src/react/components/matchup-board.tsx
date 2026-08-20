import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { UNIT_CATEGORIES, isUnitCategory, type UnitCategory } from '../../domain/enums/unit-category.ts';
import type { EngagementModel } from '../../services/combat/combat-service.ts';
import type { Matchup, OpponentPool, UpgradeLevel } from '../../services/matchup/matchup-service.ts';
import { useNameFilter } from '../hooks/use-name-filter.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { Icon } from './icon.tsx';
import { MatchupRow } from './matchup-row.tsx';
import { Picker } from './picker.tsx';
import { SearchField } from './search-field.tsx';
import { SegmentedControl } from './segmented-control.tsx';
import { VirtualList } from './virtual-list.tsx';

export interface OwnRoster {
    /** Name of the civilization the reader picked, for the switch to say whose roster it is. */
    civ: string;
    active: boolean;
    toggle: (active: boolean) => void;
}

export interface MatchupBoardProps {
    matchups: readonly Matchup[];
    subjectName: string;
    /** The switch that narrows the opposition to what the reader can actually train, when there is one. */
    ownRoster?: OwnRoster | null;
}

const SIDES = ['strong', 'weak', 'all'] as const;

type Side = (typeof SIDES)[number];

/** Which end of the ranking a verdict belongs to. */
function sideOf(verdict: Matchup['verdict']): Side | 'even' {
    if (verdict === 'dominant' || verdict === 'favourable') return 'strong';
    if (verdict === 'unfavourable' || verdict === 'countered') return 'weak';

    return 'even';
}

/**
 * The whole ranking of a unit against the roster, read one end at a time.
 *
 * Strong, weak and complete are not three lists but three views of one, so they share a card and a
 * set of filters instead of stacking into a page nobody reaches the bottom of. The switch between
 * them sits above the rows as a filter rather than as a second row of tabs.
 */
export function MatchupBoard({ matchups, subjectName, ownRoster = null }: MatchupBoardProps) {
    const { t } = useTranslation();
    const matchesName = useNameFilter();
    const { preferences, update } = usePreferences();
    const [params, setParams] = useSearchParams();

    // The end being read travels in the address, so a link lands on the answer it was sent for.
    const asked = params.get('side');
    const side: Side = SIDES.includes(asked as Side) ? (asked as Side) : 'strong';
    const [term, setTerm] = useState('');
    const [category, setCategory] = useState<UnitCategory | null>(null);

    const categories = useMemo(
        () => UNIT_CATEGORIES.filter((entry) => matchups.some((matchup) => matchup.opponent.category === entry)),
        [matchups],
    );

    const pool = useMemo(
        () =>
            matchups
                .filter((matchup) => !category || matchup.opponent.category === category)
                .filter((matchup) => matchesName(matchup.opponent.key, term)),
        [matchups, category, term, matchesName],
    );

    // The counts answer "is it worth switching" before the tap, so they follow the other filters.
    const counts = useMemo(
        () => ({
            strong: pool.filter((matchup) => sideOf(matchup.verdict) === 'strong').length,
            weak: pool.filter((matchup) => sideOf(matchup.verdict) === 'weak').length,
            all: pool.length,
        }),
        [pool],
    );

    // The ranking arrives best first, so the losing end reads in the order that matters there.
    const visible = useMemo(() => {
        if (side === 'all') return pool;
        if (side === 'strong') return pool.filter((matchup) => sideOf(matchup.verdict) === 'strong');

        return [...pool.filter((matchup) => sideOf(matchup.verdict) === 'weak')].reverse();
    }, [pool, side]);

    return (
        <section className="card">
            <div className="card__title">
                <h2>
                    <Icon name="strongAgainst" />
                    {t('counters.title', { unit: subjectName })}
                </h2>
            </div>

            <SearchField
                hideLabel
                id="matchup-filter"
                label={t('counters.filterPlaceholder')}
                placeholder={t('counters.filterHint')}
                value={term}
                onChange={setTerm}
            />

            <div className="filter-chips">
                {ownRoster === null ? null : (
                    <button
                        type="button"
                        className="chip"
                        aria-pressed={ownRoster.active}
                        onClick={() => { ownRoster.toggle(!ownRoster.active); }}
                    >
                        <Icon name="civilizations" />
                        {t('counters.ownRoster', { civ: ownRoster.civ })}
                    </button>
                )}
                <Picker
                    prefix={t('units.category')}
                    label={t('units.category')}
                    value={category ?? ''}
                    options={[
                        { value: '', label: t('common.all') },
                        ...categories.map((entry) => ({ value: entry, label: t(`categories.${entry}`) })),
                    ]}
                    onChange={(value) => {
                        setCategory(isUnitCategory(value) ? value : null);
                    }}
                />
                <Picker
                    prefix={t('counters.pool')}
                    label={t('counters.pool')}
                    value={preferences.pool}
                    options={(['common', 'all', 'every'] as const).map((option) => ({
                        value: option,
                        label: t(`counters.pools.${option}`),
                    }))}
                    onChange={(value) => { update({ pool: value as OpponentPool }); }}
                />
                <Picker
                    prefix={t('counters.model')}
                    label={t('counters.model')}
                    value={preferences.model}
                    options={(['skirmish', 'stand'] as const).map((option) => ({
                        value: option,
                        label: t(`counters.models.${option}`),
                    }))}
                    onChange={(value) => { update({ model: value as EngagementModel }); }}
                />
                <Picker
                    prefix={t('counters.upgradeLevel')}
                    label={t('counters.upgradeLevel')}
                    value={preferences.upgradeLevel}
                    options={(['full', 'base'] as const).map((option) => ({
                        value: option,
                        label: t(`counters.upgradeLevels.${option}`),
                    }))}
                    onChange={(value) => { update({ upgradeLevel: value as UpgradeLevel }); }}
                />
            </div>

            <div className="board__sides">
                <SegmentedControl<Side>
                    label={t('counters.side')}
                    value={side}
                    onChange={(next) => {
                        const merged = new URLSearchParams(params);
                        merged.set('side', next);
                        setParams(merged, { replace: true });
                    }}
                    options={[
                        { value: 'strong', label: t('counters.sides.strong'), count: counts.strong, tone: 'good' },
                        { value: 'weak', label: t('counters.sides.weak'), count: counts.weak, tone: 'bad' },
                        { value: 'all', label: t('counters.sides.all'), count: counts.all },
                    ]}
                />
            </div>

            <hr className="divider" />

            {visible.length === 0 ? null : (
                <div className="board__columns">
                    <span>{t('counters.columns.opponent')}</span>
                    <span>{t('counters.columns.trade', { unit: subjectName })}</span>
                </div>
            )}

            {visible.length === 0 ? (
                <div className="stack stack--tight">
                    <p className="empty">{t('counters.empty')}</p>
                    {preferences.pool === 'every' ? null : (
                        <button type="button" className="chip" onClick={() => { update({ pool: 'every' }); }}>
                            {t('counters.widen')}
                        </button>
                    )}
                </div>
            ) : (
                <VirtualList items={visible} estimate={72} keyOf={(matchup) => matchup.opponent.key}>
                    {(matchup) => <MatchupRow matchup={matchup} subjectName={subjectName} />}
                </VirtualList>
            )}
        </section>
    );
}

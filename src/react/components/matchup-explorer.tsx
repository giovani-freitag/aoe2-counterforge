import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UNIT_CATEGORIES, isUnitCategory, type UnitCategory } from '../../domain/enums/unit-category.ts';
import type { Matchup } from '../../services/matchup/matchup-service.ts';
import { useNameFilter } from '../hooks/use-name-filter.ts';
import { MatchupRow } from './matchup-row.tsx';
import { Picker } from './picker.tsx';
import { VirtualList } from './virtual-list.tsx';

export interface MatchupExplorerProps {
    matchups: readonly Matchup[];
    subjectName: string;
}

type SortKey = 'best' | 'worst';

/** The complete ranking of a unit against the roster, with filters to cut it down. */
export function MatchupExplorer({ matchups, subjectName }: MatchupExplorerProps) {
    const { t } = useTranslation();
    const matchesName = useNameFilter();
    const [term, setTerm] = useState('');
    const [category, setCategory] = useState<UnitCategory | null>(null);
    const [sort, setSort] = useState<SortKey>('best');

    const categories = useMemo(
        () => UNIT_CATEGORIES.filter((entry) => matchups.some((matchup) => matchup.opponent.category === entry)),
        [matchups],
    );

    const visible = useMemo(() => {
        const filtered = matchups
            .filter((matchup) => !category || matchup.opponent.category === category)
            .filter((matchup) => matchesName(matchup.opponent.key, term));

        return sort === 'best' ? filtered : [...filtered].reverse();
    }, [matchups, category, term, sort, matchesName]);

    return (
        <section className="card">
            <div className="card__title">
                <h2>{t('counters.allTitle')}</h2>
                <span className="card__hint">{t('counters.matchupCount', { count: visible.length })}</span>
            </div>

            <p className="card__hint">{t('counters.allHint')}</p>

            <div className="form-grid">
                <div className="field">
                    <label className="field__label" htmlFor="matchup-filter">
                        {t('counters.filterPlaceholder')}
                    </label>
                    <input
                        id="matchup-filter"
                        type="search"
                        className="input"
                        value={term}
                        placeholder={t('counters.filterHint')}
                        onChange={(event) => { setTerm(event.target.value); }}
                    />
                </div>

                <div className="field">
                    <label className="field__label" htmlFor="matchup-category">
                        {t('units.category')}
                    </label>
                    <Picker
                        id="matchup-category"
                        block
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
                </div>

                <div className="field">
                    <label className="field__label" htmlFor="matchup-sort">
                        {t('counters.sort')}
                    </label>
                    <Picker
                        id="matchup-sort"
                        block
                        label={t('counters.sort')}
                        value={sort}
                        options={(['best', 'worst'] as const).map((option) => ({
                            value: option,
                            label: t(`counters.sorts.${option}`),
                        }))}
                        onChange={(value) => {
                            setSort(value as SortKey);
                        }}
                    />
                </div>
            </div>

            <hr className="divider" />

            {visible.length === 0 ? (
                <p className="empty">{t('counters.empty')}</p>
            ) : (
                <VirtualList items={visible} estimate={72} keyOf={(matchup) => matchup.opponent.key}>
                    {(matchup) => <MatchupRow matchup={matchup} subjectName={subjectName} showVerdict />}
                </VirtualList>
            )}
        </section>
    );
}

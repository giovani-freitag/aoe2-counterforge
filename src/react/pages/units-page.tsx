import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { AGE_IDS, type AgeId } from '../../domain/enums/age.ts';
import { UNIT_CATEGORIES, isUnitCategory, type UnitCategory } from '../../domain/enums/unit-category.ts';
import type { Unit } from '../../domain/entities/unit.ts';
import { UNIT_SORT_KEYS, type UnitSortKey } from '../../services/unit-ranking/unit-ranking-service.ts';
import { UnitListItem } from '../components/unit-list-item.tsx';
import { VirtualList } from '../components/virtual-list.tsx';
import { buildingNames } from '../building-names.ts';
import { precise, short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useNameFilter } from '../hooks/use-name-filter.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';

type SortOption = UnitSortKey | 'name';

const SORT_OPTIONS: readonly SortOption[] = ['name', ...UNIT_SORT_KEYS];

function isSortOption(value: string | null): value is SortOption {
    return SORT_OPTIONS.includes((value ?? '') as SortOption);
}

/** Keeps only the earliest member of each upgrade line, so a line takes one row instead of five. */
function oneUnitPerLine(units: readonly Unit[]): Unit[] {
    const byLine = new Map<string, Unit>();
    for (const unit of units) {
        const current = byLine.get(unit.line);
        if (!current || unit.age < current.age) byLine.set(unit.line, unit);
    }

    return [...byLine.values()];
}

/** Browsable roster with text filter, category and age chips, and stat-based ordering. */
export function UnitsPage() {
    const { t } = useTranslation();
    const { catalog, ranking } = useServices();
    const text = useGameText();
    const matchesName = useNameFilter();
    const { preferences } = usePreferences();
    const [params, setParams] = useSearchParams();

    const rawCategory = params.get('category');
    const category = isUnitCategory(rawCategory ?? '') ? (rawCategory as UnitCategory) : null;
    const rawAge = Number(params.get('age'));
    const age = AGE_IDS.includes(rawAge as AgeId) ? (rawAge as AgeId) : null;
    const sort: SortOption = isSortOption(params.get('sort')) ? (params.get('sort') as SortOption) : 'name';
    const term = params.get('q') ?? '';
    const uniqueOnly = params.get('unique') === '1';
    const linesOnly = params.get('lines') === '1';
    const upgraded = params.get('upgraded') === '1';

    const setFilter = (name: string, value: string | null) => {
        const next = new URLSearchParams(params);
        if (value) next.set(name, value);
        else next.delete(name);
        setParams(next, { replace: true });
    };

    const rows = useMemo(() => {
        let pool = catalog
            .units({
                civ: preferences.civ,
                combatOnly: true,
                categories: category ? [category] : undefined,
                ages: age ? [age] : undefined,
            })
            .filter((unit) => !uniqueOnly || unit.uniqueTo !== null)
            .filter((unit) => matchesName(unit.key, term));

        if (linesOnly) pool = oneUnitPerLine(pool);

        if (sort === 'name') {
            return pool
                .map((unit) => ({ unit, metric: null as number | null }))
                .sort((left, right) =>
                    text.unit(left.unit.key).name.localeCompare(text.unit(right.unit.key).name),
                );
        }

        return ranking.rank({ units: pool, sort, upgraded, civ: preferences.civ });
    }, [catalog, ranking, text, matchesName, preferences.civ, category, age, sort, term, uniqueOnly, linesOnly, upgraded]);

    const metricLabel = (value: number | null) => {
        if (value === null) return undefined;
        if (sort === 'age') return t(`ages.${value}`);
        if (sort === 'train-time') return t('common.seconds', { value: short(value) });
        if (sort === 'range') return t('common.tiles', { value: short(value) });
        if (sort === 'dps' || sort === 'value') return precise(value);

        return short(value);
    };

    return (
        <div className="stack">
            <header>
                <h1>{t('nav.units')}</h1>
                <p className="card__hint">{t('civ.count', { count: rows.length })}</p>
            </header>

            <section className="card">
                <div className="form-grid">
                    <div className="field">
                        <label className="field__label" htmlFor="unit-filter">
                            {t('units.filterPlaceholder')}
                        </label>
                        <input
                            id="unit-filter"
                            type="search"
                            className="input"
                            value={term}
                            placeholder={t('units.filterHint')}
                            onChange={(event) => { setFilter('q', event.target.value || null); }}
                        />
                    </div>

                    <div className="field">
                        <label className="field__label" htmlFor="unit-sort">
                            {t('units.sortBy')}
                        </label>
                        <select
                            id="unit-sort"
                            className="select"
                            value={sort}
                            onChange={(event) => { setFilter('sort', event.target.value); }}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {t(`units.sorts.${option}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label className="field__label" htmlFor="unit-category">
                            {t('units.category')}
                        </label>
                        <select
                            id="unit-category"
                            className="select"
                            value={category ?? ''}
                            onChange={(event) => { setFilter('category', event.target.value || null); }}
                        >
                            <option value="">{t('common.all')}</option>
                            {UNIT_CATEGORIES.filter((entry) => entry !== 'civilian').map((entry) => (
                                <option key={entry} value={entry}>
                                    {t(`categories.${entry}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label className="field__label" htmlFor="unit-age">
                            {t('unit.age')}
                        </label>
                        <select
                            id="unit-age"
                            className="select"
                            value={age ?? ''}
                            onChange={(event) => { setFilter('age', event.target.value || null); }}
                        >
                            <option value="">{t('common.all')}</option>
                            {AGE_IDS.map((entry) => (
                                <option key={entry} value={entry}>
                                    {t(`ages.${entry}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <hr className="divider" />

                <div className="toggle-list">
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={linesOnly}
                            onChange={(event) => { setFilter('lines', event.target.checked ? '1' : null); }}
                        />
                        {t('units.onePerLine')}
                    </label>
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={uniqueOnly}
                            onChange={(event) => { setFilter('unique', event.target.checked ? '1' : null); }}
                        />
                        {t('units.uniqueOnly')}
                    </label>
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={upgraded}
                            onChange={(event) => { setFilter('upgraded', event.target.checked ? '1' : null); }}
                        />
                        {t('units.withUpgrades')}
                    </label>
                </div>
            </section>

            {rows.length === 0 ? (
                <p className="empty">{t('units.empty')}</p>
            ) : (
                <VirtualList items={rows} estimate={64} keyOf={(row) => row.unit.key}>
                    {(row) => (
                        <UnitListItem
                            unit={row.unit}
                            subtitle={`${t(`ages.${row.unit.age}`)} · ${buildingNames(row.unit.buildings, t)}`}
                            trailing={
                                <span className="badge">
                                    {metricLabel(row.metric) ??
                                        t('common.seconds', { value: short(row.unit.trainTime) })}
                                </span>
                            }
                        />
                    )}
                </VirtualList>
            )}
        </div>
    );
}

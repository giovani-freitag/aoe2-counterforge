import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { AGE_IDS, type AgeId } from '../../domain/enums/age.ts';
import { UNIT_CATEGORIES, isUnitCategory, type UnitCategory } from '../../domain/enums/unit-category.ts';
import type { Unit } from '../../domain/entities/unit.ts';
import { UNIT_SORT_KEYS, type UnitSortKey } from '../../services/unit-ranking/unit-ranking-service.ts';
import { UnitListItem } from '../components/unit-list-item.tsx';
import { Link } from 'react-router';
import { Directory } from '../components/directory.tsx';
import { Icon } from '../components/icon.tsx';
import { FilterPicker } from '../components/filter-picker.tsx';
import { FilterToggle } from '../components/filter-toggle.tsx';
import { SearchField } from '../components/search-field.tsx';
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
    }, [
        catalog,
        ranking,
        text,
        matchesName,
        preferences.civ,
        category,
        age,
        sort,
        term,
        uniqueOnly,
        linesOnly,
        upgraded,
    ]);

    const metricLabel = (value: number | null) => {
        if (value === null) return undefined;
        if (sort === 'age') return t(`ages.${value}`);
        if (sort === 'train-time') return t('common.seconds', { value: short(value) });
        if (sort === 'range') return t('common.tiles', { value: short(value) });
        if (sort === 'dps' || sort === 'value') return precise(value);

        return short(value);
    };

    const toggle = (key: string, label: string, active: boolean) => (
        <FilterToggle
            key={key}
            label={label}
            active={active}
            onChange={(next) => {
                setFilter(key, next ? '1' : null);
            }}
        />
    );

    return (
        <Directory
            title={t('nav.units')}
            summary={t('civ.count', { count: rows.length })}
            action={
                <Link className="chip" to="/compare">
                    <Icon name="compare" />
                    {t('nav.compare')}
                </Link>
            }
            items={rows}
            keyOf={(row) => row.unit.key}
            empty={t('units.empty')}
            search={
                <SearchField
                    id="unit-filter"
                    label={t('units.filterPlaceholder')}
                    placeholder={t('units.filterHint')}
                    value={term}
                    onChange={(value) => {
                        setFilter('q', value || null);
                    }}
                />
            }
            filters={
                <>
                    <FilterPicker
                        label={t('units.sortBy')}
                        value={sort}
                        options={SORT_OPTIONS.map((option) => ({
                            value: option,
                            label: t(`units.sorts.${option}`),
                        }))}
                        onChange={(value) => {
                            setFilter('sort', value);
                        }}
                    />
                    <FilterPicker
                        label={t('units.category')}
                        value={category ?? ''}
                        options={[
                            { value: '', label: t('common.all') },
                            ...UNIT_CATEGORIES.filter((entry) => entry !== 'civilian').map((entry) => ({
                                value: entry,
                                label: t(`categories.${entry}`),
                            })),
                        ]}
                        onChange={(value) => {
                            setFilter('category', value || null);
                        }}
                    />
                    <FilterPicker
                        label={t('unit.age')}
                        value={age === null ? '' : String(age)}
                        options={[
                            { value: '', label: t('common.all') },
                            ...AGE_IDS.map((entry) => ({ value: String(entry), label: t(`ages.${entry}`) })),
                        ]}
                        onChange={(value) => {
                            setFilter('age', value || null);
                        }}
                    />
                    {toggle('lines', t('units.onePerLine'), linesOnly)}
                    {toggle('unique', t('units.uniqueOnly'), uniqueOnly)}
                    {toggle('upgraded', t('units.withUpgrades'), upgraded)}
                </>
            }
        >
            {(row) => (
                <UnitListItem
                    unit={row.unit}
                    subtitle={`${t(`ages.${row.unit.age}`)} · ${buildingNames(row.unit.buildings, t)}`}
                    trailing={
                        <span className="badge">
                            {metricLabel(row.metric) ?? t('common.seconds', { value: short(row.unit.trainTime) })}
                        </span>
                    }
                />
            )}
        </Directory>
    );
}

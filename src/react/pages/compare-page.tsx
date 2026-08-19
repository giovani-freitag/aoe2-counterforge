import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { RESOURCES } from '../../domain/enums/resource.ts';
import { EntityNotFoundError } from '../../domain/errors/domain-error.ts';
import type { UnitStatsRecord } from '../../domain/values/unit-stats.ts';
import { GameIcon } from '../components/game-icon.tsx';
import { Icon } from '../components/icon.tsx';
import { SegmentedControl } from '../components/segmented-control.tsx';
import { UnitPicker } from '../components/unit-picker.tsx';
import { buildingNames } from '../building-names.ts';
import { efficiency, short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';

const MAX_UNITS = 4;
const STAT_ROWS = [
    'hp',
    'attack',
    'meleeArmour',
    'pierceArmour',
    'range',
    'reloadTime',
    'speed',
    'accuracy',
    'lineOfSight',
] as const satisfies readonly (keyof UnitStatsRecord)[];

/** Stats where a smaller number is the better one. */
const LOWER_IS_BETTER = new Set<keyof UnitStatsRecord>(['reloadTime']);

type StatsMode = 'base' | 'upgraded';

type Direction = 'higher' | 'lower';

interface ComparedCell {
    text: string;
    best: boolean;
    /** Distance to the winning column, or null when there is nothing to compare. */
    delta: number | null;
}

interface ComparisonRow {
    key: string;
    label: string;
    cells: ComparedCell[];
}

/**
 * Marks the winning column of a row and measures how far the others sit from it.
 *
 * @param values - One number per column, in column order.
 * @param direction - Whether the higher or the lower number wins the row.
 * @returns One cell per column; a row where every column ties is left unmarked, because crowning
 *          identical numbers reads as a difference that is not there.
 */
function compareRow(values: readonly number[], direction: Direction): ComparedCell[] {
    const winner = direction === 'lower' ? Math.min(...values) : Math.max(...values);
    const tied = values.length < 2 || values.every((value) => value === winner);

    return values.map((value) => ({
        text: short(value),
        best: !tied && value === winner,
        delta: tied || value === winner ? null : value - winner,
    }));
}

/** The distance to the winning column, written the way a reader states a difference. */
function signed(delta: number): string {
    return `${delta > 0 ? '+' : '−'}${short(Math.abs(delta))}`;
}

/** Side-by-side sheet for up to four units, including how they trade against each other. */
export function ComparePage() {
    const { t } = useTranslation();
    const { catalog, upgrades, matchups, economy } = useServices();
    const text = useGameText();
    const { preferences } = usePreferences();
    const [params, setParams] = useSearchParams();
    const [mode, setMode] = useState<StatsMode>('upgraded');

    const keys = useMemo(
        () => (params.get('units') ?? '').split(',').filter(Boolean).slice(0, MAX_UNITS),
        [params],
    );

    const units = useMemo(
        () =>
            keys
                .map((key) => {
                    try {
                        return catalog.unit(key);
                    } catch (error) {
                        if (error instanceof EntityNotFoundError) return null;
                        throw error;
                    }
                })
                .filter((unit) => unit !== null),
        [catalog, keys],
    );

    const columns = useMemo(
        () =>
            units.map((unit) => ({
                unit,
                name: text.unit(unit.key).name,
                stats: (mode === 'base' ? unit.stats : upgrades.fullyUpgraded(unit, preferences.civ).stats).toRecord(),
                villagers: economy.plan({ unit, buildings: 1 }).wholeVillagers,
            })),
        [units, text, mode, upgrades, preferences.civ, economy],
    );

    const grid = useMemo(
        () =>
            units.map((attacker) =>
                units.map((defender) =>
                    attacker.key === defender.key
                        ? null
                        : matchups.against(
                              {
                                  unit: attacker,
                                  civ: preferences.civ,
                                  model: preferences.model,
                                  upgradeLevel: mode === 'base' ? 'base' : 'full',
                              },
                              defender,
                          ),
                ),
            ),
        [units, matchups, preferences.civ, preferences.model, mode],
    );

    const rows = useMemo<ComparisonRow[]>(() => {
        const priced = RESOURCES.filter((resource) =>
            columns.some((column) => column.unit.cost.toRecord()[resource] > 0),
        );

        return [
            ...priced.map((resource) => ({
                key: resource,
                label: t(`resources.${resource}`),
                cells: compareRow(
                    columns.map((column) => column.unit.cost.toRecord()[resource]),
                    'lower',
                ),
            })),
            {
                key: 'trainTime',
                label: t('unit.trainTime'),
                cells: compareRow(columns.map((column) => column.unit.trainTime), 'lower'),
            },
            ...STAT_ROWS.map((row) => ({
                key: row,
                label: t(`stats.${row}`),
                cells: compareRow(
                    columns.map((column) => column.stats[row]),
                    LOWER_IS_BETTER.has(row) ? ('lower' as const) : ('higher' as const),
                ),
            })),
            {
                key: 'villagers',
                label: t('compare.villagers'),
                cells: compareRow(columns.map((column) => column.villagers), 'lower'),
            },
        ];
    }, [columns, t]);

    const setUnits = (next: readonly string[]) => {
        const unique = [...new Set(next)].slice(0, MAX_UNITS);
        setParams(unique.length > 0 ? { units: unique.join(',') } : {}, { replace: true });
    };


    return (
        <div className="stack">
            <header className="stack stack--tight">
                <h1>{t('compare.title')}</h1>
                <p className="card__hint">{t('compare.help', { max: MAX_UNITS })}</p>
            </header>

            <section className="card">
                <div className="row">
                    {columns.map((column) => (
                        <span key={column.unit.key} className="chip">
                            <GameIcon
                                path={column.unit.icon === null ? null : `Unit/${column.unit.icon}.png`}
                                alt=""
                                size="sm"
                            />
                            {column.name}
                            <button
                                type="button"
                                aria-label={t('compare.remove', { unit: column.name })}
                                onClick={() => { setUnits(keys.filter((key) => key !== column.unit.key)); }}
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                </div>
                {units.length < MAX_UNITS ? (
                    <div style={{ marginTop: 'var(--space-3)' }}>
                        <UnitPicker
                            label={t('compare.add')}
                            exclude={keys}
                            onPick={(unitKey) => { setUnits([...keys, unitKey]); }}
                        />
                    </div>
                ) : null}
            </section>

            {units.length === 0 ? (
                <p className="empty">{t('compare.empty')}</p>
            ) : (
                <>
                    <section className="card">
                        <div className="card__title">
                            <h2>{t('unit.stats')}</h2>
                            <SegmentedControl<StatsMode>
                                label={t('unit.stats')}
                                value={mode}
                                onChange={setMode}
                                options={[
                                    { value: 'base', label: t('unit.statsBase') },
                                    { value: 'upgraded', label: t('unit.statsUpgraded') },
                                ]}
                            />
                        </div>
                        <div className="scroll-x scroll-x--hint">
                            <table className="compare-table">
                                <thead>
                                    <tr>
                                        <th scope="col">{t('compare.attribute')}</th>
                                        {columns.map((column) => (
                                            <th scope="col" key={column.unit.key}>
                                                <Link to={`/unit/${column.unit.key}`} className="compare-table__head">
                                                    <GameIcon
                                                        path={
                                                            column.unit.icon === null
                                                                ? null
                                                                : `Unit/${column.unit.icon}.png`
                                                        }
                                                        alt=""
                                                    />
                                                    {column.name}
                                                </Link>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <th scope="row">{t('unit.age')}</th>
                                        {columns.map((column) => (
                                            <td key={column.unit.key}>{t(`ages.${column.unit.age}`)}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <th scope="row">{t('unit.trainedAt')}</th>
                                        {columns.map((column) => (
                                            <td key={column.unit.key}>
                                                {buildingNames(column.unit.buildings, t)}
                                            </td>
                                        ))}
                                    </tr>
                                    {rows.map((row) => (
                                        <tr key={row.key}>
                                            <th scope="row">{row.label}</th>
                                            {row.cells.map((cell, index) => (
                                                <td key={columns[index].unit.key} data-best={cell.best || undefined}>
                                                    <span className="cmp">
                                                        <span className="cmp__value">
                                                            {cell.best ? <Icon name="best" /> : null}
                                                            {cell.text}
                                                            {cell.best ? (
                                                                <span className="visually-hidden">
                                                                    {t('compare.best')}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                        {cell.delta === null ? null : (
                                                            <span className="cmp__delta">{signed(cell.delta)}</span>
                                                        )}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {units.length > 1 ? (
                        <section className="card">
                            <div className="card__title">
                                <h2>{t('compare.headToHead')}</h2>
                            </div>
                            <p className="card__hint">{t('compare.headToHeadHelp')}</p>
                            <div className="scroll-x scroll-x--hint" style={{ marginTop: 'var(--space-3)' }}>
                                <table className="compare-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">{t('compare.rowVersusColumn')}</th>
                                            {columns.map((column) => (
                                                <th scope="col" key={column.unit.key}>
                                                    {column.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {columns.map((row, rowIndex) => (
                                            <tr key={row.unit.key}>
                                                <th scope="row">{row.name}</th>
                                                {grid[rowIndex].map((matchup, columnIndex) => (
                                                    <td key={columns[columnIndex].unit.key}>
                                                        {matchup ? (
                                                            <span
                                                                style={{
                                                                    color:
                                                                        matchup.efficiency >= 1.25
                                                                            ? 'var(--good)'
                                                                            : matchup.efficiency <= 0.8
                                                                              ? 'var(--bad)'
                                                                              : 'var(--text-muted)',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {efficiency(matchup.efficiency)}
                                                            </span>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}
                </>
            )}
        </div>
    );
}

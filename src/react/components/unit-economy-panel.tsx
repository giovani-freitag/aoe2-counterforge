import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Unit } from '../../domain/entities/unit.ts';
import type { Resource } from '../../domain/enums/resource.ts';
import {
    DEFAULT_CARRY_UPGRADES,
    DEFAULT_FARM_UPGRADES,
    DEFAULT_GATHER_UPGRADES,
    FOOD_SOURCES,
    type FoodSource,
} from '../../services/economy/gather-rates.ts';
import { precise, short } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useProductionPlan } from '../hooks/use-production-plan.ts';
import { useServices } from '../hooks/use-services.ts';
import { Stepper } from './stepper.tsx';
import { ResourceIcon } from './resource-icon.tsx';
import { GameIcon } from './game-icon.tsx';
import { Picker } from './picker.tsx';

export interface UnitEconomyPanelProps {
    unit: Unit;
}

const MAX_BUILDINGS = 10;
const CONSCRIPTION_BUILDINGS = ['barracks', 'archery-range', 'stable', 'castle', 'krepost', 'donjon'];

interface TechGroup {
    age: number;
    techs: readonly string[];
}

/**
 * The economy technologies that can move the numbers for this unit.
 *
 * Wood shows up even for a unit that costs none, because farms are rebuilt with wood.
 */
function techGroupsFor(
    spent: ReadonlySet<Resource>,
    onFarms: boolean,
    ageOf: (tech: string) => number,
): TechGroup[] {
    const gathering = (['food', 'wood', 'gold', 'stone'] as const)
        .filter((resource) => spent.has(resource) || (resource === 'wood' && onFarms))
        .flatMap((resource) => DEFAULT_GATHER_UPGRADES[resource].map((upgrade) => upgrade.tech));

    const all = [
        ...gathering,
        ...DEFAULT_CARRY_UPGRADES.filter((upgrade) => !upgrade.resources).map((upgrade) => upgrade.tech),
        ...(onFarms ? DEFAULT_FARM_UPGRADES.map((upgrade) => upgrade.tech) : []),
    ];

    const byAge = new Map<number, string[]>();
    for (const tech of new Set(all)) {
        const age = ageOf(tech);
        byAge.set(age, [...(byAge.get(age) ?? []), tech]);
    }

    return [...byAge]
        .sort(([left], [right]) => left - right)
        .map(([age, techs]) => ({ age, techs }));
}

/** Villager planner: how many gatherers each production queue needs to never idle. */
export function UnitEconomyPanel({ unit }: UnitEconomyPanelProps) {
    const { t } = useTranslation();
    const { upgrades, catalog } = useServices();
    const text = useGameText();
    const [buildings, setBuildings] = useState(1);
    const [foodSource, setFoodSource] = useState<FoodSource>('farm');
    const [gatherTechs, setGatherTechs] = useState<readonly string[]>([]);
    const [conscription, setConscription] = useState(false);
    const [includeFarmUpkeep, setIncludeFarmUpkeep] = useState(true);

    const trainTime = useMemo(
        () => upgrades.apply({ unit, techs: conscription ? ['conscription'] : [] }).trainTime,
        [upgrades, unit, conscription],
    );
    const plan = useProductionPlan(unit, { buildings, foodSource, gatherTechs, trainTime, includeFarmUpkeep });

    const spent = new Set(unit.cost.spentResources());
    const onFarms = spent.has('food') && foodSource === 'farm' && includeFarmUpkeep;
    const technology = (key: string) => catalog.technologies().find((entry) => entry.key === key) ?? null;
    const groups = techGroupsFor(spent, onFarms, (tech) => technology(tech)?.age ?? 2);
    const iconOf = (tech: string) => technology(tech)?.icon ?? null;
    const allTechs = groups.flatMap((group) => group.techs);
    const conscriptionAvailable = unit.buildings.some((building) => CONSCRIPTION_BUILDINGS.includes(building));

    if (!plan) {
        return (
            <section className="card">
                <p className="prose">{t('economy.free')}</p>
            </section>
        );
    }

    const toggleTech = (tech: string) => {
        setGatherTechs((current) =>
            current.includes(tech) ? current.filter((entry) => entry !== tech) : [...current, tech],
        );
    };

    return (
        <div className="stack">
            <section className="card">
                <div className="card__title">
                    <h2>{t('economy.title')}</h2>
                </div>
                <p className="card__hint">{t('economy.explain')}</p>

                <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
                    <div className="field">
                        <span className="field__label">{t('economy.buildings')}</span>
                        <Stepper
                            label={t('economy.buildings')}
                            value={buildings}
                            min={1}
                            max={MAX_BUILDINGS}
                            onChange={setBuildings}
                        />
                    </div>

                    {spent.has('food') ? (
                        <div className="field">
                            <label className="field__label" htmlFor="food-source">
                                {t('economy.foodSource')}
                            </label>
                            <Picker
                                id="food-source"
                                block
                                label={t('economy.foodSource')}
                                value={foodSource}
                                options={FOOD_SOURCES.map((source) => ({
                                    value: source,
                                    label: t(`economy.foodSources.${source}`),
                                }))}
                                onChange={(value) => {
                                    setFoodSource(value as FoodSource);
                                }}
                            />
                        </div>
                    ) : null}
                </div>

                <div className="toggle-list" style={{ marginTop: 'var(--space-4)' }}>
                    {conscriptionAvailable ? (
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={conscription}
                                onChange={(event) => { setConscription(event.target.checked); }}
                            />
                            {t('economy.withConscription')}
                        </label>
                    ) : null}
                    {spent.has('food') && foodSource === 'farm' ? (
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={includeFarmUpkeep}
                                onChange={(event) => { setIncludeFarmUpkeep(event.target.checked); }}
                            />
                            {t('economy.countFarmUpkeep')}
                        </label>
                    ) : null}
                </div>

                {groups.map((group) => (
                    <div key={group.age} style={{ marginTop: 'var(--space-4)' }}>
                        <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>
                            {t(`ages.${group.age}`)}
                        </div>
                        <div className="toggle-list">
                            {group.techs.map((tech) => (
                                <label className="toggle toggle--tech" key={tech}>
                                    <input
                                        type="checkbox"
                                        checked={gatherTechs.includes(tech)}
                                        onChange={() => {
                                            toggleTech(tech);
                                        }}
                                    />
                                    <GameIcon
                                        path={iconOf(tech) === null ? null : `Tech/${String(iconOf(tech))}.png`}
                                        alt=""
                                        size="sm"
                                    />
                                    {text.technology(tech).name}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="row" style={{ marginTop: 'var(--space-4)' }}>
                    <button type="button" className="chip" onClick={() => { setGatherTechs(allTechs); }}>
                        {t('economy.researchAll')}
                    </button>
                    <button type="button" className="chip" onClick={() => { setGatherTechs([]); }}>
                        {t('economy.researchNone')}
                    </button>
                </div>
            </section>

            <section className="card">
                <div className="big-number">
                    {plan.wholeVillagers}
                    <small>{t('economy.totalVillagers')}</small>
                </div>
                <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                    <span className="badge">{t('economy.exactTotal', { value: precise(plan.totalVillagers) })}</span>
                    <span className="badge">
                        {t('economy.unitsPerMinute', { value: precise(plan.unitsPerMinute) })}
                    </span>
                    {plan.bottleneck ? (
                        <span className="badge badge--gold">
                            {t('economy.bottleneck', { resource: t(`resources.${plan.bottleneck}`) })}
                        </span>
                    ) : null}
                    <span className="badge">{t('common.seconds', { value: short(trainTime) })}</span>
                </div>

                <hr className="divider" />

                <div className="demand-grid">
                    {plan.demands.map((demand) => (
                        <div
                            className="demand"
                            key={demand.resource}
                            data-bottleneck={plan.bottleneck === demand.resource}
                        >
                            <div className="demand__head">
                                <ResourceIcon resource={demand.resource} />
                                {t(`resources.${demand.resource}`)}
                            </div>
                            <div className="big-number" style={{ fontSize: '1.75rem' }}>
                                {Math.ceil(demand.villagers)}
                                <small>{precise(demand.villagers)}</small>
                            </div>
                            <p className="card__hint">
                                {t('economy.perMinute', { value: short(demand.perMinute) })} ·{' '}
                                {t('economy.gatherRate', { value: precise(demand.gatherRate) })}
                            </p>
                            {demand.upkeepPerSecond > 0 ? (
                                <p className="card__hint">
                                    {demand.perSecond > 0
                                        ? t('economy.ofWhichUpkeep', {
                                              value: precise(demand.upkeepPerSecond / demand.gatherRate),
                                          })
                                        : t('economy.onlyUpkeep')}
                                </p>
                            ) : null}
                        </div>
                    ))}
                </div>

                {plan.farmUpkeep ? (
                    <p className="card__hint" style={{ marginTop: 'var(--space-3)' }}>
                        {t('economy.farmSummary', {
                            farms: plan.farmUpkeep.farms,
                            food: plan.farmUpkeep.foodPerFarm,
                            wood: short(plan.farmUpkeep.woodPerSecond * 60),
                        })}
                    </p>
                ) : null}

                <p className="card__hint" style={{ marginTop: 'var(--space-2)' }}>
                    {t('economy.note')}
                </p>
            </section>
        </div>
    );
}

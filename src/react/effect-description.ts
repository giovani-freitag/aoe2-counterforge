import type { TFunction } from 'i18next';
import type { ClassAmount } from '../domain/values/class-amount.ts';
import type { StatDelta } from '../services/upgrade/tech-effect.ts';
import { delta, percentDelta, short } from './format.ts';

/** Above this many classes, a shared factor is stated once instead of class by class. */
const BROAD_ENOUGH = 3;

/**
 * Turns a technology's stat delta into short human-readable chips.
 *
 * @param change - The numeric effect declared for the technology.
 * @param t - Translator bound to the active interface language.
 * @returns One label per measurable change, empty when the effect is qualitative.
 */
export function describeEffect(change: StatDelta, t: TFunction): string[] {
    const ages = change.perAge ?? 1;
    if (ages > 1) {
        return describeEffect({ ...divided(change, ages), perAge: undefined }, t).map((effect) =>
            t('upgrades.effect.perAge', { effect }),
        );
    }

    const labels: string[] = [];
    const against = (armourClass: string) =>
        armourClass === 'base-melee' || armourClass === 'base-pierce'
            ? ''
            : t('upgrades.effect.against', { class: t(`armourClasses.${armourClass}`) });

    if (change.hp !== undefined) labels.push(t('upgrades.effect.hp', { value: delta(change.hp) }));
    if (change.hpMultiplier && change.hpMultiplier !== 1) {
        labels.push(t('upgrades.effect.hpPercent', { value: percentDelta(change.hpMultiplier) }));
    }
    if (change.range !== undefined) labels.push(t('upgrades.effect.range', { value: delta(change.range) }));
    if (change.lineOfSight !== undefined) {
        labels.push(t('upgrades.effect.lineOfSight', { value: delta(change.lineOfSight) }));
    }
    if (change.lineOfSightFloor !== undefined) {
        labels.push(t('upgrades.effect.lineOfSight', { value: short(change.lineOfSightFloor) }));
    }
    if (change.accuracy !== undefined) labels.push(t('upgrades.effect.accuracy', { value: 100 }));
    if (change.accuracyFloor !== undefined) {
        labels.push(t('upgrades.effect.accuracyFloor', { value: short(change.accuracyFloor) }));
    }
    if (change.speed !== undefined) labels.push(t('upgrades.effect.speedFlat', { value: delta(change.speed) }));
    if (change.reloadTime !== undefined) {
        labels.push(t('upgrades.effect.reload', { value: delta(change.reloadTime) }));
    }
    if (change.speedMultiplier && change.speedMultiplier !== 1) {
        labels.push(t('upgrades.effect.speed', { value: percentDelta(change.speedMultiplier) }));
    }
    if (change.reloadTimeMultiplier && change.reloadTimeMultiplier !== 1) {
        labels.push(t('upgrades.effect.attackSpeed', { value: percentDelta(1 / change.reloadTimeMultiplier) }));
    }
    if (change.projectiles !== undefined) {
        labels.push(t('upgrades.effect.projectiles', { value: delta(change.projectiles) }));
    }
    if (change.blastWidth !== undefined) {
        labels.push(t('upgrades.effect.blast', { value: delta(change.blastWidth) }));
    }
    if (change.regeneration !== undefined) {
        labels.push(t('upgrades.effect.regeneration', { value: short(change.regeneration) }));
    }
    if (change.ballistics) labels.push(t('upgrades.effect.ballistics'));
    if (change.ignoresArmour) labels.push(t('upgrades.effect.ignoresArmour'));
    if (change.population !== undefined) {
        labels.push(t('upgrades.effect.population', { value: delta(change.population) }));
    }
    if (change.damageReflection !== undefined) {
        labels.push(t('upgrades.effect.damageReflection', { value: short(change.damageReflection * 100) }));
    }
    if (change.minRangeCeiling !== undefined) {
        labels.push(t('upgrades.effect.minRange', { value: short(change.minRangeCeiling) }));
    }
    if (change.bonusDamageResistance !== undefined) {
        labels.push(t('upgrades.effect.bonusResistance', { value: short(change.bonusDamageResistance * 100) }));
    }

    for (const [resource, factor] of Object.entries(change.costMultipliers ?? {})) {
        if (factor === 1) continue;

        const value = short((factor - 1) * 100);
        labels.push(
            resource === 'all'
                ? t('upgrades.effect.cost', { value })
                : t('upgrades.effect.costResource', { value, resource: t(`resources.${resource}`) }),
        );
    }
    if (change.trainTimeMultiplier && change.trainTimeMultiplier !== 1) {
        labels.push(t('upgrades.effect.trainSpeed', { value: short((1 / change.trainTimeMultiplier - 1) * 100) }));
    }

    for (const [key, entries] of [
        ['attackPercent', change.attackMultipliers ?? []],
        ['armourPercent', change.armourMultipliers ?? []],
    ] as const) {
        for (const [factor, classes] of byFactor(entries)) {
            const broad = classes.length >= BROAD_ENOUGH;
            for (const armourClass of broad ? [null] : classes) {
                labels.push(
                    t(`upgrades.effect.${key}`, {
                        value: percentDelta(factor),
                        against: armourClass === null ? '' : against(armourClass),
                    }),
                );
            }
        }
    }

    for (const entry of change.attack ?? []) {
        if (entry.amount === 0) continue;
        labels.push(
            t('upgrades.effect.attack', { value: delta(entry.amount), against: against(entry.armourClass) }),
        );
    }
    for (const entry of change.armour ?? []) {
        if (entry.amount === 0) continue;
        if (entry.armourClass === 'base-melee' || entry.armourClass === 'base-pierce') {
            const stat = entry.armourClass === 'base-melee' ? 'stats.meleeArmour' : 'stats.pierceArmour';
            labels.push(`${delta(entry.amount)} ${t(stat).toLocaleLowerCase()}`);
            continue;
        }
        labels.push(
            t('upgrades.effect.armour', { value: delta(entry.amount), against: against(entry.armourClass) }),
        );
    }

    return labels;
}

/** One age's worth of a bonus the game hands out once per age. */
function divided(change: StatDelta, ages: number): StatDelta {
    const share = (value: number | undefined) => (value === undefined ? undefined : value / ages);
    const shares = (entries: readonly ClassAmount[] | undefined) =>
        entries?.map((entry) => ({ ...entry, amount: entry.amount / ages }));

    return {
        ...change,
        hp: share(change.hp),
        range: share(change.range),
        lineOfSight: share(change.lineOfSight),
        speed: share(change.speed),
        projectiles: share(change.projectiles),
        blastWidth: share(change.blastWidth),
        regeneration: share(change.regeneration),
        reloadTime: share(change.reloadTime),
        attack: shares(change.attack),
        armour: shares(change.armour),
    };
}

/** Groups the classes that share a factor, so a blanket multiplier reads as one statement. */
function byFactor(entries: readonly ClassAmount[]): Map<number, string[]> {
    const groups = new Map<number, string[]>();
    for (const entry of entries) {
        if (entry.amount === 1) continue;
        groups.set(entry.amount, [...(groups.get(entry.amount) ?? []), entry.armourClass]);
    }

    return groups;
}

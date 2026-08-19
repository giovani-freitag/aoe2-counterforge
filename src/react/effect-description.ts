import type { TFunction } from 'i18next';
import type { StatDelta } from '../services/upgrade/tech-effect.ts';
import { delta, percentDelta, short } from './format.ts';

/**
 * Turns a technology's stat delta into short human-readable chips.
 *
 * @param change - The numeric effect declared for the technology.
 * @param t - Translator bound to the active interface language.
 * @returns One label per measurable change, empty when the effect is qualitative.
 */
export function describeEffect(change: StatDelta, t: TFunction): string[] {
    const labels: string[] = [];
    const against = (armourClass: string) =>
        armourClass === 'base-melee' || armourClass === 'base-pierce'
            ? ''
            : t('upgrades.effect.against', { class: t(`armourClasses.${armourClass}`) });

    if (change.hp) labels.push(t('upgrades.effect.hp', { value: delta(change.hp) }));
    if (change.range) labels.push(t('upgrades.effect.range', { value: delta(change.range) }));
    if (change.lineOfSight) labels.push(t('upgrades.effect.lineOfSight', { value: delta(change.lineOfSight) }));
    if (change.accuracy) labels.push(t('upgrades.effect.accuracy', { value: 100 }));
    if (change.speedMultiplier && change.speedMultiplier !== 1) {
        labels.push(t('upgrades.effect.speed', { value: percentDelta(change.speedMultiplier) }));
    }
    if (change.reloadTimeMultiplier && change.reloadTimeMultiplier !== 1) {
        labels.push(t('upgrades.effect.attackSpeed', { value: percentDelta(1 / change.reloadTimeMultiplier) }));
    }
    if (change.trainTimeMultiplier && change.trainTimeMultiplier !== 1) {
        labels.push(t('upgrades.effect.trainSpeed', { value: short((1 / change.trainTimeMultiplier - 1) * 100) }));
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

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';

export interface CivSelectorProps {
    id?: string;
}

/** Drop-down that scopes the whole guide to one civilization's tech tree. */
export function CivSelector({ id = 'civ-selector' }: CivSelectorProps) {
    const { t } = useTranslation();
    const { catalog } = useServices();
    const text = useGameText();
    const { preferences, update } = usePreferences();

    const options = useMemo(
        () =>
            catalog
                .civilizations()
                .map((civilization) => ({ key: civilization.key, name: text.civilization(civilization.key).name }))
                .sort((left, right) => left.name.localeCompare(right.name)),
        [catalog, text],
    );

    return (
        <>
            <label className="visually-hidden" htmlFor={id}>
                {t('civ.select')}
            </label>
            <select
                id={id}
                className="select"
                value={preferences.civ ?? ''}
                onChange={(event) => { update({ civ: event.target.value || null }); }}
            >
                <option value="">{t('home.allCivs')}</option>
                {options.map((option) => (
                    <option key={option.key} value={option.key}>
                        {option.name}
                    </option>
                ))}
            </select>
        </>
    );
}

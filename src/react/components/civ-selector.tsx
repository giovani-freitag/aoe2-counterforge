import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { iconUrl } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';
import { Icon } from './icon.tsx';
import { Picker } from './picker.tsx';

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
        () => [
            { value: '', label: t('home.allCivs'), visual: <Icon name="civilizations" /> },
            ...catalog
                .civilizations()
                .map((civilization) => ({
                    value: civilization.key,
                    label: text.civilization(civilization.key).name,
                    visual: (
                        <img
                            className="picker__emblem"
                            src={iconUrl(`Civs/${civilization.icon}.png`)}
                            alt=""
                            loading="lazy"
                        />
                    ),
                }))
                .sort((left, right) => left.label.localeCompare(right.label)),
        ],
        [catalog, text, t],
    );

    return (
        <Picker
            id={id}
            block
            label={t('civ.select')}
            value={preferences.civ ?? ''}
            options={options}
            onChange={(value) => {
                update({ civ: value === '' ? null : value });
            }}
        />
    );
}

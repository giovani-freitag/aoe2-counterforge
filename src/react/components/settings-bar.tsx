import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { SUPPORTED_LOCALES, toSupportedLocale } from '../../i18n/index.ts';
import { localizedPath } from '../../i18n/locale-path.ts';
import { rememberLocale } from '../../i18n/locale-preference.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useLocale } from '../hooks/use-locale.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useServices } from '../hooks/use-services.ts';
import { useTheme } from '../hooks/use-theme.ts';
import { iconUrl } from '../format.ts';
import { Flag } from './flag.tsx';
import { Icon, type IconName } from './icon.tsx';
import { Picker } from './picker.tsx';

const THEMES: readonly { value: string; icon: IconName }[] = [
    { value: 'system', icon: 'system' },
    { value: 'light', icon: 'light' },
    { value: 'dark', icon: 'dark' },
];

export interface SettingsBarProps {
    /** Lays the choices out as labelled rows, for the panel a phone opens them in. */
    stacked?: boolean;
}

/** The three choices that follow the reader everywhere: civilization, language and theme. */
export function SettingsBar({ stacked = false }: SettingsBarProps) {
    const { t } = useTranslation();
    const { pathname, search } = useLocation();
    const locale = useLocale();
    const theme = useTheme();
    const text = useGameText();
    const { catalog } = useServices();
    const { preferences, update } = usePreferences();

    const civs = [
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
    ];

    /**
     * Wraps a control in its own labelled row, or leaves it bare in the header.
     *
     * @param label - What the control chooses.
     * @param control - The control itself.
     * @returns The control, dressed for wherever the bar is being shown.
     */
    function field(label: string, control: ReactNode): ReactNode {
        if (!stacked) return control;

        return (
            <div className="field" key={label}>
                <span className="field__label">{label}</span>
                {control}
            </div>
        );
    }

    return (
        <div className={stacked ? 'settings settings--stacked' : 'settings'}>
            {field(
                t('civ.select'),
                <Picker
                    key="civ"
                    label={t('civ.select')}
                    block={stacked}
                    value={preferences.civ ?? ''}
                    options={civs}
                    onChange={(value) => {
                        update({ civ: value === '' ? null : value });
                    }}
                />,
            )}

            {field(
                t('settings.language'),
                <Picker
                    key="language"
                    label={t('settings.language')}
                    value={locale}
                    compact={!stacked}
                    block={stacked}
                    options={SUPPORTED_LOCALES.map((tag) => ({
                        value: tag,
                        label: t(`languages.${tag}`),
                        visual: <Flag locale={tag} />,
                    }))}
                    onChange={(value) => {
                        const next = toSupportedLocale(value);
                        rememberLocale(next);
                        // Each language is a page of its own, so switching is going to that page.
                        window.location.assign(localizedPath(`${pathname}${search}`, next));
                    }}
                />,
            )}

            {field(
                t('settings.theme'),
                <Picker
                    key="theme"
                    label={t('settings.theme')}
                    value={theme.choice}
                    compact={!stacked}
                    block={stacked}
                    options={THEMES.map((entry) => ({
                        value: entry.value,
                        label: t(`themes.${entry.value}`),
                        visual: <Icon name={entry.icon} />,
                    }))}
                    onChange={(value) => {
                        theme.set(value as 'system' | 'light' | 'dark');
                    }}
                />,
            )}

            <a
                className="settings__source"
                href={__APP_REPOSITORY__}
                target="_blank"
                rel="noreferrer"
                title={t('app.source')}
            >
                <Icon name="source" />
                <span className="settings__version">{__APP_VERSION__}</span>
                <span className={stacked ? undefined : 'visually-hidden'}>{t('app.source')}</span>
            </a>
        </div>
    );
}

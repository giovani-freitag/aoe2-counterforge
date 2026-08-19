import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '../../i18n/index.ts';
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

/** The three choices that follow the reader everywhere: civilization, language and theme. */
export function SettingsBar() {
    const { t, i18n } = useTranslation();
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

    return (
        <div className="settings">
            <Picker
                label={t('civ.select')}
                value={preferences.civ ?? ''}
                options={civs}
                onChange={(value) => {
                    update({ civ: value === '' ? null : value });
                }}
            />

            <Picker
                label={t('settings.language')}
                value={locale}
                compact
                options={SUPPORTED_LOCALES.map((tag) => ({
                    value: tag,
                    label: t(`languages.${tag}`),
                    visual: <Flag locale={tag} />,
                }))}
                onChange={(value) => {
                    void i18n.changeLanguage(value);
                }}
            />

            <Picker
                label={t('settings.theme')}
                value={theme.choice}
                compact
                options={THEMES.map((entry) => ({
                    value: entry.value,
                    label: t(`themes.${entry.value}`),
                    visual: <Icon name={entry.icon} />,
                }))}
                onChange={(value) => {
                    theme.set(value as 'system' | 'light' | 'dark');
                }}
            />
        </div>
    );
}

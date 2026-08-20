import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router';
import { assetUrl } from '../format.ts';
import { useCommandPalette } from '../hooks/use-command-palette.ts';
import { useSpecular } from '../hooks/use-specular.ts';
import { CommandPalette } from './command-palette.tsx';
import { EmberCanvas } from './ember-canvas.tsx';
import { ForgeFilters } from './forge-filters.tsx';
import { Icon, type IconName } from './icon.tsx';
import { SettingsBar } from './settings-bar.tsx';

/**
 * The four places the guide can be, and the routes that belong to each.
 *
 * A unit page is still the units section, so the navigation has to say so — otherwise opening a
 * unit leaves the reader with nothing lit and no idea where they are.
 */
const NAV_ITEMS = [
    { to: '/', key: 'home', icon: 'home', owns: ['/'] },
    { to: '/units', key: 'units', icon: 'units', owns: ['/units', '/unit/', '/compare'] },
    { to: '/techs', key: 'technologies', icon: 'upgrades', owns: ['/techs', '/tech/'] },
    { to: '/civs', key: 'civilizations', icon: 'civilizations', owns: ['/civs', '/civ/'] },
] as const satisfies readonly { to: string; key: string; icon: IconName; owns: readonly string[] }[];

function owns(paths: readonly string[], pathname: string): boolean {
    return paths.some((path) => (path === '/' ? pathname === '/' : pathname.startsWith(path)));
}

/** Keeps the embers over whichever tab is open. */
function openTab(bar: HTMLElement | null): { from: number; width: number } {
    const active = bar?.querySelector('[aria-current="page"]');
    if (!bar || !active) return { from: 0, width: bar?.clientWidth ?? 0 };

    const frame = bar.getBoundingClientRect();
    const box = active.getBoundingClientRect();

    return { from: box.left - frame.left + box.width * 0.2, width: box.width * 0.6 };
}

/**
 * Whether the reader's keyboard says Command where everyone else's says Control.
 *
 * @returns True on Apple hardware, where the palette answers to the meta key.
 */
function isApple(): boolean {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/** Frame shared by every page: header, navigation and the search overlay. */
export function AppShell() {
    const { t } = useTranslation();
    const { open } = useCommandPalette();
    const [isMenuOpen, setMenuOpen] = useState(false);
    const { pathname } = useLocation();

    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };

        window.addEventListener('keydown', onKey);

        return () => { window.removeEventListener('keydown', onKey); };
    }, [isMenuOpen]);
    useSpecular('.card, .topbar');

    return (
        <div className="shell">
            <ForgeFilters />

            <a className="skip-link" href="#main">
                {t('app.skipToContent')}
            </a>

            <header className="topbar">
                <Link className="topbar__brand" to="/">
                    <img className="topbar__mark" src={assetUrl('brand.svg')} alt="" width={28} height={32} />
                    <span className="topbar__name">{t('app.title')}</span>
                </Link>

                <button type="button" className="searchbutton" onClick={open}>
                    <Icon name="search" />
                    <span className="searchbutton__short">{t('search.short')}</span>
                    <span className="searchbutton__label">{t('search.open')}</span>
                    <span className="searchbutton__kbd" aria-hidden="true">
                        <kbd>{isApple() ? '⌘' : 'Ctrl'}</kbd>
                        <kbd>K</kbd>
                    </span>
                    <span className="visually-hidden">{t('search.open')}</span>
                </button>

                <SettingsBar />

                <button
                    type="button"
                    className="menubutton"
                    aria-expanded={isMenuOpen}
                    onClick={() => { setMenuOpen(true); }}
                >
                    <Icon name="menu" />
                    <span className="visually-hidden">{t('settings.title')}</span>
                </button>
            </header>

            {isMenuOpen ? (
                <div
                    className="sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('settings.title')}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setMenuOpen(false);
                    }}
                >
                    <div className="sheet__panel">
                        <div className="sheet__head">
                            <h2>{t('settings.title')}</h2>
                            <button type="button" className="chip" onClick={() => { setMenuOpen(false); }}>
                                {t('common.close')}
                            </button>
                        </div>
                        <SettingsBar stacked />
                    </div>
                </div>
            ) : null}

            <nav className="tabbar" aria-label={t('app.title')}>
                <EmberCanvas className="tabbar__embers" column={() => openTab(document.querySelector('.tabbar'))} />
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.key}
                        className="tabbar__item"
                        to={item.to}
                        aria-current={owns(item.owns, pathname) ? 'page' : undefined}
                    >
                        <Icon name={item.icon} className="tabbar__icon" />
                        {t(`nav.${item.key}`)}
                    </Link>
                ))}
            </nav>

            <main className="shell__main" id="main">
                <Outlet />
            </main>

            <CommandPalette />
        </div>
    );
}

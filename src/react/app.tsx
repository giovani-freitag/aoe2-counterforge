import { BrowserRouter, Route, Routes, StaticRouter } from 'react-router';
import { routerBasename } from '../i18n/locale-path.ts';
import type { SupportedLocale } from '../i18n/index.ts';
import { AppShell } from './components/app-shell.tsx';
import { ScrollToTop } from './components/scroll-to-top.tsx';
import { CivilizationPage } from './pages/civilization-page.tsx';
import { CivilizationsPage } from './pages/civilizations-page.tsx';
import { ComparePage } from './pages/compare-page.tsx';
import { HomePage } from './pages/home-page.tsx';
import { NotFoundPage } from './pages/not-found-page.tsx';
import { TechnologiesPage } from './pages/technologies-page.tsx';
import { TechnologyPage } from './pages/technology-page.tsx';
import { UnitPage } from './pages/unit-page.tsx';
import { UnitsPage } from './pages/units-page.tsx';
import { CommandPaletteProvider } from './providers/command-palette-provider.tsx';
import { PreferencesProvider } from './providers/preferences-provider.tsx';
import { ServicesProvider } from './providers/services-provider.tsx';

export interface AppProps {
    /** Language the pages are served in, which decides the folder every route sits under. */
    locale: SupportedLocale;
    /** Address to render outside a browser, for a page written ahead of time; a live page follows the address bar. */
    location?: string;
}

/** Application root: providers first, then the routed shell. */
export function App({ locale, location }: AppProps) {
    const basename = routerBasename(locale);
    const routes = (
        <>
            <ScrollToTop />
            <Routes>
                <Route element={<AppShell />}>
                    <Route index element={<HomePage />} />
                    <Route path="units" element={<UnitsPage />} />
                    <Route path="compare" element={<ComparePage />} />
                    <Route path="unit/:key" element={<UnitPage />} />
                    <Route path="civs" element={<CivilizationsPage />} />
                    <Route path="civ/:key" element={<CivilizationPage />} />
                    <Route path="techs" element={<TechnologiesPage />} />
                    <Route path="tech/:key" element={<TechnologyPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </>
    );

    return (
        <ServicesProvider>
            <PreferencesProvider>
                <CommandPaletteProvider>
                    {location === undefined ? (
                        <BrowserRouter basename={basename}>{routes}</BrowserRouter>
                    ) : (
                        <StaticRouter location={location} basename={basename}>
                            {routes}
                        </StaticRouter>
                    )}
                </CommandPaletteProvider>
            </PreferencesProvider>
        </ServicesProvider>
    );
}

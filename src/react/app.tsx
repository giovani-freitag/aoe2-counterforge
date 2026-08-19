import { HashRouter, Route, Routes } from 'react-router';
import { AppShell } from './components/app-shell.tsx';
import { ScrollToTop } from './components/scroll-to-top.tsx';
import { CivilizationPage } from './pages/civilization-page.tsx';
import { CivilizationsPage } from './pages/civilizations-page.tsx';
import { ComparePage } from './pages/compare-page.tsx';
import { HomePage } from './pages/home-page.tsx';
import { NotFoundPage } from './pages/not-found-page.tsx';
import { TechnologyPage } from './pages/technology-page.tsx';
import { UnitPage } from './pages/unit-page.tsx';
import { UnitsPage } from './pages/units-page.tsx';
import { CommandPaletteProvider } from './providers/command-palette-provider.tsx';
import { PreferencesProvider } from './providers/preferences-provider.tsx';
import { ServicesProvider } from './providers/services-provider.tsx';

/** Application root: providers first, then the routed shell. */
export function App() {
    return (
        <ServicesProvider>
            <PreferencesProvider>
                <CommandPaletteProvider>
                    <HashRouter>
                        <ScrollToTop />
                        <Routes>
                            <Route element={<AppShell />}>
                                <Route index element={<HomePage />} />
                                <Route path="units" element={<UnitsPage />} />
                                <Route path="compare" element={<ComparePage />} />
                                <Route path="unit/:key" element={<UnitPage />} />
                                <Route path="civs" element={<CivilizationsPage />} />
                                <Route path="civ/:key" element={<CivilizationPage />} />
                                <Route path="tech/:key" element={<TechnologyPage />} />
                                <Route path="*" element={<NotFoundPage />} />
                            </Route>
                        </Routes>
                    </HashRouter>
                </CommandPaletteProvider>
            </PreferencesProvider>
        </ServicesProvider>
    );
}

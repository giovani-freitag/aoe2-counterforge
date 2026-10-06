import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_LOCALE } from './data/dataset.ts';
import { createI18n } from './i18n/index.ts';
import { correctedPath, localeFromPath } from './i18n/locale-path.ts';
import { preferredLocale } from './i18n/locale-preference.ts';
import { App } from './react/app.tsx';
import './index.css';

const corrected = correctedPath(window.location, preferredLocale());
if (corrected) window.history.replaceState(null, '', corrected);

const locale = localeFromPath(window.location.pathname) ?? DEFAULT_LOCALE;
createI18n(locale);

const container = document.getElementById('root');
if (!container) throw new Error('The #root container is missing from index.html.');

// The markup written ahead of time is replaced rather than hydrated: the reader's stored civilization
// and theme change what the first render shows, and a mismatched hydration renders from scratch anyway.
createRoot(container).render(
    <StrictMode>
        <App locale={locale} />
    </StrictMode>,
);

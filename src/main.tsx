import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createI18n } from './i18n/index.ts';
import { App } from './react/app.tsx';
import './index.css';

createI18n();

const container = document.getElementById('root');
if (!container) throw new Error('The #root container is missing from index.html.');

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

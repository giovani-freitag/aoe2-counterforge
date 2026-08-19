/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { createI18n } from '../../src/i18n/index.ts';
import { App } from '../../src/react/app.tsx';

beforeAll(async () => {
    window.localStorage.clear();
    await createI18n().changeLanguage('pt-BR');
});

describe('App', () => {
    it('lands on the home screen with the category tiles', () => {
        render(<App />);

        expect(screen.getByRole('heading', { level: 1, name: 'Unidades de Age of Empires II' })).toBeDefined();
    });

    it('opens the command palette from the header button', async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getAllByRole('button', { name: /Buscar unidade/ })[0]);

        expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('navigates to a unit page from a search result', async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getAllByRole('button', { name: /Buscar unidade/ })[0]);
        await user.type(screen.getByRole('searchbox'), 'milicia');
        const [result] = await screen.findAllByRole('button', { name: /^Milícia/ });
        await user.click(result);

        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 1, name: 'Milícia' })).toBeDefined();
        });
    });

    it('shows the computed counters for a unit', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/unit/knight';
        render(<App />);

        await user.click(await screen.findByRole('tab', { name: 'Counters' }));

        expect(await screen.findByRole('heading', { name: 'Forte contra' })).toBeDefined();
    });

    it('lists every matchup below the summary lists', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/unit/knight?tab=counters';
        render(<App />);

        await user.click(await screen.findByRole('tab', { name: 'Counters' }));

        expect(await screen.findByRole('heading', { name: 'Todos os confrontos' })).toBeDefined();
    });

    it('filters the full matchup list by opponent name', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/unit/knight?tab=counters';
        render(<App />);

        await user.type(await screen.findByRole('searchbox', { name: /Filtrar advers/ }), 'alabard');

        await waitFor(() => {
            expect(screen.getByText('1 confronto')).toBeDefined();
        });
    });

    it('puts two units side by side with a head to head table', async () => {
        window.location.hash = '#/compare?units=knight,champion';
        render(<App />);

        expect(await screen.findByRole('heading', { name: 'Confronto direto' })).toBeDefined();
    });

    it('adds a unit to the comparison from the picker', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/compare?units=knight';
        render(<App />);

        await user.type(await screen.findByRole('searchbox', { name: /Adicionar unidade/ }), 'campeao');
        const [suggestion] = await screen.findAllByRole('button', { name: /^Campeão/ });
        await user.click(suggestion);

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Confronto direto' })).toBeDefined();
        });
    });

    it('links a unit to every civilization that trains it', async () => {
        window.location.hash = '#/unit/paladin';
        render(<App />);

        const card = await screen.findByRole('heading', { name: 'Civilizações que treinam' });

        expect(card).toBeDefined();
    });

    it('reorders the roster by the chosen metric', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/units?category=infantry&lines=1';
        render(<App />);

        await user.click(await screen.findByLabelText('Ordenar por'));
        await user.click(screen.getByRole('option', { name: 'Mais rápido de treinar' }));

        await waitFor(() => {
            expect(window.location.hash).toContain('sort=train-time');
        });
    });

    it('filters the roster by name', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/units';
        render(<App />);

        await user.type(await screen.findByRole('searchbox', { name: /Filtrar por nome/ }), 'paladino');

        await waitFor(() => {
            expect(screen.getByText('1 unidade')).toBeDefined();
        });
    });

    it('unfolds a matchup in place with a shortcut to the opponent', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/unit/knight?tab=counters';
        render(<App />);

        const [row] = await screen.findAllByRole('button', { name: /Alabardeiro/ });
        await user.click(row);

        expect(await screen.findByRole('link', { name: /Abrir Alabardeiro/ })).toBeDefined();
    });

    it('shows the villager plan for a unit', async () => {
        const user = userEvent.setup();
        window.location.hash = '#/unit/archer';
        render(<App />);

        await user.click(await screen.findByRole('tab', { name: 'Economia' }));

        expect(await screen.findByText('Aldeões no total')).toBeDefined();
    });
});

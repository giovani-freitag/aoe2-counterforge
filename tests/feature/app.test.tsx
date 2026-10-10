/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createI18n } from '../../src/i18n/index.ts';
import { App } from '../../src/react/app.tsx';

beforeAll(() => {
    window.localStorage.clear();
    createI18n('pt-BR');
});

beforeEach(() => {
    window.history.pushState(null, '', '/pt-br/');
});

describe('App', () => {
    it('lands on the counter finder with an answer already on screen', async () => {
        render(<App locale="pt-BR" />);

        expect(screen.getByRole('heading', { level: 1, name: 'O que você está enfrentando?' })).toBeDefined();
        expect(await screen.findByRole('heading', { name: /Responda um Cavaleiro com/ })).toBeDefined();
    });

    it('opens the command palette from the header button', async () => {
        const user = userEvent.setup();
        render(<App locale="pt-BR" />);

        await user.click(screen.getAllByRole('button', { name: /Buscar unidade/ })[0]);

        expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('navigates to a unit page from a search result', async () => {
        const user = userEvent.setup();
        render(<App locale="pt-BR" />);

        await user.click(screen.getAllByRole('button', { name: /Buscar unidade/ })[0]);
        await user.type(screen.getByRole('searchbox'), 'milicia');
        const [result] = await screen.findAllByRole('button', { name: /^Milícia/ });
        await user.click(result);

        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 1, name: 'Milícia' })).toBeDefined();
        });
    });

    it('follows the upgrade line to the next unit', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/unit/knight');
        const { container } = render(<App locale="pt-BR" />);
        await screen.findByRole('heading', { level: 1, name: 'Cavaleiro' });

        await user.click(container.querySelector('.line-diagram a[href="/pt-br/unit/cavalier"]')!);

        expect(await screen.findByRole('heading', { level: 1, name: 'Fidalgo' })).toBeDefined();
    });

    it('shows the computed counters for a unit', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/unit/knight');
        render(<App locale="pt-BR" />);

        await user.click(await screen.findByRole('tab', { name: 'Counters' }));

        expect(await screen.findByRole('button', { name: /^Fortes/ })).toBeDefined();
    });

    it('reaches the complete ranking without leaving the card', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/unit/knight?tab=counters');
        render(<App locale="pt-BR" />);

        const complete = await screen.findByRole('button', { name: /^Todos/ });
        await user.click(complete);

        expect(complete.getAttribute('aria-pressed')).toBe('true');
        expect(complete.textContent).toBe('Todos11');
    });

    it('counts what the opponent filter leaves on each end of the ranking', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/unit/knight?tab=counters');
        render(<App locale="pt-BR" />);

        await user.type(await screen.findByRole('searchbox', { name: /Filtrar advers/ }), 'alabard');

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /^Fortes/ }).textContent).toBe('Fortes0');
        });
        expect(screen.getByRole('button', { name: /^Fracos/ }).textContent).toBe('Fracos1');
    });

    it('puts two units side by side with a head to head table', async () => {
        window.history.pushState(null, '', '/pt-br/compare?units=knight,champion');
        render(<App locale="pt-BR" />);

        expect(await screen.findByRole('heading', { name: 'Confronto direto' })).toBeDefined();
    });

    it('names the winner of each duel instead of leaving the direction to the reader', async () => {
        window.history.pushState(null, '', '/pt-br/compare?units=halberdier,champion');
        render(<App locale="pt-BR" />);

        expect(await screen.findByRole('button', { name: /^Campeão vence Alabardeiro: 3[.,]19x/ })).toBeDefined();
    });

    it('keeps the standings out of a comparison with a single duel', async () => {
        window.history.pushState(null, '', '/pt-br/compare?units=halberdier,champion&view=standings');
        render(<App locale="pt-BR" />);

        await screen.findByRole('heading', { name: 'Confronto direto' });

        expect(screen.queryByRole('button', { name: 'Classificação' })).toBeNull();
    });

    it('opens the standings the address asks for once the group has three units', async () => {
        window.history.pushState(null, '', '/pt-br/compare?units=halberdier,champion,arbalester&view=standings');
        render(<App locale="pt-BR" />);

        expect(await screen.findByRole('columnheader', { name: 'Troca média' })).toBeDefined();
    });

    it('switches the head to head to the grid', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/compare?units=halberdier,champion');
        render(<App locale="pt-BR" />);

        await user.click(await screen.findByRole('button', { name: 'Matriz' }));

        expect(screen.getByRole('columnheader', { name: 'Linha vs coluna' })).toBeDefined();
        expect(window.location.search).toContain('view=grid');
    });

    it('adds a unit to the comparison from the picker', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/compare?units=knight');
        render(<App locale="pt-BR" />);

        await user.type(await screen.findByRole('searchbox', { name: /Adicionar unidade/ }), 'campeao');
        const [suggestion] = await screen.findAllByRole('button', { name: /^Campeão/ });
        await user.click(suggestion);

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Confronto direto' })).toBeDefined();
        });
    });

    it('links a unit to every civilization that trains it', async () => {
        window.history.pushState(null, '', '/pt-br/unit/paladin');
        render(<App locale="pt-BR" />);

        const card = await screen.findByRole('heading', { name: 'Civilizações que treinam' });

        expect(card).toBeDefined();
    });

    it('reorders the roster by the chosen metric', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/units?category=infantry&lines=1');
        render(<App locale="pt-BR" />);

        await user.click(await screen.findByRole('button', { name: /^Ordenar por/ }));
        await user.click(screen.getByRole('option', { name: 'Mais rápido de treinar' }));

        await waitFor(() => {
            expect(window.location.search).toContain('sort=train-time');
        });
    });

    it('narrows a long picker list as you type', async () => {
        const user = userEvent.setup();
        render(<App locale="pt-BR" />);

        await user.click(screen.getAllByRole('button', { name: /Todas as civilizações/ })[0]);
        await user.type(screen.getByRole('searchbox', { name: 'Usar esta civilização' }), 'bret');

        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Bretões']);
    });

    it('lists the languages in alphabetical order of their names', async () => {
        const user = userEvent.setup();
        render(<App locale="pt-BR" />);

        await user.click(screen.getAllByRole('button', { name: /^Idioma:/ })[0]);

        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
            'Espanhol',
            'Inglês',
            'Italiano',
            'Português',
        ]);
    });

    it('filters the roster by name', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/units');
        render(<App locale="pt-BR" />);

        await user.type(await screen.findByRole('searchbox', { name: /Filtrar por nome/ }), 'paladino');

        await waitFor(() => {
            expect(screen.getByText('1 unidade')).toBeDefined();
        });
    });

    it('unfolds a matchup in place with a shortcut to the opponent', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/unit/knight?tab=counters');
        render(<App locale="pt-BR" />);

        await user.click(await screen.findByRole('button', { name: /^Fracos/ }));
        const [row] = await screen.findAllByRole('button', { name: /Alabardeiro/ });
        await user.click(row);

        expect(await screen.findByRole('link', { name: /Abrir Alabardeiro/ })).toBeDefined();
    });

    it('shows the villager plan for a unit', async () => {
        const user = userEvent.setup();
        window.history.pushState(null, '', '/pt-br/unit/archer');
        render(<App locale="pt-BR" />);

        await user.click(await screen.findByRole('tab', { name: 'Economia' }));

        expect(await screen.findByText('Aldeões no total')).toBeDefined();
    });
});

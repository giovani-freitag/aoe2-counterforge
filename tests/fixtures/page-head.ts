import type { PageHeadInput } from '../../src/react/page-head.ts';

/**
 * The words and place of a page, with every field overridable.
 *
 * @param overrides - Fields the test cares about.
 * @returns A complete input for building a page head.
 */
export function pageHeadInput(overrides: Partial<PageHeadInput> = {}): PageHeadInput {
    return {
        title: 'Knight counters, stats and cost',
        description: 'Powerful all-purpose Heavy Cavalry.',
        name: 'Knight',
        path: '/unit/knight',
        locale: 'en',
        siteName: 'AoE2 Counterforge',
        trail: [
            { name: 'Home', path: '/' },
            { name: 'Units', path: '/units' },
        ],
        indexable: true,
        ...overrides,
    };
}

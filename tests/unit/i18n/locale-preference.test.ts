/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { preferredLocale, rememberLocale } from '../../../src/i18n/locale-preference.ts';

beforeEach(() => {
    window.localStorage.clear();
});

describe('preferredLocale', () => {
    it('has nothing to say before the reader chooses', () => {
        const locale = preferredLocale();

        expect(locale).toBeNull();
    });

    it('returns the language the reader chose', () => {
        rememberLocale('en');

        const locale = preferredLocale();

        expect(locale).toBe('en');
    });

    it('ignores a stored language the site does not speak', () => {
        window.localStorage.setItem('aoe2-guide.locale', 'fr');

        const locale = preferredLocale();

        expect(locale).toBeNull();
    });
});

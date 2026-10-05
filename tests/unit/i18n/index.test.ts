import { describe, expect, it } from 'vitest';
import { toSupportedLocale } from '../../../src/i18n/index.ts';

describe('toSupportedLocale', () => {
    it('keeps a locale the dataset has strings for', () => {
        const locale = toSupportedLocale('es');

        expect(locale).toBe('es');
    });

    it('matches a tag whatever its case', () => {
        const locale = toSupportedLocale('PT-br');

        expect(locale).toBe('pt-BR');
    });

    it('serves a regional variant in its own language', () => {
        const locale = toSupportedLocale('es-MX');

        expect(locale).toBe('es');
    });

    it('serves European Portuguese in Brazilian Portuguese', () => {
        const locale = toSupportedLocale('pt-PT');

        expect(locale).toBe('pt-BR');
    });

    it('falls back to English for a language it has no strings for', () => {
        const locale = toSupportedLocale('fr');

        expect(locale).toBe('en');
    });
});

import { describe, expect, it } from 'vitest';
import {
    appPathOf,
    correctedPath,
    localeFromPath,
    localizedPath,
    routerBasename,
    sitePath,
} from '../../../src/i18n/locale-path.ts';

describe('sitePath', () => {
    it('serves the default language from the bare address', () => {
        const path = sitePath('/unit/knight', 'pt-BR');

        expect(path).toBe('unit/knight');
    });

    it('serves another language from a folder named after it', () => {
        const path = sitePath('/unit/knight', 'en');

        expect(path).toBe('en/unit/knight');
    });

    it('keeps the folder of a home page as a folder', () => {
        const path = sitePath('/', 'en');

        expect(path).toBe('en/');
    });
});

describe('localizedPath', () => {
    it('keeps the query string', () => {
        const path = localizedPath('/units?category=infantry', 'en');

        expect(path).toBe('/en/units?category=infantry');
    });
});

describe('routerBasename', () => {
    it('mounts the default language at the site root', () => {
        const basename = routerBasename('pt-BR');

        expect(basename).toBe('/');
    });

    it('mounts another language in its folder', () => {
        const basename = routerBasename('en');

        expect(basename).toBe('/en/');
    });
});

describe('localeFromPath', () => {
    it('reads the language from its folder', () => {
        const locale = localeFromPath('/en/civ/britons');

        expect(locale).toBe('en');
    });

    it('reads a folder without its trailing slash', () => {
        const locale = localeFromPath('/en');

        expect(locale).toBe('en');
    });

    it('does not mistake a route starting with the same letters for a folder', () => {
        const locale = localeFromPath('/english');

        expect(locale).toBe('pt-BR');
    });

    it('falls back to the default language', () => {
        const locale = localeFromPath('/unit/knight');

        expect(locale).toBe('pt-BR');
    });
});

describe('appPathOf', () => {
    it('drops the language folder', () => {
        const path = appPathOf('/en/tech/bloodlines');

        expect(path).toBe('/tech/bloodlines');
    });

    it('turns a language folder alone into the home route', () => {
        const path = appPathOf('/en');

        expect(path).toBe('/');
    });

    it('leaves a default language path as it is', () => {
        const path = appPathOf('/units');

        expect(path).toBe('/units');
    });
});

describe('correctedPath', () => {
    it('leaves an address in the reader language alone', () => {
        const path = correctedPath({ pathname: '/en/units', search: '', hash: '' }, 'en');

        expect(path).toBeNull();
    });

    it('leaves an address alone when the reader never chose a language', () => {
        const path = correctedPath({ pathname: '/en/units', search: '', hash: '' }, null);

        expect(path).toBeNull();
    });

    it('moves the reader to the same page in the language they chose', () => {
        const path = correctedPath({ pathname: '/unit/knight', search: '?tab=counters', hash: '' }, 'en');

        expect(path).toBe('/en/unit/knight?tab=counters');
    });

    it('turns a hash route into the address it now has', () => {
        const path = correctedPath({ pathname: '/', search: '', hash: '#/unit/paladin?tab=counters' }, null);

        expect(path).toBe('/unit/paladin?tab=counters');
    });

    it('keeps an in-page anchor where it is', () => {
        const path = correctedPath({ pathname: '/units', search: '', hash: '#main' }, null);

        expect(path).toBeNull();
    });
});

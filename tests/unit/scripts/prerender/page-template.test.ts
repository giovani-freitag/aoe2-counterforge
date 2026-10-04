import { describe, expect, it } from 'vitest';
import { buildPageHead } from '../../../../src/react/page-head.ts';
import { fillTemplate, pageFile } from '../../../../scripts/prerender/page-template.ts';
import { pageHeadInput } from '../../../fixtures/page-head.ts';

const TEMPLATE =
    '<html lang="pt-BR"><head><!--page-head--></head><body><div id="root"><!--page-root--></div></body></html>';

describe('pageFile', () => {
    it('writes a page as a file named after its address', () => {
        const file = pageFile('en/unit/knight');

        expect(file).toBe('en/unit/knight.html');
    });

    it('writes a home page as the index of its folder', () => {
        const file = pageFile('en/');

        expect(file).toBe('en/index.html');
    });

    it('writes the home page of the default language as the site index', () => {
        const file = pageFile('');

        expect(file).toBe('index.html');
    });
});

describe('fillTemplate', () => {
    it('writes the language, the head and the markup into the template', () => {
        const page = { html: '<h1>Knight</h1>', head: buildPageHead(pageHeadInput()) };

        const document = fillTemplate(TEMPLATE, page);

        expect(document).toContain('<html lang="en">');
        expect(document).toContain('<title>Knight counters, stats and cost | AoE2 Counterforge</title>');
        expect(document).toContain('<div id="root"><h1>Knight</h1></div>');
    });

    it('copies markup holding replacement patterns as it is', () => {
        const page = { html: '<p>$& $1</p>', head: buildPageHead(pageHeadInput()) };

        const document = fillTemplate(TEMPLATE, page);

        expect(document).toContain('<p>$& $1</p>');
    });

    it('refuses a template that lost a marker', () => {
        const page = { html: '', head: buildPageHead(pageHeadInput()) };

        const fill = () => fillTemplate('<html lang="pt-BR"><head></head></html>', page);

        expect(fill).toThrow(/page-head/);
    });
});

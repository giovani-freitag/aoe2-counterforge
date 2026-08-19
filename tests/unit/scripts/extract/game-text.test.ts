import { describe, expect, it } from 'vitest';
import {
    cleanText,
    parseCivilizationHelp,
    parseUnitHelp,
    slug,
    splitMatchupSentences,
} from '../../../../scripts/extract/game-text.ts';

/** The Militia help text exactly as the game stores it, newlines already resolved. */
const MILITIA_HELP = [
    'Create <b>Militia<b> (<cost>)',
    'All-purpose Infantry. Strong vs. buildings, Infantry, Scout Cavalry- and Skirmisher-line. Weak vs. Ranged Soldiers at long range.',
    '<GREY><i>Upgrades: attack, armor (Blacksmith); speed, pierce armor, to Man-at-Arms (Barracks).<i><DEFAULT>',
    '<hp> <attack> <armor> <piercearmor> <range>',
].join('\n');

const BRITONS_HELP = [
    'Foot Archer civilization',
    '',
    '• Shepherds work +25% faster',
    '• Town Centers cost -50% wood starting in the Castle Age',
    '',
    '<b>Unique Unit:<b> ',
    'Longbowman (Foot Archer)',
    '',
    '<b>Team Bonus: <b> ',
    'Archery Ranges work +10% faster',
].join('\n');

describe('slug', () => {
    it('strips accents so the identifier stays plain', () => {
        expect(slug('Milícia')).toBe('milicia');
    });

    it('joins words with a single hyphen', () => {
        expect(slug('Elite Skirmisher')).toBe('elite-skirmisher');
    });

    it('drops the markup the game mixes into some names', () => {
        expect(slug('<b>Champion<b>')).toBe('champion');
    });
});

describe('cleanText', () => {
    it('removes markup and placeholders alike', () => {
        expect(cleanText('Create <b>Militia<b> (<cost>)')).toBe('Create Militia ()');
    });

    it('collapses runs of whitespace', () => {
        expect(cleanText('Foot   Archer\t civilization')).toBe('Foot Archer civilization');
    });
});

describe('splitMatchupSentences', () => {
    it('keeps the abbreviation attached to the classes it introduces', () => {
        const result = splitMatchupSentences('All-purpose Infantry. Strong vs. Infantry and Archers.');

        expect(result.strongVs).toBe('Strong vs. Infantry and Archers.');
    });

    it('separates the role from both verdicts', () => {
        const result = splitMatchupSentences(
            'All-purpose Infantry. Strong vs. buildings. Weak vs. Ranged Soldiers at long range.',
        );

        expect([result.role, result.strongVs, result.weakVs]).toEqual([
            'All-purpose Infantry.',
            'Strong vs. buildings.',
            'Weak vs. Ranged Soldiers at long range.',
        ]);
    });

    it('recognises the Portuguese verdict wording', () => {
        const result = splitMatchupSentences(
            'Infantaria de uso geral. Forte contra construções. Fraco contra Soldados de Longo Alcance.',
        );

        expect([result.strongVs, result.weakVs]).toEqual([
            'Forte contra construções.',
            'Fraco contra Soldados de Longo Alcance.',
        ]);
    });

    it('leaves both verdicts empty for a unit that has none', () => {
        const result = splitMatchupSentences('Collects resources.');

        expect([result.strongVs, result.weakVs]).toEqual(['', '']);
    });
});

describe('parseUnitHelp', () => {
    it('drops the opening line that only repeats the name and cost', () => {
        expect(parseUnitHelp(MILITIA_HELP).role).toBe('All-purpose Infantry.');
    });

    it('takes the upgrade hint from the italic line', () => {
        expect(parseUnitHelp(MILITIA_HELP).upgradesHint).toBe(
            'Upgrades: attack, armor (Blacksmith); speed, pierce armor, to Man-at-Arms (Barracks).',
        );
    });

    it('splits both verdicts out of the description', () => {
        const help = parseUnitHelp(MILITIA_HELP);

        expect([help.strongVs, help.weakVs]).toEqual([
            'Strong vs. buildings, Infantry, Scout Cavalry- and Skirmisher-line.',
            'Weak vs. Ranged Soldiers at long range.',
        ]);
    });

    it('returns empty fields for a unit with no help text', () => {
        expect(parseUnitHelp('')).toEqual({ role: '', strongVs: '', weakVs: '', upgradesHint: '' });
    });
});

describe('parseCivilizationHelp', () => {
    it('takes the first line as the civilization summary', () => {
        expect(parseCivilizationHelp(BRITONS_HELP).intro).toBe('Foot Archer civilization');
    });

    it('collects the bullet points that precede the first heading', () => {
        expect(parseCivilizationHelp(BRITONS_HELP).bonuses).toEqual([
            'Shepherds work +25% faster',
            'Town Centers cost -50% wood starting in the Castle Age',
        ]);
    });

    it('groups the entries under the heading that introduces them', () => {
        const sections = parseCivilizationHelp(BRITONS_HELP).sections;

        expect(sections).toEqual([
            { title: 'Unique Unit', items: ['Longbowman (Foot Archer)'] },
            { title: 'Team Bonus', items: ['Archery Ranges work +10% faster'] },
        ]);
    });
});

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const MARKUP = /<[^>]*>/g;

/**
 * A sentence ends at a period followed by a capital letter, unless that period closes "vs.".
 *
 * Without the exception the English "Strong vs. Infantry" would be cut in two and the verdict
 * would lose the classes it introduces.
 */
const SENTENCE_BREAK = /(?<=\.)(?<!\bvs\.)\s+(?=[A-ZÀ-Þ])/;

/** Sentence openers the game uses to introduce a matchup verdict, per shipped locale. */
const MATCHUP_MARKERS = {
    strong: /^(strong|forte|forts?)\b/i,
    weak: /^(weak|fraco|fraca)\b/i,
};

export interface UnitHelp {
    role: string;
    strongVs: string;
    weakVs: string;
    upgradesHint: string;
}

export interface CivilizationSection {
    title: string;
    items: string[];
}

export interface CivilizationHelp {
    intro: string;
    bonuses: string[];
    sections: CivilizationSection[];
}

/**
 * Turns a name into the stable identifier the application keys everything on.
 *
 * @param value - Display name in any language.
 * @returns A lowercase, accent-free, hyphenated slug.
 */
export function slug(value: string): string {
    return value
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .replace(MARKUP, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Strips the game's markup and collapses whitespace.
 *
 * @param value - Raw string straight from the game's string table.
 * @returns Plain readable text.
 */
export function cleanText(value: string): string {
    return value.replace(MARKUP, '').replace(/\s+/g, ' ').trim();
}

/**
 * Splits a help blob into the sentences the interface shows separately.
 *
 * The first line only repeats the unit name and its cost placeholder, and the last one is a row
 * of stat placeholders, so both are dropped. The line carrying the italic marker is the upgrade
 * hint the game writes for every unit.
 *
 * @param raw - Raw help string, still carrying markup and escaped newlines.
 * @returns The role sentence, both matchup verdicts and the upgrade hint.
 */
export function parseUnitHelp(raw: string): UnitHelp {
    const lines = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    let description = '';
    let upgradesHint = '';

    for (const [index, line] of lines.entries()) {
        const text = cleanText(line);
        if (!text) continue;
        if (line.includes('<i>')) {
            upgradesHint = text;
            continue;
        }
        if (index === 0) continue;
        if (!description) description = text;
    }

    return { ...splitMatchupSentences(description), upgradesHint };
}

/**
 * Pulls the designer-written matchup verdicts out of a unit description.
 *
 * @param description - The plain description sentence block.
 * @returns The role text plus each verdict sentence, empty when the unit has none.
 */
export function splitMatchupSentences(description: string): Omit<UnitHelp, 'upgradesHint'> {
    const sentences = description
        .split(SENTENCE_BREAK)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

    const role: string[] = [];
    let strongVs = '';
    let weakVs = '';

    for (const sentence of sentences) {
        if (MATCHUP_MARKERS.strong.test(sentence)) strongVs = sentence;
        else if (MATCHUP_MARKERS.weak.test(sentence)) weakVs = sentence;
        else role.push(sentence);
    }

    return { role: role.join(' '), strongVs, weakVs };
}

/**
 * Splits a civilization help blob into its intro, its plain bonuses and its titled sections.
 *
 * Sections are recognised by the bold marker rather than by their wording, which is what keeps
 * this working in every language the game ships.
 *
 * @param raw - Raw help string, still carrying markup and escaped newlines.
 * @returns The civilization summary in structured form.
 */
export function parseCivilizationHelp(raw: string): CivilizationHelp {
    const lines = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const result: CivilizationHelp = { intro: '', bonuses: [], sections: [] };
    let current: CivilizationSection | null = null;

    for (const line of lines) {
        const isHeading = line.includes('<b>');
        const text = cleanText(line);
        if (!text) continue;

        if (isHeading) {
            const [title, ...rest] = text.split(':');
            current = { title: title.trim(), items: [] };
            result.sections.push(current);

            const inline = rest.join(':').trim();
            if (inline) current.items.push(inline);
            continue;
        }

        const item = text.replace(/^[•·-]\s*/, '').trim();
        if (!item) continue;

        if (current) current.items.push(item);
        else if (!result.intro) result.intro = item;
        else result.bonuses.push(item);
    }

    return result;
}

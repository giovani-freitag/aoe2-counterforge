import { normalize, type FuzzyMatcher } from './fuzzy-matcher.ts';
import type { SearchDocument, SearchIndexBuilder, SearchKind } from './search-index-builder.ts';

export interface SearchServiceConfig {
    indexBuilder: SearchIndexBuilder;
    matcher: FuzzyMatcher;
}

export interface SearchQuery {
    text: string;
    locale: string;
    kinds?: readonly SearchKind[];
    civ?: string | null;
    limit?: number;
}

export interface SearchHit {
    document: SearchDocument;
    score: number;
    positions: readonly number[];
}

export interface SearchOutcome {
    hits: SearchHit[];
    /** Civilization inferred from the query, so the interface can show it as an active filter. */
    civScope: SearchDocument | null;
}

const DEFAULT_LIMIT = 12;
const MIN_CIV_TOKEN = 3;
const KEYWORD_PENALTY = 0.55;
const KIND_ORDER: Record<SearchKind, number> = { unit: 0, civilization: 1, technology: 2 };

/** Ranks the catalog against a free-text query, including "unit + civilization" phrasing. */
export class SearchService {
    private readonly config: SearchServiceConfig;
    private readonly indices = new Map<string, SearchDocument[]>();

    constructor(config: SearchServiceConfig) {
        this.config = config;
    }

    /**
     * Ranks documents against a typed query.
     *
     * @param query - Raw text plus the locale and any active filters.
     * @returns The best hits and the civilization the query narrowed itself to, if any.
     */
    public search(query: SearchQuery): SearchOutcome {
        const documents = this.documents(query.locale);
        const tokens = normalize(query.text).split(/\s+/).filter(Boolean);
        const scope = this.civScopeFrom(documents, tokens, query.civ ?? null);
        const terms = tokens.filter((token) => token !== scope.token);
        const limit = query.limit ?? DEFAULT_LIMIT;

        const pool = documents
            .filter((document) => !query.kinds || query.kinds.includes(document.kind))
            .filter((document) => !scope.civ || document.civs.includes(scope.civ.key) || document.id === scope.civ.id);

        const hits = terms.length === 0 ? this.defaultHits(pool, scope.civ) : this.rank(pool, terms);

        return { civScope: scope.civ, hits: hits.slice(0, limit) };
    }

    /**
     * The indexed documents for a locale, built on first use and cached afterwards.
     *
     * @param locale - Locale to index.
     * @returns Every searchable document.
     */
    public documents(locale: string): SearchDocument[] {
        const cached = this.indices.get(locale);
        if (cached) return cached;

        const built = this.config.indexBuilder.build(locale);
        this.indices.set(locale, built);

        return built;
    }

    private rank(pool: readonly SearchDocument[], terms: readonly string[]): SearchHit[] {
        const hits: SearchHit[] = [];

        for (const document of pool) {
            let total = 0;
            let positions: readonly number[] = [];
            let matchedAll = true;

            for (const term of terms) {
                const onTitle = this.config.matcher.match(term, document.normalizedTitle);
                const onKeyword = onTitle ? null : this.bestKeywordScore(document, term);
                const score = onTitle?.score ?? onKeyword;

                if (score === null || score === undefined) {
                    matchedAll = false;
                    break;
                }

                total += score;
                if (onTitle && positions.length === 0) positions = onTitle.positions;
            }

            if (matchedAll) hits.push({ document, positions, score: total * document.weight });
        }

        return hits.sort(
            (left, right) =>
                right.score - left.score ||
                KIND_ORDER[left.document.kind] - KIND_ORDER[right.document.kind] ||
                left.document.title.localeCompare(right.document.title),
        );
    }

    private bestKeywordScore(document: SearchDocument, term: string): number | null {
        let best: number | null = null;
        for (const keyword of document.keywords) {
            const match = this.config.matcher.match(term, keyword);
            if (match && (best === null || match.score > best)) best = match.score;
        }

        return best === null ? null : best * KEYWORD_PENALTY;
    }

    private defaultHits(pool: readonly SearchDocument[], civ: SearchDocument | null): SearchHit[] {
        return pool
            .filter((document) => (civ ? document.id !== civ.id : true))
            .map((document) => ({ document, score: document.weight, positions: [] }))
            .sort(
                (left, right) =>
                    KIND_ORDER[left.document.kind] - KIND_ORDER[right.document.kind] ||
                    right.score - left.score ||
                    left.document.title.localeCompare(right.document.title),
            );
    }

    /**
     * Finds the civilization a multi-word query is scoped to.
     *
     * A single word is never treated as a filter, otherwise typing a civilization name would hide
     * the civilization itself behind its own roster.
     */
    private civScopeFrom(
        documents: readonly SearchDocument[],
        tokens: readonly string[],
        explicit: string | null,
    ): { civ: SearchDocument | null; token: string | null } {
        if (explicit) {
            const forced = documents.find((document) => document.kind === 'civilization' && document.key === explicit);
            if (forced) return { civ: forced, token: null };
        }

        if (tokens.length < 2) return { civ: null, token: null };

        for (const token of tokens) {
            if (token.length < MIN_CIV_TOKEN) continue;

            const civ = documents.find(
                (document) =>
                    document.kind === 'civilization' &&
                    (document.normalizedTitle.startsWith(token) ||
                        document.keywords.some((keyword) => keyword.startsWith(token))),
            );
            if (civ) return { civ, token };
        }

        return { civ: null, token: null };
    }
}

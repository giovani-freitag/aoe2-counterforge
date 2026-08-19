import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { SearchDocument, SearchKind } from '../../services/search/search-index-builder.ts';
import { useCommandPalette } from '../hooks/use-command-palette.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useUnitSearch } from '../hooks/use-unit-search.ts';
import { GameIcon } from './game-icon.tsx';
import { Icon } from './icon.tsx';

const GROUP_ORDER: readonly SearchKind[] = ['unit', 'civilization', 'technology'];

const ROUTE_PREFIX: Record<SearchKind, string> = {
    unit: '/unit/',
    civilization: '/civ/',
    technology: '/tech/',
};

/**
 * Wraps the matched characters of a title so the reason for a hit is visible.
 *
 * Consecutive characters are grouped into one element on purpose: a span per letter makes
 * assistive technology read the name out one character at a time.
 */
function highlight(title: string, positions: readonly number[]): ReactNode {
    if (positions.length === 0) return title;

    const marked = new Set(positions);
    const runs: { text: string; isMatch: boolean }[] = [];

    for (const [index, character] of [...title].entries()) {
        const isMatch = marked.has(index);
        const last = runs.at(-1);
        if (last && last.isMatch === isMatch) last.text += character;
        else runs.push({ text: character, isMatch });
    }

    return runs.map((run, index) =>
        run.isMatch ? <mark key={index}>{run.text}</mark> : <span key={index}>{run.text}</span>,
    );
}

/** The dialog itself, mounted only while the palette is open so its state starts clean. */
function PaletteDialog({ close }: { close: () => void }) {
    const { t } = useTranslation();
    const { preferences } = usePreferences();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    const outcome = useUnitSearch(query, preferences.civ);

    const groups = useMemo(
        () =>
            GROUP_ORDER.map((kind) => ({
                kind,
                items: outcome.hits.filter((hit) => hit.document.kind === kind),
            })).filter((group) => group.items.length > 0),
        [outcome.hits],
    );
    const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
    const active = Math.min(activeIndex, Math.max(0, flat.length - 1));

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const go = (document: SearchDocument) => {
        close();
        void navigate(`${ROUTE_PREFIX[document.kind]}${document.key}`);
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex(flat.length === 0 ? 0 : (active + 1) % flat.length);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(flat.length === 0 ? 0 : (active - 1 + flat.length) % flat.length);
            return;
        }
        if (event.key === 'Enter' && flat[active]) {
            event.preventDefault();
            go(flat[active].document);
        }
    };

    return (
        <div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label={t('search.open')}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <div className="palette__panel" onKeyDown={onKeyDown}>
                <div className="palette__header">
                    <Icon name="search" />
                    <input
                        ref={inputRef}
                        className="palette__input"
                        type="search"
                        value={query}
                        placeholder={t('search.placeholder')}
                        aria-label={t('search.placeholder')}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                    />
                    <button type="button" className="palette__close" onClick={close}>
                        {t('common.close')}
                    </button>
                </div>

                {outcome.civScope ? (
                    <div className="palette__scope">
                        <GameIcon path={outcome.civScope.icon} alt="" size="sm" className="icon--civ" />
                        {outcome.civScope.title}
                    </div>
                ) : null}

                <div className="palette__results">
                    {flat.length === 0 ? (
                        <p className="empty">{query ? t('search.empty', { query }) : t('search.hint')}</p>
                    ) : (
                        groups.map((group) => (
                            <div key={group.kind}>
                                <div className="palette__group section-label">{t(`search.groups.${group.kind}`)}</div>
                                {group.items.map((hit) => {
                                    const index = flat.indexOf(hit);
                                    const subtitle = [
                                        hit.document.categoryKey ? t(`categories.${hit.document.categoryKey}`) : '',
                                        hit.document.subtitle,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ');

                                    return (
                                        <button
                                            key={hit.document.id}
                                            type="button"
                                            className="palette__item"
                                            data-active={index === active}
                                            onMouseMove={() => { setActiveIndex(index); }}
                                            onClick={() => { go(hit.document); }}
                                            ref={(node) => {
                                                if (index === active) node?.scrollIntoView({ block: 'nearest' });
                                            }}
                                        >
                                            <GameIcon
                                                path={hit.document.icon}
                                                alt=""
                                                className={
                                                    hit.document.kind === 'civilization' ? 'icon--civ' : undefined
                                                }
                                            />
                                            <span className="list-item__body">
                                                <span className="list-item__title">
                                                    {highlight(hit.document.title, hit.positions)}
                                                </span>
                                                <span className="list-item__subtitle">{subtitle}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                <div className="palette__footer">
                    <span>
                        <kbd>↑</kbd> <kbd>↓</kbd> {t('search.keys.navigate')}
                    </span>
                    <span>
                        <kbd>↵</kbd> {t('search.keys.select')}
                    </span>
                    <span>
                        <kbd>esc</kbd> {t('search.keys.close')}
                    </span>
                </div>
            </div>
        </div>
    );
}

/** The global search overlay, opened with Ctrl+K or the header button. */
export function CommandPalette() {
    const { isOpen, close } = useCommandPalette();

    return isOpen ? <PaletteDialog close={close} /> : null;
}

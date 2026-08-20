import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FuzzyMatcher, normalize } from '../../services/search/fuzzy-matcher.ts';
import { useListbox } from '../hooks/use-listbox.ts';
import { Icon } from './icon.tsx';

export interface PickerOption {
    value: string;
    label: string;
    /** Drawn before the label, in the button and in the list. */
    visual?: ReactNode;
}

export interface PickerProps {
    label: string;
    value: string;
    options: readonly PickerOption[];
    onChange: (value: string) => void;
    /** Hides the label text in the button, leaving only the visual. */
    compact?: boolean;
    /** Names the filter inside the button, for a picker that stands outside a form field. */
    prefix?: string;
    /** Fills the width of a form field, the way a plain select does. */
    block?: boolean;
    /** Ties the button to a label written next to it. */
    id?: string;
    align?: 'start' | 'end';
}

/** How close to the window edge an open list is allowed to come, in pixels. */
const EDGE_MARGIN = 8;

/** Above this many entries, scanning the list stops working and typing takes over. */
const SEARCH_FROM = 10;

/** The same scoring the command palette uses, so "brt" finds the Britons here too. */
const matcher = new FuzzyMatcher();

/** A single-choice list that can carry a flag, an emblem or an icon beside each entry. */
export function Picker({ label, value, options, onChange, compact, prefix, block, id, align = 'end' }: PickerProps) {
    const { t } = useTranslation();
    const [term, setTerm] = useState('');
    const container = useRef<HTMLDivElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const [shift, setShift] = useState(0);
    const search = useRef<HTMLInputElement>(null);
    const searchable = options.length > SEARCH_FROM;

    const visible = useMemo(() => {
        const fragment = normalize(term.trim());
        if (!fragment) return options;

        return options
            .map((option) => ({ option, match: matcher.match(fragment, normalize(option.label)) }))
            .filter((entry) => entry.match !== null)
            .sort((left, right) => (right.match?.score ?? 0) - (left.match?.score ?? 0))
            .map((entry) => entry.option);
    }, [options, term]);

    const current = options.find((option) => option.value === value) ?? options[0];
    const list = useListbox({
        container,
        count: visible.length,
        selected: Math.max(
            0,
            visible.findIndex((option) => option.value === value),
        ),
        onPick: (index) => {
            const picked = visible[index];
            if (picked) onChange(picked.value);
            setTerm('');
        },
    });

    useEffect(() => {
        if (list.isOpen) search.current?.focus();
    }, [list.isOpen]);

    // A list anchored to a small button can hang off the screen, so it slides back into it.
    useLayoutEffect(() => {
        if (!list.isOpen || !popup.current) {
            setShift(0);

            return;
        }

        const rect = popup.current.getBoundingClientRect();
        const past = rect.right - (window.innerWidth - EDGE_MARGIN);
        const before = EDGE_MARGIN - rect.left;

        if (past > 0) setShift(-past);
        else if (before > 0) setShift(before);
        else setShift(0);
    }, [list.isOpen]);

    return (
        <div
            className={['picker', block ? 'picker--block' : '', prefix === undefined ? '' : 'picker--labelled']
                .filter(Boolean)
                .join(' ')}
            ref={container}
            onKeyDown={list.onKeyDown}
        >
            <button
                id={id}
                type="button"
                className="picker__button"
                aria-haspopup="listbox"
                aria-expanded={list.isOpen}
                aria-label={compact || prefix !== undefined ? `${label}: ${current.label}` : undefined}
                onClick={() => {
                    setTerm('');
                    list.toggle();
                }}
            >
                {current.visual}
                {prefix === undefined ? null : <span className="picker__prefix">{prefix}</span>}
                {compact ? null : <span className="picker__value">{current.label}</span>}
                <Icon name="down" className="picker__caret" />
            </button>

            {list.isOpen ? (
                <div
                    ref={popup}
                    className="picker__popup"
                    data-align={block ? 'start' : align}
                    style={shift === 0 ? undefined : { transform: `translateX(${String(shift)}px)` }}
                >
                    {searchable ? (
                        <input
                            ref={search}
                            type="search"
                            className="picker__search"
                            value={term}
                            placeholder={t('common.filter')}
                            aria-label={label}
                            onChange={(event) => {
                                setTerm(event.target.value);
                            }}
                        />
                    ) : null}

                    {visible.length === 0 ? (
                        <p className="picker__empty">{t('common.noMatch')}</p>
                    ) : (
                        <ul className="picker__list" role="listbox" aria-label={label}>
                            {visible.map((option, index) => (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={option.value === value}
                                        className="picker__option"
                                        data-active={index === list.active || undefined}
                                        onClick={() => {
                                            list.pick(index);
                                        }}
                                    >
                                        {option.visual}
                                        {option.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}

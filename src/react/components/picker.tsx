import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { normalize } from '../../services/search/fuzzy-matcher.ts';
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
    align?: 'start' | 'end';
}

/** Above this many entries, scanning the list stops working and typing takes over. */
const SEARCH_FROM = 10;

/** A single-choice list that can carry a flag, an emblem or an icon beside each entry. */
export function Picker({ label, value, options, onChange, compact, align = 'end' }: PickerProps) {
    const { t } = useTranslation();
    const [term, setTerm] = useState('');
    const container = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const searchable = options.length > SEARCH_FROM;

    const visible = useMemo(() => {
        const fragment = normalize(term.trim());

        return fragment ? options.filter((option) => normalize(option.label).includes(fragment)) : options;
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

    return (
        <div className="picker" ref={container} onKeyDown={list.onKeyDown}>
            <button
                type="button"
                className="picker__button"
                aria-haspopup="listbox"
                aria-expanded={list.isOpen}
                aria-label={compact ? `${label}: ${current.label}` : undefined}
                onClick={() => {
                    setTerm('');
                    list.toggle();
                }}
            >
                {current.visual}
                {compact ? null : <span className="picker__value">{current.label}</span>}
                <Icon name="next" className="picker__caret" />
            </button>

            {list.isOpen ? (
                <div className="picker__popup" data-align={align}>
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

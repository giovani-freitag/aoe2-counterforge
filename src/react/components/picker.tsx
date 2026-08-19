import { useRef, type ReactNode } from 'react';
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

/** A single-choice list that can carry a flag, an emblem or an icon beside each entry. */
export function Picker({ label, value, options, onChange, compact, align = 'end' }: PickerProps) {
    const selected = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );
    const container = useRef<HTMLDivElement>(null);
    const list = useListbox({
        container,
        count: options.length,
        selected,
        onPick: (index) => {
            onChange(options[index].value);
        },
    });

    const current = options[selected];

    return (
        <div className="picker" ref={container} onKeyDown={list.onKeyDown}>
            <button
                type="button"
                className="picker__button"
                aria-haspopup="listbox"
                aria-expanded={list.isOpen}
                aria-label={compact ? `${label}: ${current.label}` : undefined}
                onClick={list.toggle}
            >
                {current.visual}
                {compact ? null : <span className="picker__value">{current.label}</span>}
                <Icon name="next" className="picker__caret" />
            </button>

            {list.isOpen ? (
                <ul className="picker__list" role="listbox" aria-label={label} data-align={align}>
                    {options.map((option, index) => (
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
            ) : null}
        </div>
    );
}

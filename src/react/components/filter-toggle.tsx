import type { ReactNode } from 'react';

export interface FilterToggleProps {
    label: string;
    active: boolean;
    onChange: (active: boolean) => void;
    /** A glyph before the label, for a switch worth spotting in the row. */
    icon?: ReactNode;
}

/** A filter that is either on or off, shaped like the pickers it sits beside. */
export function FilterToggle({ label, active, onChange, icon }: FilterToggleProps) {
    return (
        <button
            type="button"
            className="chip"
            aria-pressed={active}
            onClick={() => {
                onChange(!active);
            }}
        >
            {icon}
            {label}
        </button>
    );
}

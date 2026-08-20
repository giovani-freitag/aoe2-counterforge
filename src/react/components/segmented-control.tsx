export interface SegmentedOption<T extends string> {
    value: T;
    label: string;
    /** How many rows the segment holds, when knowing that before tapping is the point. */
    count?: number;
    /** Tints the segment once chosen, for a switch whose sides mean good and bad. */
    tone?: 'good' | 'bad';
}

export interface SegmentedControlProps<T extends string> {
    label: string;
    value: T;
    options: readonly SegmentedOption<T>[];
    onChange: (value: T) => void;
}

/** A compact two or three way switch used for the simulation toggles. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) {
    return (
        <div className="segmented" role="group" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className="segmented__option"
                    aria-pressed={option.value === value}
                    data-tone={option.tone}
                    onClick={() => { onChange(option.value); }}
                >
                    {option.label}
                    {option.count === undefined ? null : (
                        <span className="segmented__count">{option.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

export interface SearchFieldProps {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    /** Leaves the label to assistive technology, for a row too tight to spell it out. */
    hideLabel?: boolean;
}

/** The name filter every catalogue page opens with. */
export function SearchField({ id, label, placeholder, value, onChange, hideLabel = false }: SearchFieldProps) {
    return (
        <div className="field">
            <label className={hideLabel ? 'visually-hidden' : 'field__label'} htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                type="search"
                className="input"
                value={value}
                placeholder={placeholder}
                onChange={(event) => {
                    onChange(event.target.value);
                }}
            />
        </div>
    );
}

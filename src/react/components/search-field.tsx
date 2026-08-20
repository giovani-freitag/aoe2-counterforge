export interface SearchFieldProps {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}

/** The name filter every catalogue page opens with. */
export function SearchField({ id, label, placeholder, value, onChange }: SearchFieldProps) {
    return (
        <div className="field">
            <label className="field__label" htmlFor={id}>
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

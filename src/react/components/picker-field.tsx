import { Picker, type PickerOption } from './picker.tsx';

export interface PickerFieldProps {
    id: string;
    label: string;
    value: string;
    options: readonly PickerOption[];
    onChange: (value: string) => void;
}

/** A labelled choice, sized like the input beside it. */
export function PickerField({ id, label, value, options, onChange }: PickerFieldProps) {
    return (
        <div className="field">
            <label className="field__label" htmlFor={id}>
                {label}
            </label>
            <Picker id={id} block label={label} value={value} options={options} onChange={onChange} />
        </div>
    );
}

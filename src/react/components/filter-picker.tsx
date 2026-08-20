import { Picker, type PickerOption } from './picker.tsx';

export interface FilterPickerProps {
    label: string;
    value: string;
    options: readonly PickerOption[];
    onChange: (value: string) => void;
}

/** A choice that narrows a list, carrying its own name so it can stand in a row of them. */
export function FilterPicker({ label, value, options, onChange }: FilterPickerProps) {
    return <Picker prefix={label} label={label} value={value} options={options} onChange={onChange} />;
}

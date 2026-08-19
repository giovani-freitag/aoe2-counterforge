export interface StepperProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}

/** A plus and minus control for small whole numbers. */
export function Stepper({ label, value, min, max, onChange }: StepperProps) {
    return (
        <div className="stepper" role="group" aria-label={label}>
            <button
                type="button"
                className="stepper__button"
                onClick={() => { onChange(Math.max(min, value - 1)); }}
                disabled={value <= min}
                aria-label={`${label} -1`}
            >
                -
            </button>
            <output className="stepper__value">{value}</output>
            <button
                type="button"
                className="stepper__button"
                onClick={() => { onChange(Math.min(max, value + 1)); }}
                disabled={value >= max}
                aria-label={`${label} +1`}
            >
                +
            </button>
        </div>
    );
}

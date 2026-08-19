import { useEffect, useState } from 'react';

/**
 * Trails a value by a fixed delay so keystrokes do not trigger a search each time.
 *
 * @param value - Value to follow.
 * @param delayMs - How long the value must stay still before it is published.
 * @returns The settled value.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [settled, setSettled] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => { setSettled(value); }, delayMs);

        return () => { window.clearTimeout(timer); };
    }, [value, delayMs]);

    return settled;
}

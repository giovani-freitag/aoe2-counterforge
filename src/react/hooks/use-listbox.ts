import { useCallback, useEffect, useState, type KeyboardEvent, type RefObject } from 'react';

export interface ListboxOptions {
    /** The element that holds the button and the popup, so a click outside can close it. */
    container: RefObject<HTMLElement | null>;
    /** How many entries the list holds, so the keys can wrap around it. */
    count: number;
    /** Where the highlight starts when the list opens. */
    selected: number;
    onPick: (index: number) => void;
}

export interface Listbox {
    isOpen: boolean;
    active: number;
    toggle: () => void;
    close: () => void;
    pick: (index: number) => void;
    onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Keyboard and focus behaviour of a single-choice list.
 *
 * @param options - Size of the list, the current choice, and what to do with a new one.
 * @returns The state the markup needs and the handlers to spread on it.
 */
export function useListbox(options: ListboxOptions): Listbox {
    const [isOpen, setIsOpen] = useState(false);
    const [active, setActive] = useState(options.selected);

    const close = useCallback(() => {
        setIsOpen(false);
    }, []);

    const toggle = useCallback(() => {
        setActive(options.selected);
        setIsOpen((open) => !open);
    }, [options.selected]);

    const pick = useCallback(
        (index: number) => {
            options.onPick(index);
            setIsOpen(false);
        },
        [options],
    );

    useEffect(() => {
        if (!isOpen) return;

        const onPointerDown = (event: PointerEvent) => {
            if (!options.container.current?.contains(event.target as Node)) setIsOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [isOpen, options.container]);

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            const step = (delta: number) => {
                event.preventDefault();
                setIsOpen(true);
                setActive((current) => (current + delta + options.count) % options.count);
            };

            if (event.key === 'ArrowDown') { step(1); return; }
            if (event.key === 'ArrowUp') { step(-1); return; }

            if (event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                setActive(event.key === 'Home' ? 0 : options.count - 1);

                return;
            }

            if (event.key === 'Escape') {
                setIsOpen(false);

                return;
            }

            if (isOpen && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                pick(active);
            }
        },
        [active, isOpen, options.count, pick],
    );

    return { isOpen, active, toggle, close, pick, onKeyDown };
}

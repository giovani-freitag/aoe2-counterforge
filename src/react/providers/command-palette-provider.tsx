import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CommandPaletteContext, type CommandPaletteStore } from './command-palette-context.ts';

function isShortcut(event: KeyboardEvent): boolean {
    return (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
}

export interface CommandPaletteProviderProps {
    children: ReactNode;
}

/** Owns the open state of the search overlay and the keyboard shortcut that summons it. */
export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => { setIsOpen(true); }, []);
    const close = useCallback(() => { setIsOpen(false); }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!isShortcut(event)) return;

            event.preventDefault();
            setIsOpen((current) => !current);
        };

        window.addEventListener('keydown', onKeyDown);

        return () => { window.removeEventListener('keydown', onKeyDown); };
    }, []);

    const store = useMemo<CommandPaletteStore>(() => ({ isOpen, open, close }), [isOpen, open, close]);

    return <CommandPaletteContext value={store}>{children}</CommandPaletteContext>;
}

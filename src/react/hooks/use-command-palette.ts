import { useContext } from 'react';
import { CommandPaletteContext, type CommandPaletteStore } from '../providers/command-palette-context.ts';

/**
 * Controls the global search overlay.
 *
 * @returns Whether the palette is open plus the open and close actions.
 * @throws Error when called outside of the command palette provider.
 */
export function useCommandPalette(): CommandPaletteStore {
    const store = useContext(CommandPaletteContext);
    if (!store) throw new Error('useCommandPalette must be used inside <CommandPaletteProvider>.');

    return store;
}

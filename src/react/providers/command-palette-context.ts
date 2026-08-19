import { createContext } from 'react';

export interface CommandPaletteStore {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export const CommandPaletteContext = createContext<CommandPaletteStore | null>(null);

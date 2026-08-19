import { createContext } from 'react';
import type { AppServices } from '../../composition-root.ts';

export const ServicesContext = createContext<AppServices | null>(null);

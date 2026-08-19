import { useMemo, type ReactNode } from 'react';
import { createServices } from '../../composition-root.ts';
import { ServicesContext } from './services-context.ts';

export interface ServicesProviderProps {
    children: ReactNode;
}

/** Builds the service graph once and hands it to the tree below. */
export function ServicesProvider({ children }: ServicesProviderProps) {
    const services = useMemo(() => createServices(), []);

    return <ServicesContext value={services}>{children}</ServicesContext>;
}

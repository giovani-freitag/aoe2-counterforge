import { useContext } from 'react';
import type { AppServices } from '../../composition-root.ts';
import { ServicesContext } from '../providers/services-context.ts';

/**
 * Reads the wired service graph.
 *
 * @returns Every application service.
 * @throws Error when called outside of the services provider.
 */
export function useServices(): AppServices {
    const services = useContext(ServicesContext);
    if (!services) throw new Error('useServices must be used inside <ServicesProvider>.');

    return services;
}

import { useEffect } from 'react';
import { Specular } from '../effects/specular.ts';

/**
 * Lights the metal surfaces of the page under the pointer.
 *
 * @param selector - Which surfaces take the reflection.
 */
export function useSpecular(selector: string): void {
    useEffect(() => {
        if (!matchMedia('(pointer: fine)').matches) return;

        const specular = new Specular({ selector, root: document });
        specular.start();

        return () => {
            specular.stop();
        };
    }, [selector]);
}

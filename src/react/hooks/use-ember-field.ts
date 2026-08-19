import { useEffect, useRef, type RefObject } from 'react';
import { EmberField } from '../effects/ember-field.ts';

export interface EmberFieldOptions {
    density?: number;
    wind?: number;
    /** Keeps new embers inside one part of the canvas, such as the open tab. */
    column?: () => { from: number; width: number };
}

/**
 * Runs an ember field on a canvas for as long as it is on screen.
 *
 * @param options - Density, wind, and where new embers are allowed to appear.
 * @returns The ref to attach to the canvas.
 */
export function useEmberField(options: EmberFieldOptions = {}): RefObject<HTMLCanvasElement | null> {
    const canvas = useRef<HTMLCanvasElement>(null);
    const latest = useRef(options);
    latest.current = options;

    useEffect(() => {
        const element = canvas.current;
        if (!element) return;
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        // A browser without a 2d context simply goes without the embers.
        if (!element.getContext('2d')) return;

        const field = new EmberField({
            canvas: element,
            get density() {
                return latest.current.density;
            },
            get wind() {
                return latest.current.wind;
            },
            column: latest.current.column,
            isLight: () => {
                const chosen = document.documentElement.dataset.theme;

                return chosen === 'light' || (chosen === undefined && !matchMedia('(prefers-color-scheme: dark)').matches);
            },
        });

        let visible = true;
        let frame = requestAnimationFrame(function loop() {
            if (visible) field.step();
            frame = requestAnimationFrame(loop);
        });

        const measure = () => {
            field.measure();
        };
        const watcher = new IntersectionObserver((entries) => {
            for (const entry of entries) visible = entry.isIntersecting;
            if (!visible) field.clear();
        });
        const resizer = new ResizeObserver(measure);

        watcher.observe(element);
        resizer.observe(element);

        return () => {
            cancelAnimationFrame(frame);
            watcher.disconnect();
            resizer.disconnect();
        };
    }, []);

    return canvas;
}

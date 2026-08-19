export interface SpecularConfig {
    /** Surfaces the reflection is allowed to land on. */
    selector: string;
    root: Document;
}

/** Where the highlight rests when the pointer is nowhere near the plate. */
const PARKED = '-60%';

/**
 * Moves a highlight across metal, following the pointer.
 *
 * The plate itself is styled in CSS; this only keeps two custom properties up to date, so a page
 * with no pointer at all costs nothing.
 */
export class Specular {
    private readonly config: SpecularConfig;
    private readonly track: (event: PointerEvent) => void;
    private lit: HTMLElement | null = null;
    private frame = 0;

    constructor(config: SpecularConfig) {
        this.config = config;
        this.track = (event) => {
            cancelAnimationFrame(this.frame);
            this.frame = requestAnimationFrame(() => {
                this.move(event);
            });
        };
    }

    /** Starts following the pointer. */
    public start(): void {
        this.config.root.addEventListener('pointermove', this.track, { passive: true });
    }

    /** Stops following it and parks the highlight. */
    public stop(): void {
        cancelAnimationFrame(this.frame);
        this.config.root.removeEventListener('pointermove', this.track);
        this.park();
    }

    private move(event: PointerEvent): void {
        const target = event.target instanceof Element ? event.target.closest(this.config.selector) : null;

        if (!(target instanceof HTMLElement)) {
            this.park();

            return;
        }

        if (target !== this.lit) this.park();
        this.lit = target;

        const box = target.getBoundingClientRect();
        target.style.setProperty('--sx', `${(((event.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
        target.style.setProperty('--sy', `${(((event.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
    }

    private park(): void {
        this.lit?.style.setProperty('--sy', PARKED);
        this.lit = null;
    }
}

/**
 * jsdom implements neither scrolling API the interface relies on, so both are stubbed here
 * rather than guarded in production code.
 */
if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = function scrollIntoView() {
        return undefined;
    };
}

if (typeof window !== 'undefined') {
    window.scrollTo = () => undefined;
}

/** jsdom ships no media query engine, and the interface asks it about motion and theme. */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) =>
        ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => false,
        }) as MediaQueryList;
}

/** Neither does it draw, so the decorative canvases stay switched off in tests. */
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = () => null;
}

/**
 * jsdom lays nothing out, and a virtualized list asks the layout how tall its window is.
 *
 * Without an answer every list mounts zero rows, which would leave the interface tests unable to
 * see a single row of anything the app shows. Only the scrolling window is given a size; the rows
 * keep whatever jsdom reports, so the virtualizer settles on showing all of them.
 */
const TEST_VIEWPORT_HEIGHT = 800;

if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'function') {
    window.ResizeObserver = class {
        private readonly callback: ResizeObserverCallback;

        constructor(callback: ResizeObserverCallback) {
            this.callback = callback;
        }

        public observe(target: Element): void {
            this.callback([{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry], this);
        }

        public unobserve(): void {
            return undefined;
        }

        public disconnect(): void {
            return undefined;
        }
    };
}

if (typeof HTMLElement !== 'undefined') {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get(this: HTMLElement) {
            return this.classList.contains('virtual') ? TEST_VIEWPORT_HEIGHT : 0;
        },
    });
}

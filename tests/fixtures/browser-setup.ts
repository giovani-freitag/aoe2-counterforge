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

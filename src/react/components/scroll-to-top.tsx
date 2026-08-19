import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Puts every navigation back at the top, the way a native app behaves. */
export function ScrollToTop() {
    const { pathname } = useLocation();

    // A concise body would hand React whatever scrollTo returns, and React calls that on cleanup.
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [pathname]);

    return null;
}

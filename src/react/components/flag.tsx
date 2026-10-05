import type { ReactNode } from 'react';
import type { SupportedLocale } from '../../i18n/index.ts';

export interface FlagProps {
    locale: SupportedLocale;
}

/** Each flag reduced to the few shapes that still read at the size of an icon. */
const FLAGS: Record<SupportedLocale, ReactNode> = {
    'pt-BR': (
        <>
            <rect width="24" height="24" fill="#1d9c4a" />
            <path d="M12 3.4 22 12l-10 8.6L2 12z" fill="#f4d31c" />
            <circle cx="12" cy="12" r="4.1" fill="#1c3d8f" />
            <path d="M7.9 11.2c2.8-1 5.5-1 8.2.4" stroke="#fff" strokeWidth="1.1" fill="none" />
        </>
    ),
    en: (
        <>
            <rect width="24" height="24" fill="#f4f6f8" />
            <g fill="#b22234">
                <rect y="0" width="24" height="1.85" />
                <rect y="3.7" width="24" height="1.85" />
                <rect y="7.4" width="24" height="1.85" />
                <rect y="11.1" width="24" height="1.85" />
                <rect y="14.8" width="24" height="1.85" />
                <rect y="18.5" width="24" height="1.85" />
                <rect y="22.2" width="24" height="1.8" />
            </g>
            <rect width="11" height="9.25" fill="#3c3b6e" />
            <g fill="#fff">
                <circle cx="2.2" cy="2" r="0.7" />
                <circle cx="5.5" cy="2" r="0.7" />
                <circle cx="8.8" cy="2" r="0.7" />
                <circle cx="3.85" cy="4.6" r="0.7" />
                <circle cx="7.15" cy="4.6" r="0.7" />
                <circle cx="2.2" cy="7.2" r="0.7" />
                <circle cx="5.5" cy="7.2" r="0.7" />
                <circle cx="8.8" cy="7.2" r="0.7" />
            </g>
        </>
    ),
    es: (
        <>
            <rect width="24" height="24" fill="#c60b1e" />
            <rect y="6" width="24" height="12" fill="#ffc400" />
        </>
    ),
    it: (
        <>
            <rect width="8" height="24" fill="#009246" />
            <rect x="8" width="8" height="24" fill="#f4f6f8" />
            <rect x="16" width="8" height="24" fill="#ce2b37" />
        </>
    ),
};

/**
 * The flag of the language, cut into a disc.
 *
 * Drawn rather than fetched: a few small shapes weigh nothing and never fall back to a system
 * emoji that changes with the operating system.
 */
export function Flag({ locale }: FlagProps) {
    return (
        <svg className="flag" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <defs>
                <clipPath id={`flag-disc-${locale}`}>
                    <circle cx="12" cy="12" r="11" />
                </clipPath>
            </defs>
            <g clipPath={`url(#flag-disc-${locale})`}>{FLAGS[locale]}</g>
            <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        </svg>
    );
}

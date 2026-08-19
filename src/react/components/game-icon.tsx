import { useState } from 'react';
import { iconUrl } from '../format.ts';

export interface GameIconProps {
    path: string | null;
    alt: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZE_CLASS = { sm: 'icon icon--sm', md: 'icon', lg: 'icon icon--lg' };

/** Renders a game icon, degrading to an empty tile when the sprite is missing. */
export function GameIcon({ path, alt, size = 'md', className }: GameIconProps) {
    const [failed, setFailed] = useState(false);
    const classes = [SIZE_CLASS[size], className].filter(Boolean).join(' ');

    if (!path || failed) return <span className={classes} aria-hidden="true" />;

    return (
        <img
            className={classes}
            src={iconUrl(path)}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => { setFailed(true); }}
        />
    );
}

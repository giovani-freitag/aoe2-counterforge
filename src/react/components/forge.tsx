import { type CSSProperties, type ReactNode } from 'react';
import { iconUrl } from '../format.ts';
import { EmberCanvas } from './ember-canvas.tsx';

export interface ForgeProps {
    /** The portrait that stands in the slot, already sized and framed by its own component. */
    portrait: ReactNode;
    name: string;
    /** One line naming what the subject is and where it comes from. */
    subtitle: string;
    /** The age whose shield hangs in the corner, or null for a subject that has no age. */
    age?: number | null;
    /** Anything between the subtitle and the badges, such as an upgrade line. */
    children?: ReactNode;
    /** Badges describing availability, shown under everything else. */
    meta?: ReactNode;
}

/** The head of a detail page: the portrait on the anvil, with the embers of the forge behind it. */
export function Forge({ portrait, name, subtitle, age = null, children, meta }: ForgeProps) {
    const style = {
        '--slot': `url(${iconUrl('ui/slot.png')})`,
        ...(age === null ? {} : { '--shield': `url(${iconUrl(`ui/age-${String(age)}.png`)})` }),
    } as CSSProperties;

    return (
        <div className="forge" style={style}>
            <EmberCanvas className="forge__embers" />
            <span className="forge__floor" aria-hidden="true" />

            <div className="forge__body">
                <span className="slot">{portrait}</span>

                <div className="forge__title">
                    <h1 className="forge__name">{name}</h1>
                    <p className="forge__sub">{subtitle}</p>

                    {children}

                    {meta === undefined ? null : <div className="forge__meta">{meta}</div>}
                </div>

                {age === null ? null : <span className="forge__shield" aria-hidden="true" />}
            </div>
        </div>
    );
}

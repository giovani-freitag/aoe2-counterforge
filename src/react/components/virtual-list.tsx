import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, type ReactNode } from 'react';

export interface VirtualListProps<T> {
    items: readonly T[];
    /** Height one row takes before it is measured, in pixels. */
    estimate: number;
    keyOf: (item: T) => string;
    children: (item: T) => ReactNode;
}

/**
 * Renders only the rows the viewport can show.
 *
 * The unit roster is two hundred rows deep and every one of them carries an image; mounting all
 * of them costs a visible pause on a phone, and the reader only ever sees a handful.
 */
export function VirtualList<T>({ items, estimate, keyOf, children }: VirtualListProps<T>) {
    const scroller = useRef<HTMLDivElement>(null);

    const virtual = useVirtualizer({
        count: items.length,
        getScrollElement: () => scroller.current,
        estimateSize: () => estimate,
        overscan: 6,
        gap: 8,
    });

    return (
        <div className="virtual" ref={scroller}>
            <div className="virtual__runway" style={{ height: `${String(virtual.getTotalSize())}px` }}>
                {virtual.getVirtualItems().map((row) => (
                    <div
                        className="virtual__row"
                        key={keyOf(items[row.index])}
                        data-index={row.index}
                        ref={virtual.measureElement}
                        style={{ transform: `translateY(${String(row.start)}px)` }}
                    >
                        {children(items[row.index])}
                    </div>
                ))}
            </div>
        </div>
    );
}

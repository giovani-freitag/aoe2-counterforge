import type { ReactNode } from 'react';
import { VirtualList } from './virtual-list.tsx';

export interface DirectoryProps<T> {
    title: string;
    /** One line under the title, usually how many rows the filters left. */
    summary: string;
    /** A way out of the list, such as the tool that works on what it holds. */
    action?: ReactNode;
    /** The name filter every list opens with, full width and label hidden. */
    search: ReactNode;
    /** The choices and switches that narrow the list further, laid out as a row of chips. */
    filters?: ReactNode;
    items: readonly T[];
    keyOf: (item: T) => string;
    /** Height a row takes before it is measured, in pixels. */
    estimate?: number;
    /** What to say when the filters leave nothing. */
    empty: string;
    children: (item: T) => ReactNode;
}

const DEFAULT_ROW_HEIGHT = 64;

/**
 * The shape every catalogue page takes: a title, the filters, and the rows they leave.
 *
 * Units, technologies and civilizations all answer the same kind of question, so they get the
 * same skeleton rather than three that drift apart. Only the row belongs to the page.
 */
export function Directory<T>({
    title,
    summary,
    action,
    search,
    filters,
    items,
    keyOf,
    estimate = DEFAULT_ROW_HEIGHT,
    empty,
    children,
}: DirectoryProps<T>) {
    return (
        <div className="stack">
            <header className="directory__head">
                <div className="stack stack--tight">
                    <h1>{title}</h1>
                    <p className="card__hint">{summary}</p>
                </div>
                {action}
            </header>

            <section className="card">
                {search}
                {filters ? <div className="filter-chips">{filters}</div> : null}
            </section>

            {items.length === 0 ? (
                <p className="empty">{empty}</p>
            ) : (
                <VirtualList items={items} estimate={estimate} keyOf={keyOf}>
                    {children}
                </VirtualList>
            )}
        </div>
    );
}

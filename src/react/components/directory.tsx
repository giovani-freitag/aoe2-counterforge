import type { ReactNode } from 'react';
import { VirtualList } from './virtual-list.tsx';

export interface DirectoryProps<T> {
    title: string;
    /** One line under the title, usually how many rows the filters left. */
    summary: string;
    /** A way out of the list, such as the tool that works on what it holds. */
    action?: ReactNode;
    /** Controls that narrow the list, laid out across the filter card. */
    filters: ReactNode;
    /** Switches under the filters, for the pages that have any. */
    switches?: ReactNode;
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
    filters,
    switches,
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
                <div className="form-grid">{filters}</div>
                {switches ? (
                    <>
                        <hr className="divider" />
                        <div className="toggle-list">{switches}</div>
                    </>
                ) : null}
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

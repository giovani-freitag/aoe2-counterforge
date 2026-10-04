import { createContext } from 'react';
import type { PageHead } from '../page-head.ts';

/** Receives the head of the page being written ahead of time; absent in a live browser. */
export type PageHeadRecorder = (head: PageHead) => void;

export const PageHeadContext = createContext<PageHeadRecorder | null>(null);

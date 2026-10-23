/**
 * The tracks CONTEXT OBJECTS, in a file that changes only when they do.
 * Why apart from the reducer (TracksContext.tsx): Vite re-executes an
 * edited module and everything that imports it; React Refresh then
 * re-mounts any component whose custom hooks changed identity. With the
 * contexts and the hooks beside the reducer, a reducer edit gave every
 * consumer a new `useTracks`, re-mounted the editor and wiped the
 * project (2026-10-23: a touch of TracksContext.tsx took four tracks to
 * none). Here, and in useTracks.ts, they are untouched by a reducer
 * edit — the provider re-renders with its state kept.
 */
import { createContext } from 'react';
import type { TracksState, TracksAction } from './TracksContext';

export const TracksStateContext = createContext<TracksState | undefined>(undefined);
export const TracksDispatchContext = createContext<React.Dispatch<TracksAction> | undefined>(undefined);

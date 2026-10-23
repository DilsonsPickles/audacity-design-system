/**
 * The tracks PROVIDER, in a file that exports only a component: Vite's
 * Fast Refresh swaps a component module in place and keeps its state,
 * but a module with any other export (the reducer, initialState, the
 * hooks — TracksContext.tsx) is invalidated and re-executed on every hot
 * update, which gave the provider a new identity and re-mounted the
 * whole editor, wiping the project (2026-10-23: a touch of
 * TracksContext.tsx took four tracks to none). Now an edit to the
 * reducer re-renders this provider with its state kept.
 */
import { useReducer, type ReactNode } from 'react';
import { tracksReducer, initialState, type Track } from './TracksContext';
import { TracksStateContext, TracksDispatchContext } from './tracksContextObjects';

interface TracksProviderProps {
  children: ReactNode;
  initialTracks?: Track[];
}

export function TracksProvider({ children, initialTracks = [] }: TracksProviderProps) {
  const [state, dispatch] = useReducer(tracksReducer, {
    ...initialState,
    tracks: initialTracks,
  });

  return (
    <TracksStateContext.Provider value={state}>
      <TracksDispatchContext.Provider value={dispatch}>
        {children}
      </TracksDispatchContext.Provider>
    </TracksStateContext.Provider>
  );
}

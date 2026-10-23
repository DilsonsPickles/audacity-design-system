/**
 * The tracks HOOKS — see tracksContextObjects.ts for why they live
 * apart from the reducer: a component keeps its state across a hot
 * update only while its custom hooks keep their identity.
 */
import { useContext } from 'react';
import { TracksStateContext, TracksDispatchContext } from './tracksContextObjects';

export function useTracksState() {
  const context = useContext(TracksStateContext);
  if (context === undefined) {
    throw new Error('useTracksState must be used within a TracksProvider');
  }
  return context;
}

export function useTracksDispatch() {
  const context = useContext(TracksDispatchContext);
  if (context === undefined) {
    throw new Error('useTracksDispatch must be used within a TracksProvider');
  }
  return context;
}

// Convenience hook for using both state and dispatch
export function useTracks() {
  return {
    state: useTracksState(),
    dispatch: useTracksDispatch(),
  };
}

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { UsePlaybackControlsReturn } from '../hooks/usePlaybackControls';

export type PlaybackContextValue = UsePlaybackControlsReturn;

const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);

interface PlaybackProviderProps {
  value: PlaybackContextValue;
  children: ReactNode;
}

/**
 * Value-provider: does NOT call usePlaybackControls itself.
 * CanvasDemoContent calls the hook (because it needs App-local deps) and
 * passes the full return object as `value`.
 */
export function PlaybackProvider({ value, children }: PlaybackProviderProps) {
  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackContext);
  if (context === undefined) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
}

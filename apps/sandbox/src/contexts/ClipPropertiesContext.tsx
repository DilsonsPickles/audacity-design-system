/**
 * The Clip properties panel's state (user request 2026-10-02, built the
 * way the Macro manager's was): open or not, where it sits — docked
 * left / right / bottom, or its own OS window (the same triad as Macros;
 * first open lands in the RIGHT dock) — and which clip it was opened ON.
 *
 * The clip it SHOWS is resolved by the dock panel from the target and
 * the selection (utils/clipPropertiesTarget.ts): the target while it
 * exists, else the single selected clip, else nothing.
 */
import React, { createContext, useContext } from 'react';

export type ClipPropertiesSide = 'left' | 'right' | 'bottom' | 'window';

export interface ClipPropertiesTarget {
  trackIndex: number;
  clipId: number;
}

interface ClipPropertiesContextValue {
  isClipPropertiesOpen: boolean;
  setIsClipPropertiesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  clipPropertiesSide: ClipPropertiesSide;
  setClipPropertiesSide: React.Dispatch<React.SetStateAction<ClipPropertiesSide>>;
  /** The clip the panel was opened on (the context menu's), if any */
  clipPropertiesTarget: ClipPropertiesTarget | null;
  setClipPropertiesTarget: React.Dispatch<React.SetStateAction<ClipPropertiesTarget | null>>;
  /** Open the panel on a clip (the "Clip properties…" menu item) */
  openClipProperties: (target: ClipPropertiesTarget) => void;
}

const ClipPropertiesContext = createContext<ClipPropertiesContextValue | null>(null);

export function ClipPropertiesProvider({ children }: { children: React.ReactNode }) {
  const [isClipPropertiesOpen, setIsClipPropertiesOpen] = React.useState(false);
  const [clipPropertiesSide, setClipPropertiesSide] = React.useState<ClipPropertiesSide>('right');
  const [clipPropertiesTarget, setClipPropertiesTarget] = React.useState<ClipPropertiesTarget | null>(null);
  const openClipProperties = React.useCallback((target: ClipPropertiesTarget) => {
    setClipPropertiesTarget(target);
    setIsClipPropertiesOpen(true);
  }, []);

  const value = React.useMemo<ClipPropertiesContextValue>(() => ({
    isClipPropertiesOpen, setIsClipPropertiesOpen,
    clipPropertiesSide, setClipPropertiesSide,
    clipPropertiesTarget, setClipPropertiesTarget,
    openClipProperties,
  }), [isClipPropertiesOpen, clipPropertiesSide, clipPropertiesTarget, openClipProperties]);

  return <ClipPropertiesContext.Provider value={value}>{children}</ClipPropertiesContext.Provider>;
}

export function useClipProperties(): ClipPropertiesContextValue {
  const ctx = useContext(ClipPropertiesContext);
  if (!ctx) throw new Error('useClipProperties must be used within ClipPropertiesProvider');
  return ctx;
}

import { createContext, useContext, type ReactNode } from 'react';
import type { UseLoopRegionReturn } from '../hooks/useLoopRegion';

export type LoopRegionContextValue = UseLoopRegionReturn;

const LoopRegionContext = createContext<LoopRegionContextValue | undefined>(undefined);

/**
 * Value-provider: CanvasDemoContent calls useLoopRegion (its options need
 * App-local timeSelection/bpm/beatsPerMeasure) and passes the result here.
 */
export function LoopRegionProvider({ value, children }: { value: LoopRegionContextValue; children: ReactNode }) {
  return <LoopRegionContext.Provider value={value}>{children}</LoopRegionContext.Provider>;
}

export function useLoopRegionContext(): LoopRegionContextValue {
  const ctx = useContext(LoopRegionContext);
  if (!ctx) throw new Error('useLoopRegionContext must be used within LoopRegionProvider');
  return ctx;
}

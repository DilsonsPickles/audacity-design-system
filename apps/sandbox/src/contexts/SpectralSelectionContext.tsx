import { createContext, useContext, useState, ReactNode } from 'react';

export interface SpectralSelection {
  trackIndex: number;
  clipId?: number | string; // Optional - if undefined, selection can span multiple clips on the track
  startTime: number;
  endTime: number;
  minFrequency: number; // 0-1 (normalized)
  maxFrequency: number; // 0-1 (normalized)
  originChannel?: 'L' | 'R' | 'mono';
}

interface SpectralSelectionContextType {
  spectralSelection: SpectralSelection | null;
  setSpectralSelection: (selection: SpectralSelection | null) => void;
}

const SpectralSelectionContext = createContext<SpectralSelectionContextType | undefined>(undefined);

export function SpectralSelectionProvider({ children }: { children: ReactNode }) {
  const [spectralSelection, setSpectralSelection] = useState<SpectralSelection | null>(null);

  return (
    <SpectralSelectionContext.Provider value={{ spectralSelection, setSpectralSelection }}>
      {children}
    </SpectralSelectionContext.Provider>
  );
}

export function useSpectralSelection() {
  const context = useContext(SpectralSelectionContext);
  if (context === undefined) {
    throw new Error('useSpectralSelection must be used within a SpectralSelectionProvider');
  }
  return context;
}

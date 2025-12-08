/**
 * Shared types for spectral selection components
 */

export interface SpectralSelection {
  trackIndex: number;
  clipId: number | string;
  startTime: number;
  endTime: number;
  minFrequency: number; // 0-1 (normalized, 0 = bottom, 1 = top)
  maxFrequency: number; // 0-1 (normalized)
}

export interface Track {
  clips: Array<{
    id: number | string;
    start: number;
    duration: number;
  }>;
}

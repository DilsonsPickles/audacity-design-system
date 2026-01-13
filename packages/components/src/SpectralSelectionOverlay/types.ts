/**
 * Shared types for spectral selection components
 */

export interface SpectralSelection {
  trackIndex: number;
  clipId?: number | string; // Optional - if undefined, selection can span multiple clips on the track
  startTime: number;
  endTime: number;
  minFrequency: number; // 0-1 (normalized, 0 = bottom, 1 = top)
  maxFrequency: number; // 0-1 (normalized)
  originChannel?: 'L' | 'R' | 'mono'; // Which channel the selection was started in
}

export interface Track {
  clips: Array<{
    id: number | string;
    start: number;
    duration: number;
  }>;
}

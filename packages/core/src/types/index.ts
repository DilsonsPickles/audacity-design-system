/**
 * @audacity-ui/core - Core types for Audacity Design System
 */

export interface EnvelopePoint {
  time: number;
  db: number;
}

export interface Clip {
  id: number;
  name: string;
  startTime: number;
  duration: number;
  waveform: number[];
  envelopePoints: EnvelopePoint[];
  selected?: boolean;
}

export interface Track {
  id: number;
  name: string;
  clips: Clip[];
  height?: number; // Custom height for track (optional, defaults to TRACK_HEIGHT)
}

export interface DragState {
  clip: Clip;
  trackIndex: number;
  offsetX: number;
  initialX: number;
  initialTrackIndex: number;
}

export interface EnvelopeDragState {
  clip: Clip;
  pointIndex: number;
  trackIndex: number;
  clipX: number;
  clipWidth: number;
  clipY: number;
  clipHeight: number;
  startX: number;
  startY: number;
  deletedPoints: EnvelopePoint[];
  originalTime: number;
  isNewPoint?: boolean; // Track if this point was just created
  hiddenPointIndices: number[]; // Indices of points hidden because dragged point passed them
}

export interface TimeSelection {
  startTime: number;
  endTime: number;
}

export interface TimeSelectionDragState {
  startX: number;
  currentX: number;
  startTrackIndex: number;
}

/**
 * Configuration for time selection behavior
 */
export interface TimeSelectionConfig {
  /** Pixels per second - zoom level */
  pixelsPerSecond: number;
  /** Left padding before timeline starts (in pixels) */
  leftPadding: number;
  /** Array of tracks with height information */
  tracks: Track[];
  /** Default track height when not specified */
  defaultTrackHeight: number;
  /** Gap between tracks (in pixels) */
  trackGap: number;
  /** Initial gap above first track (in pixels) */
  initialGap: number;
}

export interface TrackResizeDragState {
  trackIndex: number; // Index of track being resized
  startY: number; // Initial Y position
  startHeight: number; // Initial height of the track
}

export interface EnvelopeSegmentDragState {
  clip: Clip;
  segmentStartIndex: number; // Index of the point at the start of the segment
  segmentEndIndex: number; // Index of the point at the end of the segment
  trackIndex: number;
  clipX: number;
  clipWidth: number;
  clipY: number;
  clipHeight: number;
  startY: number; // Initial Y position of mouse
  startDb1: number; // Initial dB of first point
  startDb2: number; // Initial dB of second point
}

/**
 * Theme colors for clip rendering
 */
export interface ClipTheme {
  // Clip colors
  clipBackground: string;
  clipBorder: string;
  clipHeaderBackground: string;
  clipHeaderText: string;

  // Waveform colors
  waveformColor: string;

  // Envelope colors
  envelopeLineColor: string;
  envelopeLineColorHover: string;
  envelopePointColor: string;
  envelopePointColorHover: string;
  envelopeFillColor: string;

  // Selection/overlay colors
  timeSelectionOverlay: string;
  automationOverlayActive: string;
  automationOverlayIdle: string;

  // Segment hover
  segmentHoverColor: string;
  segmentHoverOverlay: string;
}

import React from 'react';
import { CLIP_CONTENT_OFFSET, useTheme } from '@dilsonspickles/components';

export interface GridArgs {
  bpm: number;
  beatsPerMeasure: number;
  timeFormat: 'beats-measures' | 'minutes-seconds';
  pixelsPerSecond: number;
  width: number;
  clipContentOffset: number;
}

export function computeGrid(args: GridArgs): {
  gridLines: Array<{ x: number; tier: 'measure' | 'beat' | 'subdivision' }>;
  measureBands: Array<{ x: number; w: number }>;
} {
  const { bpm, beatsPerMeasure, timeFormat, pixelsPerSecond, width, clipContentOffset } = args;
  const lines: Array<{ x: number; tier: 'measure' | 'beat' | 'subdivision' }> = [];
  const bands: Array<{ x: number; w: number }> = [];
  const totalSeconds = width / pixelsPerSecond;

  if (timeFormat === 'beats-measures') {
    const secondsPerBeat = 60 / bpm;
    const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
    // Grid step: determined by zoom level, not snap subdivision
    // At low zoom show only measures, at high zoom show finer subdivisions
    const pixelsPerBeat = secondsPerBeat * pixelsPerSecond;
    let gridSubdivision: number;
    if (pixelsPerBeat < 20) {
      gridSubdivision = 1; // measures only
    } else if (pixelsPerBeat < 40) {
      gridSubdivision = beatsPerMeasure; // beats (quarter notes in 4/4)
    } else if (pixelsPerBeat < 80) {
      gridSubdivision = beatsPerMeasure * 2; // eighth notes
    } else if (pixelsPerBeat < 160) {
      gridSubdivision = beatsPerMeasure * 4; // sixteenth notes
    } else {
      gridSubdivision = beatsPerMeasure * 8; // thirty-second notes
    }
    const gridStep = secondsPerMeasure / gridSubdivision;
    const totalSteps = Math.ceil(totalSeconds / gridStep) + Math.ceil(secondsPerMeasure / gridStep);

    for (let i = 0; i <= totalSteps; i++) {
      const t = i * gridStep;
      const x = clipContentOffset + t * pixelsPerSecond;
      if (x > width) break;

      // Classify: is this time on a measure boundary, a beat boundary, or a subdivision?
      const beatIndex = t / secondsPerBeat;
      const isOnBeat = Math.abs(beatIndex - Math.round(beatIndex)) < 0.001;
      const measureIndex = t / secondsPerMeasure;
      const isOnMeasure = isOnBeat && Math.abs(measureIndex - Math.round(measureIndex)) < 0.001;

      const tier: 'measure' | 'beat' | 'subdivision' = isOnMeasure ? 'measure' : isOnBeat ? 'beat' : 'subdivision';
      lines.push({ x, tier });
    }

    // Alternating measure bands — every other measure gets a darker background
    const measureWidth = secondsPerMeasure * pixelsPerSecond;
    const totalMeasures = Math.ceil(totalSeconds / secondsPerMeasure) + 1;
    for (let m = 0; m < totalMeasures; m++) {
      if (m % 2 !== 0) continue; // even indices only (0-indexed), so measures 1,3,5,7… in 1-indexed
      const x = clipContentOffset + m * measureWidth;
      if (x > width) break;
      bands.push({ x, w: measureWidth });
    }
  } else {
    // minutes-seconds: use the exact same thresholds as TimelineRuler
    let majorInterval: number;
    if (pixelsPerSecond < 20) {
      majorInterval = 10;
    } else if (pixelsPerSecond < 50) {
      majorInterval = 5;
    } else if (pixelsPerSecond < 100) {
      majorInterval = 2;
    } else if (pixelsPerSecond < 200) {
      majorInterval = 1;
    } else {
      majorInterval = 0.5;
    }
    const minorInterval = majorInterval / 5;
    let t = 0;
    while (t <= totalSeconds + minorInterval) {
      const roundedT = Math.round(t / minorInterval) * minorInterval;
      const x = clipContentOffset + roundedT * pixelsPerSecond;
      if (x > width) break;
      const isMajor = Math.abs(roundedT % majorInterval) < 0.001;
      lines.push({ x, tier: isMajor ? 'measure' : 'beat' });
      t = Math.round((t + minorInterval) * 1000) / 1000;
    }
  }
  return { gridLines: lines, measureBands: bands };
}

export interface GridOverlayProps {
  bpm: number;
  beatsPerMeasure: number;
  timeFormat: 'beats-measures' | 'minutes-seconds';
  pixelsPerSecond: number;
  width: number;
  containerHeight: number;
  viewportHeight: number;
}

export function GridOverlay(props: GridOverlayProps) {
  const { theme } = useTheme();
  const { gridLines, measureBands } = React.useMemo(
    () => computeGrid({ ...props, clipContentOffset: CLIP_CONTENT_OFFSET }),
    // containerHeight/viewportHeight are intentionally excluded — they only
    // affect the SVG height (computed below), not computeGrid's output, so
    // recomputing the grid when they change would be wasted work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.bpm, props.beatsPerMeasure, props.timeFormat, props.pixelsPerSecond, props.width],
  );

  if (gridLines.length === 0 && measureBands.length === 0) return null;

  const gridHeight = Math.max(props.containerHeight, props.viewportHeight);
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${props.width}px`,
        height: `${gridHeight}px`,
        pointerEvents: 'none',
      }}
    >
      {/* Alternating measure bands (zebra striping) — rendered behind the grid
          lines. Placeholder fill for now; swap for a theme token when picked. */}
      {measureBands.map(({ x, w }) => (
        <rect
          key={`band-${x}`}
          x={x}
          y={0}
          width={w}
          height={gridHeight}
          fill="rgba(128, 128, 128, 0.06)"
        />
      ))}
      {gridLines.map(({ x, tier }) => (
        <line
          key={x}
          x1={x}
          y1={0}
          x2={x}
          y2={gridHeight}
          stroke={tier === 'measure' ? theme.stroke.grid.measure : tier === 'beat' ? theme.stroke.grid.major : theme.stroke.grid.minor}
          strokeWidth={tier === 'subdivision' ? 0.5 : 1}
        />
      ))}
    </svg>
  );
}

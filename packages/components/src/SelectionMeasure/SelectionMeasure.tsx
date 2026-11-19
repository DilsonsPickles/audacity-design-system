import React from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { CLIP_CONTENT_OFFSET } from '../constants';
import { formatSelectionParts, placeSelectionMeasure, type SelectionReadoutFormat } from '../utils/selectionReadout';

export interface SelectionMeasureProps {
  startTime: number;
  endTime: number;
  pixelsPerSecond: number;
  /** Content y of the bracket's top: just under the selection's lowest track */
  top: number;
  /** The view's horizontal scroll, px — the visible part of the content */
  visibleLeft: number;
  visibleWidth: number;
  /** The content x of time 0 (the clips' own offset) */
  leftOffset?: number;
  timeFormat?: SelectionReadoutFormat['format'];
  /** 'dimension' — the measuring bracket (D2, the default); 'line' — the
   *  edge times beside the length on one row, no bracket (D1 at rest, D3 while
   *  dragging: the edge in hand lit), to compare in Debug (2026-11-19) */
  variant?: 'dimension' | 'line';
  /** The edge being dragged — lit in the accent */
  activeEdge?: 'start' | 'end' | null;
  bpm?: number;
  beatsPerMeasure?: number;
  noteValue?: number;
}

/** The bracket's geometry, px from `top` */
const TICK_TOP = 2;
const TICK_HEIGHT = 13;
const LINE_Y = 8;
const PILL_HEIGHT = 17;
const TIME_TOP = 18;

/**
 * THE SELECTION MEASURE (2026-11-19, D2 of the mockups — "I like D2"): a
 * dimension line under the time selection, on the canvas in content
 * coordinates, as a drawing tool measures — a 1px line the selection's width
 * with a tick at each end, the LENGTH in a small pill on the line (kept over
 * the visible part of the selection), and each EDGE's time under its tick
 * (only when that tick is in view and there is room). No pointer events. It
 * replaced a label in the ruler ("It shouldn't be in the ruler").
 */
export function SelectionMeasure({ startTime, endTime, pixelsPerSecond, top, visibleLeft, visibleWidth, leftOffset = CLIP_CONTENT_OFFSET, timeFormat = 'minutes-seconds', bpm, beatsPerMeasure, noteValue, variant = 'dimension', activeEdge = null }: SelectionMeasureProps) {
  const { theme } = useTheme();
  const parts = formatSelectionParts(startTime, endTime, { format: timeFormat, bpm, beatsPerMeasure, noteValue });
  const pillRef = React.useRef<HTMLSpanElement>(null);
  const startRef = React.useRef<HTMLSpanElement>(null);
  const endRef = React.useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = React.useState({ pill: 0, start: 0, end: 0 });
  React.useLayoutEffect(() => {
    const next = { pill: pillRef.current?.offsetWidth ?? 0, start: startRef.current?.offsetWidth ?? 0, end: endRef.current?.offsetWidth ?? 0 };
    if (next.pill !== widths.pill || next.start !== widths.start || next.end !== widths.end) setWidths(next);
  });
  const a = Math.min(startTime, endTime);
  const b = Math.max(startTime, endTime);
  const startX = leftOffset + a * pixelsPerSecond;
  const endX = leftOffset + b * pixelsPerSecond;
  const place = b > a ? placeSelectionMeasure({
    startX, endX, visibleLeft, visibleRight: visibleLeft + visibleWidth,
    pillWidth: widths.pill, startWidth: widths.start, endWidth: widths.end,
  }) : null;
  const ink = theme.foreground.text.secondary;
  const pill: React.CSSProperties = {
    position: 'absolute', height: PILL_HEIGHT, display: 'inline-flex', alignItems: 'center', padding: '0 6px',
    boxSizing: 'border-box', borderRadius: 3, fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: theme.foreground.text.primary, background: theme.background.surface.elevated, border: `1px solid ${theme.border.default}`,
  };
  const time: React.CSSProperties = { position: 'absolute', fontSize: 11, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: ink };
  const hidden: React.CSSProperties = { visibility: 'hidden', left: 0, top: 0 };
  const line = variant === 'line';
  // In the one-line style every reading sits on one row, centred on the pill;
  // the edge in hand is a pill of its own in the accent
  const timeTop = line ? top + 2 + (PILL_HEIGHT - 13) / 2 : top + TIME_TOP;
  const pillTop = line ? top + 2 : top + LINE_Y - PILL_HEIGHT / 2;
  const edgeStyle = (edge: 'start' | 'end'): React.CSSProperties => (activeEdge === edge
    ? { ...pill, color: theme.foreground.text.primary, border: `1px solid ${theme.accent.primary}`, top: `${pillTop}px` }
    : { ...time, top: `${timeTop}px` });
  return (
    <>
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden' }}>
        <span ref={pillRef} style={{ ...pill, ...hidden }}>{parts.length}</span>
        <span ref={startRef} style={{ ...time, ...hidden }}>{parts.start}</span>
        <span ref={endRef} style={{ ...time, ...hidden }}>{parts.end}</span>
      </span>
      {place && (
        <div data-selection-measure="" aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 6 }}>
          {!line && (
            <>
              <div data-selection-line="" style={{ position: 'absolute', left: `${startX}px`, width: `${endX - startX}px`, top: `${top + LINE_Y}px`, height: 1, background: ink }} />
              <div data-selection-tick="" style={{ position: 'absolute', left: `${startX}px`, top: `${top + TICK_TOP}px`, width: 1, height: TICK_HEIGHT, background: ink }} />
              <div data-selection-tick="" style={{ position: 'absolute', left: `${endX - 1}px`, top: `${top + TICK_TOP}px`, width: 1, height: TICK_HEIGHT, background: ink }} />
            </>
          )}
          <span data-selection-length="" style={{ ...pill, left: `${place.pillLeft}px`, top: `${pillTop}px` }}>{parts.length}</span>
          {place.showStart && <span data-selection-start="" data-active={activeEdge === 'start' ? '' : undefined} style={{ ...edgeStyle('start'), left: `${startX - widths.start / 2}px` }}>{parts.start}</span>}
          {place.showEnd && <span data-selection-end="" data-active={activeEdge === 'end' ? '' : undefined} style={{ ...edgeStyle('end'), left: `${endX - widths.end / 2}px` }}>{parts.end}</span>}
        </div>
      )}
    </>
  );
}

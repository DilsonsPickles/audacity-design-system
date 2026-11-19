import React from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { CLIP_CONTENT_OFFSET } from '../constants';
import { formatSelectionReadout, placeSelectionReadout } from '../utils/selectionReadout';

export interface SelectionReadoutProps {
  startTime: number;
  endTime: number;
  pixelsPerSecond: number;
  scrollX: number;
  /** The ruler's visible width, px */
  viewportWidth: number;
  /** The ruler's height, px — the label sits in its bottom half */
  height: number;
  timeFormat?: 'minutes-seconds' | 'beats-measures';
  bpm?: number;
  beatsPerMeasure?: number;
  noteValue?: number;
}

/**
 * THE SELECTION READOUT (2026-11-19): the time selection's length and range
 * as a small label in the timeline ruler's bottom half — where the ruler
 * draws the selection — centred over it, live while it is drawn and for as
 * long as it exists; the length alone when the selection is narrower than
 * the full label. It takes no pointer events, so the ruler's clicks and drags
 * are untouched. Rendered by the host over the ruler's canvas, in a
 * positioned container (the ruler itself is a bare canvas).
 */
export function SelectionReadout({ startTime, endTime, pixelsPerSecond, scrollX, viewportWidth, height, timeFormat = 'minutes-seconds', bpm, beatsPerMeasure, noteValue }: SelectionReadoutProps) {
  const { theme } = useTheme();
  const text = formatSelectionReadout(startTime, endTime, { format: timeFormat, bpm, beatsPerMeasure, noteValue });
  const fullRef = React.useRef<HTMLSpanElement>(null);
  const shortRef = React.useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = React.useState({ full: 0, short: 0 });
  React.useLayoutEffect(() => {
    const full = fullRef.current?.offsetWidth ?? 0;
    const short = shortRef.current?.offsetWidth ?? 0;
    if (full !== widths.full || short !== widths.short) setWidths({ full, short });
  });
  if (Math.abs(endTime - startTime) <= 0) return null;
  const x = (t: number) => CLIP_CONTENT_OFFSET + t * pixelsPerSecond - scrollX;
  const fits = placeSelectionReadout({ startX: x(startTime), endX: x(endTime), labelWidth: widths.full, viewportWidth, fullWidth: widths.full });
  const full = fits?.full ?? false;
  const place = full ? fits : placeSelectionReadout({ startX: x(startTime), endX: x(endTime), labelWidth: widths.short, viewportWidth, fullWidth: widths.full });
  const pill: React.CSSProperties = {
    position: 'absolute',
    top: Math.floor(height / 2) + 2,
    height: Math.ceil(height / 2) - 4,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 6px',
    boxSizing: 'border-box',
    borderRadius: 3,
    fontSize: 11,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    color: theme.foreground.text.primary,
    background: theme.background.surface.elevated,
    border: `1px solid ${theme.border.default}`,
    pointerEvents: 'none',
    zIndex: 2,
  };
  const measure: React.CSSProperties = { ...pill, visibility: 'hidden', left: 0 };
  return (
    <>
      <span ref={fullRef} aria-hidden="true" style={measure}>{text.full}</span>
      <span ref={shortRef} aria-hidden="true" style={measure}>{text.short}</span>
      {place && (
        <span data-selection-readout="" role="status" aria-live="off" style={{ ...pill, left: place.left }}>
          {full ? text.full : text.short}
        </span>
      )}
    </>
  );
}

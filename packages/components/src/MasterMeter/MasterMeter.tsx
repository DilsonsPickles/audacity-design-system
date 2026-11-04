import React from 'react';
import { useTheme } from '../ThemeProvider';
import '../assets/fonts/musescore-icon.css';
import { meterPercent, meterDbFromPercent, meterTicks, DEFAULT_PLAYBACK_METER_LOOK, type PlaybackMeterLook } from '../utils/meterLook';
import './MasterMeter.css';

export interface MasterMeterProps {
  /** Current left channel level in dB (-60 to 0) */
  levelLeft?: number;
  /** Current right channel level in dB (-60 to 0) */
  levelRight?: number;
  /** Whether the left channel is clipping */
  clippedLeft?: boolean;
  /** Whether the right channel is clipping */
  clippedRight?: boolean;
  /** Recent peak level left in dB */
  recentPeakLeft?: number;
  /** Recent peak level right in dB */
  recentPeakRight?: number;
  /** Master volume (0 to 1, where 1 = 0dB) */
  volume?: number;
  /** Callback when volume slider changes */
  onVolumeChange?: (volume: number) => void;
  /**
   * Initial meter width in pixels. The component owns the live width state
   * (resize is built in), so this only seeds the initial value. Default 360.
   */
  defaultWidth?: number;
  /** Minimum meter width during resize. Default 160. */
  minWidth?: number;
  /**
   * Disable the resize grip + behavior entirely. Useful when the meter sits
   * in a layout that already controls its width externally.
   */
  resizable?: boolean;
  /**
   * Override the default drag handler. When provided the component will
   * forward the mousedown event instead of running its built-in drag loop —
   * the caller is then responsible for the full lifecycle.
   */
  onResizeMouseDown?: (event: React.MouseEvent) => void;
  /** Additional CSS class */
  className?: string;
  /** Accessible name of the meter group. Default "Master playback meter" */
  ariaLabel?: string;
  /** Accessible name of the level slider. Default "Master volume" */
  sliderAriaLabel?: string;
  /** The meter's LOOK (2026-11-04, the Playback meter flyout): style,
   *  type and dB range — `utils/meterLook.ts` */
  look?: PlaybackMeterLook;
}

/** Minimum scale width (px) per label density — keep labels from butting
 *  up: three, six-ish, a dozen (`meterTicks`) */
const DB_TICKS_MIN_WIDTHS = [0, 220, 440];

export const MasterMeter: React.FC<MasterMeterProps> = ({
  levelLeft = -60,
  levelRight = -60,
  clippedLeft = false,
  clippedRight = false,
  recentPeakLeft,
  recentPeakRight,
  volume = 1,
  onVolumeChange,
  defaultWidth = 360,
  minWidth = 160,
  resizable = true,
  onResizeMouseDown,
  className = '',
  ariaLabel = 'Master playback meter',
  sliderAriaLabel = 'Master volume',
  look = DEFAULT_PLAYBACK_METER_LOOK,
}) => {
  const { theme } = useTheme();
  const lookRef = React.useRef(look);
  lookRef.current = look;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const thumbRef = React.useRef<HTMLDivElement>(null);
  const scaleRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);
  const onVolumeChangeRef = React.useRef(onVolumeChange);
  onVolumeChangeRef.current = onVolumeChange;

  // The component owns its own width when resizable. Drag → grow into free
  // space within the nearest `.toolbar__content` (if any); window resize →
  // clamp back down if the container shrank.
  const [width, setWidth] = React.useState(defaultWidth);

  const handleResizeMouseDownInternal = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const root = rootRef.current;
    if (!root) return;
    const startX = e.clientX;
    const startWidth = root.getBoundingClientRect().width;
    const container = root.closest('.toolbar__content') as HTMLElement | null;
    const onMove = (ev: MouseEvent) => {
      const maxAvailable = container
        ? container.getBoundingClientRect().right - root.getBoundingClientRect().left
        : Infinity;
      const next = Math.max(
        minWidth,
        Math.min(maxAvailable, startWidth + (ev.clientX - startX)),
      );
      setWidth(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [minWidth]);

  // If the toolbar narrows past what fits, shrink the meter so it doesn't
  // get pushed onto a second row. We only clamp DOWN; growing back is left
  // to the user via the grip.
  React.useEffect(() => {
    if (!resizable) return;
    const root = rootRef.current;
    const container = root?.closest('.toolbar__content') as HTMLElement | null;
    if (!root || !container) return;
    const observer = new ResizeObserver(() => {
      const available = container.getBoundingClientRect().right - root.getBoundingClientRect().left;
      setWidth((current) => (current > available ? Math.max(minWidth, available) : current));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [resizable, minWidth]);

  const gripMouseDown = onResizeMouseDown ?? handleResizeMouseDownInternal;

  // Pick the densest tick tier that fits without crowding. The scale grows
  // with the meter, so wider meters unlock more labels.
  const [tierIndex, setTierIndex] = React.useState(1);
  React.useEffect(() => {
    const el = scaleRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      let next = 0;
      for (let i = DB_TICKS_MIN_WIDTHS.length - 1; i >= 0; i--) {
        if (width >= DB_TICKS_MIN_WIDTHS[i]) { next = i; break; }
      }
      setTierIndex(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const ticks = meterTicks(look, tierIndex as 0 | 1 | 2);

  const floor = -look.dbRange;
  const leftPercent = meterPercent(levelLeft, look);
  const rightPercent = meterPercent(levelRight, look);
  // The knob: linear volume → dB on this scale (0 at the floor)
  const thumbDb = volume <= 0 ? floor : Math.max(floor, 20 * Math.log10(volume));
  const thumbPercent = meterPercent(thumbDb, look);

  const peakLeftPercent = recentPeakLeft !== undefined ? meterPercent(recentPeakLeft, look) : undefined;
  const peakRightPercent = recentPeakRight !== undefined ? meterPercent(recentPeakRight, look) : undefined;
  const gradient = look.style === 'gradient';
  const rms = look.style === 'rms';

  const updateVolumeFromX = React.useCallback((clientX: number) => {
    if (!trackRef.current || !onVolumeChangeRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const db = meterDbFromPercent(percent, lookRef.current);
    onVolumeChangeRef.current(db <= -lookRef.current.dbRange ? 0 : Math.pow(10, db / 20));
  }, []);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = true;
      updateVolumeFromX(e.clientX);

      const handleMouseMove = (ev: MouseEvent) => {
        if (draggingRef.current) updateVolumeFromX(ev.clientX);
      };
      const handleMouseUp = () => {
        draggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    track.addEventListener('mousedown', handleMouseDown);
    return () => track.removeEventListener('mousedown', handleMouseDown);
  }, [updateVolumeFromX]);

  const style = {
    '--mm-bg': theme.background.control.meter.background,
    '--mm-fill': theme.background.control.meter.fill,
    '--mm-peak': theme.background.control.meter.peak,
    '--mm-clip': theme.semantic.error.background,
    '--mm-text': theme.foreground.text.primary,
    '--mm-thumb-bg': theme.background.control.slider.handle.background,
    '--mm-thumb-border': theme.background.control.slider.handle.border,
    ...(resizable ? { width: `${width}px` } : null),
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`master-meter ${className}`}
      style={style}
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        // The toolbar's roving tab-index lands here on the component as a
        // unit. Enter / Space "grabs" the slider so arrow keys then adjust
        // volume; Escape on the slider returns focus here.
        if (e.key === 'Enter' || e.key === ' ') {
          if (document.activeElement === rootRef.current && thumbRef.current) {
            e.preventDefault();
            thumbRef.current.focus();
          }
        }
      }}
    >
      <div className="master-meter__main">
      {/* Meter bars + slider track */}
      <div className="master-meter__row">
        <div
          ref={trackRef}
          className="master-meter__track"
        >
          {/* Left channel meter */}
          <div className={`master-meter__bar${gradient ? ' master-meter__bar--gradient' : ''}`}>
            {gradient ? (
              <div className="master-meter__cover" style={{ width: `${100 - leftPercent}%` }} />
            ) : (
              <div
                className="master-meter__fill"
                style={{ width: `${leftPercent}%` }}
              />
            )}
            {rms && peakLeftPercent !== undefined && peakLeftPercent > leftPercent && (
              <div className="master-meter__rms-peak" style={{ left: `${leftPercent}%`, width: `${peakLeftPercent - leftPercent}%` }} />
            )}
            {peakLeftPercent !== undefined && peakLeftPercent > 0 && (
              <div
                className="master-meter__peak-line"
                style={{ left: `${peakLeftPercent}%` }}
              />
            )}
          </div>

          {/* Right channel meter */}
          <div className={`master-meter__bar${gradient ? ' master-meter__bar--gradient' : ''}`}>
            {gradient ? (
              <div className="master-meter__cover" style={{ width: `${100 - rightPercent}%` }} />
            ) : (
              <div
                className="master-meter__fill"
                style={{ width: `${rightPercent}%` }}
              />
            )}
            {rms && peakRightPercent !== undefined && peakRightPercent > rightPercent && (
              <div className="master-meter__rms-peak" style={{ left: `${rightPercent}%`, width: `${peakRightPercent - rightPercent}%` }} />
            )}
            {peakRightPercent !== undefined && peakRightPercent > 0 && (
              <div
                className="master-meter__peak-line"
                style={{ left: `${peakRightPercent}%` }}
              />
            )}
          </div>

          {/* Volume thumb — only focusable programmatically (tabIndex -1)
              so it sits inside the outer role="group" wrapper without
              competing for tab order. Escape kicks focus back out. */}
          <div
            ref={thumbRef}
            className="master-meter__thumb"
            style={{ left: `${thumbPercent}%` }}
            role="slider"
            aria-label={sliderAriaLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                rootRef.current?.focus();
                return;
              }
              if (!onVolumeChange) return;
              e.stopPropagation();
              const step = e.shiftKey ? 0.1 : 0.02;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                onVolumeChange(Math.min(1, volume + step));
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                onVolumeChange(Math.max(0, volume - step));
              }
            }}
          />
        </div>

        {/* Clip indicators */}
        <div className="master-meter__clip-indicators">
          <div className={`master-meter__clip-dot ${clippedLeft ? 'master-meter__clip-dot--active' : ''}`} />
          <div className={`master-meter__clip-dot ${clippedRight ? 'master-meter__clip-dot--active' : ''}`} />
        </div>
      </div>

      {/* dB scale labels — flex `space-between` anchors the first label flush
          at the left edge and the last flush at the right, matching the bar
          coordinate system above. */}
      <div ref={scaleRef} className="master-meter__scale">
        {ticks.map((tick) => (
          <span key={tick.label} className="master-meter__tick-label">{tick.label}</span>
        ))}
      </div>
      </div>

      {/* Resize grip — sibling of the meter+scale column so it can stay
          centered against the full control rather than stretching the row.
          Uses the built-in drag handler unless the consumer overrides it. */}
      {resizable && (
      <span
        className="master-meter__resize-grip musescore-icon"
        aria-hidden="true"
        role="presentation"
        onMouseDown={gripMouseDown}
      >
        {'\uF347'}
      </span>
      )}
    </div>
  );
};

export default MasterMeter;

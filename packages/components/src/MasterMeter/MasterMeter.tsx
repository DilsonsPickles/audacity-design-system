import React from 'react';
import { useTheme } from '../ThemeProvider';
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
  /** Additional CSS class */
  className?: string;
}

/** dB tick marks to render */
const DB_TICKS = [-60, -54, -48, -42, -36, -30, -24, -18, -12, -6, 0];
const DB_MIN = -60;
const DB_MAX = 0;

/** Convert a dB value to a percentage position (0–100) */
function dbToPercent(db: number): number {
  const clamped = Math.max(DB_MIN, Math.min(DB_MAX, db));
  return ((clamped - DB_MIN) / (DB_MAX - DB_MIN)) * 100;
}

/** Convert a linear volume (0–1) to dB for thumb position */
function volumeToDb(volume: number): number {
  if (volume <= 0) return DB_MIN;
  return Math.max(DB_MIN, 20 * Math.log10(volume));
}

/** Convert dB to linear volume (0–1) */
function dbToVolume(db: number): number {
  if (db <= DB_MIN) return 0;
  return Math.pow(10, db / 20);
}

export const MasterMeter: React.FC<MasterMeterProps> = ({
  levelLeft = -60,
  levelRight = -60,
  clippedLeft = false,
  clippedRight = false,
  recentPeakLeft,
  recentPeakRight,
  volume = 1,
  onVolumeChange,
  className = '',
}) => {
  const { theme } = useTheme();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);
  const onVolumeChangeRef = React.useRef(onVolumeChange);
  onVolumeChangeRef.current = onVolumeChange;

  const leftPercent = dbToPercent(levelLeft);
  const rightPercent = dbToPercent(levelRight);
  const thumbDb = volumeToDb(volume);
  const thumbPercent = dbToPercent(thumbDb);

  const peakLeftPercent = recentPeakLeft !== undefined ? dbToPercent(recentPeakLeft) : undefined;
  const peakRightPercent = recentPeakRight !== undefined ? dbToPercent(recentPeakRight) : undefined;

  const updateVolumeFromX = React.useCallback((clientX: number) => {
    if (!trackRef.current || !onVolumeChangeRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const db = DB_MIN + (percent / 100) * (DB_MAX - DB_MIN);
    onVolumeChangeRef.current(dbToVolume(db));
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
  } as React.CSSProperties;

  return (
    <div className={`master-meter ${className}`} style={style}>
      {/* Meter bars + slider track */}
      <div className="master-meter__row">
        <div
          ref={trackRef}
          className="master-meter__track"
        >
          {/* Left channel meter */}
          <div className="master-meter__bar">
            <div
              className="master-meter__fill"
              style={{ width: `${leftPercent}%` }}
            />
            {peakLeftPercent !== undefined && peakLeftPercent > 0 && (
              <div
                className="master-meter__peak-line"
                style={{ left: `${peakLeftPercent}%` }}
              />
            )}
          </div>

          {/* Right channel meter */}
          <div className="master-meter__bar">
            <div
              className="master-meter__fill"
              style={{ width: `${rightPercent}%` }}
            />
            {peakRightPercent !== undefined && peakRightPercent > 0 && (
              <div
                className="master-meter__peak-line"
                style={{ left: `${peakRightPercent}%` }}
              />
            )}
          </div>

          {/* Volume thumb */}
          <div
            className="master-meter__thumb"
            style={{ left: `${thumbPercent}%` }}
            role="slider"
            aria-label="Master volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            tabIndex={0}
            onKeyDown={(e) => {
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

      {/* dB scale labels */}
      <div className="master-meter__scale">
        {DB_TICKS.map((db) => (
          <div
            key={db}
            className="master-meter__tick"
            style={{ left: `${dbToPercent(db)}%` }}
          >
            <span className="master-meter__tick-label">{db}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasterMeter;

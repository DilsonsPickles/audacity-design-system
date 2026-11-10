import React from 'react';
import { useTheme } from '../ThemeProvider';
import { ToolButton } from '../ToolButton';
import { meterPercent, meterDbFromPercent, meterTicks, DEFAULT_PLAYBACK_METER_LOOK, type PlaybackMeterLook } from '../utils/meterLook';
import './MasterMeterVertical.css';

export interface MasterMeterVerticalProps {
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
  /** Callback when the volume settings button is clicked */
  onSettingsClick?: () => void;
  /** Additional CSS class */
  className?: string;
  /** The button's glyph and name — 'volume' / "Playback volume settings"
   *  for the master, 'microphone' / "Microphone level" for the docked
   *  recording meter (2026-11-04) */
  icon?: 'volume' | 'microphone';
  settingsAriaLabel?: string;
  /** The knob's name (the master volume, or the input gain) */
  sliderAriaLabel?: string;
  /** The button's MENU (the recording dock's orientation menu, the playback
   *  dock's flyout): a click opens it under the button — with the button's
   *  rect, for a flyout to hang off — a right-click at the pointer */
  onSettingsMenu?: (x: number, y: number, buttonRect?: DOMRect) => void;
  /** The meter's LOOK (2026-11-04): style, type and dB range */
  look?: PlaybackMeterLook;
  /** The meter alone — no button at its head, no surface, border or
   *  padding: the form a toolbar in a side dock draws, its button the
   *  toolbar's own (2026-11-10, the meters in the dock system) */
  bare?: boolean;
}

/** Two unlabelled minor ticks between each pair of numeric ticks. */
const MINOR_TICKS_BETWEEN = 2;

export const MasterMeterVertical: React.FC<MasterMeterVerticalProps> = ({
  levelLeft = -60,
  levelRight = -60,
  clippedLeft = false,
  clippedRight = false,
  recentPeakLeft,
  recentPeakRight,
  volume = 1,
  onVolumeChange,
  onSettingsClick,
  className = '',
  icon = 'volume',
  settingsAriaLabel = 'Playback volume settings',
  sliderAriaLabel = 'Master volume',
  onSettingsMenu,
  look = DEFAULT_PLAYBACK_METER_LOOK,
  bare = false,
}) => {
  const { theme } = useTheme();
  const lookRef = React.useRef(look);
  lookRef.current = look;
  const trackRef = React.useRef<HTMLDivElement>(null);
  const settingsRef = React.useRef<HTMLSpanElement>(null);
  const draggingRef = React.useRef(false);
  const onVolumeChangeRef = React.useRef(onVolumeChange);
  onVolumeChangeRef.current = onVolumeChange;

  const floor = -look.dbRange;
  const leftFill = meterPercent(levelLeft, look);
  const rightFill = meterPercent(levelRight, look);
  const thumbDb = volume <= 0 ? floor : Math.max(floor, 20 * Math.log10(volume));
  const thumbY = 100 - meterPercent(thumbDb, look);
  const peakLeftY = recentPeakLeft !== undefined ? 100 - meterPercent(recentPeakLeft, look) : undefined;
  const peakRightY = recentPeakRight !== undefined ? 100 - meterPercent(recentPeakRight, look) : undefined;
  const gradient = look.style === 'gradient';
  const rms = look.style === 'rms';
  // The dense scale, top → bottom
  const ticks = meterTicks(look, 2).slice().reverse();

  const updateVolumeFromY = React.useCallback((clientY: number) => {
    if (!trackRef.current || !onVolumeChangeRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const yFromTop = clientY - rect.top;
    const percentFromTop = Math.max(0, Math.min(100, (yFromTop / rect.height) * 100));
    // Top of track = 0 dB, bottom = the floor, on the look's scale
    const db = meterDbFromPercent(100 - percentFromTop, lookRef.current);
    onVolumeChangeRef.current(db <= -lookRef.current.dbRange ? 0 : Math.pow(10, db / 20));
  }, []);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = true;
      updateVolumeFromY(e.clientY);

      const handleMouseMove = (ev: MouseEvent) => {
        if (draggingRef.current) updateVolumeFromY(ev.clientY);
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
  }, [updateVolumeFromY]);

  const style = {
    '--mmv-surface': theme.background.toolbar,
    '--mmv-border': theme.border.divider,
    '--mmv-bar-bg': theme.background.control.meter.background,
    '--mmv-bar-fill': theme.background.control.meter.fill,
    '--mmv-bar-peak': theme.background.control.meter.peak,
    '--mmv-clip': theme.semantic.error.background,
    '--mmv-text': theme.foreground.text.primary,
    '--mmv-thumb-bg': theme.background.control.slider.handle.background,
    '--mmv-thumb-border': theme.background.control.slider.handle.border,
  } as React.CSSProperties;

  return (
    <div className={`master-meter-vertical${bare ? ' master-meter-vertical--bare' : ''} ${className}`} style={style}>
      {!bare && <span
        ref={settingsRef}
        style={{ display: 'inline-flex' }}
        onContextMenu={onSettingsMenu ? (e) => { e.preventDefault(); onSettingsMenu(e.clientX, e.clientY); } : undefined}
      >
        <ToolButton
          icon={icon}
          ariaLabel={settingsAriaLabel}
          onClick={() => {
            onSettingsClick?.();
            if (onSettingsMenu && settingsRef.current) {
              const r = settingsRef.current.getBoundingClientRect();
              onSettingsMenu(r.left, r.bottom + 2, r);
            }
          }}
        />
      </span>}

      <div className="master-meter-vertical__meter-row">
        <div ref={trackRef} className="master-meter-vertical__bars" role="slider"
             aria-label={sliderAriaLabel}
             aria-valuemin={0}
             aria-valuemax={100}
             aria-valuenow={Math.round(volume * 100)}
             aria-orientation="vertical"
             tabIndex={0}
             onKeyDown={(e) => {
               if (!onVolumeChange) return;
               e.stopPropagation();
               const step = e.shiftKey ? 0.1 : 0.02;
               if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                 e.preventDefault();
                 onVolumeChange(Math.min(1, volume + step));
               } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                 e.preventDefault();
                 onVolumeChange(Math.max(0, volume - step));
               }
             }}
        >
          <div className={`master-meter-vertical__bar${gradient ? ' master-meter-vertical__bar--gradient' : ''}`}>
            {gradient ? (
              <div className="master-meter-vertical__cover" style={{ height: `${100 - leftFill}%` }} />
            ) : (
              <div
                className="master-meter-vertical__bar-fill"
                style={{ height: `${leftFill}%` }}
              />
            )}
            {rms && peakLeftY !== undefined && peakLeftY < 100 - leftFill && (
              <div className="master-meter-vertical__rms-peak" style={{ top: `${peakLeftY}%`, height: `${100 - leftFill - peakLeftY}%` }} />
            )}
            {peakLeftY !== undefined && peakLeftY < 100 && (
              <div
                className="master-meter-vertical__peak-line"
                style={{ top: `${peakLeftY}%` }}
              />
            )}
            {clippedLeft && <div className="master-meter-vertical__clip-cap" />}
          </div>
          <div className={`master-meter-vertical__bar${gradient ? ' master-meter-vertical__bar--gradient' : ''}`}>
            {gradient ? (
              <div className="master-meter-vertical__cover" style={{ height: `${100 - rightFill}%` }} />
            ) : (
              <div
                className="master-meter-vertical__bar-fill"
                style={{ height: `${rightFill}%` }}
              />
            )}
            {rms && peakRightY !== undefined && peakRightY < 100 - rightFill && (
              <div className="master-meter-vertical__rms-peak" style={{ top: `${peakRightY}%`, height: `${100 - rightFill - peakRightY}%` }} />
            )}
            {peakRightY !== undefined && peakRightY < 100 && (
              <div
                className="master-meter-vertical__peak-line"
                style={{ top: `${peakRightY}%` }}
              />
            )}
            {clippedRight && <div className="master-meter-vertical__clip-cap" />}
          </div>

          {/* Volume knob — anchored by its vertical center, positioned by dB. */}
          <div
            className="master-meter-vertical__thumb"
            style={{ top: `${thumbY}%` }}
          />
        </div>

        <div className="master-meter-vertical__scale" aria-hidden="true">
          {ticks.map((tick, idx) => (
            <React.Fragment key={tick.label}>
              <span className="master-meter-vertical__label">{tick.label}</span>
              {idx < ticks.length - 1 && (
                <>
                  {Array.from({ length: MINOR_TICKS_BETWEEN }).map((_, t) => (
                    <span key={t} className="master-meter-vertical__tick" />
                  ))}
                </>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MasterMeterVertical;

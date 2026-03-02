import React from 'react';
import { Icon } from '../Icon';
import { LabeledRadio } from '../LabeledRadio';
import { LabeledCheckbox } from '../LabeledCheckbox';
import { NumberStepper } from '../NumberStepper';
import { useTheme } from '../ThemeProvider';
import type { SpectrogramScale } from '../VerticalRuler/FrequencyRuler';
import './RulerFlyout.css';

/**
 * NumberStepper wrapper with local draft state.
 * Lets the user type freely; only validates + commits on blur, Enter,
 * or arrow-button clicks.
 */
function FreqStepper({ value, onCommit, min, max, step, width, className }: {
  value: number;
  onCommit: (n: number) => void;
  min: number;
  max: number;
  step: number;
  width?: number;
  className?: string;
}) {
  const [draft, setDraft] = React.useState(String(value));
  const ref = React.useRef<HTMLInputElement>(null);

  // Sync draft when external value changes (e.g. from arrow buttons on the other field)
  React.useEffect(() => { setDraft(String(value)); }, [value]);

  const tryCommit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= min && n <= max) {
      onCommit(n);
    } else {
      setDraft(String(value)); // revert
    }
  };

  return (
    <div
      onBlur={() => tryCommit(draft)}
      onKeyDown={(e) => { if (e.key === 'Enter') tryCommit(draft); }}
    >
      <NumberStepper
        ref={ref}
        value={draft}
        onChange={(val) => {
          // Arrow buttons produce a clean integer — commit immediately
          const n = parseInt(val, 10);
          if (!isNaN(n) && n >= min && n <= max && /^-?\d+$/.test(val.trim())) {
            onCommit(n);
          }
          setDraft(val);
        }}
        min={min}
        max={max}
        step={step}
        width={width}
        className={className}
      />
    </div>
  );
}

export type WaveformRulerFormat = 'linear-amp' | 'logarithmic-db' | 'linear-db';

export interface RulerFlyoutProps {
  /** Whether the flyout is open */
  isOpen: boolean;
  /** Callback when flyout should close */
  onClose: () => void;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Ruler mode determines which options are shown */
  mode: 'waveform' | 'spectrogram';
  /** Current waveform ruler format (used when mode='waveform') */
  rulerFormat?: WaveformRulerFormat;
  /** Callback when waveform ruler format changes */
  onRulerFormatChange?: (format: WaveformRulerFormat) => void;
  /** Whether half wave display is enabled (used when mode='waveform') */
  halfWave?: boolean;
  /** Callback when half wave changes */
  onHalfWaveChange?: (enabled: boolean) => void;
  /** Current spectrogram scale (used when mode='spectrogram') */
  spectrogramScale?: SpectrogramScale;
  /** Callback when spectrogram scale changes */
  onSpectrogramScaleChange?: (scale: SpectrogramScale) => void;
  /** Minimum frequency in Hz (used when mode='spectrogram') */
  minFreq?: number;
  /** Callback when minimum frequency changes */
  onMinFreqChange?: (freq: number) => void;
  /** Maximum frequency in Hz (used when mode='spectrogram') */
  maxFreq?: number;
  /** Callback when maximum frequency changes */
  onMaxFreqChange?: (freq: number) => void;
  /** Callback for zoom in */
  onZoomIn?: () => void;
  /** Callback for zoom out */
  onZoomOut?: () => void;
  /** Callback for reset */
  onReset?: () => void;
  /** Ref to trigger element for focus restoration */
  triggerRef?: React.RefObject<HTMLElement>;
  /** Additional CSS class */
  className?: string;
}

const WAVEFORM_OPTIONS: { value: WaveformRulerFormat; label: string }[] = [
  { value: 'linear-amp', label: 'Linear (amp)' },
  { value: 'logarithmic-db', label: 'Logarithmic (dB)' },
  { value: 'linear-db', label: 'Linear (dB)' },
];

const SPECTROGRAM_OPTIONS: { value: SpectrogramScale; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'logarithmic', label: 'Logarithmic' },
  { value: 'mel', label: 'Mel' },
  { value: 'bark', label: 'Bark' },
  { value: 'erb', label: 'ERB' },
  { value: 'period', label: 'Period' },
];

export const RulerFlyout: React.FC<RulerFlyoutProps> = ({
  isOpen,
  onClose,
  x,
  y,
  mode,
  rulerFormat = 'linear-amp',
  onRulerFormatChange,
  halfWave = false,
  onHalfWaveChange,
  spectrogramScale = 'mel',
  onSpectrogramScaleChange,
  minFreq = 10,
  onMinFreqChange,
  maxFreq = 22050,
  onMaxFreqChange,
  onZoomIn,
  onZoomOut,
  onReset,
  triggerRef,
  className = '',
}) => {
  const { theme } = useTheme();
  const flyoutRef = React.useRef<HTMLDivElement>(null);

  // Click outside to close
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Escape to close
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        if (triggerRef?.current) {
          setTimeout(() => triggerRef.current?.focus(), 0);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const style = {
    '--ruler-flyout-bg': theme.background.surface.default,
    '--ruler-flyout-border': theme.border.default,
    '--ruler-flyout-label': theme.foreground.text.primary,
    '--ruler-flyout-btn-color': theme.foreground.text.primary,
    '--ruler-flyout-recess-bg': theme.background.surface.elevated,
    '--ruler-flyout-recess-border': theme.border.default,
  } as React.CSSProperties;

  const triangleFill = theme.background.surface.default;

  return (
    <div
      ref={flyoutRef}
      className={`ruler-flyout ${className}`}
      style={{
        ...style,
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10000,
      }}
    >
      {/* Triangle pointer (right side) */}
      <svg className="ruler-flyout__triangle" width="16" height="9" viewBox="0 0 16 9" fill="none">
        <path d="M8 0L16 9H0L8 0Z" fill={triangleFill} />
      </svg>

      <div className="ruler-flyout__content">
        {/* Zoom controls */}
        <div className="ruler-flyout__toolbar">
          <div className="ruler-flyout__toolbar-zoom">
            <button
              className="ruler-flyout__btn"
              aria-label="Zoom in"
              onClick={onZoomIn}
            >
              <Icon name="zoom-in" size={16} />
            </button>
            <button
              className="ruler-flyout__btn"
              aria-label="Zoom out"
              onClick={onZoomOut}
            >
              <Icon name="zoom-out" size={16} />
            </button>
          </div>
          <button
            className="ruler-flyout__btn ruler-flyout__btn--reset"
            aria-label="Reset zoom"
            onClick={onReset}
          >
            <Icon name="refresh" size={16} />
            <span className="ruler-flyout__btn-label">Reset</span>
          </button>
        </div>

        {/* Ruler format section */}
        <div className="ruler-flyout__format-section">
          <div className="ruler-flyout__section-label">Ruler format</div>
          <div className="ruler-flyout__radio-group" role="radiogroup" aria-label="Ruler format">
            {mode === 'waveform'
              ? WAVEFORM_OPTIONS.map((opt) => (
                  <LabeledRadio
                    key={opt.value}
                    label={opt.label}
                    name="ruler-format"
                    value={opt.value}
                    checked={rulerFormat === opt.value}
                    onChange={() => onRulerFormatChange?.(opt.value)}
                  />
                ))
              : SPECTROGRAM_OPTIONS.map((opt) => (
                  <LabeledRadio
                    key={opt.value}
                    label={opt.label}
                    name="ruler-format"
                    value={opt.value}
                    checked={spectrogramScale === opt.value}
                    onChange={() => onSpectrogramScaleChange?.(opt.value)}
                  />
                ))}
          </div>
        </div>

        {/* Frequency range inputs (spectrogram mode only) */}
        {mode === 'spectrogram' && (
          <div className="ruler-flyout__freq-section">
            <div className="ruler-flyout__section-label">Frequency range</div>
            <div className="ruler-flyout__freq-row">
              <label className="ruler-flyout__freq-label">Min</label>
              <FreqStepper
                value={minFreq}
                onCommit={(n) => onMinFreqChange?.(n)}
                min={0}
                max={maxFreq - 1}
                step={10}
                width={80}
                className="ruler-flyout__freq-input"
              />
              <span className="ruler-flyout__freq-unit">Hz</span>
            </div>
            <div className="ruler-flyout__freq-row">
              <label className="ruler-flyout__freq-label">Max</label>
              <FreqStepper
                value={maxFreq}
                onCommit={(n) => onMaxFreqChange?.(n)}
                min={minFreq + 1}
                max={22050}
                step={100}
                width={80}
                className="ruler-flyout__freq-input"
              />
              <span className="ruler-flyout__freq-unit">Hz</span>
            </div>
          </div>
        )}

        {/* Half wave checkbox (waveform mode only) */}
        {mode === 'waveform' && (
          <div className="ruler-flyout__checkbox-section">
            <LabeledCheckbox
              label="Half wave"
              checked={halfWave}
              onChange={onHalfWaveChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RulerFlyout;

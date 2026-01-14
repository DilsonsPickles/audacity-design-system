import React, { useState, useRef, useEffect } from 'react';
import { TimeCodeDigit } from './TimeCodeDigit';
import { TimeCodeUnit } from './TimeCodeUnit';
import type { TimeCodeUnitType } from './TimeCodeUnit';
import { Icon } from '../Icon';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { useTheme } from '../ThemeProvider';
import './TimeCode.css';
import './TimeCodeDigit.css';
import './TimeCodeUnit.css';

export type TimeCodeFormat =
  | 'dd:hh:mm:ss'
  | 'hh:mm:ss'
  | 'hh:mm:ss+hundredths'
  | 'hh:mm:ss+milliseconds'
  | 'hh:mm:ss+samples'
  | 'hh:mm:ss+frames'
  | 'samples'
  | 'seconds'
  | 'seconds+milliseconds'
  | 'film-frames'
  | 'beats:bars'
  | 'Hz';

export interface TimeCodeUnit {
  value: string;
  maxLength: number;
  max: number;
  label?: string;
}

export interface TimeCodeProps {
  /**
   * Current time value in seconds
   */
  value: number;
  /**
   * Format to display the timecode
   * @default 'hh:mm:ss'
   */
  format?: TimeCodeFormat;
  /**
   * Sample rate for sample-based formats
   * @default 44100
   */
  sampleRate?: number;
  /**
   * Frame rate for frame-based formats
   * @default 24
   */
  frameRate?: number;
  /**
   * Callback when value changes
   */
  onChange?: (value: number) => void;
  /**
   * Callback when format changes
   */
  onFormatChange?: (format: TimeCodeFormat) => void;
  /**
   * Show format selector dropdown
   * @default true
   */
  showFormatSelector?: boolean;
  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;
  /**
   * Visual variant
   * - dark: Dark background with light text (transport controls)
   * - light: Light background with dark text (label editor)
   * @default 'dark'
   */
  variant?: 'dark' | 'light';
  /**
   * Optional className for custom styling
   */
  className?: string;
}

interface TimeCodeSegment {
  value: string;
  type: 'unit' | 'separator' | 'label';
  unitType?: TimeCodeUnitType;
  maxLength?: number;
  max?: number;
  editable?: boolean;
}

/**
 * TimeCode component - Displays and edits time in various formats
 * Supports multiple time formats including SMPTE, samples, Hz, etc.
 */
export function TimeCode({
  value,
  format = 'hh:mm:ss',
  sampleRate = 44100,
  frameRate = 24,
  onChange,
  onFormatChange,
  showFormatSelector = true,
  disabled = false,
  variant = 'dark',
  className = '',
}: TimeCodeProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editingDigitIndex, setEditingDigitIndex] = useState<number | null>(null);
  const [hoverDigitIndex, setHoverDigitIndex] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const segments = formatTimeToSegments(value, format, sampleRate, frameRate);

  const handleDigitClick = (digitGlobalIndex: number) => {
    if (disabled) return;
    setIsEditing(true);
    setEditingDigitIndex(digitGlobalIndex);
  };

  const handleDigitChange = (digitGlobalIndex: number, newValue: string) => {
    if (!onChange) return;
    // TODO: Convert segments back to seconds and call onChange
  };

  const handleFormatSelect = (newFormat: TimeCodeFormat) => {
    onFormatChange?.(newFormat);
    setShowMenu(false);
  };

  const handleMenuButtonClick = () => {
    if (disabled || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPosition({
      x: rect.left,
      y: rect.bottom + 4,
    });
    setShowMenu(!showMenu);
  };

  const style = {
    '--timecode-bg': variant === 'light' ? '#FFFFFF' : '#212433',
    '--timecode-text': variant === 'light' ? theme.foreground.text.primary : '#f4f5f9',
    '--timecode-hover': variant === 'light' ? 'rgba(0, 0, 0, 0.05)' : '#4a5068',
    '--timecode-border': variant === 'light' ? '#D4D5D9' : 'transparent',
    '--timecode-unit-bg': variant === 'light' ? '#FFFFFF' : '#212433',
    '--timecode-unit-text': variant === 'light' ? theme.foreground.text.primary : '#c5c6cd',
    '--timecode-unit-hover-bg': variant === 'light' ? 'rgba(0, 0, 0, 0.05)' : '#4a5068',
    '--timecode-unit-hover-text': variant === 'light' ? theme.foreground.text.primary : '#f4f5f9',
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`timecode timecode--${variant} ${disabled ? 'timecode--disabled' : ''} ${className}`}
      style={style}
    >
      <div className="timecode__display">
        {segments.map((segment, index) => (
          <React.Fragment key={index}>
            {segment.type === 'unit' ? (
              // Render each digit character separately for proper styling
              segment.value.split('').map((digit, digitIndex) => {
                const digitGlobalIndex = index * 100 + digitIndex; // Unique index for each digit
                const digitState =
                  editingDigitIndex === digitGlobalIndex ? 'active' :
                  hoverDigitIndex === digitGlobalIndex && !disabled ? 'hover' :
                  'default';

                return (
                  <TimeCodeDigit
                    key={digitGlobalIndex}
                    value={digit}
                    state={digitState}
                    editable={segment.editable && !disabled}
                    onClick={() => handleDigitClick(digitGlobalIndex)}
                    onMouseEnter={() => setHoverDigitIndex(digitGlobalIndex)}
                    onMouseLeave={() => setHoverDigitIndex(null)}
                  />
                );
              })
            ) : segment.type === 'label' && segment.unitType ? (
              <TimeCodeUnit unit={segment.unitType} />
            ) : (
              <span className="timecode__separator">{segment.value}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {showFormatSelector && (
        <>
          <button
            ref={buttonRef}
            className="timecode__format-button"
            onClick={handleMenuButtonClick}
            disabled={disabled}
          >
            <Icon name="caret-down" size={16} color="#f4f5f9" />
          </button>

          <ContextMenu
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            x={menuPosition.x}
            y={menuPosition.y}
          >
            <ContextMenuItem
              label="dd:hh:mm:ss"
              onClick={() => handleFormatSelect('dd:hh:mm:ss')}
            />
            <ContextMenuItem
              label="hh:mm:ss"
              onClick={() => handleFormatSelect('hh:mm:ss')}
            />
            <ContextMenuItem
              label="hh:mm:ss + hundredths"
              onClick={() => handleFormatSelect('hh:mm:ss+hundredths')}
            />
            <ContextMenuItem
              label="hh:mm:ss + milliseconds"
              onClick={() => handleFormatSelect('hh:mm:ss+milliseconds')}
            />
            <ContextMenuItem
              label="hh:mm:ss + samples"
              onClick={() => handleFormatSelect('hh:mm:ss+samples')}
            />
            <ContextMenuItem
              label="hh:mm:ss + frames (24fps)"
              onClick={() => handleFormatSelect('hh:mm:ss+frames')}
            />
            <ContextMenuItem
              label="samples"
              onClick={() => handleFormatSelect('samples')}
            />
            <ContextMenuItem
              label="Seconds"
              onClick={() => handleFormatSelect('seconds')}
            />
            <ContextMenuItem
              label="Seconds + milliseconds"
              onClick={() => handleFormatSelect('seconds+milliseconds')}
            />
            <ContextMenuItem
              label="film frames (24fps)"
              onClick={() => handleFormatSelect('film-frames')}
            />
            <ContextMenuItem
              label="beats:bars"
              onClick={() => handleFormatSelect('beats:bars')}
            />
            <ContextMenuItem
              label="Hz"
              onClick={() => handleFormatSelect('Hz')}
            />
          </ContextMenu>
        </>
      )}
    </div>
  );
}

function formatTimeToSegments(
  seconds: number,
  format: TimeCodeFormat,
  sampleRate: number,
  frameRate: number
): TimeCodeSegment[] {
  switch (format) {
    case 'dd:hh:mm:ss':
      return formatDDHHMMSS(seconds);
    case 'hh:mm:ss':
      return formatHHMMSS(seconds);
    case 'hh:mm:ss+hundredths':
      return formatHHMMSSHundredths(seconds);
    case 'hh:mm:ss+milliseconds':
      return formatHHMMSSMilliseconds(seconds);
    case 'hh:mm:ss+samples':
      return formatHHMMSSSamples(seconds, sampleRate);
    case 'hh:mm:ss+frames':
      return formatHHMMSSFrames(seconds, frameRate);
    case 'samples':
      return formatSamples(seconds, sampleRate);
    case 'seconds':
      return formatSeconds(seconds);
    case 'seconds+milliseconds':
      return formatSecondsMilliseconds(seconds);
    case 'film-frames':
      return formatFilmFrames(seconds, frameRate);
    case 'beats:bars':
      return formatBeatsBar(seconds);
    case 'Hz':
      return formatHz(seconds);
    default:
      return formatHHMMSS(seconds);
  }
}

function pad(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

function formatDDHHMMSS(seconds: number): TimeCodeSegment[] {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    { value: pad(days, 2), type: 'unit', maxLength: 2, max: 99, editable: true },
    { value: 'd', type: 'label', unitType: 'days' },
    { value: pad(hours, 2), type: 'unit', maxLength: 2, max: 23, editable: true },
    { value: 'h', type: 'label', unitType: 'hours' },
    { value: pad(minutes, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 'm', type: 'label', unitType: 'minutes' },
    { value: pad(secs, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 's', type: 'label', unitType: 'seconds' },
  ];
}

function formatHHMMSS(seconds: number): TimeCodeSegment[] {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    { value: pad(hours, 2), type: 'unit', maxLength: 2, max: 99, editable: true },
    { value: 'h', type: 'label', unitType: 'hours' },
    { value: pad(minutes, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 'm', type: 'label', unitType: 'minutes' },
    { value: pad(secs, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 's', type: 'label', unitType: 'seconds' },
  ];
}

function formatHHMMSSHundredths(seconds: number): TimeCodeSegment[] {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds % 1) * 100);

  return [
    { value: pad(hours, 2), type: 'unit', maxLength: 2, max: 99, editable: true },
    { value: 'h', type: 'label', unitType: 'hours' },
    { value: pad(minutes, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 'm', type: 'label', unitType: 'minutes' },
    { value: pad(secs, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: '.', type: 'separator' },
    { value: pad(hundredths, 2), type: 'unit', maxLength: 2, max: 99, editable: true },
    { value: 's', type: 'label', unitType: 'seconds' },
  ];
}

function formatHHMMSSMilliseconds(seconds: number): TimeCodeSegment[] {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return [
    { value: pad(hours, 2), type: 'unit', maxLength: 2, max: 99, editable: true },
    { value: 'h', type: 'label', unitType: 'hours' },
    { value: pad(minutes, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 'm', type: 'label', unitType: 'minutes' },
    { value: pad(secs, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: '.', type: 'separator' },
    { value: pad(milliseconds, 3), type: 'unit', maxLength: 3, max: 999, editable: true },
    { value: 's', type: 'label', unitType: 'seconds' },
  ];
}

function formatHHMMSSSamples(seconds: number, sampleRate: number): TimeCodeSegment[] {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const samples = Math.floor((seconds % 1) * sampleRate);

  return [
    { value: pad(hours, 2), type: 'unit', maxLength: 2, max: 99, editable: true },
    { value: 'h', type: 'label', unitType: 'hours' },
    { value: pad(minutes, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 'm', type: 'label', unitType: 'minutes' },
    { value: pad(secs, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 's', type: 'label', unitType: 'seconds' },
    { value: pad(samples, 5), type: 'unit', maxLength: 5, max: sampleRate - 1, editable: true },
    { value: 'samples', type: 'label', unitType: 'samples' },
  ];
}

function formatHHMMSSFrames(seconds: number, frameRate: number): TimeCodeSegment[] {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * frameRate);

  return [
    { value: pad(hours, 2), type: 'unit', maxLength: 2, max: 99, editable: true },
    { value: 'h', type: 'label', unitType: 'hours' },
    { value: pad(minutes, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 'm', type: 'label', unitType: 'minutes' },
    { value: pad(secs, 2), type: 'unit', maxLength: 2, max: 59, editable: true },
    { value: 's', type: 'label', unitType: 'seconds' },
    { value: pad(frames, 2), type: 'unit', maxLength: 2, max: frameRate - 1, editable: true },
    { value: 'frames', type: 'label', unitType: 'frames' },
  ];
}

function formatSamples(seconds: number, sampleRate: number): TimeCodeSegment[] {
  const totalSamples = Math.floor(seconds * sampleRate);
  const samplesStr = totalSamples.toString();

  // Add commas for thousands separators
  const parts: TimeCodeSegment[] = [];
  const groups = [];

  for (let i = samplesStr.length - 1, group = ''; i >= 0; i--) {
    group = samplesStr[i] + group;
    if (group.length === 3 || i === 0) {
      groups.unshift(group);
      group = '';
    }
  }

  groups.forEach((group, index) => {
    parts.push({ value: group, type: 'unit', editable: true });
    if (index < groups.length - 1) {
      parts.push({ value: ',', type: 'separator' });
    }
  });

  parts.push({ value: 'samples', type: 'label', unitType: 'samples' });

  return parts.length ? parts : [{ value: '0', type: 'unit', editable: true }, { value: 'samples', type: 'label', unitType: 'samples' }];
}

function formatSeconds(seconds: number): TimeCodeSegment[] {
  const totalSeconds = Math.floor(seconds);
  const secondsStr = totalSeconds.toString();

  // Add commas for thousands separators
  const parts: TimeCodeSegment[] = [];
  const groups = [];

  for (let i = secondsStr.length - 1, group = ''; i >= 0; i--) {
    group = secondsStr[i] + group;
    if (group.length === 3 || i === 0) {
      groups.unshift(group);
      group = '';
    }
  }

  groups.forEach((group, index) => {
    parts.push({ value: group, type: 'unit', editable: true });
    if (index < groups.length - 1) {
      parts.push({ value: ',', type: 'separator' });
    }
  });

  parts.push({ value: 's', type: 'label', unitType: 'seconds' });

  return parts.length ? parts : [{ value: '0', type: 'unit', editable: true }, { value: 's', type: 'label', unitType: 'seconds' }];
}

function formatSecondsMilliseconds(seconds: number): TimeCodeSegment[] {
  const totalSeconds = Math.floor(seconds);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  const secondsStr = totalSeconds.toString();

  // Add commas for thousands separators
  const parts: TimeCodeSegment[] = [];
  const groups = [];

  for (let i = secondsStr.length - 1, group = ''; i >= 0; i--) {
    group = secondsStr[i] + group;
    if (group.length === 3 || i === 0) {
      groups.unshift(group);
      group = '';
    }
  }

  groups.forEach((group, index) => {
    parts.push({ value: group, type: 'unit', editable: true });
    if (index < groups.length - 1) {
      parts.push({ value: ',', type: 'separator' });
    }
  });

  parts.push({ value: '.', type: 'separator' });
  parts.push({ value: pad(milliseconds, 3), type: 'unit', maxLength: 3, max: 999, editable: true });
  parts.push({ value: 's', type: 'label', unitType: 'seconds' });

  return parts;
}

function formatFilmFrames(seconds: number, frameRate: number): TimeCodeSegment[] {
  const totalFrames = Math.floor(seconds * frameRate);
  const framesStr = totalFrames.toString();

  // Add commas for thousands separators
  const parts: TimeCodeSegment[] = [];
  const groups = [];

  for (let i = framesStr.length - 1, group = ''; i >= 0; i--) {
    group = framesStr[i] + group;
    if (group.length === 3 || i === 0) {
      groups.unshift(group);
      group = '';
    }
  }

  groups.forEach((group, index) => {
    parts.push({ value: group, type: 'unit', editable: true });
    if (index < groups.length - 1) {
      parts.push({ value: ',', type: 'separator' });
    }
  });

  return parts.length ? parts : [{ value: '0', type: 'unit', editable: true }];
}

function formatBeatsBar(seconds: number): TimeCodeSegment[] {
  // Assuming 120 BPM and 4/4 time signature for now
  const bpm = 120;
  const beatsPerBar = 4;
  const secondsPerBeat = 60 / bpm;

  const totalBeats = Math.floor(seconds / secondsPerBeat);
  const bars = Math.floor(totalBeats / beatsPerBar);
  const beats = totalBeats % beatsPerBar;

  return [
    { value: pad(bars, 3), type: 'unit', maxLength: 3, max: 999, editable: true },
    { value: (beats + 1).toString(), type: 'unit', maxLength: 1, max: beatsPerBar, editable: true },
  ];
}

function formatHz(seconds: number): TimeCodeSegment[] {
  // This is a placeholder - actual Hz calculation would depend on the context
  const frequency = seconds > 0 ? 1 / seconds : 0;
  const hz = frequency.toFixed(2);
  const [intPart, decPart] = hz.split('.');

  return [
    { value: intPart, type: 'unit', editable: true },
    { value: '.', type: 'separator' },
    { value: decPart, type: 'unit', editable: true },
    { value: ' Hz', type: 'separator' },
  ];
}

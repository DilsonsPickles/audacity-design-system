/**
 * SelectionToolbar - Bottom toolbar displaying audio selection information
 *
 * Shows playback status, instruction text, and selection timecodes
 * Matches Figma design: node-id=111-1630
 */

import React from 'react';
import { useTheme } from '../ThemeProvider';
import { TimeCode, TimeCodeFormat } from '../TimeCode/TimeCode';
import { CloudProjectIndicator } from '../CloudProjectIndicator';
import './SelectionToolbar.css';

export interface SelectionToolbarProps {
  /**
   * Selection start time in seconds
   * @default null (no selection)
   */
  selectionStart: number | null;
  /**
   * Selection end time in seconds
   * @default null (no selection)
   */
  selectionEnd: number | null;
  /**
   * Playback status text
   * @default 'Stopped'
   */
  status?: string;
  /**
   * Instruction text to display
   * @default 'Click and drag to select audio'
   */
  instructionText?: string;
  /**
   * Timecode format to display
   * @default 'hh:mm:ss+milliseconds'
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
   * Callback when format changes
   */
  onFormatChange?: (format: TimeCodeFormat) => void;
  /**
   * Callback when selection start time changes via editing
   */
  onSelectionStartChange?: (value: number) => void;
  /**
   * Callback when selection end time changes via editing
   */
  onSelectionEndChange?: (value: number) => void;
  /**
   * Whether to show the cloud project indicator
   */
  showCloudIndicator?: boolean;
  /**
   * Whether the cloud project is currently uploading
   */
  isCloudUploading?: boolean;
  /**
   * Whether to show the duration timecode
   */
  showDuration?: boolean;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * SelectionToolbar - Bottom toolbar with status and selection timecodes
 */
export function SelectionToolbar({
  selectionStart,
  selectionEnd,
  status = 'Stopped',
  instructionText = 'Click and drag to select audio',
  format = 'hh:mm:ss+milliseconds',
  sampleRate = 44100,
  frameRate = 24,
  onFormatChange,
  onSelectionStartChange,
  onSelectionEndChange,
  showCloudIndicator = false,
  isCloudUploading = false,
  showDuration = true,
  className = '',
}: SelectionToolbarProps) {
  const { theme } = useTheme();

  const style = {
    '--selection-toolbar-bg': theme.background.surface.default,
    '--selection-toolbar-border': theme.border.default,
    '--selection-toolbar-text': theme.foreground.text.primary,
    '--selection-toolbar-divider': theme.border.divider,
  } as React.CSSProperties;

  // Calculate duration
  const duration = selectionStart !== null && selectionEnd !== null
    ? Math.abs(selectionEnd - selectionStart)
    : null;

  // Default values when no selection
  const startValue = selectionStart ?? 0;
  const endValue = selectionEnd ?? 0;
  const durationValue = duration ?? 0;

  return (
    <div className={`selection-toolbar ${className}`} style={style}>
      {/* Left side - Status and instruction */}
      <div className="selection-toolbar__left">
        <div className="selection-toolbar__status">
          <span className="selection-toolbar__status-text">{status}</span>
        </div>
        <div className="selection-toolbar__divider" />
        <div className="selection-toolbar__instruction">
          <span className="selection-toolbar__instruction-text">{instructionText}</span>
        </div>
      </div>

      {/* Right side - Selection timecodes and duration */}
      <div className="selection-toolbar__right">
        {showCloudIndicator && (
          <>
            <CloudProjectIndicator isUploading={isCloudUploading} />
            <div className="selection-toolbar__divider" />
          </>
        )}
        <span className="selection-toolbar__label">Selection</span>
        <div className="selection-toolbar__timecodes">
          <TimeCode
            value={startValue}
            format={format}
            sampleRate={sampleRate}
            frameRate={frameRate}
            onChange={onSelectionStartChange}
            onFormatChange={onFormatChange}
            showFormatSelector={false}
          />
          <TimeCode
            value={endValue}
            format={format}
            sampleRate={sampleRate}
            frameRate={frameRate}
            onChange={onSelectionEndChange}
            showFormatSelector={false}
          />
        </div>

        {showDuration && (
          <>
            <span className="selection-toolbar__label">Duration</span>
            <div className="selection-toolbar__timecodes">
              <TimeCode
                value={durationValue}
                format={format}
                sampleRate={sampleRate}
                frameRate={frameRate}
                showFormatSelector={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SelectionToolbar;

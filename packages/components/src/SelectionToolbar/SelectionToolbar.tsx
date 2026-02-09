/**
 * SelectionToolbar - Bottom toolbar displaying audio selection information
 *
 * Shows playback status, instruction text, and selection timecodes
 * Matches Figma design: node-id=111-1630
 */

import React, { useRef, useEffect } from 'react';
import { useTheme } from '../ThemeProvider';
import { TimeCode, TimeCodeFormat } from '../TimeCode/TimeCode';
import { CloudProjectIndicator } from '../CloudProjectIndicator';
import { useAccessibilityProfile } from '../contexts/AccessibilityProfileContext';
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
   * Timecode format to display for selection start/end
   * @default 'hh:mm:ss+milliseconds'
   */
  format?: TimeCodeFormat;
  /**
   * Timecode format to display for duration
   * @default 'hh:mm:ss+milliseconds'
   */
  durationFormat?: TimeCodeFormat;
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
   * Callback when selection format changes
   */
  onFormatChange?: (format: TimeCodeFormat) => void;
  /**
   * Callback when duration format changes
   */
  onDurationFormatChange?: (format: TimeCodeFormat) => void;
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
  durationFormat = 'hh:mm:ss+milliseconds',
  sampleRate = 44100,
  frameRate = 24,
  onFormatChange,
  onDurationFormatChange,
  onSelectionStartChange,
  onSelectionEndChange,
  showCloudIndicator = false,
  isCloudUploading = false,
  showDuration = true,
  className = '',
}: SelectionToolbarProps) {
  const { theme } = useTheme();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { activeProfile } = useAccessibilityProfile();

  // Get tab group configuration for selection-toolbar
  const tabGroupConfig = activeProfile?.config?.tabGroups?.['selection-toolbar'];
  const useTabGroups = tabGroupConfig?.arrows === true;
  const startTabIndex = tabGroupConfig?.tabindex === 'roving' ? 0 : undefined;

  // Initialize roving tabindex on mount
  useEffect(() => {
    if (!useTabGroups || startTabIndex === undefined || !toolbarRef.current) return;

    // Find all focusable elements (TimeCode containers with role="group")
    const allElements = toolbarRef.current.querySelectorAll('[role="group"]');
    const focusables = Array.from(allElements).filter(el => {
      const element = el as HTMLElement;
      return true; // Include all TimeCode containers
    });

    // Set first element to startTabIndex, rest to -1
    focusables.forEach((el, index) => {
      (el as HTMLElement).tabIndex = index === 0 ? startTabIndex : -1;
    });
  }, [useTabGroups, startTabIndex]);

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!useTabGroups || startTabIndex === undefined) return;
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;

    e.preventDefault();
    e.stopPropagation();

    const allElements = toolbarRef.current?.querySelectorAll('[role="group"]');
    if (!allElements) return;

    const focusables = Array.from(allElements).filter(() => true);
    const currentIndex = focusables.indexOf(document.activeElement!);

    if (currentIndex === -1) return;

    let nextIndex: number;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % focusables.length;
    } else {
      nextIndex = (currentIndex - 1 + focusables.length) % focusables.length;
    }

    // Update tabIndex: current element gets -1, next element gets startTabIndex
    (focusables[currentIndex] as HTMLElement).tabIndex = -1;
    (focusables[nextIndex] as HTMLElement).tabIndex = startTabIndex;
    (focusables[nextIndex] as HTMLElement).focus();
  };

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
    <div
      ref={toolbarRef}
      className={`selection-toolbar ${className}`}
      style={style}
      role={useTabGroups ? "toolbar" : undefined}
      aria-label={useTabGroups ? "Selection toolbar" : undefined}
      onKeyDown={handleKeyDown}
    >
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
            showFormatSelector={false}
          />
          <TimeCode
            value={endValue}
            format={format}
            sampleRate={sampleRate}
            frameRate={frameRate}
            onChange={onSelectionEndChange}
            onFormatChange={onFormatChange}
            showFormatSelector={true}
          />
        </div>

        {showDuration && (
          <>
            <span className="selection-toolbar__label">Duration</span>
            <div className="selection-toolbar__timecodes">
              <TimeCode
                value={durationValue}
                format={durationFormat}
                sampleRate={sampleRate}
                frameRate={frameRate}
                showFormatSelector={true}
                onFormatChange={onDurationFormatChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SelectionToolbar;

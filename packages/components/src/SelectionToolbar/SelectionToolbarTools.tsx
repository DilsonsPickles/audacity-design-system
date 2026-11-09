/**
 * THE STATUS BAR'S ITEMS AS TOOLS (2026-11-09, the custom toolbars design:
 * "I want the bottom toolbar items to also be customisable"): the playback
 * cue, the info line, the selection timecodes and the duration, each a
 * piece a ToolbarDock can place anywhere. `SelectionToolbar` composes the
 * same pieces for hosts that keep a fixed bar. The class names are the
 * bar's own, so the status bar's tests and the status-info rules read them
 * wherever they sit.
 */
import React from 'react';
import { useTheme } from '../ThemeProvider';
import { TimeCode, type TimeCodeFormat } from '../TimeCode/TimeCode';
import './SelectionToolbar.css';

/** The bar's tokens, for a host that draws the pieces outside SelectionToolbar */
export function useSelectionToolbarStyle(): React.CSSProperties {
  const { theme } = useTheme();
  return {
    '--selection-toolbar-bg': theme.background.toolbar,
    '--selection-toolbar-border': theme.border.onSurface,
    '--selection-toolbar-text': theme.foreground.text.primary,
    '--selection-toolbar-divider': theme.border.divider,
  } as React.CSSProperties;
}

/** Slot one: the playback cue — Stopped, Playing, Recording, Seeking */
export function StatusCueTool({ status = 'Stopped' }: { status?: string }) {
  return (
    <div className="selection-toolbar__status" data-status-tool="cue">
      <span className="selection-toolbar__status-text">{status}</span>
    </div>
  );
}

/** Slot two: what the pointer is over */
export function StatusInfoTool({ text = 'Click and drag to select audio' }: { text?: string }) {
  return (
    <div className="selection-toolbar__instruction" data-status-tool="info">
      <span className="selection-toolbar__instruction-text">{text}</span>
    </div>
  );
}

export interface SelectionTimecodesToolProps {
  selectionStart: number | null;
  selectionEnd: number | null;
  format?: TimeCodeFormat;
  sampleRate?: number;
  frameRate?: number;
  onFormatChange?: (format: TimeCodeFormat) => void;
  onSelectionStartChange?: (value: number) => void;
  onSelectionEndChange?: (value: number) => void;
}

/** The Selection start / end timecodes, with their label */
export function SelectionTimecodesTool({
  selectionStart, selectionEnd, format = 'hh:mm:ss+milliseconds', sampleRate = 44100, frameRate = 24,
  onFormatChange, onSelectionStartChange, onSelectionEndChange,
}: SelectionTimecodesToolProps) {
  return (
    <div className="selection-toolbar__group" data-status-tool="selection">
      <span className="selection-toolbar__label">Selection</span>
      <div className="selection-toolbar__timecodes">
        <TimeCode
          value={selectionStart ?? 0}
          format={format}
          sampleRate={sampleRate}
          frameRate={frameRate}
          onChange={onSelectionStartChange}
          showFormatSelector={false}
          ariaLabel="Selection start"
        />
        <TimeCode
          value={selectionEnd ?? 0}
          format={format}
          sampleRate={sampleRate}
          frameRate={frameRate}
          onChange={onSelectionEndChange}
          onFormatChange={onFormatChange}
          showFormatSelector={true}
          ariaLabel="Selection end"
        />
      </div>
    </div>
  );
}

export interface SelectionDurationToolProps {
  selectionStart: number | null;
  selectionEnd: number | null;
  format?: TimeCodeFormat;
  sampleRate?: number;
  frameRate?: number;
  onFormatChange?: (format: TimeCodeFormat) => void;
}

/** The Duration timecode, with its label */
export function SelectionDurationTool({
  selectionStart, selectionEnd, format = 'hh:mm:ss+milliseconds', sampleRate = 44100, frameRate = 24, onFormatChange,
}: SelectionDurationToolProps) {
  const duration = selectionStart !== null && selectionEnd !== null ? Math.abs(selectionEnd - selectionStart) : 0;
  return (
    <div className="selection-toolbar__group" data-status-tool="duration">
      <span className="selection-toolbar__label">Duration</span>
      <div className="selection-toolbar__timecodes">
        <TimeCode
          value={duration}
          format={format}
          sampleRate={sampleRate}
          frameRate={frameRate}
          showFormatSelector={true}
          onFormatChange={onFormatChange}
          ariaLabel="Selection duration"
        />
      </div>
    </div>
  );
}

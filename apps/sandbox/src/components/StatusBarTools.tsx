import React from 'react';
import {
  StatusCueTool, StatusInfoTool, SelectionTimecodesTool, SelectionDurationTool,
  type TimeCodeFormat, type ToolMeta, type ToolbarOrientation,
} from '@audacity-ui/components';

export interface StatusBarToolsDeps {
  status: string;
  infoText: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  format: TimeCodeFormat;
  durationFormat: TimeCodeFormat;
  onFormatChange: (format: TimeCodeFormat) => void;
  onDurationFormatChange: (format: TimeCodeFormat) => void;
  onSelectionStartChange: (value: number) => void;
  onSelectionEndChange: (value: number) => void;
}

export const STATUS_TOOL_IDS = ['status-cue', 'status-info', 'selection-timecodes', 'selection-duration'] as const;

/**
 * THE STATUS BAR'S TOOLS (2026-11-09, custom toolbars: "I want the bottom
 * toolbar items to also be customisable"): the Figma Status/Info bar's
 * two slots and the selection timecodes, drawn by id for whatever dock
 * holds them. None has a vertical form; the info line GROWS, which is
 * what pushes the Selection bar to the right.
 */
export function renderStatusTool(id: string, _orientation: ToolbarOrientation, deps: StatusBarToolsDeps): React.ReactNode {
  switch (id) {
    case 'status-cue': return <StatusCueTool status={deps.status} />;
    case 'status-info': return <StatusInfoTool text={deps.infoText} />;
    case 'selection-timecodes':
      return (
        <SelectionTimecodesTool
          selectionStart={deps.selectionStart}
          selectionEnd={deps.selectionEnd}
          format={deps.format}
          onFormatChange={deps.onFormatChange}
          onSelectionStartChange={deps.onSelectionStartChange}
          onSelectionEndChange={deps.onSelectionEndChange}
        />
      );
    case 'selection-duration':
      return (
        <SelectionDurationTool
          selectionStart={deps.selectionStart}
          selectionEnd={deps.selectionEnd}
          format={deps.durationFormat}
          onFormatChange={deps.onDurationFormatChange}
        />
      );
    default: return null;
  }
}

export function statusToolMeta(id: string): ToolMeta | undefined {
  switch (id) {
    case 'status-info': return { vertical: false, grow: true };
    case 'status-cue': case 'selection-timecodes': case 'selection-duration': return { vertical: false };
    default: return undefined;
  }
}

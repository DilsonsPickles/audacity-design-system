/**
 * LabelEditor - Modal dialog for editing audio labels
 * Based on Figma design: node-id=8997-128847
 */

import React, { useState } from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { LabelEditorHeader } from '../LabelEditorHeader';
import { LabelEditorTableHeader } from '../LabelEditorTableHeader';
import { LabelEditorTableRow } from '../LabelEditorTableRow';
import type { Label } from '@audacity-ui/core';
import type { TimeCodeFormat } from '../TimeCode';
import { useTheme } from '../ThemeProvider';
import './LabelEditor.css';

export interface LabelEditorProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Labels to edit
   */
  labels: Label[];
  /**
   * Available tracks for dropdown
   */
  tracks: Array<{ value: string; label: string }>;
  /**
   * Callback when labels change
   */
  onChange?: (labels: Label[]) => void;
  /**
   * Callback when dialog should close
   */
  onClose?: () => void;
  /**
   * Callback to import labels
   */
  onImport?: () => void;
  /**
   * Callback to export labels
   */
  onExport?: () => void;
  /**
   * Sample rate for timecode display
   * @default 44100
   */
  sampleRate?: number;
  /**
   * Operating system for platform-specific header controls
   * @default 'macos'
   */
  os?: 'macos' | 'windows';
  /**
   * Current playhead position in seconds
   * Used as default position for new labels
   * @default 0
   */
  playheadPosition?: number;
}

/**
 * LabelEditor component - Table-based label editing dialog
 */
export function LabelEditor({
  isOpen,
  labels,
  tracks,
  onChange,
  onClose,
  onImport,
  onExport,
  sampleRate = 44100,
  os = 'macos',
  playheadPosition = 0,
}: LabelEditorProps) {
  const { theme } = useTheme();
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [timeCodeFormat, setTimeCodeFormat] = useState<TimeCodeFormat>('hh:mm:ss');

  const handleLabelChange = (labelId: string, field: keyof Label, value: any) => {
    if (!onChange) return;

    const newLabels = labels.map((label) =>
      label.id === labelId ? { ...label, [field]: value } : label
    );
    onChange(newLabels);
  };

  const handleAddLabel = () => {
    if (!onChange) return;

    const newLabel: Label = {
      id: `label-${Date.now()}`,
      trackIndex: 0,
      text: '',
      startTime: playheadPosition,
      endTime: playheadPosition,
    };
    onChange([...labels, newLabel]);
  };

  const handleDeleteSelected = () => {
    if (!onChange || selectedLabelIds.size === 0) return;

    const newLabels = labels.filter((label) => !selectedLabelIds.has(label.id));
    onChange(newLabels);
    setSelectedLabelIds(new Set());
  };

  const handleRowClick = (labelId: string, e: React.MouseEvent) => {
    const newSelection = new Set(selectedLabelIds);

    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl+Click: Toggle selection
      if (newSelection.has(labelId)) {
        newSelection.delete(labelId);
      } else {
        newSelection.add(labelId);
      }
    } else if (e.shiftKey && selectedLabelIds.size > 0) {
      // Shift+Click: Range selection
      const labelIds = labels.map((l) => l.id);
      const lastSelectedId = Array.from(selectedLabelIds)[selectedLabelIds.size - 1];
      const lastIndex = labelIds.indexOf(lastSelectedId);
      const currentIndex = labelIds.indexOf(labelId);

      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);

      for (let i = start; i <= end; i++) {
        newSelection.add(labelIds[i]);
      }
    } else {
      // Regular click: Select only this label
      newSelection.clear();
      newSelection.add(labelId);
    }

    setSelectedLabelIds(newSelection);
  };

  const handleApply = () => {
    onClose?.();
  };

  const headerContent = (
    <LabelEditorHeader
      onImport={onImport}
      onExport={onExport}
      onDelete={handleDeleteSelected}
      onAddLabel={handleAddLabel}
      disableDelete={selectedLabelIds.size === 0}
    />
  );

  const footer = (
    <div className="dialog__footer">
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
      <Button variant="primary" onClick={handleApply}>
        Apply
      </Button>
    </div>
  );

  const style = {
    '--label-editor-border': theme.border.default,
    '--label-editor-header-bg': theme.background.surface.elevated,
    '--label-editor-row-hover': theme.background.surface.hover,
    '--label-editor-row-selected': theme.border.focus,
    '--label-editor-text': theme.foreground.text.primary,
    '--label-editor-text-secondary': theme.foreground.text.secondary,
  } as React.CSSProperties;

  return (
    <Dialog
      isOpen={isOpen}
      title="Label editor"
      onClose={onClose}
      width={800}
      headerContent={headerContent}
      footer={footer}
      footerBorder={true}
      noPadding
      os={os}
      style={style}
    >
      <div className="label-editor">
        <div className="label-editor__scroll-container">
          <table
            className="label-editor__table"
            style={{
              '--table-header-bg': '#EBEBEF',
              '--table-header-border': '#D4D5D9',
              '--table-header-text': theme.foreground.text.primary,
            } as React.CSSProperties}
          >
            <colgroup>
              <col style={{ width: '120px' }} />
              <col style={{ width: '320px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
            </colgroup>
            <LabelEditorTableHeader
              columns={[
                { label: 'Track', width: '120px' },
                { label: 'Label text', width: '320px' },
                { label: 'Start time', width: '180px', showMenu: true },
                { label: 'End time', width: '180px', showMenu: true },
                { label: 'Low frequency', width: '120px', showMenu: true },
                { label: 'High frequency', width: '120px', showMenu: true },
              ]}
            />
            <tbody className="label-editor__table-body">
              {labels.map((label) => (
                <LabelEditorTableRow
                  key={label.id}
                  trackOptions={tracks}
                  trackValue={label.trackIndex.toString()}
                  labelText={label.text}
                  startTime={label.startTime}
                  endTime={label.endTime}
                  lowFrequency={label.lowFrequency}
                  highFrequency={label.highFrequency}
                  selected={selectedLabelIds.has(label.id)}
                  sampleRate={sampleRate}
                  timeCodeFormat={timeCodeFormat}
                  onTrackChange={(value) =>
                    handleLabelChange(label.id, 'trackIndex', parseInt(value))
                  }
                  onLabelTextChange={(value) => handleLabelChange(label.id, 'text', value)}
                  onStartTimeChange={(value) => handleLabelChange(label.id, 'startTime', value)}
                  onEndTimeChange={(value) => handleLabelChange(label.id, 'endTime', value)}
                  onLowFrequencyChange={(value) =>
                    handleLabelChange(label.id, 'lowFrequency', value || undefined)
                  }
                  onHighFrequencyChange={(value) =>
                    handleLabelChange(label.id, 'highFrequency', value || undefined)
                  }
                  onClick={(e) => handleRowClick(label.id, e)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  );
}

export default LabelEditor;

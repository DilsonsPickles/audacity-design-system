/**
 * LabelEditor - Modal dialog for editing audio labels
 * Based on Figma design: node-id=8997-128847
 */

import React, { useState } from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { Dropdown } from '../Dropdown';
import { TextInput } from '../TextInput';
import { TimeCode, type TimeCodeFormat } from '../TimeCode';
import type { Label } from '@audacity-ui/core';
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
      startTime: 0,
      endTime: 0,
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
    <div className="label-editor__section-header">
      <h2 className="label-editor__section-title">Labels</h2>
      <div className="label-editor__actions">
        <Button size="small" onClick={onImport}>
          Import
        </Button>
        <Button size="small" onClick={onExport}>
          Export
        </Button>
        <Button
          size="small"
          onClick={handleDeleteSelected}
          disabled={selectedLabelIds.size === 0}
        >
          Delete
        </Button>
        <Button size="small" onClick={handleAddLabel}>
          Add label
        </Button>
      </div>
    </div>
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
      noPadding
      os={os}
      style={style}
    >
      <div className="label-editor">
        <div className="label-editor__table-container">
          <table className="label-editor__table">
            <thead className="label-editor__table-header">
              <tr>
                <th className="label-editor__table-header-cell label-editor__table-header-cell--track">
                  Track
                </th>
                <th className="label-editor__table-header-cell label-editor__table-header-cell--text">
                  Label text
                </th>
                <th className="label-editor__table-header-cell label-editor__table-header-cell--time">
                  Start time
                </th>
                <th className="label-editor__table-header-cell label-editor__table-header-cell--time">
                  End time
                </th>
                <th className="label-editor__table-header-cell label-editor__table-header-cell--frequency">
                  Low frequency
                </th>
                <th className="label-editor__table-header-cell label-editor__table-header-cell--frequency">
                  High frequency
                </th>
              </tr>
            </thead>
            <tbody className="label-editor__table-body">
              {labels.map((label) => (
                <tr
                  key={label.id}
                  className={`label-editor__table-row ${
                    selectedLabelIds.has(label.id) ? 'label-editor__table-row--selected' : ''
                  }`}
                  onClick={(e) => handleRowClick(label.id, e)}
                >
                  <td className="label-editor__table-cell label-editor__table-cell--track">
                    <Dropdown
                      options={tracks}
                      value={label.trackIndex.toString()}
                      onChange={(value) =>
                        handleLabelChange(label.id, 'trackIndex', parseInt(value))
                      }
                      width="100%"
                    />
                  </td>
                  <td className="label-editor__table-cell label-editor__table-cell--text">
                    <TextInput
                      value={label.text}
                      onChange={(value) => handleLabelChange(label.id, 'text', value)}
                      placeholder="Enter label text"
                    />
                  </td>
                  <td className="label-editor__table-cell label-editor__table-cell--time">
                    <TimeCode
                      value={label.startTime}
                      format={timeCodeFormat}
                      sampleRate={sampleRate}
                      onChange={(value) => handleLabelChange(label.id, 'startTime', value)}
                      onFormatChange={setTimeCodeFormat}
                      showFormatSelector
                    />
                  </td>
                  <td className="label-editor__table-cell label-editor__table-cell--time">
                    <TimeCode
                      value={label.endTime}
                      format={timeCodeFormat}
                      sampleRate={sampleRate}
                      onChange={(value) => handleLabelChange(label.id, 'endTime', value)}
                      showFormatSelector={false}
                    />
                  </td>
                  <td className="label-editor__table-cell label-editor__table-cell--frequency">
                    <TextInput
                      value={label.lowFrequency?.toString() || ''}
                      onChange={(value) =>
                        handleLabelChange(
                          label.id,
                          'lowFrequency',
                          value ? parseFloat(value) : undefined
                        )
                      }
                      placeholder="Hz"
                      type="number"
                    />
                  </td>
                  <td className="label-editor__table-cell label-editor__table-cell--frequency">
                    <TextInput
                      value={label.highFrequency?.toString() || ''}
                      onChange={(value) =>
                        handleLabelChange(
                          label.id,
                          'highFrequency',
                          value ? parseFloat(value) : undefined
                        )
                      }
                      placeholder="Hz"
                      type="number"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  );
}

export default LabelEditor;

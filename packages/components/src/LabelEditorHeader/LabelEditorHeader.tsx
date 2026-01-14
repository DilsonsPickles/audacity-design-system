/**
 * LabelEditorHeader - Header section for label editor with title and action buttons
 * Based on Figma design: node-id=8827-42958
 */

import React from 'react';
import { Button } from '../Button';
import { Separator } from '../Separator';
import { useTheme } from '../ThemeProvider';
import './LabelEditorHeader.css';

export interface LabelEditorHeaderProps {
  /**
   * Callback when Import button is clicked
   */
  onImport?: () => void;
  /**
   * Callback when Export button is clicked
   */
  onExport?: () => void;
  /**
   * Callback when Delete button is clicked
   */
  onDelete?: () => void;
  /**
   * Callback when Add label button is clicked
   */
  onAddLabel?: () => void;
  /**
   * Whether the Delete button should be disabled
   * @default false
   */
  disableDelete?: boolean;
}

/**
 * LabelEditorHeader component - Header with title and action buttons
 */
export function LabelEditorHeader({
  onImport,
  onExport,
  onDelete,
  onAddLabel,
  disableDelete = false,
}: LabelEditorHeaderProps) {
  const { theme } = useTheme();

  const style = {
    '--label-editor-header-bg': theme.background.surface.elevated,
    '--label-editor-header-border': theme.border.default,
    '--label-editor-header-text': theme.foreground.text.primary,
  } as React.CSSProperties;

  return (
    <div className="label-editor-header" style={style}>
      <h2 className="label-editor-header__title">Labels</h2>
      <div className="label-editor-header__actions">
        <Button size="small" onClick={onImport}>
          Import
        </Button>
        <Button size="small" onClick={onExport}>
          Export
        </Button>
        <Separator />
        <Button size="small" onClick={onDelete} disabled={disableDelete}>
          Delete
        </Button>
        <Button size="small" onClick={onAddLabel}>
          Add label
        </Button>
      </div>
    </div>
  );
}

export default LabelEditorHeader;

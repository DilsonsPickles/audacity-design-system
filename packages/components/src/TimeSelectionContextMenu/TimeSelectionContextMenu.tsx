import React from 'react';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';
import { useTheme } from '../ThemeProvider';
import './TimeSelectionContextMenu.css';

export interface TimeSelectionContextMenuProps {
  /**
   * Whether the menu is open
   */
  isOpen: boolean;

  /**
   * Callback when menu should close
   */
  onClose: () => void;

  /**
   * X position for the menu (in pixels)
   */
  x: number;

  /**
   * Y position for the menu (in pixels)
   */
  y: number;

  /**
   * Callback for cut operation
   */
  onCut?: () => void;

  /**
   * Callback for copy operation
   */
  onCopy?: () => void;

  /**
   * Callback for paste operation
   */
  onPaste?: () => void;

  /**
   * Callback for delete operation
   */
  onDelete?: () => void;

  /**
   * Callback for trim audio operation
   */
  onTrimAudio?: () => void;

  /**
   * Callback for split delete operation
   */
  onSplitDelete?: () => void;

  /**
   * Callback for silence audio operation
   */
  onSilence?: () => void;

  /**
   * Current cut mode ('split' | 'ripple')
   */
  cutMode?: 'split' | 'ripple';

  /**
   * Whether to auto-focus first menu item (when opened via keyboard)
   */
  autoFocus?: boolean;
}

/**
 * TimeSelectionContextMenu - Context menu for time selections
 * Shows clipboard operations (cut, copy, paste, delete) and audio operations
 */
export const TimeSelectionContextMenu: React.FC<TimeSelectionContextMenuProps> = ({
  isOpen,
  onClose,
  x,
  y,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onTrimAudio,
  onSplitDelete,
  onSilence,
  cutMode = 'split',
  autoFocus = false,
}) => {
  const { theme } = useTheme();

  const style = {
    '--time-selection-context-menu-divider-bg': theme.border.divider,
  } as React.CSSProperties;

  const deleteLabel = cutMode === 'split' ? 'Split delete' : 'Ripple delete';

  return (
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y} className="time-selection-context-menu" autoFocus={autoFocus} style={style}>
      {/* Clipboard operations */}
      <ContextMenuItem
        label="Cut"
        onClick={() => {
          onCut?.();
          onClose();
        }}
        onClose={onClose}
      />

      <ContextMenuItem
        label="Copy"
        onClick={() => {
          onCopy?.();
          onClose();
        }}
        onClose={onClose}
      />

      <ContextMenuItem
        label="Paste"
        onClick={() => {
          onPaste?.();
          onClose();
        }}
        onClose={onClose}
      />

      {/* Divider */}
      <div className="time-selection-context-menu-divider" />

      {/* Delete operation */}
      <ContextMenuItem
        label={deleteLabel}
        onClick={() => {
          onDelete?.();
          onClose();
        }}
        onClose={onClose}
      />

      {onTrimAudio && (
        <ContextMenuItem
          label="Trim audio to selection"
          onClick={() => {
            onTrimAudio();
            onClose();
          }}
          onClose={onClose}
        />
      )}

      {/* Divider */}
      <div className="time-selection-context-menu-divider" />

      {/* Audio operations */}
      {onSilence && (
        <ContextMenuItem
          label="Silence audio"
          onClick={() => {
            onSilence();
            onClose();
          }}
          onClose={onClose}
        />
      )}

      {onSplitDelete && (
        <ContextMenuItem
          label="Split delete"
          onClick={() => {
            onSplitDelete();
            onClose();
          }}
          onClose={onClose}
        />
      )}
    </ContextMenu>
  );
};

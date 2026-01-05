import React from 'react';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';
import './TrackContextMenu.css';

export interface TrackContextMenuProps {
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
   * Callback for deleting the track
   */
  onDelete?: () => void;
}

/**
 * TrackContextMenu - Context menu for audio tracks
 * Shows options for track manipulation like delete
 */
export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  isOpen,
  onClose,
  x,
  y,
  onDelete,
}) => {
  return (
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y} className="track-context-menu">
      {/* Delete track */}
      <ContextMenuItem
        label="Delete track"
        onClick={onDelete}
        onClose={onClose}
      />
    </ContextMenu>
  );
};

export default TrackContextMenu;

import React, { ReactElement, cloneElement } from 'react';
import { SidePanel } from '../SidePanel';
import { ResizablePanel } from '../ResizablePanel';
import { Button } from '../Button';
import { Icon } from '../Icon';
import type { TrackControlPanelProps } from '../TrackControlPanel';
import './TrackControlSidePanel.css';

export interface TrackControlSidePanelProps {
  /**
   * TrackControlPanel components
   */
  children: ReactElement<TrackControlPanelProps> | ReactElement<TrackControlPanelProps>[];

  /**
   * Whether the panel is resizable
   */
  resizable?: boolean;

  /**
   * Minimum width when resizing (px)
   */
  minWidth?: number;

  /**
   * Maximum width when resizing (px)
   */
  maxWidth?: number;

  /**
   * Track heights in pixels - should match timeline track heights
   */
  trackHeights?: number[];

  /**
   * Called when panel is resized
   */
  onResize?: (width: number) => void;

  /**
   * Called when "Add new" button is clicked
   */
  onAddTrack?: () => void;

  /**
   * Additional CSS class
   */
  className?: string;
}

export const TrackControlSidePanel: React.FC<TrackControlSidePanelProps> = ({
  children,
  resizable = false,
  minWidth = 280,
  maxWidth = 280,
  trackHeights = [],
  onResize,
  onAddTrack,
  className = '',
}) => {
  const childArray = React.Children.toArray(children) as ReactElement<TrackControlPanelProps>[];

  return (
    <SidePanel
      position="left"
      width={280}
      resizable={resizable}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResize={onResize}
      className={`track-control-side-panel ${className}`}
    >
      {/* Header */}
      <div className="track-control-side-panel__header">
        <h2 className="track-control-side-panel__title">Tracks</h2>
        <Button
          variant="secondary"
          size="default"
          onClick={onAddTrack}
          showIcon={true}
          icon={<Icon name="plus" size={16} />}
        >
          Add new
        </Button>
      </div>

      {/* Track list */}
      <div className="track-control-side-panel__list">
        {childArray.map((child, index) => {
          const height = trackHeights[index] || 114; // Default to 114px
          return (
            <ResizablePanel
              key={child.key || index}
              initialHeight={height}
              minHeight={44}
              maxHeight={400}
              className="track-control-side-panel__track"
            >
              {cloneElement(child, {
                ...child.props,
              })}
            </ResizablePanel>
          );
        })}
      </div>
    </SidePanel>
  );
};

export default TrackControlSidePanel;

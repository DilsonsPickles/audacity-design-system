import React from 'react';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';
import './TrackContextMenu.css';

type ClipColor = 'cyan' | 'blue' | 'violet' | 'magenta' | 'red' | 'orange' | 'yellow' | 'green' | 'teal';

const TRACK_COLORS: ClipColor[] = ['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'];

export interface TrackContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  autoFocus?: boolean;
  onDelete?: () => void;
  onColorChange?: (color: ClipColor) => void;
  onSpectrogramSettings?: () => void;
  /**
   * THIS track's height (2026-10-22, the "Track expand/collapse" design
   * brief: "single-track height control belongs in this menu"): collapse
   * it to the floor, expand it back to its open height, fit it to what
   * the other rows leave of the view. Named for ONE track, against the
   * side panel's blank-area menu, which names ALL tracks.
   */
  onCollapseTrack?: () => void;
  onExpandTrack?: () => void;
  onFitTrackToHeight?: () => void;
  /** Back to the default height, whatever it is (2026-10-29) */
  onResetTrackHeight?: () => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  isOpen,
  onClose,
  x,
  y,
  autoFocus = false,
  onDelete,
  onColorChange,
  onSpectrogramSettings,
  onCollapseTrack,
  onExpandTrack,
  onFitTrackToHeight,
  onResetTrackHeight,
}) => {
  const heightItems = [
    ['Collapse', onCollapseTrack],
    ['Expand', onExpandTrack],
    ['Fit to height', onFitTrackToHeight],
    ['Reset height', onResetTrackHeight],
  ] as const;
  const hasHeightItems = heightItems.some(([, handler]) => handler);
  return (
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y} autoFocus={autoFocus} className="track-context-menu">
      {/* Colour picker row */}
      <div className="track-context-menu__colour-row" role="group" aria-label="Track colour">
        <span className="track-context-menu__colour-label">Track colour</span>
        <div className="track-context-menu__swatches">
          {TRACK_COLORS.map((color) => (
            <button
              key={color}
              className="track-context-menu__swatch"
              style={{ backgroundColor: `var(--clip-${color}-body)` }}
              title={color.charAt(0).toUpperCase() + color.slice(1)}
              onClick={() => { onColorChange?.(color); onClose(); }}
              aria-label={`Set track colour to ${color}`}
            />
          ))}
        </div>
      </div>
      {/* The track's look stays together (2026-10-26): colour, height and
          the spectrogram's settings, then a divider before the one
          destructive action. The height is a PARENT item, "Track height",
          with the three under it. */}
      {hasHeightItems && (
        <div data-track-height-items="">
          <ContextMenuItem label="Track height" onClose={onClose}>
            {/* Reset sits apart, below a divider (2026-10-29) */}
            {heightItems.map(([label, handler]) => handler && (
              <React.Fragment key={label}>
                {label === 'Reset height' && heightItems.some(([l, h]) => l !== label && h) && (
                  <div className="context-menu-separator" />
                )}
                <ContextMenuItem
                  label={label}
                  onClick={handler}
                  onClose={onClose}
                />
              </React.Fragment>
            ))}
          </ContextMenuItem>
        </div>
      )}
      {/* Spectrogram settings */}
      {onSpectrogramSettings && (
        <ContextMenuItem
          label="Spectrogram settings..."
          onClick={() => { onSpectrogramSettings(); onClose(); }}
          onClose={onClose}
        />
      )}
      <ContextMenuItem isDivider label="" />
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

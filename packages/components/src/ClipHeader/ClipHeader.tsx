import React from 'react';
import type { ClipColor } from '../types/clip';
import { Icon } from '../Icon';
import { useTheme } from '../ThemeProvider';
import './ClipHeader.css';

export type ClipHeaderState = 'default' | 'hover';

export interface ClipHeaderProps {
  /** Clip color from the 9-color palette */
  color?: ClipColor;
  /** Whether the parent clip is selected */
  selected?: boolean;
  /** Whether the clip is within a time selection */
  inTimeSelection?: boolean;
  /** Interaction state */
  state?: ClipHeaderState;
  /** Clip name to display */
  name?: string;
  /** Width in pixels */
  width?: number;
  /** Whether to show pitch indicator */
  showPitch?: boolean;
  /** Pitch value to display */
  pitchValue?: string;
  /** Whether to show speed indicator */
  showSpeed?: boolean;
  /** Speed value to display */
  speedValue?: string;
  /** Whether to show the menu button */
  showMenu?: boolean;
  /** Click handler for the header */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Click handler for the menu button */
  onMenuClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Mouse enter handler */
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Mouse leave handler */
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Clip start time in seconds (for calculating time selection overlay position) */
  clipStartTime?: number;
  /** Clip duration in seconds (for calculating time selection overlay position) */
  clipDuration?: number;
  /** Time selection range (for calculating overlay position) */
  timeSelectionRange?: { startTime: number; endTime: number } | null;
  /** Pixels per second (timeline zoom level) */
  pixelsPerSecond?: number;
}

/**
 * ClipHeader - The header section of an audio clip
 *
 * Displays the clip name, optional pitch/speed indicators, and a menu button.
 * Uses the Audacity 9-color clip palette with proper hover and selected states.
 */
export const ClipHeader: React.FC<ClipHeaderProps> = ({
  color = 'blue',
  selected = false,
  inTimeSelection = false,
  state = 'default',
  name = 'Clip',
  width = 272,
  showPitch = false,
  pitchValue = '4.04',
  showSpeed = false,
  speedValue = '112%',
  showMenu = true,
  onClick,
  onMenuClick,
  onMouseEnter,
  onMouseLeave,
  clipStartTime = 0,
  clipDuration = 0,
  timeSelectionRange = null,
  pixelsPerSecond = 100,
}) => {
  const { theme } = useTheme();

  const style = {
    '--clip-header-text': theme.foreground.text.primary,
  } as React.CSSProperties;

  const className = [
    'clip-header',
    `clip-header--${color}`,
    `clip-header--${state}`,
    selected && 'clip-header--selected',
  ]
    .filter(Boolean)
    .join(' ');

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onMenuClick?.(e);
  };

  // Calculate time selection overlay position and width
  let timeSelectionOverlay: { left: number; width: number } | null = null;
  if (inTimeSelection && timeSelectionRange) {
    const clipEndTime = clipStartTime + clipDuration;
    const overlapStart = Math.max(clipStartTime, timeSelectionRange.startTime);
    const overlapEnd = Math.min(clipEndTime, timeSelectionRange.endTime);

    if (overlapStart < overlapEnd) {
      const selStartX = (overlapStart - clipStartTime) * pixelsPerSecond;
      const selWidth = (overlapEnd - overlapStart) * pixelsPerSecond;
      timeSelectionOverlay = { left: selStartX, width: selWidth };
    }
  }

  // Color map for time selection overlay - header-specific colors
  const timeSelectionColorMap: Record<string, string> = {
    red: '#FFC5CD',
    cyan: '#7BFFFF',
    blue: '#99E8FF',
    violet: '#CCDBFF',
    magenta: '#FFD1FF',
    orange: '#FFE3B2',
    yellow: '#FFFF9D',
    green: '#A7FFA6',
    teal: '#67F9E1',
    classic: '#89A7EE',
  };

  return (
    <div
      className={className}
      style={{ width: `${width}px`, position: 'relative', ...style }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-color={color}
      data-state={state}
      data-selected={selected}
    >
      {/* Time selection overlay */}
      {timeSelectionOverlay && (
        <div
          className="clip-header__time-selection-overlay"
          style={{
            position: 'absolute',
            left: `${timeSelectionOverlay.left}px`,
            width: `${timeSelectionOverlay.width}px`,
            top: 0,
            bottom: 0,
            backgroundColor: timeSelectionColorMap[color] || '#FFFFFF',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      <div className="clip-header__content">
        <span className="clip-header__name">{name}</span>

        <div className="clip-header__info">
          {showPitch && (
            <div className="clip-header__badge">
              <span className="clip-header__badge-icon">♪</span>
              <span className="clip-header__badge-value">{pitchValue}</span>
            </div>
          )}

          {showSpeed && (
            <div className="clip-header__badge">
              <span className="clip-header__badge-icon">⚡</span>
              <span className="clip-header__badge-value">{speedValue}</span>
            </div>
          )}

          {showMenu && (
            <button
              className="clip-header__menu-button"
              onClick={handleMenuClick}
              aria-label="Clip menu"
              type="button"
              tabIndex={-1}
            >
              <Icon name="menu" size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClipHeader;

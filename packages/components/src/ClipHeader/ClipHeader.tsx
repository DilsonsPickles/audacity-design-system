import React from 'react';
import type { ClipColor } from '../types/clip';
import { Icon } from '../Icon';
import './ClipHeader.css';

export type ClipHeaderState = 'default' | 'hover';

export interface ClipHeaderProps {
  /** Clip color from the 9-color palette */
  color?: ClipColor;
  /** Whether the parent clip is selected */
  selected?: boolean;
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
}) => {
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

  return (
    <div
      className={className}
      style={{ width: `${width}px` }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-color={color}
      data-state={state}
      data-selected={selected}
    >
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

import React from 'react';
import { Icon } from '../Icon/Icon';
import './AddTrackFlyout.css';

export type TrackType = 'mono' | 'stereo' | 'label' | 'midi';

export interface TrackTypeOption {
  type: TrackType;
  label: string;
  icon: 'microphone' | 'label' | 'midi';
}

export interface AddTrackFlyoutProps {
  /**
   * Whether the flyout is open
   */
  isOpen: boolean;

  /**
   * Callback when a track type is selected
   */
  onSelectTrackType: (type: TrackType) => void;

  /**
   * Callback when flyout should close
   */
  onClose: () => void;

  /**
   * X position for the flyout (in pixels)
   */
  x: number;

  /**
   * Y position for the flyout (in pixels)
   */
  y: number;

  /**
   * Whether to show the MIDI option (default: false)
   */
  showMidiOption?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * AddTrackFlyout - A popover menu for creating new tracks
 * Appears when the "Add Track" button is clicked
 */
export const AddTrackFlyout: React.FC<AddTrackFlyoutProps> = ({
  isOpen,
  onSelectTrackType,
  onClose,
  x,
  y,
  showMidiOption = false,
  className = '',
}) => {
  const flyoutRef = React.useRef<HTMLDivElement>(null);

  // Handle click outside to close
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Add slight delay to prevent immediate close from the button click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Handle escape key to close
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Adjust position if flyout would go off-screen
  React.useEffect(() => {
    if (!isOpen || !flyoutRef.current) return;

    const flyout = flyoutRef.current;
    const rect = flyout.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Check if flyout goes off right edge
    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    // Check if flyout goes off bottom edge
    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    // Check if flyout goes off left edge
    if (adjustedX < 0) {
      adjustedX = 10;
    }

    // Check if flyout goes off top edge
    if (adjustedY < 0) {
      adjustedY = 10;
    }

    if (adjustedX !== x || adjustedY !== y) {
      flyout.style.left = `${adjustedX}px`;
      flyout.style.top = `${adjustedY}px`;
    }
  }, [isOpen, x, y]);

  const handleOptionClick = (type: TrackType) => {
    onSelectTrackType(type);
    onClose();
  };

  if (!isOpen) return null;

  const options: TrackTypeOption[] = [
    { type: 'mono', label: 'Mono', icon: 'microphone' },
    { type: 'stereo', label: 'Stereo', icon: 'microphone' },
    { type: 'label', label: 'Label', icon: 'label' },
  ];

  if (showMidiOption) {
    options.push({ type: 'midi', label: 'MIDI', icon: 'midi' });
  }

  return (
    <div
      ref={flyoutRef}
      className={`add-track-flyout ${className}`}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10000,
      }}
    >
      <div className="add-track-flyout__triangle" />
      <div className="add-track-flyout__body">
        {options.map((option) => (
          <button
            key={option.type}
            className="add-track-flyout__option"
            onClick={() => handleOptionClick(option.type)}
          >
            <Icon name={option.icon} size={16} />
            <span className="add-track-flyout__option-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AddTrackFlyout;

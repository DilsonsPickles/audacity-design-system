'use client';

import React from 'react';
import './AddTrackFlyout.css';

export type TrackType = 'mono' | 'stereo' | 'label' | 'midi';

export interface AddTrackFlyoutProps {
  isOpen: boolean;
  onSelectTrackType: (type: TrackType) => void;
  onClose: () => void;
  x: number;
  y: number;
  showMidiOption?: boolean;
  className?: string;
}

export default function AddTrackFlyout({
  isOpen,
  onSelectTrackType,
  onClose,
  x,
  y,
  showMidiOption = false,
  className = '',
}: AddTrackFlyoutProps) {
  const flyoutRef = React.useRef<HTMLDivElement>(null);

  // Handle click outside to close
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

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

  const handleOptionClick = (type: TrackType) => {
    onSelectTrackType(type);
    onClose();
  };

  if (!isOpen) return null;

  const options = [
    { type: 'mono' as TrackType, label: 'Mono', icon: '🎤' },
    { type: 'stereo' as TrackType, label: 'Stereo', icon: '🎤' },
    { type: 'label' as TrackType, label: 'Label', icon: '🏷️' },
  ];

  if (showMidiOption) {
    options.push({ type: 'midi' as TrackType, label: 'MIDI', icon: '🎹' });
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
            <span className="add-track-flyout__option-icon">{option.icon}</span>
            <span className="add-track-flyout__option-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

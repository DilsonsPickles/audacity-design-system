import React from 'react';
import { Icon } from '../Icon';
import './AudioFileThumbnail.css';

export interface AudioFileThumbnailProps {
  /**
   * Audio file name
   */
  title?: string;
  /**
   * Date/timestamp text (e.g., "TODAY", "YESTERDAY")
   */
  dateText?: string;
  /**
   * Duration text (e.g., "3:45")
   */
  duration?: string;
  /**
   * Whether this is a cloud audio file (shows cloud icon badge)
   */
  isCloudFile?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Context menu button click handler
   */
  onContextMenu?: (e: React.MouseEvent) => void;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

// Simple waveform visualization - static pattern
const WaveformVisual = () => {
  // Static waveform pattern for consistent appearance
  const bars = [
    0.4, 0.6, 0.8, 0.9, 0.7, 0.5, 0.6, 0.8, 0.95, 0.85, 0.7, 0.6, 0.5, 0.7, 0.9, 1.0, 0.95, 0.8, 0.6, 0.5,
    0.6, 0.75, 0.85, 0.9, 0.8, 0.65, 0.5, 0.6, 0.8, 0.9, 0.85, 0.7, 0.55, 0.45, 0.6, 0.75, 0.8, 0.7, 0.5, 0.4
  ];

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 280 170"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bars.map((height, i) => {
        const x = (i / bars.length) * 280;
        const barHeight = height * 140;
        const y = (170 - barHeight) / 2;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={280 / bars.length - 1}
            height={barHeight}
            fill="#677CE4"
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
};

/**
 * AudioFileThumbnail component
 * - Shows audio file with waveform visualization
 * - Fixed dimensions: 280px × 170px
 */
export function AudioFileThumbnail({
  title = 'Audio File',
  dateText = 'TODAY',
  duration = '0:00',
  isCloudFile = false,
  onClick,
  onContextMenu,
  className = '',
}: AudioFileThumbnailProps) {
  return (
    <div className={`audio-file-thumbnail ${className}`}>
      <button
        className="audio-file-thumbnail__button"
        onClick={onClick}
        type="button"
      >
        <div className="audio-file-thumbnail__image">
          <WaveformVisual />
          {isCloudFile && (
            <div className="audio-file-thumbnail__cloud-badge">
              <Icon name="cloud-filled" size={16} />
            </div>
          )}
          {onContextMenu && (
            <button
              className="audio-file-thumbnail__context-btn"
              onClick={(e) => {
                e.stopPropagation();
                onContextMenu(e);
              }}
              type="button"
              aria-label="More options"
            >
              <Icon name="menu" size={16} />
            </button>
          )}
          <div className="audio-file-thumbnail__duration">
            {duration}
          </div>
        </div>
        <div className="audio-file-thumbnail__info">
          <div className="audio-file-thumbnail__title">{title}</div>
          <div className="audio-file-thumbnail__date">{dateText}</div>
        </div>
      </button>
    </div>
  );
}

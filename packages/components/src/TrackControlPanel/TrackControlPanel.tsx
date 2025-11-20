import React, { useState } from 'react';
import { Button } from '../Button';
import { GhostButton } from '../GhostButton';
import { Icon } from '../Icon';
import { PanKnob } from '../PanKnob';
import { Slider } from '../Slider';
import { ToggleButton } from '../ToggleButton';
import './TrackControlPanel.css';

export interface TrackControlPanelProps {
  trackName: string;
  trackType?: 'mono' | 'stereo' | 'label';
  volume?: number; // 0-100
  pan?: number; // -100 to 100
  isMuted?: boolean;
  isSolo?: boolean;
  onVolumeChange?: (volume: number) => void;
  onPanChange?: (pan: number) => void;
  onMuteToggle?: () => void;
  onSoloToggle?: () => void;
  onEffectsClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
  state?: 'idle' | 'hover' | 'active';
  height?: 'default' | 'truncated' | 'collapsed';
}

export const TrackControlPanel: React.FC<TrackControlPanelProps> = ({
  trackName,
  trackType = 'mono',
  volume = 75,
  pan = 0,
  isMuted = false,
  isSolo = false,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onEffectsClick,
  onMenuClick,
  className = '',
  state = 'idle',
  height = 'default',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate volume slider position
  const volumePercent = volume;

  const actualState = state !== 'idle' ? state : (isHovered ? 'hover' : 'idle');

  return (
    <div
      className={`track-control-panel track-control-panel--${actualState} track-control-panel--${height} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="track-control-panel__main">
        {/* Header */}
        <div className="track-control-panel__header">
          <div className="track-control-panel__track-name">
            <button className="track-control-panel__icon-button" aria-label="Track icon">
              <Icon name="mixer" size={16} />
            </button>
            <span className="track-control-panel__track-name-text">{trackName}</span>
          </div>
          <GhostButton
            onClick={onMenuClick}
            ariaLabel="Track menu"
          />
        </div>

        {/* Controls Row */}
        {height !== 'collapsed' && (
          <div className="track-control-panel__controls-row">
            {/* Pan Knob */}
            <PanKnob
              value={pan}
              onChange={onPanChange}
            />

            {/* Volume Slider */}
            <Slider
              value={volume}
              onChange={onVolumeChange}
              ariaLabel="Volume"
            />

            {/* Mute and Solo Buttons */}
            <div className="track-control-panel__button-group">
              <ToggleButton
                active={isMuted}
                onClick={onMuteToggle}
                ariaLabel="Mute"
              >
                M
              </ToggleButton>
              <ToggleButton
                active={isSolo}
                onClick={onSoloToggle}
                ariaLabel="Solo"
              >
                S
              </ToggleButton>
            </div>
          </div>
        )}

        {/* Effects Button */}
        {height === 'default' && (
          <Button
            variant="secondary"
            size="small"
            onClick={onEffectsClick}
            showIcon={false}
          >
            Effects
          </Button>
        )}
      </div>

      {/* Volume Meter */}
      {height !== 'collapsed' && (
        <div className="track-control-panel__meter">
          <div className="track-control-panel__meter-bar">
            <div className="track-control-panel__meter-clip"></div>
            <div className="track-control-panel__meter-main"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackControlPanel;

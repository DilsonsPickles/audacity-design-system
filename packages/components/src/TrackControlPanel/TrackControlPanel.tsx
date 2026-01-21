import React, { useState } from 'react';
import { useTheme } from '../ThemeProvider';
import { Button } from '../Button';
import { GhostButton } from '../GhostButton';
import { Icon } from '../Icon';
import { PanKnob } from '../PanKnob';
import { Slider } from '../Slider';
import { ToggleButton } from '../ToggleButton';
import { TrackMeter } from '../TrackMeter';
import './TrackControlPanel.css';

export interface TrackControlPanelProps {
  trackName: string;
  trackType?: 'mono' | 'stereo' | 'label';
  volume?: number; // 0-100
  pan?: number; // -100 to 100
  isMuted?: boolean;
  isSolo?: boolean;
  isFocused?: boolean;
  isMenuOpen?: boolean;
  onVolumeChange?: (volume: number) => void;
  onPanChange?: (pan: number) => void;
  onMuteToggle?: () => void;
  onSoloToggle?: () => void;
  onEffectsClick?: () => void;
  onAddLabelClick?: () => void;
  onMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClick?: () => void;
  onToggleSelection?: () => void; // Cmd/Ctrl+Click to toggle
  onRangeSelection?: () => void; // Shift+Click for range selection
  className?: string;
  state?: 'idle' | 'hover' | 'active';
  height?: 'default' | 'truncated' | 'collapsed';
  trackHeight?: number; // Actual pixel height for fine-grained responsive behavior
  tabIndex?: number;
  onFocusChange?: (hasFocus: boolean) => void;
  onNavigateVertical?: (direction: 'up' | 'down') => void;
  onTabOut?: () => void;
  // Meter props (for mono tracks, use meterLevel; for stereo, use meterLevelLeft/meterLevelRight)
  meterLevel?: number; // 0-100 - current meter level (mono)
  meterLevelLeft?: number; // 0-100 - left channel meter level (stereo)
  meterLevelRight?: number; // 0-100 - right channel meter level (stereo)
  meterClipped?: boolean; // Whether meter is clipping (mono)
  meterClippedLeft?: boolean; // Whether left channel is clipping (stereo)
  meterClippedRight?: boolean; // Whether right channel is clipping (stereo)
  meterStyle?: 'default' | 'rms'; // Meter display style
  meterRecentPeak?: number; // 0-100 - recent peak level (mono)
  meterRecentPeakLeft?: number; // 0-100 - left channel recent peak (stereo)
  meterRecentPeakRight?: number; // 0-100 - right channel recent peak (stereo)
  meterMaxPeak?: number; // 0-100 - max peak level (mono)
  meterMaxPeakLeft?: number; // 0-100 - left channel max peak (stereo)
  meterMaxPeakRight?: number; // 0-100 - right channel max peak (stereo)
}

export const TrackControlPanel: React.FC<TrackControlPanelProps> = ({
  trackName,
  trackType = 'mono',
  volume = 75,
  pan = 0,
  isMuted = false,
  isSolo = false,
  isFocused = false,
  isMenuOpen = false,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onEffectsClick,
  onAddLabelClick,
  onMenuClick,
  onClick,
  onToggleSelection,
  onRangeSelection,
  className = '',
  state = 'idle',
  height = 'default',
  trackHeight,
  tabIndex,
  onFocusChange,
  onNavigateVertical,
  onTabOut,
  meterLevel = 0,
  meterLevelLeft,
  meterLevelRight,
  meterClipped = false,
  meterClippedLeft,
  meterClippedRight,
  meterStyle = 'default',
  meterRecentPeak,
  meterRecentPeakLeft,
  meterRecentPeakRight,
  meterMaxPeak,
  meterMaxPeakLeft,
  meterMaxPeakRight,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate volume slider position
  const volumePercent = volume;

  const actualState = state !== 'idle' ? state : (isHovered ? 'hover' : 'idle');

  // Determine track icon based on type
  const getTrackIcon = () => {
    switch (trackType) {
      case 'label':
        return 'label';
      case 'stereo':
        return 'microphone';
      case 'mono':
      default:
        return 'microphone';
    }
  };

  const isLabelTrack = trackType === 'label';

  // Determine if Effect button should be visible based on actual pixel height (>= 102px)
  const showEffectButton = trackHeight ? trackHeight >= 102 : height === 'default';

  const handleFocus = (e: React.FocusEvent) => {
    // Focus entered somewhere within the panel (could be panel itself or a child)
    onFocusChange?.(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const panelElement = e.currentTarget;

    // Only notify blur if focus is moving completely outside the panel
    if (!relatedTarget || !panelElement.contains(relatedTarget)) {
      onFocusChange?.(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const panelElement = e.currentTarget as HTMLElement;
    const currentElement = document.activeElement;
    const isPanelFocused = currentElement === panelElement;

    // Handle Enter key to toggle track selection when panel is focused
    if (e.key === 'Enter' && isPanelFocused) {
      e.preventDefault();
      onToggleSelection?.();
      return;
    }

    // Handle Shift+F10 or ContextMenu key to open track menu
    if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
      e.preventDefault();
      e.stopPropagation();
      // Trigger menu click with a synthetic event
      if (onMenuClick) {
        const syntheticEvent = {
          currentTarget: panelElement.querySelector('[aria-label="Track menu"]') || panelElement,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.MouseEvent<HTMLButtonElement>;
        onMenuClick(syntheticEvent);
      }
      return;
    }

    // Handle Escape key to return focus to panel itself
    if (e.key === 'Escape' && !isPanelFocused) {
      e.preventDefault();
      panelElement.focus();
      return;
    }

    // Handle Tab key to navigate out to clips
    if (e.key === 'Tab' && !e.shiftKey && !isPanelFocused) {
      // If Tab is pressed on any nested element (not the panel itself), navigate out to clips
      e.preventDefault();
      onTabOut?.();
      return;
    }

    // Only handle arrow keys for navigation
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
      return;
    }

    // Handle up/down navigation when panel itself is focused
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && isPanelFocused) {
      e.preventDefault();
      onNavigateVertical?.(e.key === 'ArrowUp' ? 'up' : 'down');
      return;
    }

    // Only handle left/right for internal navigation
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      return;
    }

    // Find all focusable elements within the panel
    const focusableElements = panelElement.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const currentIndex = Array.from(focusableElements).indexOf(currentElement as HTMLElement);

    // If the panel itself is focused (currentIndex === -1)
    if (currentIndex === -1) {
      e.preventDefault();
      if (e.key === 'ArrowRight') {
        // Go to first element
        (focusableElements[0] as HTMLElement).focus();
      } else {
        // Go to last element (cycle backwards)
        (focusableElements[focusableElements.length - 1] as HTMLElement).focus();
      }
      return;
    }

    e.preventDefault();

    if (e.key === 'ArrowRight') {
      // Move to next element
      const nextIndex = currentIndex + 1;
      if (nextIndex >= focusableElements.length) {
        // After last element, focus back to panel itself
        panelElement.focus();
      } else {
        (focusableElements[nextIndex] as HTMLElement).focus();
      }
    } else {
      // Move to previous element
      const nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        // Before first element, focus back to panel itself
        panelElement.focus();
      } else {
        (focusableElements[nextIndex] as HTMLElement).focus();
      }
    }
  };

  const { theme } = useTheme();

  const style = {
    '--tcp-bg-idle': theme.background.surface.subtle,
    '--tcp-bg-hover': theme.background.surface.hover,
    '--tcp-bg-active': theme.background.surface.default,
    '--tcp-text-primary': theme.foreground.text.primary,
    '--tcp-icon-default': theme.foreground.icon.primary,
    '--tcp-focus-color': theme.border.focus,
  } as React.CSSProperties;

  const handleClick = (e: React.MouseEvent) => {
    // Shift+Click: Range selection (select all tracks between last selected and clicked)
    if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
      onRangeSelection?.();
      return;
    }
    // Cmd/Ctrl+Click: Toggle individual track in/out of selection
    if (e.metaKey || e.ctrlKey) {
      onToggleSelection?.();
      return;
    }
    // Regular click: Select only this track
    onClick?.();
  };

  return (
    <div
      className={`track-control-panel track-control-panel--${actualState} track-control-panel--${height} ${isFocused ? 'track-control-panel--focused' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      tabIndex={tabIndex}
      role={tabIndex !== undefined ? "group" : undefined}
      aria-label={tabIndex !== undefined ? `${trackName} track controls` : undefined}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={style}
    >
      <div className="track-control-panel__main">
        {/* Header */}
        <div className="track-control-panel__header">
          <div className="track-control-panel__track-name">
            <button className="track-control-panel__icon-button" aria-label="Track icon" tabIndex={-1}>
              <Icon name={getTrackIcon()} size={16} className="track-control-panel__icon" />
            </button>
            <span className="track-control-panel__track-name-text">{trackName}</span>
          </div>

          <div className="track-control-panel__header-right">
            {/* Mute and Solo buttons - shown in header when height <= 70px */}
            {!isLabelTrack && trackHeight && trackHeight <= 70 && (
              <div className="track-control-panel__button-group">
                <ToggleButton
                  active={isMuted}
                  onClick={onMuteToggle}
                  ariaLabel="Mute"
                  tabIndex={-1}
                >
                  M
                </ToggleButton>
                <ToggleButton
                  active={isSolo}
                  onClick={onSoloToggle}
                  ariaLabel="Solo"
                  tabIndex={-1}
                >
                  S
                </ToggleButton>
              </div>
            )}

            <GhostButton
              onClick={onMenuClick}
              active={isMenuOpen}
              ariaLabel="Track menu"
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Controls Row - Hidden for label tracks and when height <= 70px */}
        {!isLabelTrack && (!trackHeight || trackHeight > 70) && (
          <div className="track-control-panel__controls-row">
            {/* Pan Knob */}
            <PanKnob
              value={pan}
              onChange={onPanChange}
              tabIndex={-1}
            />

            {/* Volume Slider */}
            <Slider
              value={volume}
              onChange={onVolumeChange}
              ariaLabel="Volume"
              tabIndex={-1}
            />

            {/* Mute and Solo Buttons - shown in controls row when height > 70px */}
            <div className="track-control-panel__button-group">
              <ToggleButton
                active={isMuted}
                onClick={onMuteToggle}
                ariaLabel="Mute"
                tabIndex={-1}
              >
                M
              </ToggleButton>
              <ToggleButton
                active={isSolo}
                onClick={onSoloToggle}
                ariaLabel="Solo"
                tabIndex={-1}
              >
                S
              </ToggleButton>
            </div>
          </div>
        )}

        {/* Bottom Button - show when track height >= 100px */}
        {showEffectButton && (
          <Button
            variant="secondary"
            size="small"
            onClick={isLabelTrack ? onAddLabelClick : onEffectsClick}
            showIcon={false}
            tabIndex={-1}
          >
            {isLabelTrack ? 'Add label' : 'Effects'}
          </Button>
        )}
      </div>

      {/* Volume Meter - Always visible (empty for label tracks to maintain alignment) */}
      <div className="track-control-panel__meter">
        {!isLabelTrack && (
          trackType === 'stereo' ? (
            <>
              {/* Left channel meter */}
              <TrackMeter
                variant="stereo"
                volume={meterLevelLeft ?? 0}
                clipped={meterClippedLeft ?? false}
                meterStyle={meterStyle}
                recentPeak={meterRecentPeakLeft}
                maxPeak={meterMaxPeakLeft}
              />
              {/* Right channel meter */}
              <TrackMeter
                variant="stereo"
                volume={meterLevelRight ?? 0}
                clipped={meterClippedRight ?? false}
                meterStyle={meterStyle}
                recentPeak={meterRecentPeakRight}
                maxPeak={meterMaxPeakRight}
              />
            </>
          ) : (
            /* Mono meter */
            <TrackMeter
              variant="mono"
              volume={meterLevel}
              clipped={meterClipped}
              meterStyle={meterStyle}
              recentPeak={meterRecentPeak}
              maxPeak={meterMaxPeak}
            />
          )
        )}
      </div>
    </div>
  );
};

export default TrackControlPanel;

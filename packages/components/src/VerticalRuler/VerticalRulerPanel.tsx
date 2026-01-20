import React, { useEffect, useRef } from 'react';
import { VerticalRuler } from './VerticalRuler';
import { useTheme } from '../ThemeProvider';
import './VerticalRulerPanel.css';

export interface TrackRulerConfig {
  /** Track ID */
  id: string;
  /** Track height in pixels */
  height: number;
  /** Whether track is selected */
  selected?: boolean;
  /** Whether track is stereo (shows two rulers) */
  stereo?: boolean;
  /** Track type */
  type?: 'mono' | 'stereo';
}

export interface VerticalRulerPanelProps {
  /**
   * Array of track configurations
   */
  tracks: TrackRulerConfig[];
  /**
   * Width of the panel
   * @default 32
   */
  width?: number;
  /**
   * Height of the header (ruler header)
   * @default 40
   */
  headerHeight?: number;
  /**
   * Gap between tracks
   * @default 2
   */
  trackGap?: number;
  /**
   * Vertical scroll offset in pixels
   * @default 0
   */
  scrollY?: number;
  /**
   * Mouse cursor Y position in pixels (relative to tracks container)
   */
  cursorY?: number;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * VerticalRulerPanel component
 *
 * Panel on the right side of the canvas showing vertical amplitude rulers for each track.
 * Enabled by "Show vertical rulers" in the timeline ruler context menu.
 */
export const VerticalRulerPanel: React.FC<VerticalRulerPanelProps> = ({
  tracks,
  width = 32,
  headerHeight = 40,
  trackGap = 2,
  scrollY = 0,
  cursorY,
  className = '',
}) => {
  const { theme } = useTheme();
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-focus the selected track
  useEffect(() => {
    const selectedIndex = tracks.findIndex(track => track.selected);
    if (selectedIndex !== -1 && trackRefs.current[selectedIndex]) {
      trackRefs.current[selectedIndex]?.focus();
    }
  }, [tracks]);

  const style = {
    '--panel-width': `${width}px`,
    '--panel-header-height': `${headerHeight}px`,
    '--panel-track-gap': `${trackGap}px`,
    '--panel-header-bg': theme.background.surface.subtle,
    '--panel-header-border': theme.border.default,
    '--panel-canvas-bg': theme.background.canvas.default,
    '--panel-grid-border': '#323644',
    '--panel-track-idle': theme.background.canvas.default,
    '--panel-track-selected': theme.background.canvas.track.selected,
    '--panel-track-selected-border': theme.border.focus,
    '--vrp-focus-color': theme.border.focus,
  } as React.CSSProperties;

  return (
    <div className={`vertical-ruler-panel ${className}`} style={style}>
      {/* Header - fixed at top */}
      {headerHeight > 0 && (
        <div className="vertical-ruler-panel__header" />
      )}

      {/* Tracks container */}
      <div className="vertical-ruler-panel__tracks" style={{ transform: `translateY(-${scrollY}px)` }}>
        {/* Horizontal cursor line */}
        {cursorY !== undefined && (
          <div
            className="vertical-ruler-panel__cursor"
            style={{
              top: `${cursorY}px`,
              width: '100%',
            }}
          />
        )}

        {tracks.map((track, index) => (
          <React.Fragment key={track.id}>
            {/* Track ruler */}
            <div
              ref={(el) => (trackRefs.current[index] = el)}
              className={`vertical-ruler-panel__track ${
                track.selected ? 'vertical-ruler-panel__track--selected' : ''
              }`}
              style={{ height: `${track.height}px` }}
              tabIndex={track.selected ? 0 : -1}
            >
              {/* 20px spacer to align with clip header recess */}
              <div className="vertical-ruler-panel__track-spacer" />

              {track.stereo ? (
                // Stereo track - two rulers stacked
                <div className="vertical-ruler-panel__stereo">
                  <VerticalRuler
                    height={track.height / 2 - 1 - 20}
                    min={-1.0}
                    max={1.0}
                    majorDivisions={3}
                    minorDivisions={1}
                    position="right"
                    width={width}
                    headerHeight={0}
                  />
                  <div className="vertical-ruler-panel__stereo-divider" />
                  <VerticalRuler
                    height={track.height / 2 - 1 - 20}
                    min={-1.0}
                    max={1.0}
                    majorDivisions={3}
                    minorDivisions={1}
                    position="right"
                    width={width}
                    headerHeight={0}
                  />
                </div>
              ) : (
                // Mono track - single ruler
                <VerticalRuler
                  height={track.height - 20}
                  min={-1.0}
                  max={1.0}
                  majorDivisions={5}
                  minorDivisions={4}
                  position="right"
                  width={width}
                  headerHeight={0}
                />
              )}
            </div>

            {/* Track gap (except after last track) */}
            {index < tracks.length - 1 && (
              <div className="vertical-ruler-panel__track-gap" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default VerticalRulerPanel;

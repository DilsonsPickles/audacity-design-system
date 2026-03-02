import React, { useEffect, useRef } from 'react';
import { VerticalRuler } from './VerticalRuler';
import { DbRuler } from './DbRuler';
import { FrequencyRuler } from './FrequencyRuler';
import type { SpectrogramScale } from './FrequencyRuler';
import type { WaveformRulerFormat } from '../RulerFlyout';
import { getScaleMinFreq } from '../utils/spectrogramScales';
import { useTheme } from '../ThemeProvider';
import './VerticalRulerPanel.css';

export interface TrackRulerConfig {
  /** Track ID */
  id: string;
  /** Track height in pixels */
  height: number;
  /** Whether track is selected */
  selected?: boolean;
  /** Whether track has focus */
  focused?: boolean;
  /** Whether the track container in the canvas has keyboard focus */
  containerFocused?: boolean;
  /** Whether track is stereo (shows two rulers) */
  stereo?: boolean;
  /** Track type */
  type?: 'mono' | 'stereo';
  /** View mode - determines which ruler to show */
  viewMode?: 'waveform' | 'spectrogram' | 'split';
  /** Track type - label tracks show no ruler */
  trackType?: 'audio' | 'label';
  /** Split ratio for split view (0-1, default 0.5) */
  channelSplitRatio?: number;
  /** Waveform ruler format for this track */
  waveformRulerFormat?: WaveformRulerFormat;
  /** Spectrogram scale for this track */
  spectrogramScale?: SpectrogramScale;
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
  /**
   * Frequency scale for spectrogram ruler
   * @default 'mel'
   */
  spectrogramScale?: SpectrogramScale;
  /**
   * Waveform ruler format (deprecated — use per-track waveformRulerFormat in TrackRulerConfig instead)
   * @default 'linear-amp'
   * @deprecated
   */
  waveformRulerFormat?: WaveformRulerFormat;
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
  spectrogramScale,
  waveformRulerFormat = 'linear-amp',
}) => {
  const { theme } = useTheme();
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevFocusedIndexRef = useRef<number>(-1);

  // Auto-focus the focused track (only when focus changes)
  useEffect(() => {
    const focusedIndex = tracks.findIndex(track => track.focused);
    if (focusedIndex !== prevFocusedIndexRef.current && focusedIndex !== -1 && trackRefs.current[focusedIndex]) {
      trackRefs.current[focusedIndex]?.focus();
      prevFocusedIndexRef.current = focusedIndex;
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

        {tracks.map((track, index) => {
          // Per-track values, falling back to panel-level props, then defaults
          const format = track.waveformRulerFormat ?? waveformRulerFormat;
          const specScale = track.spectrogramScale ?? spectrogramScale ?? 'mel';

          return (
          <React.Fragment key={track.id}>
            {/* Track ruler */}
            <div
              ref={(el) => (trackRefs.current[index] = el)}
              className={`vertical-ruler-panel__track ${
                track.focused ? 'vertical-ruler-panel__track--focused' : ''
              } ${track.containerFocused ? 'vertical-ruler-panel__track--container-focused' : ''}`}
              style={{ height: `${track.height}px` }}
            >
              {/* 20px spacer to align with clip header recess (hidden for label tracks and when track is too small) */}
              {track.trackType !== 'label' && track.height > 44 && (
                <div className="vertical-ruler-panel__track-spacer" />
              )}

              {track.trackType === 'label' ? (
                // Label tracks - no ruler needed
                null
              ) : track.viewMode === 'split' ? (
                // Split view - frequency ruler on top, amplitude ruler on bottom
                (() => {
                  const splitRatio = track.channelSplitRatio ?? 0.5;
                  const spacerHeight = track.height > 44 ? 20 : 0;
                  const availableHeight = track.height - spacerHeight;
                  const topHeight = availableHeight * splitRatio;
                  const bottomHeight = availableHeight * (1 - splitRatio);

                  return (
                    <div className="vertical-ruler-panel__split">
                      <FrequencyRuler
                        height={topHeight}
                        minFreq={getScaleMinFreq(specScale)}
                        maxFreq={22050}
                        scale={specScale}
                        position="right"
                        width={width}
                        headerHeight={0}
                      />
                      <div className="vertical-ruler-panel__split-divider" />
                      {format === 'linear-amp' ? (
                        <VerticalRuler
                          height={bottomHeight}
                          min={-1.0}
                          max={1.0}
                          majorDivisions={5}
                          minorDivisions={4}
                          position="right"
                          width={width}
                          headerHeight={0}
                        />
                      ) : (
                        <DbRuler
                          height={bottomHeight}
                          scale={format === 'logarithmic-db' ? 'logarithmic' : 'linear'}
                          position="right"
                          width={width}
                          headerHeight={0}
                        />
                      )}
                    </div>
                  );
                })()
              ) : track.viewMode === 'spectrogram' ? (
                // Spectrogram mode - frequency ruler
                <FrequencyRuler
                  height={track.height - (track.height > 44 ? 20 : 0)}
                  minFreq={getScaleMinFreq(specScale)}
                  maxFreq={22050}
                  scale={specScale}
                  position="right"
                  width={width}
                  headerHeight={0}
                />
              ) : track.stereo ? (
                // Stereo track - two rulers stacked
                (() => {
                  const splitRatio = track.channelSplitRatio ?? 0.5;
                  const spacerHeight = track.height > 44 ? 20 : 0;
                  const availableHeight = track.height - spacerHeight;
                  const topHeight = availableHeight * splitRatio;
                  const bottomHeight = availableHeight * (1 - splitRatio);

                  return (
                    <div className="vertical-ruler-panel__stereo">
                      {format === 'linear-amp' ? (
                        <VerticalRuler
                          height={topHeight}
                          min={-1.0}
                          max={1.0}
                          majorDivisions={3}
                          minorDivisions={1}
                          position="right"
                          width={width}
                          headerHeight={0}
                        />
                      ) : (
                        <DbRuler
                          height={topHeight}
                          scale={format === 'logarithmic-db' ? 'logarithmic' : 'linear'}
                          position="right"
                          width={width}
                          headerHeight={0}
                        />
                      )}
                      <div className="vertical-ruler-panel__stereo-divider" />
                      {format === 'linear-amp' ? (
                        <VerticalRuler
                          height={bottomHeight}
                          min={-1.0}
                          max={1.0}
                          majorDivisions={3}
                          minorDivisions={1}
                          position="right"
                          width={width}
                          headerHeight={0}
                        />
                      ) : (
                        <DbRuler
                          height={bottomHeight}
                          scale={format === 'logarithmic-db' ? 'logarithmic' : 'linear'}
                          position="right"
                          width={width}
                          headerHeight={0}
                        />
                      )}
                    </div>
                  );
                })()
              ) : format === 'linear-amp' ? (
                // Waveform mode - amplitude ruler
                <VerticalRuler
                  height={track.height - (track.height > 44 ? 20 : 0)}
                  min={-1.0}
                  max={1.0}
                  majorDivisions={5}
                  minorDivisions={4}
                  position="right"
                  width={width}
                  headerHeight={0}
                />
              ) : (
                // Waveform mode - dB ruler
                <DbRuler
                  height={track.height - (track.height > 44 ? 20 : 0)}
                  scale={format === 'logarithmic-db' ? 'logarithmic' : 'linear'}
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
        );
        })}
      </div>
    </div>
  );
};

export default VerticalRulerPanel;

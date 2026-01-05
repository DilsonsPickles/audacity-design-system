import React, { useState } from 'react';
import type { ClipColor } from '../types/clip';
import { ClipHeader } from '../ClipHeader/ClipHeader';
import { ClipBody, ClipBodyVariant, ClipBodyChannelMode } from '../ClipBody/ClipBody';
import type { EnvelopePointData } from '../utils/envelope';
import './ClipDisplay.css';

export type ClipState = 'default' | 'headerHover';

const MIN_CLIP_HEIGHT = 44; // Minimum height before header is hidden
const HEADER_HEIGHT = 20;

export interface ClipDisplayProps {
  /** Clip color from the 9-color palette */
  color?: ClipColor;
  /** Whether the clip is selected */
  selected?: boolean;
  /** Interaction state */
  state?: ClipState;
  /** Clip name to display in header */
  name?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Visualization type */
  variant?: ClipBodyVariant;
  /** Channel display mode */
  channelMode?: ClipBodyChannelMode;
  /** Waveform image URL (optional) */
  waveformSrc?: string;
  /** Waveform data array (normalized -1 to 1) - for mono */
  waveformData?: number[];
  /** Left channel waveform data (for stereo) */
  waveformLeft?: number[];
  /** Right channel waveform data (for stereo) */
  waveformRight?: number[];
  /** Split ratio for stereo channels (0-1, default 0.5 for 50/50) */
  channelSplitRatio?: number;
  /** Envelope points for automation curve */
  envelope?: EnvelopePointData[];
  /** Whether to show the envelope overlay */
  showEnvelope?: boolean;
  /** Clip duration in seconds (needed for envelope rendering) */
  clipDuration?: number;
  /** Points to hide during drag (eating behavior) */
  hiddenPointIndices?: number[];
  /** Index of point being hovered (for hover visual feedback) */
  hoveredPointIndex?: number | null;
  /** Callback when clip header is clicked */
  onHeaderClick?: () => void;
  /** Callback when clip menu button is clicked */
  onMenuClick?: (x: number, y: number) => void;
}

/**
 * ClipDisplay - A visual representation of an audio clip
 *
 * This component displays a simplified clip with header and body areas,
 * using the Audacity 9-color clip palette. Composed of ClipHeader and ClipBody.
 *
 * When height ≤ 44px, enters "truncated" mode where header is hidden until hover.
 */
export const ClipDisplay: React.FC<ClipDisplayProps> = ({
  color = 'blue',
  selected = false,
  state = 'default',
  name = 'Clip',
  width = 224,
  height = 104,
  variant = 'waveform',
  channelMode = 'mono',
  waveformSrc,
  waveformData,
  waveformLeft,
  waveformRight,
  channelSplitRatio = 0.5,
  envelope,
  showEnvelope = false,
  clipDuration,
  hiddenPointIndices = [],
  hoveredPointIndex = null,
  onHeaderClick,
  onMenuClick,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isHeaderHovering, setIsHeaderHovering] = useState(false);

  const isTruncated = height <= MIN_CLIP_HEIGHT;
  const showHeader = !isTruncated || isHovering;

  const className = [
    'clip-display',
    selected && 'clip-display--selected',
    isTruncated && 'clip-display--truncated',
    isTruncated && isHovering && 'clip-display--truncated-hover',
  ]
    .filter(Boolean)
    .join(' ');

  // In truncated mode, body always takes full height
  // Header overlays on top when visible
  const bodyHeight = isTruncated ? height : height - HEADER_HEIGHT;

  return (
    <div
      className={className}
      style={{ width: `${width}px`, height: `${height}px`, position: 'relative' }}
      data-color={color}
      data-state={state}
      data-selected={selected}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {showHeader && (
        <div
          style={isTruncated ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 } : undefined}
          onMouseEnter={() => setIsHeaderHovering(true)}
          onMouseLeave={() => setIsHeaderHovering(false)}
        >
          <ClipHeader
            color={color}
            selected={selected}
            state={isHeaderHovering ? 'hover' : 'default'}
            name={name}
            width={width}
            showMenu={true}
            onClick={(e) => {
              e.stopPropagation();
              onHeaderClick?.();
            }}
            onMenuClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onMenuClick?.(rect.right, rect.bottom);
            }}
          />
        </div>
      )}
      <ClipBody
        color={color}
        selected={selected}
        variant={variant}
        channelMode={channelMode}
        width={width}
        height={bodyHeight}
        waveformSrc={waveformSrc}
        waveformData={waveformData}
        waveformLeft={waveformLeft}
        waveformRight={waveformRight}
        channelSplitRatio={channelSplitRatio}
        envelope={envelope}
        showEnvelope={showEnvelope}
        clipDuration={clipDuration}
        hiddenPointIndices={hiddenPointIndices}
        hoveredPointIndex={hoveredPointIndex}
      />
    </div>
  );
};

export default ClipDisplay;

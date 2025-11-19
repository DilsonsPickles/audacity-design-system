'use client';

import { useState, useRef, useEffect } from 'react';
import TrackHeader from './TrackHeader';
import { Track } from './types';

interface ResizableTrackHeaderProps {
  track: Track;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  height: number;
  onSelect: () => void;
  onHeightChange: (newHeight: number) => void;
  isFirstTrack?: boolean;
}

export default function ResizableTrackHeader({
  track,
  index,
  isSelected,
  isFocused,
  height,
  onSelect,
  onHeightChange,
  isFirstTrack = false,
}: ResizableTrackHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCursor, setResizeCursor] = useState(false);
  const resizeStartRef = useRef<{ y: number; height: number } | null>(null);

  // Add document-level event listeners for dragging beyond component bounds
  useEffect(() => {
    if (!isResizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (resizeStartRef.current) {
        const deltaY = e.clientY - resizeStartRef.current.y;
        const newHeight = Math.max(44, resizeStartRef.current.height + deltaY);
        onHeightChange(newHeight);
      }
    };

    const handleDocumentMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isResizing, onHeightChange]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizing) {
      // Check if hovering over the bottom edge of the track header (last 8px)
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const topPadding = isFirstTrack ? 2 : 0;
      const trackBottom = topPadding + height;
      const resizeZoneStart = trackBottom - 8; // 8px resize zone at bottom of track
      const inResizeZone = y >= resizeZoneStart && y <= trackBottom;

      setResizeCursor(inResizeZone);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const topPadding = isFirstTrack ? 2 : 0;
    const trackBottom = topPadding + height;
    const resizeZoneStart = trackBottom - 8;
    const inResizeZone = y >= resizeZoneStart && y <= trackBottom;

    if (inResizeZone) {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = { y: e.clientY, height };
    }
  };

  const handleMouseLeave = () => {
    if (!isResizing) {
      setResizeCursor(false);
    }
  };

  return (
    <div
      style={{
        marginTop: isFirstTrack ? '2px' : '0',
        marginBottom: '2px',
        position: 'relative',
      }}
    >
      <div
        style={{
          cursor: resizeCursor ? 'ns-resize' : 'default',
          position: 'relative',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
      >
        <TrackHeader
          trackName={track.name}
          isSelected={isSelected}
          isFocused={isFocused}
          height={height}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { CLIP_STRIP_HEIGHT } from './constants';
import type { PianoRollTimeMode } from './types';
import type { MidiClip, SnapGrid } from '@audacity-ui/core';

export interface PianoRollClipStripProps {
  clips: MidiClip[];
  activeClipId?: number;
  pixelsPerSecond: number;
  scrollX: number;
  width: number;
  timeOffset: number;
  snap: SnapGrid;
  bpm: number;
  timeMode?: PianoRollTimeMode;
  onResizeClip?: (edge: 'left' | 'right', newStart: number, newDuration: number, clipId: number) => void;
  onSelectClip?: (clipId: number) => void;
  trackColor?: string;
}

const EDGE_WIDTH = 6;

export const PianoRollClipStrip: React.FC<PianoRollClipStripProps> = ({
  clips,
  activeClipId,
  pixelsPerSecond,
  scrollX,
  width,
  timeOffset,
  snap,
  bpm,
  onResizeClip,
  onSelectClip,
  trackColor,
  timeMode = 'global',
}) => {
  const { theme } = useTheme();
  const pr = theme.audio.pianoRoll;
  const clipColors = trackColor ? (theme.audio.clip as Record<string, any>)[trackColor] : null;
  const dragRef = useRef<{
    clipId: number;
    edge: 'left' | 'right';
    initialStart: number;
    initialDuration: number;
    startMouseX: number;
  } | null>(null);

  const snapTime = useCallback((t: number): number => {
    const beatDuration = 60 / bpm;
    const subDivisions = snap.subdivision * (snap.triplet ? 1.5 : 1);
    const gridStep = beatDuration / subDivisions;
    return Math.round(t / gridStep) * gridStep;
  }, [bpm, snap]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaX = e.clientX - drag.startMouseX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (drag.edge === 'left') {
        const newStart = snapTime(drag.initialStart + deltaTime);
        const endTime = drag.initialStart + drag.initialDuration;
        const newDuration = endTime - newStart;
        if (newDuration > 0) {
          onResizeClip?.('left', newStart, newDuration, drag.clipId);
        }
      } else {
        const newEnd = snapTime(drag.initialStart + drag.initialDuration + deltaTime);
        const newDuration = newEnd - drag.initialStart;
        if (newDuration > 0) {
          onResizeClip?.('right', drag.initialStart, newDuration, drag.clipId);
        }
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pixelsPerSecond, snapTime, onResizeClip]);

  const handleEdgeMouseDown = useCallback((
    e: React.MouseEvent,
    clipId: number,
    edge: 'left' | 'right',
    clipStart: number,
    clipDuration: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      clipId,
      edge,
      initialStart: clipStart,
      initialDuration: clipDuration,
      startMouseX: e.clientX,
    };
    document.body.style.cursor = 'ew-resize';
  }, []);

  const handleClipClick = useCallback((e: React.MouseEvent, clipId: number) => {
    e.stopPropagation();
    onSelectClip?.(clipId);
  }, [onSelectClip]);

  return (
    <div
      style={{
        position: 'relative',
        height: CLIP_STRIP_HEIGHT,
        flexShrink: 0,
        background: `linear-gradient(${pr.background}, rgba(255,255,255,0.04) 0%, ${pr.background})`,
        borderBottom: `1px solid ${pr.gridSubdivision}`,
        overflow: 'hidden',
      }}
    >
      {clips.map((clip) => {
        const x = (clip.start - timeOffset) * pixelsPerSecond - scrollX;
        const w = clip.duration * pixelsPerSecond;

        // Skip if entirely out of view
        if (x + w < 0 || x > width) return null;

        const isActive = clip.id === activeClipId;
        const isGhost = !isActive && timeMode === 'local';
        const baseColor = clipColors?.header ?? pr.noteFill;

        return (
          <div
            key={clip.id}
            style={{
              position: 'absolute',
              left: x,
              top: 2,
              width: w,
              height: CLIP_STRIP_HEIGHT - 4,
              background: baseColor,
              opacity: isActive ? 1 : 0.4,
              borderRadius: 2,
              cursor: isGhost || (timeMode === 'local' && clip.id === activeClipId) ? 'default' : 'pointer',
              pointerEvents: isGhost ? 'none' : undefined,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseDown={isGhost || (timeMode === 'local' && clip.id === activeClipId) ? undefined : (e) => handleClipClick(e, clip.id)}
          >
            {/* Clip name */}
            <span
              style={{
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                color: '#fff',
                paddingLeft: 4,
                pointerEvents: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {clip.name}
            </span>

            {/* Left edge handle — hidden for ghost clips */}
            {!isGhost && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: EDGE_WIDTH,
                  height: '100%',
                  cursor: 'ew-resize',
                }}
                onMouseDown={(e) => handleEdgeMouseDown(e, clip.id, 'left', clip.start, clip.duration)}
              />
            )}

            {/* Right edge handle — hidden for ghost clips */}
            {!isGhost && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: EDGE_WIDTH,
                  height: '100%',
                  cursor: 'ew-resize',
                }}
                onMouseDown={(e) => handleEdgeMouseDown(e, clip.id, 'right', clip.start, clip.duration)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { PanelHeader } from '../PanelHeader';
import { PianoRollSidebar } from './PianoRollSidebar';
import { PianoKeyboard } from './PianoKeyboard';
import { PianoRollRuler } from './PianoRollRuler';
import { PianoRollClipStrip } from './PianoRollClipStrip';
import { NoteGrid } from './NoteGrid';
import {
  DEFAULT_PANEL_HEIGHT,
  MIN_PANEL_HEIGHT,
  DEFAULT_SCROLL_Y,
  NOTE_HEIGHT,
  PIANO_KEY_WIDTH,
  HEADER_HEIGHT,
  RULER_HEIGHT,
  CLIP_STRIP_HEIGHT,
} from './constants';
import type { PianoRollPanelProps } from './types';

export const PianoRollPanel: React.FC<PianoRollPanelProps> = ({
  clip,
  allClips,
  bpm,
  beatsPerMeasure,
  pixelsPerSecond,
  scrollX,
  snap,
  timeBasis,
  onSnapChange,
  onTimeBasisChange,
  onAddNote,
  onDeleteNotes,
  onUpdateNote,
  onMoveNotes,
  onResizeNote,
  onSelectNote,
  onSelectNotes,
  onDeselectAll,
  onPixelsPerSecondChange,
  onScrollXChange,
  onClose,
  onCreateClipWithNote,
  onResizeClip,
  onSelectClip,
  trackColor,
  playheadPosition,
  timeMode = 'global',
  hideHeader = false,
  height: externalHeight,
}) => {
  const { theme } = useTheme();
  const pr = theme.audio.pianoRoll;

  const [internalHeight, setInternalHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [scrollY, setScrollY] = useState(DEFAULT_SCROLL_Y);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(800);

  // Use external height when provided, otherwise internal
  const panelHeight = externalHeight ?? internalHeight;
  const hasOwnHeader = !hideHeader;

  // Measure grid width: total width - sidebar - piano keyboard
  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGridWidth(Math.max(0, entry.contentRect.width - PIANO_KEY_WIDTH));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Top-edge resize handle (only when managing own header)
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaY = e.clientY - resizeRef.current.startY;
      const newHeight = Math.max(MIN_PANEL_HEIGHT, resizeRef.current.startHeight - deltaY);
      setInternalHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = { startY: e.clientY, startHeight: panelHeight };
  }, [panelHeight]);

  const contentHeight = hasOwnHeader ? panelHeight - HEADER_HEIGHT : panelHeight;
  const gridHeight = contentHeight - RULER_HEIGHT - CLIP_STRIP_HEIGHT;
  const timeOffset = timeMode === 'local' ? (clip?.start ?? 0) : 0;

  return (
    <div
      style={{
        height: panelHeight,
        background: pr.background,
        ...(hasOwnHeader ? { borderTop: `1px solid ${theme.border.onElevated}` } : {}),
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Header (resize via top edge) — only when not managed externally */}
      {hasOwnHeader && (
        <PanelHeader
          tabs={[{ id: 'piano-roll', label: 'Piano roll' }]}
          activeTabId="piano-roll"
          onClose={onClose}
          onResizeStart={handleResizeStart}
        />
      )}

      {/* Main content: Sidebar | Keyboard + Ruler/Grid */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <PianoRollSidebar
          snap={snap}
          timeBasis={timeBasis}
          onSnapChange={onSnapChange}
          onTimeBasisChange={onTimeBasisChange}
        />

        {/* Main content: Keyboard + (Ruler + Grid) */}
        <div
          ref={mainContentRef}
          style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
        >
          {/* Piano keyboard (aligned: empty top for ruler, then keys) */}
          <PianoKeyboard
            scrollY={scrollY}
            noteHeight={NOTE_HEIGHT}
            height={contentHeight}
          />

          {/* Ruler + Grid column */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative' }}>
            {/* Timeline ruler */}
            <PianoRollRuler
              width={gridWidth}
              scrollX={scrollX}
              pixelsPerSecond={pixelsPerSecond}
              bpm={bpm}
              beatsPerMeasure={beatsPerMeasure}
              snap={snap}
              timeBasis={timeBasis}
            />

            {/* Clip strip */}
            <PianoRollClipStrip
              clips={allClips ?? (clip ? [clip] : [])}
              activeClipId={clip?.id}
              pixelsPerSecond={pixelsPerSecond}
              scrollX={scrollX}
              width={gridWidth}
              timeOffset={timeOffset}
              snap={snap}
              bpm={bpm}
              onResizeClip={onResizeClip ? (edge, newStart, newDuration, clipId) => onResizeClip(edge, newStart, newDuration, clipId) : undefined}
              onSelectClip={onSelectClip}
              trackColor={trackColor}
              timeMode={timeMode}
            />

            {/* Note grid */}
            <NoteGrid
              clip={clip}
              allClips={allClips}
              bpm={bpm}
              beatsPerMeasure={beatsPerMeasure}
              pixelsPerSecond={pixelsPerSecond}
              scrollX={scrollX}
              scrollY={scrollY}
              noteHeight={NOTE_HEIGHT}
              snap={snap}
              timeBasis={timeBasis}
              timeMode={timeMode}
              width={gridWidth}
              height={gridHeight}
              onAddNote={onAddNote}
              onDeleteNotes={onDeleteNotes}
              onUpdateNote={onUpdateNote}
              onMoveNotes={onMoveNotes}
              onResizeNote={onResizeNote}
              onSelectNote={onSelectNote}
              onSelectNotes={onSelectNotes}
              onDeselectAll={onDeselectAll}
              onScrollYChange={setScrollY}
              onPixelsPerSecondChange={onPixelsPerSecondChange}
              onScrollXChange={onScrollXChange}
              onResizeClip={onResizeClip}
              trackColor={trackColor}
            />

            {/* Playhead cursor */}
            {playheadPosition !== undefined && (() => {
              const localPlayhead = timeMode === 'local' ? playheadPosition - (clip?.start ?? 0) : playheadPosition;
              const playheadX = localPlayhead * pixelsPerSecond - scrollX;
              return playheadX >= 0 && playheadX <= gridWidth ? (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: playheadX,
                  width: 1,
                  height: '100%',
                  background: '#ffffff',
                  boxShadow: '-1px 0 0 #000000, 1px 0 0 #000000',
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              />
              ) : null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

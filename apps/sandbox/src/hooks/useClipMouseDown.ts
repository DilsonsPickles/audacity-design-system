import { MutableRefObject } from 'react';
import { CLIP_CONTENT_OFFSET } from '@audacity-ui/components';
import { calculateLabelRows, isPointInLabel } from '../utils/labelLayout';
import type { Track } from '../contexts/TracksContext';

interface ClipMouseDownConfig {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  tracks: Track[];
  selectedLabelIds: string[];
  spectralSelection: any;
  hasSpectralView: boolean;
  selectionIsPositionOnSpectralClip: ((x: number, y: number) => boolean) | undefined;
  containerPropsOnMouseDown: ((e: React.MouseEvent<HTMLDivElement>) => void) | undefined;
  clipDragStateRef: MutableRefObject<any>;
  didDragRef: MutableRefObject<boolean>;
  pixelsPerSecond: number;
  dispatch: (action: any) => void;
  setSpectralSelection: (selection: any) => void;
  TOP_GAP: number;
  TRACK_GAP: number;
  DEFAULT_TRACK_HEIGHT: number;
  CLIP_HEADER_HEIGHT: number;
}

/**
 * Custom hook for handling clip and label mouse down interactions
 * Handles:
 * - Spectral selection priority checking
 * - Clip header hit detection
 * - Clip selection and drag setup
 * - Label click detection and selection
 */
export function useClipMouseDown({
  containerRef,
  tracks,
  selectedLabelIds,
  spectralSelection,
  hasSpectralView,
  selectionIsPositionOnSpectralClip,
  containerPropsOnMouseDown,
  clipDragStateRef,
  didDragRef,
  pixelsPerSecond,
  dispatch,
  setSpectralSelection,
  TOP_GAP,
  TRACK_GAP,
  DEFAULT_TRACK_HEIGHT,
  CLIP_HEADER_HEIGHT,
}: ClipMouseDownConfig) {

  const handleClipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle left mouse button (button 0)
    // Ignore right-click (button 2) to allow context menus
    if (e.button !== 0) return;

    if (!containerRef.current) {
      containerPropsOnMouseDown?.(e);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If there's a spectral selection at this position, prioritize it
    if (spectralSelection && hasSpectralView && selectionIsPositionOnSpectralClip) {
      const isOnSpectralClip = selectionIsPositionOnSpectralClip(x, y);
      if (isOnSpectralClip) {
        containerPropsOnMouseDown?.(e);
        return;
      }
    }

    // Check for clip header dragging
    // Note: Selection is handled by TrackNew's onClipClick, this only sets up drag state
    let currentY = TOP_GAP;
    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];
      const trackHeight = track.height || DEFAULT_TRACK_HEIGHT;

      if (y >= currentY && y < currentY + trackHeight) {
        for (const clip of track.clips) {
          const clipX = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
          const clipWidth = clip.duration * pixelsPerSecond;
          const clipHeaderY = currentY;

          // Check if click is on clip header
          if (x >= clipX && x <= clipX + clipWidth &&
              y >= clipHeaderY && y <= clipHeaderY + CLIP_HEADER_HEIGHT) {

            // Only clear selections and start drag if NOT shift-clicking
            // (Shift-click is handled by onClipClick for multi-select)
            if (!e.shiftKey) {
              // If clicking on an unselected clip, select it exclusively first
              // and only include this clip in the drag
              let selectedClipsInitialPositions;
              if (!clip.selected) {
                // Clear time selection when starting drag on unselected clip
                dispatch({ type: 'SET_TIME_SELECTION', payload: null });
                setSpectralSelection(null);

                dispatch({
                  type: 'SELECT_CLIP',
                  payload: { trackIndex, clipId: clip.id },
                });
                // Don't select track - waveform colors should only change with explicit track selection
                // dispatch({
                //   type: 'SELECT_TRACK',
                //   payload: trackIndex,
                // });

                // Only drag this one clip (state hasn't updated yet)
                selectedClipsInitialPositions = [{
                  clipId: clip.id,
                  trackIndex: trackIndex,
                  startTime: clip.start,
                }];
              } else {
                // Clip is already selected - get all selected clips for multi-drag
                // Don't clear time selection - it will move with the clips
                const selectedClips = tracks.flatMap((track, tIndex) =>
                  track.clips
                    .filter(c => c.selected)
                    .map(c => ({ clip: c, trackIndex: tIndex }))
                );

                selectedClipsInitialPositions = selectedClips.map(({ clip: c, trackIndex: tIndex }) => ({
                  clipId: c.id,
                  trackIndex: tIndex,
                  startTime: c.start,
                }));
              }

              // Start clip drag
              clipDragStateRef.current = {
                clip,
                trackIndex,
                offsetX: x - clipX,
                initialX: x,
                initialTrackIndex: trackIndex,
                initialStartTime: clip.start,
                selectedClipsInitialPositions,
              };
              didDragRef.current = false; // Reset drag flag
            }

            e.stopPropagation();
            return;
          }
        }

        // Check for label clicks (for immediate selection on mouse down, like clips)
        if (track.labels && track.labels.length > 0 && !e.shiftKey) {
          // Calculate label rows using utility function
          const labelRowsMap = calculateLabelRows(track.labels, pixelsPerSecond, CLIP_CONTENT_OFFSET);

          // Check if click is on any label
          for (const label of track.labels) {
            const row = labelRowsMap.get(label.id) ?? 0;

            // Check if point is in label using utility function
            if (isPointInLabel(x, y, label, row, pixelsPerSecond, CLIP_CONTENT_OFFSET, currentY)) {
              const labelKeyId = `${trackIndex}-${label.id}`;
              const isLabelSelected = selectedLabelIds.includes(labelKeyId);

              // If clicking on an unselected label, select it exclusively
              if (!isLabelSelected) {
                dispatch({ type: 'SET_SELECTED_LABELS', payload: [labelKeyId] });
              }

              // Stop propagation to prevent onClick handler from firing
              e.stopPropagation();
              return;
            }
          }
        }
      }

      currentY += trackHeight + TRACK_GAP;
    }

    // No clip interaction, pass through to audio selection
    containerPropsOnMouseDown?.(e);
  };

  return handleClipMouseDown;
}

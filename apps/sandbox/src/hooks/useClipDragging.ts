import { useRef, useEffect } from 'react';
import { ClipDragState, useTracksDispatch } from '../contexts/TracksContext';
import { snapToGrid, SnapOptions } from '../utils/snapToGrid';
import { snapToClipEdges } from '../utils/snapToClipEdges';
import { resolveOverlap, ClipPlacement } from '../utils/resolveOverlap';

export interface UseClipDraggingOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  tracks: any[];
  pixelsPerSecond: number;
  clipContentOffset: number;
  topGap: number;
  trackGap: number;
  defaultTrackHeight: number;
  onDragStatusChange?: (isDragging: boolean) => void;
  snapEnabled?: boolean;
  snapOptions?: SnapOptions;
}

export interface UseClipDraggingReturn {
  clipDragStateRef: React.MutableRefObject<ClipDragState | null>;
  didDragRef: React.MutableRefObject<boolean>;
  startClipDrag: (dragState: ClipDragState) => void;
  cancelDrag: () => void;
}

/**
 * Hook for managing clip dragging behavior
 * Handles mouse-based dragging of clips across tracks and timeline
 */
export function useClipDragging(options: UseClipDraggingOptions): UseClipDraggingReturn {
  const {
    containerRef,
    tracks,
    pixelsPerSecond,
    clipContentOffset,
    topGap,
    trackGap,
    defaultTrackHeight,
    onDragStatusChange,
    snapEnabled = false,
    snapOptions,
  } = options;

  const dispatch = useTracksDispatch();
  const clipDragStateRef = useRef<ClipDragState | null>(null);
  const didDragRef = useRef(false);

  // Tracks cumulative cursor x movement while a snap is engaged, for hysteresis.
  // When this exceeds SNAP_RELEASE_PX, the snap releases and free positioning resumes.
  const snapHysteresisRef = useRef<{ engagedAtTimePos: number; cursorXAtEngage: number } | null>(null);

  const SNAP_THRESHOLD_PX = 6;
  const SNAP_RELEASE_PX = 10;

  const startClipDrag = (dragState: ClipDragState) => {
    clipDragStateRef.current = dragState;
    didDragRef.current = false;
    onDragStatusChange?.(true);
  };

  const cancelDrag = () => {
    clipDragStateRef.current = null;
    didDragRef.current = false;
    snapHysteresisRef.current = null;
    if (containerRef.current) {
      containerRef.current.style.cursor = '';
    }
    onDragStatusChange?.(false);
  };

  // Document-level mouse move and up for clip dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !clipDragStateRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dragState = clipDragStateRef.current;
      didDragRef.current = true; // Mark that dragging has occurred

      // Calculate raw new start time
      let newStartTime = Math.max(0, (x - dragState.offsetX - clipContentOffset) / pixelsPerSecond);
      if (snapEnabled && snapOptions) {
        newStartTime = Math.max(0, snapToGrid(newStartTime, snapOptions));
      }

      // Determine destination track first.
      let currentY = topGap;
      let newTrackIndex = dragState.trackIndex;
      for (let i = 0; i < tracks.length; i++) {
        const trackHeight = tracks[i].height || defaultTrackHeight;
        if (y >= currentY && y < currentY + trackHeight) {
          newTrackIndex = i;
          break;
        }
        currentY += trackHeight + trackGap;
      }

      // Build moving-clip-id set for snap (don't snap to ourselves).
      const movingIds = new Set<number>(
        dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1
          ? dragState.selectedClipsInitialPositions.map((p: { clipId: number }) => p.clipId)
          : [dragState.clip.id]
      );

      // Compute target edges on destination track (non-moving clips only).
      const destClips = tracks[newTrackIndex]?.clips ?? [];
      const targetEdges: number[] = [];
      for (const c of destClips) {
        if (movingIds.has(c.id)) continue;
        targetEdges.push(c.start);
        targetEdges.push(c.start + c.duration);
      }

      // Apply clip-edge snap unless the user has pushed past hysteresis.
      const cursorX = e.clientX;
      const hysteresis = snapHysteresisRef.current;
      let snappedStart = newStartTime;

      if (hysteresis && Math.abs(cursorX - hysteresis.cursorXAtEngage) > SNAP_RELEASE_PX) {
        snapHysteresisRef.current = null;
      }

      if (snapHysteresisRef.current === null) {
        const snapResult = snapToClipEdges({
          proposedStart: newStartTime,
          duration: dragState.clip.duration,
          targetEdges,
          pixelsPerSecond,
          thresholdPx: SNAP_THRESHOLD_PX,
        });
        if (snapResult.snappedEdge !== null) {
          snappedStart = snapResult.snappedStart;
          snapHysteresisRef.current = {
            engagedAtTimePos: snappedStart,
            cursorXAtEngage: cursorX,
          };
        }
      } else {
        snappedStart = hysteresis.engagedAtTimePos;
      }

      newStartTime = Math.max(0, snappedStart);

      // Update cursor style
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }

      // Check if we're dragging multiple selected clips
      const hasMultipleSelected = dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1;
      const isDraggedClipSelected = dragState.selectedClipsInitialPositions?.some(
        pos => pos.clipId === dragState.clip.id
      );

      if (hasMultipleSelected && isDraggedClipSelected) {
        // Calculate the delta from the dragged clip's INITIAL position
        let deltaTime = newStartTime - dragState.initialStartTime;
        const deltaTrack = newTrackIndex - dragState.initialTrackIndex;

        // Find the leftmost clip in the selection
        const leftmostClipStartTime = Math.min(
          ...dragState.selectedClipsInitialPositions!.map((pos: { clipId: number; trackIndex: number; startTime: number }) => pos.startTime)
        );

        // Clamp deltaTime so that the leftmost clip doesn't go below 0
        if (leftmostClipStartTime + deltaTime < 0) {
          deltaTime = -leftmostClipStartTime;
        }

        // Move all selected clips by the same delta from their INITIAL positions
        dragState.selectedClipsInitialPositions!.forEach((initialPos: { clipId: number; trackIndex: number; startTime: number }) => {
          const targetTrackIndex = Math.max(0, Math.min(tracks.length - 1, initialPos.trackIndex + deltaTrack));
          const targetStartTime = initialPos.startTime + deltaTime;

          // Find the current track index of this clip (it may have moved already)
          let currentTrackIndex = initialPos.trackIndex;
          for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].clips.some((c: any) => c.id === initialPos.clipId) ||
                tracks[i].midiClips?.some((c: any) => c.id === initialPos.clipId)) {
              currentTrackIndex = i;
              break;
            }
          }

          dispatch({
            type: 'MOVE_CLIP',
            payload: {
              clipId: initialPos.clipId,
              fromTrackIndex: currentTrackIndex,
              toTrackIndex: targetTrackIndex,
              newStartTime: targetStartTime,
            },
          });
        });
      } else {
        // Move only the dragged clip
        dispatch({
          type: 'MOVE_CLIP',
          payload: {
            clipId: dragState.clip.id,
            fromTrackIndex: dragState.trackIndex,
            toTrackIndex: newTrackIndex,
            newStartTime,
          },
        });
      }

      // Update drag state if track changed
      if (newTrackIndex !== dragState.trackIndex) {
        dragState.trackIndex = newTrackIndex;
        // Update selected track when clip moves to a different track
        dispatch({ type: 'SET_SELECTED_TRACKS', payload: [newTrackIndex] });
      }
    };

    const handleMouseUp = () => {
      const dragState = clipDragStateRef.current;
      if (!dragState) return;

      const wasDragging = didDragRef.current;

      if (wasDragging) {
        // Build intent from current positions of moving clips.
        const movingIds = new Set<number>(
          dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1
            ? dragState.selectedClipsInitialPositions.map((p: { clipId: number }) => p.clipId)
            : [dragState.clip.id]
        );

        const intent: ClipPlacement[] = [];
        for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
          for (const clip of tracks[trackIndex].clips) {
            if (movingIds.has(clip.id)) {
              intent.push({
                clipId: clip.id,
                trackIndex,
                start: clip.start,
                duration: clip.duration,
              });
            }
          }
        }

        const resolution = resolveOverlap(tracks, intent, movingIds);
        if (resolution.mutations.length > 0) {
          dispatch({ type: 'APPLY_CLIP_PLACEMENT', payload: resolution });
        }
      }

      cancelDrag();
      didDragRef.current = wasDragging;
      snapHysteresisRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [tracks, pixelsPerSecond, clipContentOffset, topGap, trackGap, defaultTrackHeight, dispatch, onDragStatusChange, containerRef, snapEnabled, snapOptions]);

  return {
    clipDragStateRef,
    didDragRef,
    startClipDrag,
    cancelDrag,
  };
}

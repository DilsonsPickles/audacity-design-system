import { useRef, useEffect } from 'react';
import { ClipDragState, useTracksDispatch } from '../contexts/TracksContext';

export interface UseClipDraggingOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  tracks: any[];
  pixelsPerSecond: number;
  clipContentOffset: number;
  topGap: number;
  trackGap: number;
  defaultTrackHeight: number;
  onDragStatusChange?: (isDragging: boolean) => void;
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
  } = options;

  const dispatch = useTracksDispatch();
  const clipDragStateRef = useRef<ClipDragState | null>(null);
  const didDragRef = useRef(false);

  const startClipDrag = (dragState: ClipDragState) => {
    clipDragStateRef.current = dragState;
    didDragRef.current = false;
    onDragStatusChange?.(true);
  };

  const cancelDrag = () => {
    clipDragStateRef.current = null;
    didDragRef.current = false;
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

      // Calculate new start time
      const newStartTime = Math.max(0, (x - dragState.offsetX - clipContentOffset) / pixelsPerSecond);

      // Find which track the cursor is over
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
            if (tracks[i].clips.some((c: any) => c.id === initialPos.clipId)) {
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
      if (clipDragStateRef.current) {
        cancelDrag();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [tracks, pixelsPerSecond, clipContentOffset, topGap, trackGap, defaultTrackHeight, dispatch, onDragStatusChange, containerRef]);

  return {
    clipDragStateRef,
    didDragRef,
    startClipDrag,
    cancelDrag,
  };
}

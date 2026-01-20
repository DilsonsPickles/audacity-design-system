import { useRef, useEffect } from 'react';
import { useTracksDispatch } from '../contexts/TracksContext';

export interface ClipTrimState {
  trackIndex: number;
  clipId: number;
  edge: 'left' | 'right';
  initialTrimStart: number;
  initialDuration: number;
  initialClipStart: number;
  // Store initial state for all selected clips
  allClipsInitialState: Map<string, { trimStart: number; duration: number; start: number; fullDuration: number }>;
}

export interface UseClipTrimmingOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  tracks: any[];
  pixelsPerSecond: number;
  clipContentOffset: number;
  onTrimStatusChange?: (isTrimming: boolean) => void;
}

export interface UseClipTrimmingReturn {
  clipTrimStateRef: React.MutableRefObject<ClipTrimState | null>;
  startClipTrim: (trimState: ClipTrimState) => void;
  cancelTrim: () => void;
}

/**
 * Hook for managing clip trimming behavior
 * Handles non-destructive trimming of clip edges
 */
export function useClipTrimming(options: UseClipTrimmingOptions): UseClipTrimmingReturn {
  const {
    containerRef,
    tracks,
    pixelsPerSecond,
    clipContentOffset,
    onTrimStatusChange,
  } = options;

  const dispatch = useTracksDispatch();
  const clipTrimStateRef = useRef<ClipTrimState | null>(null);

  const startClipTrim = (trimState: ClipTrimState) => {
    clipTrimStateRef.current = trimState;
    onTrimStatusChange?.(true);
  };

  const cancelTrim = () => {
    clipTrimStateRef.current = null;
    onTrimStatusChange?.(false);
  };

  // Document-level mouse move and up for clip trimming
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !clipTrimStateRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const trimState = clipTrimStateRef.current;

      // Find the clip being dragged
      const draggedClip = tracks[trimState.trackIndex]?.clips.find((c: any) => c.id === trimState.clipId);
      if (!draggedClip) return;

      // Calculate mouse position in timeline
      const mouseTime = Math.max(0, (x - clipContentOffset) / pixelsPerSecond);

      // Get initial state for all selected clips from stored Map
      const allClipsInitialState = trimState.allClipsInitialState;
      const selectedClips: Array<{
        trackIndex: number;
        clip: any;
        initialState: { trimStart: number; duration: number; start: number; fullDuration: number };
      }> = [];

      tracks.forEach((track: any, trackIndex: number) => {
        track.clips.forEach((clip: any) => {
          if (clip.selected) {
            const key = `${trackIndex}-${clip.id}`;
            const initialState = allClipsInitialState.get(key);
            if (initialState) {
              selectedClips.push({ trackIndex, clip, initialState });
            }
          }
        });
      });

      if (trimState.edge === 'left') {
        // Trimming left edge (non-destructive)
        // Calculate desired trim delta for the dragged clip
        const newTrimStart = Math.max(0, mouseTime - trimState.initialClipStart + trimState.initialTrimStart);
        const trimDelta = newTrimStart - trimState.initialTrimStart;

        // Calculate limits for all selected clips using their INITIAL state
        let clampedTrimDelta = trimDelta;
        selectedClips.forEach(({ initialState }) => {
          const rightEdge = initialState.trimStart + initialState.duration;
          // Don't allow trimming past 0
          const minDelta = -initialState.trimStart;
          // Don't allow trimming past right edge (min 0.01s visible)
          const maxDelta = rightEdge - initialState.trimStart - 0.01;
          clampedTrimDelta = Math.max(minDelta, Math.min(clampedTrimDelta, maxDelta));
        });

        // Apply clamped delta to all selected clips using their INITIAL state
        selectedClips.forEach(({ trackIndex, clip, initialState }) => {
          const newTrimStartForClip = initialState.trimStart + clampedTrimDelta;
          const rightEdge = initialState.trimStart + initialState.duration;
          const newDuration = rightEdge - newTrimStartForClip;
          const newStart = initialState.start + clampedTrimDelta;

          dispatch({
            type: 'TRIM_CLIP',
            payload: {
              trackIndex,
              clipId: clip.id as number,
              newTrimStart: newTrimStartForClip,
              newDuration,
              newStart,
            },
          });
        });
      } else {
        // Trimming right edge (non-destructive)
        // Calculate desired duration change for the dragged clip
        const newDuration = Math.max(0.01, mouseTime - draggedClip.start);
        const durationDelta = newDuration - trimState.initialDuration;

        // Calculate limits for all selected clips using their INITIAL state
        let clampedDurationDelta = durationDelta;
        selectedClips.forEach(({ initialState }) => {
          // Don't allow duration to go below 0.01s
          const minDelta = 0.01 - initialState.duration;
          // Don't allow duration to exceed available audio
          const maxDelta = (initialState.fullDuration - initialState.trimStart) - initialState.duration;
          clampedDurationDelta = Math.max(minDelta, Math.min(clampedDurationDelta, maxDelta));
        });

        // Apply clamped delta to all selected clips using their INITIAL state
        selectedClips.forEach(({ trackIndex, clip, initialState }) => {
          const newDurationForClip = initialState.duration + clampedDurationDelta;

          dispatch({
            type: 'TRIM_CLIP',
            payload: {
              trackIndex,
              clipId: clip.id as number,
              newTrimStart: initialState.trimStart,
              newDuration: newDurationForClip,
            },
          });
        });
      }
    };

    const handleMouseUp = () => {
      if (clipTrimStateRef.current) {
        cancelTrim();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [tracks, pixelsPerSecond, clipContentOffset, dispatch, onTrimStatusChange, containerRef]);

  return {
    clipTrimStateRef,
    startClipTrim,
    cancelTrim,
  };
}

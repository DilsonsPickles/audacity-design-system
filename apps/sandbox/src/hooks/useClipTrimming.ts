import { useRef, useEffect } from 'react';
import { useTracksDispatch } from '../contexts/TracksContext';
import { resolveOverlap, ClipPlacement } from '../utils/resolveOverlap';
import { snapToGrid, SnapOptions } from '../utils/snapToGrid';

export interface ClipTrimState {
  trackIndex: number;
  clipId: number;
  edge: 'left' | 'right';
  initialTrimStart: number;
  initialDuration: number;
  initialClipStart: number;
  // Store initial state for all selected clips
  allClipsInitialState: Map<string, { trimStart: number; duration: number; start: number; fullDuration: number; isMidi?: boolean; stretchFactor?: number }>;
}

export interface UseClipTrimmingOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  tracks: any[];
  pixelsPerSecond: number;
  clipContentOffset: number;
  onTrimStatusChange?: (isTrimming: boolean) => void;
  /** When true, snap the trimmed edge to the user's grid. Alt held
   *  during the drag temporarily disables snap for fine adjustments. */
  snapEnabled?: boolean;
  snapOptions?: SnapOptions;
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
    snapEnabled = false,
    snapOptions,
  } = options;

  const dispatch = useTracksDispatch();
  const clipTrimStateRef = useRef<ClipTrimState | null>(null);
  const snapHysteresisRef = useRef<{ cursorXAtEngage: number } | null>(null);
  const SNAP_THRESHOLD_PX = 6;
  const SNAP_RELEASE_PX = 10;

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

      // Find the clip being dragged (audio or midi)
      const draggedClip = tracks[trimState.trackIndex]?.clips.find((c: any) => c.id === trimState.clipId)
        || (tracks[trimState.trackIndex]?.midiClips || []).find((c: any) => c.id === trimState.clipId);
      if (!draggedClip) return;

      // Calculate mouse position in timeline. Apply the user's snap
      // grid unless Alt is held (escape hatch for fine adjustments).
      const rawMouseTime = Math.max(0, (x - clipContentOffset) / pixelsPerSecond);
      const mouseTime = (snapEnabled && snapOptions && !e.altKey)
        ? Math.max(0, snapToGrid(rawMouseTime, snapOptions))
        : rawMouseTime;

      // Get initial state for all selected clips from stored Map
      const allClipsInitialState = trimState.allClipsInitialState;
      const selectedClips: Array<{
        trackIndex: number;
        clip: any;
        initialState: { trimStart: number; duration: number; start: number; fullDuration: number; isMidi?: boolean; stretchFactor?: number };
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
        (track.midiClips || []).forEach((clip: any) => {
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

        // Calculate limits for all selected clips using their INITIAL state.
        // `clampedTrimDelta` is in *canvas* time; trimStart is in *source* time.
        // For stretched clips the canvas delta maps to source delta / stretchFactor,
        // so the canvas-space bound on extending the left edge is scaled.
        let clampedTrimDelta = trimDelta; // let so snap block can mutate it
        selectedClips.forEach(({ initialState }) => {
          const stretch = initialState.stretchFactor ?? 1;
          if (initialState.isMidi) {
            const minDelta = -(initialState.trimStart ?? 0); // trimStart + delta >= 0
            const maxDelta = initialState.duration - 0.01; // duration - delta >= 0.01
            clampedTrimDelta = Math.max(minDelta, Math.min(clampedTrimDelta, maxDelta));
          } else {
            // Don't allow trimming past 0 (source time)
            const minDelta = -initialState.trimStart * stretch;
            // Don't allow duration below 0.01s (canvas time)
            const maxDelta = initialState.duration - 0.01;
            clampedTrimDelta = Math.max(minDelta, Math.min(clampedTrimDelta, maxDelta));
          }
        });

        // Snap-to-flush: adjust clampedTrimDelta so the dragged clip's left edge
        // (newStart) meets a non-selected clip's edge on the same track within threshold.
        {
          const draggedInitial = trimState.allClipsInitialState.get(`${trimState.trackIndex}-${trimState.clipId}`);
          if (draggedInitial) {
            const projectedLeftEdge = draggedInitial.start + clampedTrimDelta;
            const trackClips = tracks[trimState.trackIndex]?.clips ?? [];
            const targetEdges: number[] = [];
            for (const c of trackClips) {
              if (c.selected) continue;
              targetEdges.push(c.start);
              targetEdges.push(c.start + c.duration);
            }

            const cursorX = e.clientX;
            const hysteresis = snapHysteresisRef.current;
            if (hysteresis && Math.abs(cursorX - hysteresis.cursorXAtEngage) > SNAP_RELEASE_PX) {
              snapHysteresisRef.current = null;
            }

            if (snapHysteresisRef.current === null) {
              const thresholdTime = SNAP_THRESHOLD_PX / pixelsPerSecond;
              let bestTarget: number | null = null;
              let bestDistance = Infinity;
              for (const target of targetEdges) {
                const d = Math.abs(projectedLeftEdge - target);
                if (d <= thresholdTime && d < bestDistance) {
                  bestTarget = target;
                  bestDistance = d;
                }
              }
              if (bestTarget !== null) {
                const snapDelta = bestTarget - draggedInitial.start;
                clampedTrimDelta = snapDelta;
                snapHysteresisRef.current = { cursorXAtEngage: cursorX };
                // Re-clamp after snap to prevent exposing audio past recorded boundaries.
                selectedClips.forEach(({ initialState }) => {
                  const stretch = initialState.stretchFactor ?? 1;
                  if (initialState.isMidi) {
                    const minDelta = -(initialState.trimStart ?? 0);
                    const maxDelta = initialState.duration - 0.01;
                    clampedTrimDelta = Math.max(minDelta, Math.min(clampedTrimDelta, maxDelta));
                  } else {
                    const minDelta = -initialState.trimStart * stretch;
                    const maxDelta = initialState.duration - 0.01;
                    clampedTrimDelta = Math.max(minDelta, Math.min(clampedTrimDelta, maxDelta));
                  }
                });
              }
            }
          }
        }

        // Apply clamped delta to all selected clips using their INITIAL state
        selectedClips.forEach(({ trackIndex, clip, initialState }) => {
          if (initialState.isMidi) {
            // MIDI clips: use trimStart like audio — notes stay at absolute local positions
            const newTrimStartForClip = (initialState.trimStart ?? 0) + clampedTrimDelta;
            const newDuration = initialState.duration - clampedTrimDelta;
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
          } else {
            const stretch = initialState.stretchFactor ?? 1;
            // trimStart lives in source-audio time; clampedTrimDelta is canvas time.
            // Map canvas → source via stretchFactor so stretched clips' trim
            // shifts the source window by the correct amount.
            const newTrimStartForClip = initialState.trimStart + clampedTrimDelta / stretch;
            const newDuration = initialState.duration - clampedTrimDelta;
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
          }
        });
      } else {
        // Trimming right edge (non-destructive)
        // Calculate desired duration change for the dragged clip
        const newDuration = Math.max(0.01, mouseTime - draggedClip.start);
        const durationDelta = newDuration - trimState.initialDuration;

        // Calculate limits for all selected clips using their INITIAL state.
        // `clampedDurationDelta` is in canvas time. With stretchFactor s, the
        // available *canvas* duration of the visible audio is
        // (fullDuration - trimStart) * s, so the max canvas duration delta is
        // that minus the current canvas duration.
        let clampedDurationDelta = durationDelta;
        selectedClips.forEach(({ initialState }) => {
          const stretch = initialState.stretchFactor ?? 1;
          const minDelta = 0.01 - initialState.duration;
          if (initialState.isMidi) {
            clampedDurationDelta = Math.max(minDelta, clampedDurationDelta);
          } else {
            const maxDelta =
              (initialState.fullDuration - initialState.trimStart) * stretch
              - initialState.duration;
            clampedDurationDelta = Math.max(minDelta, Math.min(clampedDurationDelta, maxDelta));
          }
        });

        // Snap-to-flush: adjust clampedDurationDelta so the dragged clip's right edge
        // meets a non-selected clip's edge on the same track within threshold.
        {
          const draggedInitial = trimState.allClipsInitialState.get(`${trimState.trackIndex}-${trimState.clipId}`);
          if (draggedInitial) {
            const projectedRightEdge = draggedInitial.start + draggedInitial.duration + clampedDurationDelta;
            const trackClips = tracks[trimState.trackIndex]?.clips ?? [];
            const targetEdges: number[] = [];
            for (const c of trackClips) {
              if (c.selected) continue;
              targetEdges.push(c.start);
              targetEdges.push(c.start + c.duration);
            }

            const cursorX = e.clientX;
            const hysteresis = snapHysteresisRef.current;
            if (hysteresis && Math.abs(cursorX - hysteresis.cursorXAtEngage) > SNAP_RELEASE_PX) {
              snapHysteresisRef.current = null;
            }

            if (snapHysteresisRef.current === null) {
              const thresholdTime = SNAP_THRESHOLD_PX / pixelsPerSecond;
              let bestTarget: number | null = null;
              let bestDistance = Infinity;
              for (const target of targetEdges) {
                const d = Math.abs(projectedRightEdge - target);
                if (d <= thresholdTime && d < bestDistance) {
                  bestTarget = target;
                  bestDistance = d;
                }
              }
              if (bestTarget !== null) {
                const originalRight = draggedInitial.start + draggedInitial.duration;
                clampedDurationDelta = bestTarget - originalRight;
                snapHysteresisRef.current = { cursorXAtEngage: cursorX };
                // Re-clamp after snap to prevent exposing audio past recorded boundaries.
                selectedClips.forEach(({ initialState }) => {
                  const stretch = initialState.stretchFactor ?? 1;
                  const minDelta = 0.01 - initialState.duration;
                  if (initialState.isMidi) {
                    clampedDurationDelta = Math.max(minDelta, clampedDurationDelta);
                  } else {
                    const maxDelta =
                      (initialState.fullDuration - initialState.trimStart) * stretch
                      - initialState.duration;
                    clampedDurationDelta = Math.max(minDelta, Math.min(clampedDurationDelta, maxDelta));
                  }
                });
              }
            }
          }
        }

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
      const trimState = clipTrimStateRef.current;
      if (!trimState) return;

      // Build intent from final positions of all clips that were being trimmed
      // (every selected clip on every track).
      const intent: ClipPlacement[] = [];
      const movingIds = new Set<number>();
      tracks.forEach((track: any, trackIndex: number) => {
        track.clips.forEach((clip: any) => {
          if (clip.selected) {
            intent.push({
              clipId: clip.id,
              trackIndex,
              start: clip.start,
              duration: clip.duration,
            });
            movingIds.add(clip.id);
          }
        });
      });

      if (intent.length > 0) {
        const resolution = resolveOverlap(tracks, intent, movingIds);
        if (resolution.mutations.length > 0) {
          dispatch({ type: 'APPLY_CLIP_PLACEMENT', payload: resolution });
        }
      }

      snapHysteresisRef.current = null;
      cancelTrim();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [tracks, pixelsPerSecond, clipContentOffset, dispatch, onTrimStatusChange, containerRef, snapEnabled, snapOptions]);

  return {
    clipTrimStateRef,
    startClipTrim,
    cancelTrim,
  };
}

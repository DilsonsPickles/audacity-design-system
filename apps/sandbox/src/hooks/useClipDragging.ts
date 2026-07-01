import { useRef, useEffect, useState } from 'react';
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
  /** Called when the drag settles in the empty space below all tracks.
   *  Returns a fresh track template (id, name, type, height, clips: [])
   *  the hook will `ADD_TRACK`-dispatch. Called `count` times so name
   *  numbering can advance without collisions.
   *  When omitted, drop-below is disabled and the drag clamps to the
   *  last existing track as before. */
  buildTrackForDrop?: (indexAmongNew: number, sourceTrackIndex: number) => any;
}

export type SnapGuidelineKind = 'grid' | 'alignment';

export interface UseClipDraggingReturn {
  clipDragStateRef: React.MutableRefObject<ClipDragState | null>;
  didDragRef: React.MutableRefObject<boolean>;
  startClipDrag: (dragState: ClipDragState) => void;
  cancelDrag: () => void;
  /** Time (in seconds) the active drag has snapped to. Null when no
   *  drag is active, no snap engaged, or Alt is held. */
  snapGuidelineTime: number | null;
  snapGuidelineKind: SnapGuidelineKind | null;
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
    buildTrackForDrop,
  } = options;

  const dispatch = useTracksDispatch();
  const clipDragStateRef = useRef<ClipDragState | null>(null);
  const didDragRef = useRef(false);
  // Last pointer Y (in container-local space) captured during
  // mousemove — mouseup reads this to detect drops below all tracks
  // without needing the mouseup event's own clientY.
  const lastPointerYRef = useRef<number | null>(null);
  // Provisional-track bookkeeping. As soon as the drag needs to reach
  // past the last row, we dispatch ADD_TRACK so the user sees a real
  // row appear under their cursor; when they drag back up we
  // DELETE_TRACK the ones no longer needed. `originalTracksLenRef`
  // freezes the pre-drag length so shrink logic never eats a track
  // that existed before the gesture.
  const provisionalCountRef = useRef(0);
  const originalTracksLenRef = useRef(0);
  const provisionalDragInitializedRef = useRef(false);
  const [snapGuidelineTime, setSnapGuidelineTime] = useState<number | null>(null);
  const [snapGuidelineKind, setSnapGuidelineKind] = useState<SnapGuidelineKind | null>(null);

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
    lastPointerYRef.current = null;
    provisionalCountRef.current = 0;
    originalTracksLenRef.current = 0;
    provisionalDragInitializedRef.current = false;
    setSnapGuidelineTime(null);
    setSnapGuidelineKind(null);
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
      lastPointerYRef.current = y;

      // First mousemove of this drag: freeze the pre-drag track count
      // so grow / shrink can compute deltas against a stable baseline.
      // We initialize here (rather than at drag-start) because
      // useClipMouseDown sets clipDragStateRef directly without going
      // through startClipDrag.
      if (!provisionalDragInitializedRef.current) {
        originalTracksLenRef.current = tracks.length;
        provisionalCountRef.current = 0;
        provisionalDragInitializedRef.current = true;
      }

      // Calculate raw new start time.
      const rawStart = Math.max(0, (x - dragState.offsetX - clipContentOffset) / pixelsPerSecond);
      let newStartTime = rawStart;
      let guideline: number | null = null;
      let guidelineKind: SnapGuidelineKind | null = null;

      if (snapEnabled && snapOptions && !e.altKey) {
        // Grid snap path.
        newStartTime = Math.max(0, snapToGrid(rawStart, snapOptions));
        guideline = newStartTime;
        guidelineKind = 'grid';
      } else if (!e.altKey) {
        // Alignment snap path — magnetically align to another clip's
        // start or end when within ~6px. Compares the moving clip's
        // start AND end edges to every other clip's edges so trailing
        // butt-joins also catch.
        const draggedDuration = dragState.clip?.duration ?? 0;
        const ALIGN_THRESHOLD_PX = 6;
        const thresholdSec = ALIGN_THRESHOLD_PX / pixelsPerSecond;
        let bestEdge: number | null = null;
        let bestDelta = 0;
        let bestDist = thresholdSec;
        for (let ti = 0; ti < tracks.length; ti++) {
          const t = tracks[ti];
          const allClips = [...(t.clips || []), ...(t.midiClips || [])];
          for (const c of allClips) {
            if (c.id === dragState.clip?.id) continue;
            for (const otherEdge of [c.start, c.start + c.duration]) {
              for (const movingEdge of [rawStart, rawStart + draggedDuration]) {
                const d = Math.abs(movingEdge - otherEdge);
                if (d < bestDist) {
                  bestDist = d;
                  bestEdge = otherEdge;
                  bestDelta = otherEdge - movingEdge;
                }
              }
            }
          }
        }
        if (bestEdge !== null) {
          newStartTime = Math.max(0, rawStart + bestDelta);
          guideline = bestEdge;
          guidelineKind = 'alignment';
        }
      }
      setSnapGuidelineTime(guideline);
      setSnapGuidelineKind(guidelineKind);

      // Determine destination track first. If the pointer is past the
      // bottom of the last row, `newTrackIndex` extends into virtual
      // territory (tracks.length + rowsBelow); we'll later dispatch
      // ADD_TRACK to materialise those rows so the user can see them
      // under the cursor.
      let currentY = topGap;
      let newTrackIndex = -1;
      for (let i = 0; i < tracks.length; i++) {
        const trackHeight = tracks[i].height || defaultTrackHeight;
        if (y >= currentY && y < currentY + trackHeight) {
          newTrackIndex = i;
          break;
        }
        currentY += trackHeight + trackGap;
      }
      if (newTrackIndex === -1) {
        if (buildTrackForDrop && y > currentY - trackGap) {
          const rowStride = defaultTrackHeight + trackGap;
          const rowsBelow = Math.max(0, Math.floor((y - currentY) / rowStride));
          newTrackIndex = tracks.length + rowsBelow;
        } else {
          newTrackIndex = dragState.trackIndex;
        }
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

      // Vertical delta from the leader clip's initial track — used both
      // to position multi-clip members and to recompute the active-tracks
      // set when the leader crosses a track boundary.
      let deltaTrack = newTrackIndex - dragState.initialTrackIndex;

      // Group bounds needed both to clamp the move and to size any
      // provisional tracks we need to append below.
      const groupInitialTracks = (hasMultipleSelected && isDraggedClipSelected)
        ? dragState.selectedClipsInitialPositions!.map(
            (pos: { trackIndex: number }) => pos.trackIndex,
          )
        : [dragState.initialTrackIndex];
      const topmostInitialTrack = Math.min(...groupInitialTracks);
      const bottommostInitialTrack = Math.max(...groupInitialTracks);

      // Grow provisional tracks if the desired delta pushes the group's
      // bottom past the last existing row and buildTrackForDrop is
      // wired. The dispatch batches ahead of MOVE_CLIP so by the time
      // the move lands, the target index exists in the reducer's state.
      if (buildTrackForDrop) {
        const desiredMaxTargetIndex = bottommostInitialTrack + deltaTrack;
        const neededProvisional = Math.max(
          0,
          desiredMaxTargetIndex - (originalTracksLenRef.current - 1),
        );
        if (neededProvisional > provisionalCountRef.current) {
          for (let i = provisionalCountRef.current; i < neededProvisional; i++) {
            const template = buildTrackForDrop(i, dragState.initialTrackIndex);
            if (template) {
              dispatch({ type: 'ADD_TRACK', payload: template });
            }
          }
          provisionalCountRef.current = neededProvisional;
        }
      }

      // Effective row count for clamping. Includes any provisional
      // tracks we've queued this tick — those dispatches have already
      // hit the reducer so the state at MOVE_CLIP-processing time
      // reflects them, even though our `tracks` closure is still stale.
      const effectiveTracksLength =
        originalTracksLenRef.current + provisionalCountRef.current;

      if (hasMultipleSelected && isDraggedClipSelected) {
        // Calculate the delta from the dragged clip's INITIAL position
        let deltaTime = newStartTime - dragState.initialStartTime;

        // Find the leftmost clip in the selection
        const leftmostClipStartTime = Math.min(
          ...dragState.selectedClipsInitialPositions!.map((pos: { clipId: number; trackIndex: number; startTime: number }) => pos.startTime)
        );

        // Clamp deltaTime so that the leftmost clip doesn't go below 0
        if (leftmostClipStartTime + deltaTime < 0) {
          deltaTime = -leftmostClipStartTime;
        }

        // Clamp deltaTrack: top stays at 0; bottom is either the
        // pre-drag last row (no provisional path) or the last row
        // including any provisional tracks we just grew into.
        const minAllowedDeltaTrack = -topmostInitialTrack;
        const maxAllowedDeltaTrack = (effectiveTracksLength - 1) - bottommostInitialTrack;
        deltaTrack = Math.max(minAllowedDeltaTrack, Math.min(maxAllowedDeltaTrack, deltaTrack));

        // Move all selected clips by the same delta from their INITIAL positions
        dragState.selectedClipsInitialPositions!.forEach((initialPos: { clipId: number; trackIndex: number; startTime: number }) => {
          const targetTrackIndex = initialPos.trackIndex + deltaTrack;
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
        // Single-clip drag: clamp to the effective row range so we
        // never point MOVE_CLIP at a row that doesn't exist yet
        // (even after the provisional grow above).
        const singleClipTargetIndex = Math.max(
          0,
          Math.min(effectiveTracksLength - 1, newTrackIndex),
        );
        // Snap deltaTrack to what actually got applied so the
        // focus / selection update below matches reality.
        deltaTrack = singleClipTargetIndex - dragState.initialTrackIndex;
        dispatch({
          type: 'MOVE_CLIP',
          payload: {
            clipId: dragState.clip.id,
            fromTrackIndex: dragState.trackIndex,
            toTrackIndex: singleClipTargetIndex,
            newStartTime,
          },
        });
        newTrackIndex = singleClipTargetIndex;
      }

      // Update drag state if track changed.
      if (newTrackIndex !== dragState.trackIndex) {
        dragState.trackIndex = newTrackIndex;
        if (hasMultipleSelected && isDraggedClipSelected) {
          // Replace the active-tracks set with the union of destination
          // tracks for every moving clip — the user expects the tracks
          // that now host the dragged clips to be active, not the ones
          // the clips just vacated.
          const destTracks = new Set<number>();
          dragState.selectedClipsInitialPositions!.forEach((initialPos: { trackIndex: number }) => {
            const target = Math.max(0, Math.min(effectiveTracksLength - 1, initialPos.trackIndex + deltaTrack));
            destTracks.add(target);
          });
          dispatch({
            type: 'SET_SELECTED_TRACKS',
            payload: [...destTracks].sort((a, b) => a - b),
          });
        } else {
          dispatch({ type: 'SET_SELECTED_TRACKS', payload: [newTrackIndex] });
        }
        // Move the focused-track state along with the leader clip so
        // keyboard focus and the focus ring follow the drag instead of
        // stranding on the originating track.
        dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
      }

      // Shrink: if the user has dragged back up and one or more
      // provisional tracks are no longer needed, drop them from the
      // end. Runs AFTER the MOVE_CLIP dispatches above so the reducer
      // sees the clips already vacated those rows and the DELETE_TRACKs
      // target genuinely empty tracks.
      if (buildTrackForDrop && provisionalCountRef.current > 0) {
        const maxOccupiedTargetIndex = bottommostInitialTrack + deltaTrack;
        const stillNeeded = Math.max(
          0,
          maxOccupiedTargetIndex - (originalTracksLenRef.current - 1),
        );
        if (stillNeeded < provisionalCountRef.current) {
          const excess = provisionalCountRef.current - stillNeeded;
          for (let i = 0; i < excess; i++) {
            // Delete the highest-indexed provisional track each
            // iteration. After DELETE_TRACK removes the last row the
            // next iteration's target (one lower) is the new last row.
            const deleteIndex =
              originalTracksLenRef.current + provisionalCountRef.current - 1 - i;
            dispatch({ type: 'DELETE_TRACK', payload: deleteIndex });
          }
          provisionalCountRef.current = stillNeeded;
          // DELETE_TRACK overwrites focusedTrackIndex in the reducer
          // (it can't tell "you were focused elsewhere, please stay").
          // Restore the leader's track so the focus ring stays with the
          // drag rather than snapping to the deleted row's neighbour.
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
        }
      }
    };

    const handleMouseUp = () => {
      const dragState = clipDragStateRef.current;
      if (!dragState) return;

      const wasDragging = didDragRef.current;

      if (wasDragging) {
        const movingIds = new Set<number>(
          dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1
            ? dragState.selectedClipsInitialPositions.map((p: { clipId: number }) => p.clipId)
            : [dragState.clip.id]
        );

        // Standard settle: resolve any overlap the drag created against
        // the existing tracks and commit as APPLY_CLIP_PLACEMENT. Any
        // provisional tracks the mousemove path materialised will be
        // in `tracks` here — if they're occupied they behave like
        // regular rows for overlap resolution; if they were vacated
        // by an upward drag they're empty and the safety-net below
        // trims them.
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

        // Safety net: if any of the provisional tracks we added during
        // the drag are still empty at mouseup (nothing landed on them),
        // remove them. The shrink logic in mousemove only fires when
        // the pointer moves back up above them; a fast release right
        // above a provisional row leaves it untouched otherwise.
        if (provisionalCountRef.current > 0) {
          for (
            let i = originalTracksLenRef.current + provisionalCountRef.current - 1;
            i >= originalTracksLenRef.current;
            i--
          ) {
            const t = tracks[i] as any;
            const isEmpty =
              t
              && (t.clips?.length ?? 0) === 0
              && (t.midiClips?.length ?? 0) === 0;
            if (isEmpty) {
              dispatch({ type: 'DELETE_TRACK', payload: i });
            }
          }
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
  }, [tracks, pixelsPerSecond, clipContentOffset, topGap, trackGap, defaultTrackHeight, dispatch, onDragStatusChange, containerRef, snapEnabled, snapOptions, buildTrackForDrop]);

  return {
    clipDragStateRef,
    didDragRef,
    startClipDrag,
    cancelDrag,
    snapGuidelineTime,
    snapGuidelineKind,
  };
}

import React from 'react';
import { TrackNew, CLIP_CONTENT_OFFSET, scrollIntoViewIfNeeded, announce, type SpectrogramScale } from '@dilsonspickles/components';
import { useTracksDispatch, type Clip, type Track, type TimeSelection } from '../../contexts/TracksContext';
import type { EnvelopePointSizes } from '../../utils/envelopePointSizes';
import type { ClipTrimState } from '../../hooks/useClipTrimming';
import type { ClipStretchState } from '../../hooks/useClipStretching';
import {
  computeKeyboardTrimBatch,
  computeKeyboardTrimAnnouncement,
  computeKeyboardStretch,
  computeKeyboardStretchAnnouncement,
  type KeyboardTrimTarget,
} from '../../utils/clipKeyboardEdit';
import { pendingClipMoveResolution } from '../../utils/pendingClipMoveResolution';
import { provisionalKeyboardTrackIds } from '../../utils/provisionalKeyboardTrackIds';
import { calculateTrackYOffset } from '../../utils/trackLayout';
import { TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT } from '../../constants/canvas';
import { LabelRenderer } from '../LabelRenderer';

export interface CanvasTrackListProps {
  tracks: Track[];
  selectedTrackIndices: number[];
  focusedTrackIndex: number | null;
  selectedLabelIds: string[];
  width: number;
  pixelsPerSecond: number;
  envelopeMode: boolean;
  isFlatNavigation: boolean;
  trackBase: number;
  timeSelection: TimeSelection | null;
  isTimeSelectionDragging: boolean;
  clipStyle: 'classic' | 'colourful';
  recordingClipId: number | null;
  showRmsInWaveform: boolean;
  draggingClipIds: Set<number>;
  raisedClipIds: Set<number>;
  hoveredMidiClipId?: number | null;
  onHoverMidiClip?: (clipId: number | null) => void;
  onTrackFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  onTrackContainerFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  onEnterTrackPanel?: (trackIndex: number) => void;
  onShiftTabFromTrack?: (trackIndex: number) => void;
  onContainerEnter?: (trackIndex: number, modifiers: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;
  onTabFromLastClip?: (trackIndex: number) => void;
  /** Canvas prop, forwarded straight through to the per-clip menu-click wrapper below. */
  onClipMenuClick?: (clipId: number, trackIndex: number, x: number, y: number, openedViaKeyboard?: boolean) => void;
  envelopePointSizes: EnvelopePointSizes;
  spectrogramScale: SpectrogramScale;
  hoveredEar: string | null;
  hoveredBanner: string | null;
  setHoveredEar: (id: string | null) => void;
  setHoveredBanner: (id: string | null) => void;
  selectionAnchor: number | null;
  setSelectionAnchor?: (anchor: number | null) => void;
  /** Guards read by the empty-background click handler below — all three
   *  hooks report "the mouseup that just fired was actually a drag/trim/
   *  stretch, not a click", so this handler can bail rather than
   *  deselecting the clip the user just edited. */
  wasJustDragging: () => boolean;
  wasJustTrimming: () => boolean;
  wasJustStretching: () => boolean;
  /** Track-level keyboard nav/reorder — from useTrackKeyboardHandlers (Task 5.7). */
  onTrackNavigateVertical: (trackIndex: number, direction: 1 | -1, shiftKey?: boolean, decouple?: boolean) => void;
  onTrackReorder: (trackIndex: number, direction: 1 | -1, wasContainerFocused: boolean) => void;
  /**
   * Cross-hook ref contracts, threaded in verbatim from Canvas so the
   * clip callbacks below (moved here character-for-character from
   * Canvas.tsx's old per-track render loop) keep mutating exactly the
   * refs the sibling drag/trim/stretch hooks read: onClipClick resets
   * didDragRef/justSelectedOnMouseDownRef, onClipTrimEdge seeds
   * clipTrimStateRef.current, onClipStretchEdge calls startClipStretch.
   */
  didDragRef: React.MutableRefObject<boolean>;
  justSelectedOnMouseDownRef: React.MutableRefObject<boolean>;
  clipTrimStateRef: React.MutableRefObject<ClipTrimState | null>;
  clipStretchStateRef: React.MutableRefObject<ClipStretchState | null>;
  startClipStretch: (stretchState: ClipStretchState) => void;
  beginCmdMove: () => void;
  /** Factory that builds a new track template for keyboard drop-below.
   *  Signature matches useClipDragging's buildTrackForDrop. */
  buildTrackForDrop?: (indexAmongNew: number, sourceTrackIndex: number) => Track;
}

/**
 * Renders the per-track tree: one absolutely-positioned wrapper `<div>`
 * per track, each containing a `TrackNew` plus (for label tracks) a
 * `LabelRenderer` overlay. Extracted verbatim from Canvas.tsx's
 * `tracks.map(...)` — including the clip/track callback bodies, which
 * still close over the per-iteration `track`/`trackIndex` loop
 * variables exactly as before. DOM structure (element order,
 * z-index/overflow contracts) is unchanged.
 */
export function CanvasTrackList({
  tracks,
  selectedTrackIndices,
  focusedTrackIndex,
  selectedLabelIds,
  width,
  pixelsPerSecond,
  envelopeMode,
  isFlatNavigation,
  trackBase,
  timeSelection,
  isTimeSelectionDragging,
  clipStyle,
  recordingClipId,
  showRmsInWaveform,
  draggingClipIds,
  raisedClipIds,
  hoveredMidiClipId,
  onHoverMidiClip,
  onTrackFocusChange,
  onTrackContainerFocusChange,
  onEnterTrackPanel,
  onShiftTabFromTrack,
  onContainerEnter,
  onTabFromLastClip,
  onClipMenuClick,
  envelopePointSizes,
  spectrogramScale,
  hoveredEar,
  hoveredBanner,
  setHoveredEar,
  setHoveredBanner,
  selectionAnchor,
  setSelectionAnchor,
  wasJustDragging,
  wasJustTrimming,
  wasJustStretching,
  onTrackNavigateVertical,
  onTrackReorder,
  didDragRef,
  justSelectedOnMouseDownRef,
  clipTrimStateRef,
  clipStretchStateRef,
  startClipStretch,
  beginCmdMove,
  buildTrackForDrop,
}: CanvasTrackListProps) {
  const dispatch = useTracksDispatch();

  // Solo overrides per-track mute visuals: when any track is soloed,
  // every non-soloed track reads as effectively muted (matches the audio
  // behaviour). Computed once per render.
  const anySoloed = tracks.some((t) => t.soloed);

  return (
    <>
      {tracks.map((track, trackIndex) => {
        const trackHeight = track.height || DEFAULT_TRACK_HEIGHT;
        const isSelected = selectedTrackIndices.includes(trackIndex);
        const isFocused = focusedTrackIndex === trackIndex;
        const effectivelyMuted =
          track.muted === true
          || (anySoloed && track.soloed !== true);

        // Calculate y position for this track
        const yOffset = calculateTrackYOffset(trackIndex, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT);

        return (
          <div
            key={track.id}
            style={{
              position: 'absolute',
              top: `${yOffset}px`,
              left: 0,
              width: `${width}px`,
              height: `${trackHeight}px`,
              overflow: 'visible', // Allow focus outline to show
            }}
            onClick={(e) => {
              // Only handle clicks on empty space (not on clips or labels)
              // Check if click was on TrackNew background or wrapper
              const target = e.target as HTMLElement;
              const isTrackBackground = target.classList?.contains('track') || e.target === e.currentTarget;

              if (isTrackBackground) {
                // Handle Shift+Click for range selection FIRST (before drag check)
                // This allows Shift+Click to work even after setting playhead
                if (e.shiftKey) {
                  // Deselect all clips
                  dispatch({ type: 'DESELECT_ALL_CLIPS' });

                  // Use the first selected track as anchor if no anchor is set
                  const anchor = selectionAnchor ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : trackIndex);
                  if (selectionAnchor === null && setSelectionAnchor) {
                    setSelectionAnchor(anchor);
                  }

                  // Calculate range selection from anchor to clicked track
                  const start = Math.min(anchor, trackIndex);
                  const end = Math.max(anchor, trackIndex);
                  const newSelection: number[] = [];
                  for (let i = start; i <= end; i++) {
                    newSelection.push(i);
                  }
                  dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });

                  // Set this track as focused
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                  // Clear label selections
                  dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });
                  return; // Done with Shift+Click handling
                }

                // Don't handle regular clicks if we just finished dragging (creating time selection),
                // trimming, or stretching — all three synthesise a click on the track LCA at
                // mouseup, and dispatching DESELECT_ALL_CLIPS here would clear the just-edited clip.
                if (wasJustDragging() || wasJustTrimming() || wasJustStretching()) {
                  return;
                }

                // Regular click on empty track background:
                //  - Clear clip selection (canvas clicks outside a
                //    clip drop clip focus).
                //  - Move focus to the clicked track (blue outline
                //    follows the click).
                //  - Clear label selection.
                //  - Track selection itself is NOT touched — it's
                //    an explicit gesture (side panel, Shift+Click,
                //    Cmd+click).
                dispatch({ type: 'DESELECT_ALL_CLIPS' });
                dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });
              }
            }}
          >
            <TrackNew
              clips={track.type === 'midi'
                ? (track.midiClips || []).map((mc) => ({
                    id: mc.id, name: mc.name, start: mc.start,
                    duration: mc.duration, trimStart: mc.trimStart ?? 0,
                    envelopePoints: [],
                    selected: mc.selected, color: mc.color || track.color,
                    midiNotes: mc.notes,
                  }))
                : showRmsInWaveform ? track.clips : track.clips.map((clip) => ({
                    ...clip,
                    waveformRms: undefined,
                    waveformLeftRms: undefined,
                    waveformRightRms: undefined,
                  }))}
              height={trackHeight}
              trackIndex={trackIndex}
              spectrogramMode={track.viewMode === 'spectrogram'}
              splitView={track.viewMode === 'split'}
              envelopeMode={envelopeMode}
              isSelected={isSelected}
              isFocused={isFocused}
              isMuted={effectivelyMuted}
              isLabelTrack={track.type === 'label'}
              isMidiTrack={track.type === 'midi'}
              pixelsPerSecond={pixelsPerSecond}
              width={width}
              tabIndex={isFlatNavigation ? 0 : (trackBase + 2 + trackIndex * 4)}
              trackTabIndex={isFlatNavigation ? 0 : (trackBase + trackIndex * 4)}
              trackName={track.name}
              onTrackNavigateVertical={(direction, shiftKey, decouple) =>
                onTrackNavigateVertical(trackIndex, direction, shiftKey, decouple)
              }
              onTrackReorder={(direction, wasContainerFocused) =>
                onTrackReorder(trackIndex, direction, wasContainerFocused)
              }

              timeSelection={timeSelection && (timeSelection.renderOnCanvas !== false) ? timeSelection : null}
              isTimeSelectionDragging={isTimeSelectionDragging}
              clipStyle={clipStyle}
              color={track.color}
              recordingClipId={recordingClipId}
              onFocusChange={(hasFocus) => onTrackFocusChange?.(trackIndex, hasFocus)}
              onContainerFocusChange={(hasFocus) => onTrackContainerFocusChange?.(trackIndex, hasFocus)}
              onEnterPanel={() => onEnterTrackPanel?.(trackIndex)}
              onShiftTabOut={() => onShiftTabFromTrack?.(trackIndex)}
              onContainerEnter={(modifiers) => onContainerEnter?.(trackIndex, modifiers)}
              onTabFromLastClip={() => onTabFromLastClip?.(trackIndex)}
              hoveredClipId={track.type === 'midi' ? hoveredMidiClipId : undefined}
              onHoverClip={track.type === 'midi' ? onHoverMidiClip : undefined}
              draggingClipIds={draggingClipIds}
              raisedClipIds={raisedClipIds}
              onClipMove={(clipId, deltaSeconds) => {
                const clip = track.clips.find(c => c.id === clipId) || (track.midiClips || []).find(c => c.id === clipId);
                if (!clip) return;
                // Ensure the focused clip is selected so it moves with the group
                if (!clip.selected) {
                  dispatch({
                    type: 'SELECT_CLIP',
                    payload: { trackIndex, clipId: clipId as number },
                  });
                }
                dispatch({
                  type: 'MOVE_SELECTED_CLIPS',
                  payload: { deltaSeconds },
                });
                // Defer overlap resolution to when the user releases
                // Cmd/Ctrl — otherwise a Cmd+Arrow nudge across
                // several clips would leave a trail of eaten
                // neighbors between the start and end position.
                pendingClipMoveResolution.current = true;
                beginCmdMove();

                // Scroll focused clip into view
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    const clipEl = document.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement;
                    if (clipEl) scrollIntoViewIfNeeded(clipEl);
                  });
                });
              }}
              onClipMoveToTrack={(clipId, direction) => {
                const clip = track.clips.find(c => c.id === clipId) || (track.midiClips || []).find(c => c.id === clipId);
                if (!clip) return;
                // Ensure the focused clip is selected so it moves with the group
                if (!clip.selected) {
                  dispatch({
                    type: 'SELECT_CLIP',
                    payload: { trackIndex, clipId: clipId as number },
                  });
                }
                // Detect whether the move would push the bottommost selected clip
                // past the last track. If so, and we have the factory, dispatch the
                // combined create-and-move action for single-step undo.
                const maxSelectedTrackIndex = tracks.reduce((max, t, ti) => {
                  const hasSelected = t.clips.some(c => c.selected) || (t.midiClips || []).some(c => c.selected);
                  return hasSelected ? Math.max(max, ti) : max;
                }, -1);
                const wouldOverflow = direction === 1 && maxSelectedTrackIndex + 1 >= tracks.length;

                // Identify provisional tracks to clean up using the pre-move snapshot
                // (all their clips are selected and about to leave). Delete them AFTER
                // the move so the reducer sees empty tracks, not tracks with clips.
                // Only run on Cmd+Up (direction=-1): Cmd+Down must let provisional
                // tracks accumulate so clips visually travel further down each press.
                // Empty provisional tracks left by Cmd+Down are purged on Cmd release
                // in useCmdArrowMove's keyup handler.
                const toCleanUp: number[] = [];
                if (direction === -1) {
                  for (const trackId of provisionalKeyboardTrackIds.current) {
                    const pt = tracks.find(t => t.id === trackId);
                    if (!pt) { provisionalKeyboardTrackIds.current.delete(trackId); continue; }
                    const hasUnselected = pt.clips.some(c => !c.selected) || (pt.midiClips || []).some(c => !c.selected);
                    if (!hasUnselected) {
                      // Skip cleanup if another selected clip is moving INTO this slot —
                      // clips shift by `direction`, so the incoming neighbour is at ptIdx-direction.
                      const ptIdx = tracks.findIndex(t => t.id === trackId);
                      const incomingIdx = ptIdx - direction;
                      const hasIncoming = incomingIdx >= 0 && incomingIdx < tracks.length
                        && (tracks[incomingIdx].clips.some(c => c.selected) || (tracks[incomingIdx].midiClips || []).some(c => c.selected));
                      if (!hasIncoming) {
                        toCleanUp.push(trackId);
                        provisionalKeyboardTrackIds.current.delete(trackId);
                      }
                    }
                  }
                }

                if (wouldOverflow && buildTrackForDrop) {
                  const template = buildTrackForDrop(0, trackIndex);
                  dispatch({
                    type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
                    payload: { newTrack: template },
                  });
                  provisionalKeyboardTrackIds.current.add(template.id);
                  for (const trackId of toCleanUp) {
                    dispatch({ type: 'DELETE_PROVISIONAL_TRACK', payload: { trackId } });
                  }
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: tracks.length });
                } else {
                  dispatch({
                    type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
                    payload: { direction: direction as 1 | -1 },
                  });
                  for (const trackId of toCleanUp) {
                    dispatch({ type: 'DELETE_PROVISIONAL_TRACK', payload: { trackId } });
                  }
                  const newTrackIndex = trackIndex + direction;
                  if (newTrackIndex >= 0 && newTrackIndex < tracks.length) {
                    dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
                  }
                }
                // Defer overlap resolution to Cmd/Ctrl release — see
                // onClipMove above for the same rationale.
                pendingClipMoveResolution.current = true;
                beginCmdMove();
                // Focus the clip on the new track and scroll into view
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    const movedClip = document.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement;
                    if (movedClip) {
                      movedClip.focus({ preventScroll: true });
                      scrollIntoViewIfNeeded(movedClip);
                    }
                  });
                });
              }}
              onClipNavigateVertical={(clipId, direction) => {
                // Find the source clip's start time
                const sourceClip = track.clips.find(c => c.id === clipId);
                const sourceStart = sourceClip?.start ?? 0;

                // Search tracks in the given direction, wrapping around
                const trackCount = tracks.length;
                for (let i = 1; i <= trackCount; i++) {
                  const candidateIndex = ((trackIndex + direction * i) % trackCount + trackCount) % trackCount;
                  const candidateTrackData = tracks[candidateIndex];
                  if (candidateTrackData.clips.length === 0) continue;

                  // Find the clip closest in start time
                  let closestClip = candidateTrackData.clips[0];
                  let closestDist = Math.abs(closestClip.start - sourceStart);
                  for (const c of candidateTrackData.clips) {
                    const dist = Math.abs(c.start - sourceStart);
                    if (dist < closestDist) {
                      closestClip = c;
                      closestDist = dist;
                    }
                  }

                  // Focus the closest clip element
                  const candidateTrack = document.querySelector(`[data-track-index="${candidateIndex}"]`);
                  if (candidateTrack) {
                    const clipEl = candidateTrack.querySelector(`[data-clip-id="${closestClip.id}"]`) as HTMLElement;
                    if (clipEl) {
                      setTimeout(() => {
                        clipEl.focus({ preventScroll: true });
                        // onFocus handler on the clip handles scroll-into-view
                      }, 0);
                      return;
                    }
                  }
                }
                // No track with clips found — don't move focus
              }}
              onClipTrim={(clipId, edge, deltaSeconds) => {
                // Pressing [ or ] on a focused clip always makes
                // it the selected clip — even when the trim
                // itself hits a source boundary and the reducer
                // no-ops. Selection is the "you're operating on
                // this" signal, independent of whether the edge
                // actually moved.
                const focusedClip = tracks[trackIndex]?.clips.find((c) => c.id === clipId)
                  || (tracks[trackIndex]?.midiClips || []).find((c) => c.id === clipId);
                if (focusedClip && !focusedClip.selected) {
                  dispatch({
                    type: 'SELECT_CLIP',
                    payload: { trackIndex, clipId: clipId as number },
                  });
                }

                // Collect every selected clip (audio + MIDI). If the
                // shortcut was triggered on a not-yet-selected clip we
                // still trim that one. The same canvas-time delta is
                // applied to each clip independently, with per-clip
                // bounds checks against its own source duration.
                const targets: KeyboardTrimTarget[] = [];
                tracks.forEach((t, tIndex) => {
                  t.clips.forEach((c) => {
                    if (c.selected || (tIndex === trackIndex && c.id === clipId)) {
                      targets.push({ trackIndex: tIndex, clip: c });
                    }
                  });
                  (t.midiClips || []).forEach((c) => {
                    if (c.selected) {
                      targets.push({ trackIndex: tIndex, clip: c });
                    }
                  });
                });

                // Dedupe (the dispatched clip may already be in selection).
                const seen = new Set<string>();
                const uniqueTargets = targets.filter(({ trackIndex: ti, clip }) => {
                  const key = `${ti}-${clip.id}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });

                // Per-clip trim math + overlap resolution (eating any
                // neighbor the trim pushed into) is pure — computed in
                // clipKeyboardEdit.ts and unit-tested there. This mirrors
                // the mouse-trim path: once a trim moves an edge into a
                // neighbor, the neighbor gets non-destructively eaten
                // (trim / split / delete) the same way it does on drop.
                const { updates, mutations } = computeKeyboardTrimBatch(uniqueTargets, edge, deltaSeconds, tracks);

                for (const update of updates) {
                  dispatch({
                    type: 'TRIM_CLIP',
                    payload: {
                      trackIndex: update.trackIndex,
                      clipId: update.clipId,
                      newTrimStart: update.newTrimStart,
                      newDuration: update.newDuration,
                      newStart: update.newStart,
                    },
                  });
                }

                if (mutations.length > 0) {
                  dispatch({
                    type: 'APPLY_CLIP_PLACEMENT',
                    payload: { placements: [], mutations },
                  });
                }

                // Screen-reader announcement of the resulting duration.
                // The focused clip's aria-label updates with the new
                // duration on re-render but VoiceOver doesn't re-read
                // the focused element's label automatically — push it
                // through the live region so each keyboard trim is
                // audible. Use the originating clip's new duration.
                const focused = uniqueTargets.find(
                  (t) => t.trackIndex === trackIndex && t.clip.id === clipId,
                ) ?? uniqueTargets[0];
                if (focused) {
                  announce(computeKeyboardTrimAnnouncement(focused.clip, deltaSeconds));
                }
              }}
              onClipStretch={(clipId, edge, deltaSeconds) => {
                // Keyboard time-stretch (Alt+Arrow). Sign convention
                // matches onClipTrim: positive delta shrinks the clip
                // from `edge`, negative grows it.
                // Applied to every selected clip; if the originating
                // clip isn't currently selected we still stretch it.
                const targets: KeyboardTrimTarget[] = [];
                tracks.forEach((t, tIndex) => {
                  t.clips.forEach((c) => {
                    if (c.selected || (tIndex === trackIndex && c.id === clipId)) {
                      targets.push({ trackIndex: tIndex, clip: c });
                    }
                  });
                  (t.midiClips || []).forEach((c) => {
                    if (c.selected) {
                      targets.push({ trackIndex: tIndex, clip: c });
                    }
                  });
                });
                const seen = new Set<string>();
                const uniqueTargets = targets.filter(({ trackIndex: ti, clip }) => {
                  const key = `${ti}-${clip.id}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });

                // Time-stretch is audio-only — stretchFactor never
                // applies to MidiClip (the STRETCH_CLIP reducer only
                // touches track.clips). MidiClip targets are skipped.
                for (const { trackIndex: ti, clip } of uniqueTargets) {
                  if ('notes' in clip) continue; // MidiClip — stretch doesn't apply
                  const result = computeKeyboardStretch({ clip, edge, deltaSeconds });
                  if (!result) continue;
                  dispatch({
                    type: 'STRETCH_CLIP',
                    payload: {
                      trackIndex: ti,
                      clipId: clip.id,
                      newDuration: result.newDuration,
                      newStretchFactor: result.newStretchFactor,
                      newStart: result.newStart,
                    },
                  });
                }
                // Announce the resulting duration of the originating
                // clip — VoiceOver won't re-read the focused element's
                // label on its own after the stretch reducer runs.
                const focused = uniqueTargets.find(
                  (t) => t.trackIndex === trackIndex && t.clip.id === clipId,
                ) ?? uniqueTargets[0];
                if (focused) {
                  announce(computeKeyboardStretchAnnouncement(focused.clip, deltaSeconds));
                }
              }}
              onEnvelopePointsChange={(clipId, points) => {
                dispatch({
                  type: 'UPDATE_CLIP_ENVELOPE_POINTS',
                  payload: { trackIndex, clipId: clipId as number, envelopePoints: points },
                });
              }}
              onClipMenuClick={(clipId, x, y, openedViaKeyboard) => {
                onClipMenuClick?.(clipId as number, trackIndex, x, y, openedViaKeyboard);
              }}
              onClipRename={(clipId, newName) => {
                dispatch({
                  type: 'UPDATE_CLIP',
                  payload: {
                    trackIndex,
                    clipId: clipId as number,
                    updates: { name: newName },
                  },
                });
              }}
              onClipClick={(clipId, shiftKey, metaKey) => {
                // Don't change selection if we just finished dragging
                if (didDragRef.current) {
                  didDragRef.current = false; // Reset immediately after blocking one click
                  return;
                }

                // Don't deselect if we just selected this clip on mouse down
                if (justSelectedOnMouseDownRef.current) {
                  justSelectedOnMouseDownRef.current = false; // Reset immediately after blocking one click
                  return;
                }

                if (shiftKey) {
                  // Shift+click: range selection (select all clips between last selected and this one)
                  dispatch({
                    type: 'SELECT_CLIP_RANGE',
                    payload: { trackIndex, clipId: clipId as number },
                  });
                } else if (metaKey) {
                  // Cmd/Ctrl+click: toggle selection (add/remove from multi-selection)
                  dispatch({
                    type: 'TOGGLE_CLIP_SELECTION',
                    payload: { trackIndex, clipId: clipId as number },
                  });
                  // Move track focus outline to this track
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                } else {
                  // Regular click/Enter: if the clip is already
                  // selected, leave the selection alone — a click on
                  // an already-selected clip's header shouldn't drop
                  // the selection. Only fire SELECT_CLIP when the
                  // clip is currently unselected.
                  const clip = track.clips.find(c => c.id === clipId) || (track.midiClips || []).find(c => c.id === clipId);
                  const isSelected = clip?.selected || false;
                  if (!isSelected) {
                    dispatch({
                      type: 'SELECT_CLIP',
                      payload: { trackIndex, clipId: clipId as number },
                    });
                  }
                }
              }}
              onClipTrimEdge={(clipId, edge) => {
                // Find the clip being trimmed
                const clip = track.clips.find(c => c.id === clipId) || (track.midiClips || []).find(c => c.id === clipId);
                if (!clip) return;

                // Initialize trim state on first call
                if (!clipTrimStateRef.current) {
                  // Select the clip if it's not already selected
                  if (!clip.selected) {
                    dispatch({
                      type: 'SELECT_CLIP',
                      payload: { trackIndex, clipId: clipId as number },
                    });
                  }

                  // Store initial state for all selected clips (including the one we just selected)
                  const allClipsInitialState = new Map<string, { trimStart: number; duration: number; start: number; fullDuration: number; isMidi?: boolean; stretchFactor?: number }>();
                  tracks.forEach((t, tIndex) => {
                    const isMidiTrack = t.type === 'midi';
                    const allTrackClips = [...t.clips, ...(t.midiClips || [])];
                    allTrackClips.forEach(c => {
                      // Include this clip even if it wasn't selected before (we just selected it)
                      if (c.selected || (tIndex === trackIndex && c.id === clipId)) {
                        const isMidi = isMidiTrack || (t.midiClips || []).some((mc) => mc.id === c.id);
                        const trimStart = (c as Clip).trimStart || 0;
                        const stretchFactor = (c as any).stretchFactor ?? 1; // justified: stretchFactor not on Clip/MidiClip type
                        // fullDuration is the source-audio length. If we don't
                        // have it stored yet, recover it from the visible duration
                        // by dividing by stretchFactor (canvas → source seconds).
                        const fullDuration = (c as Clip).fullDuration || (trimStart + c.duration / stretchFactor);
                        const key = `${tIndex}-${c.id}`;
                        allClipsInitialState.set(key, {
                          trimStart,
                          duration: c.duration,
                          start: c.start,
                          fullDuration,
                          isMidi,
                          stretchFactor,
                        });
                      }
                    });
                  });

                  clipTrimStateRef.current = {
                    trackIndex,
                    clipId: clipId as number,
                    edge,
                    initialTrimStart: (clip as Clip).trimStart || 0,
                    initialDuration: clip.duration,
                    initialClipStart: clip.start,
                    allClipsInitialState,
                  };
                }

                // The actual trimming happens in the mousemove handler
              }}
              onClipStretchEdge={(clipId, edge) => {
                // Only initialize once per drag — Clip.tsx calls back on every
                // mousemove. Subsequent mousemoves are handled inside the
                // stretch hook against the snapshot we capture here.
                if (clipStretchStateRef.current) return;
                const clip = track.clips.find(c => c.id === clipId);
                if (!clip) return;
                if (!clip.selected) {
                  dispatch({
                    type: 'SELECT_CLIP',
                    payload: { trackIndex, clipId: clipId as number },
                  });
                }
                // Snapshot initial state for every selected clip
                // (audio + MIDI) so the stretch hook can apply the
                // dragged clip's ratio across all of them. Include
                // the dragged clip even if it wasn't selected before —
                // we just selected it above.
                const allClipsInitialState: Array<{
                  trackIndex: number;
                  clipId: number;
                  isMidi: boolean;
                  initialDuration: number;
                  initialStart: number;
                  initialStretchFactor: number;
                }> = [];
                tracks.forEach((t, tIndex) => {
                  t.clips.forEach((c) => {
                    if (
                      c.selected
                      || (tIndex === trackIndex && c.id === clipId)
                    ) {
                      allClipsInitialState.push({
                        trackIndex: tIndex,
                        clipId: c.id as number,
                        isMidi: false,
                        initialDuration: c.duration,
                        initialStart: c.start,
                        initialStretchFactor: (c as any).stretchFactor ?? 1, // justified: stretchFactor not on Clip type
                      });
                    }
                  });
                  (t.midiClips || []).forEach((c) => {
                    if (c.selected) {
                      allClipsInitialState.push({
                        trackIndex: tIndex,
                        clipId: c.id,
                        isMidi: true,
                        initialDuration: c.duration,
                        initialStart: c.start,
                        initialStretchFactor: (c as any).stretchFactor ?? 1, // justified: stretchFactor not on MidiClip type
                      });
                    }
                  });
                });
                startClipStretch({
                  trackIndex,
                  clipId: clipId as number,
                  edge,
                  initialDuration: clip.duration,
                  initialStart: clip.start,
                  initialStretchFactor: (clip as any).stretchFactor ?? 1, // justified: stretchFactor not on Clip type
                  allClipsInitialState,
                });
              }}
              envelopePointSizes={envelopePointSizes}
              spectrogramScale={track.spectrogramScale ?? spectrogramScale}
              channelSplitRatio={track.channelSplitRatio}
              onChannelSplitRatioChange={(ratio) => {
                dispatch({
                  type: 'UPDATE_CHANNEL_SPLIT_RATIO',
                  payload: { index: trackIndex, ratio },
                });
              }}
              onTrackClick={(e) => {
                // Plain click: move focus only. Track selection is
                // now sticky — a canvas click doesn't collapse the
                // selection to the clicked row. Shift+Click still
                // extends a range from the anchor (explicit
                // gesture).
                dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });

                if (e.shiftKey) {
                  const anchor = selectionAnchor ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : trackIndex);
                  if (selectionAnchor === null) {
                    setSelectionAnchor(anchor);
                  }
                  const start = Math.min(anchor, trackIndex);
                  const end = Math.max(anchor, trackIndex);
                  const newSelection: number[] = [];
                  for (let i = start; i <= end; i++) {
                    newSelection.push(i);
                  }
                  dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                }
              }}
            />

            {/* Render labels for label tracks */}
            {track.labels && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  pointerEvents: 'none', // Allow clicks to pass through to children
                }}
              >
                <div style={{ pointerEvents: 'auto' }}>
                  <LabelRenderer
                    labels={track.labels}
                    trackIndex={trackIndex}
                    trackHeight={track.height || 114}
                    pixelsPerSecond={pixelsPerSecond}
                    clipContentOffset={CLIP_CONTENT_OFFSET}
                    selectedLabelIds={selectedLabelIds}
                    hoveredEar={hoveredEar}
                    hoveredBanner={hoveredBanner}
                    tracks={tracks}
                    selectedTrackIndices={selectedTrackIndices}
                    setHoveredEar={setHoveredEar}
                    setHoveredBanner={setHoveredBanner}
                    dispatch={dispatch}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

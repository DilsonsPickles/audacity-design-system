import { announce } from '@audacity-ui/components';
import type { TracksState, TracksAction, Clip, Label, Track } from '../../contexts/TracksContext';
import { dissolveDegenerateGroups } from '../../contexts/TracksContext';
import type { MidiClip } from '@audacity-ui/core';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { applySplitCut, applyRippleCut } from '../../utils/cutOperations';
import { rippleInsert, carveIntervals } from '../../utils/pasteOperations';
import { computeWholeGroupIds, regroupCopiedClips } from '../../utils/clipGroupCopy';
import { resolveTimeSelectionScope } from '../../utils/timeSelectionScope';
import { clipOfElement } from '../useFocusedClip';
import type { ClipboardState } from '../useKeyboardShortcuts';

/** The paste matrix's preferences (2026-11-12 spec), read from
 *  Preferences › Editing: how pasted audio treats the audio already
 *  there, and whether it lands as a clip of its own. */
export interface PastePrefs {
  mode: 'overlaps' | 'pushes';
  pushScope: 'same-track' | 'all-tracks';
  asNewClip: boolean;
}

/** Floats that drift by less than this are the same instant */
const PASTE_EPSILON = 1e-6;
/** A truncated pasted fade under this is no fade (the reducers' MIN_FADE_SECONDS) */
const MIN_PASTED_FADE = 0.02;

export interface ClipboardHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  clipboard: ClipboardState | null;
  setClipboard: React.Dispatch<React.SetStateAction<ClipboardState | null>>;
  audioManagerRef: React.RefObject<AudioPlaybackManager>;
  pastePrefs: PastePrefs;
}

/** Resolve the selected label ids ("trackIndex-labelId") to label objects. */
function resolveSelectedLabels(state: TracksState): (Label & { trackIndex: number })[] {
  const out: (Label & { trackIndex: number })[] = [];
  state.selectedLabelIds.forEach((keyId) => {
    const [trackIndexStr, labelIdStr] = keyId.split('-');
    const trackIndex = parseInt(trackIndexStr, 10);
    const labelId = parseInt(labelIdStr, 10);
    const label = state.tracks[trackIndex]?.labels?.find((l) => l.id === labelId);
    if (label) out.push({ ...label, trackIndex });
  });
  return out;
}

/** The audio clip with the keyboard focus, for the selection-else-focus
 *  rule (2026-10-13): the wrapper (or one of its handles) carrying
 *  data-clip-id + data-track-index */
function focusedAudioClip(state: TracksState): (Clip & { trackIndex: number }) | null {
  const f = clipOfElement(typeof document === 'undefined' ? null : document.activeElement);
  if (!f) return null;
  const clip = state.tracks[f.trackIndex]?.clips.find((c) => c.id === f.clipId);
  return clip ? { ...clip, trackIndex: f.trackIndex } : null;
}

export function handleCopy(deps: ClipboardHandlerDeps): void {
  const { state, setClipboard } = deps;

  // Priority 0: selected LABELS — an explicit label selection wins over
  // any lingering time selection (labels were the last thing picked).
  if (state.selectedLabelIds.length > 0) {
    const labels = resolveSelectedLabels(state);
    if (labels.length > 0) {
      setClipboard({ clips: [], labels, operation: 'copy' });
    }
    return;
  }

  // Priority 1: Copy time selection if it exists (skip clip-derived selections)
  if (state.timeSelection && state.timeSelection.renderOnCanvas !== false) {
    const { startTime, endTime } = state.timeSelection;

    // Collect clips that intersect the time selection on the tracks in
    // the selection's scope (drag rows → selectedTracks → all).
    const scopedTracks = resolveTimeSelectionScope(
      state.timeSelection,
      state.selectedTrackIndices,
      state.tracks.map((_, idx) => idx),
    );
    const clipsInSelection: (Clip & { trackIndex: number })[] = [];
    state.tracks.forEach((track, trackIndex) => {
      if (!scopedTracks.includes(trackIndex)) return;
      track.clips.forEach(clip => {
        const clipEnd = clip.start + clip.duration;
        if (clip.start < endTime && clipEnd > startTime) {
          clipsInSelection.push({ ...clip, trackIndex });
        }
      });
    });

    if (clipsInSelection.length > 0) {
      setClipboard({
        clips: clipsInSelection,
        operation: 'copy',
        timeSelection: { startTime, endTime },
        wholeGroupIds: Array.from(
          computeWholeGroupIds(clipsInSelection, state.tracks, { startTime, endTime })
        ),
      });
    }
    return;
  }

  // Priority 2: Copy selected clips…
  const selectedClips: (Clip & { trackIndex: number })[] = [];
  state.tracks.forEach((track, trackIndex) => {
    track.clips.forEach(clip => {
      if (clip.selected) {
        selectedClips.push({ ...clip, trackIndex });
      }
    });
  });
  // …else the FOCUSED clip (2026-10-13, selection else focus)
  if (selectedClips.length === 0) {
    const f = focusedAudioClip(state);
    if (f) selectedClips.push(f);
  }

  if (selectedClips.length > 0) {
    setClipboard({
      clips: selectedClips,
      operation: 'copy',
      wholeGroupIds: Array.from(computeWholeGroupIds(selectedClips, state.tracks)),
    });
  }
}

export function handleCut(deps: ClipboardHandlerDeps): void {
  const { state, dispatch, setClipboard } = deps;

  // Priority 0: selected LABELS — copy them, then remove (same
  // UPDATE_TRACK-with-filtered-labels mechanism as deleteHandlers).
  if (state.selectedLabelIds.length > 0) {
    const labels = resolveSelectedLabels(state);
    if (labels.length === 0) return;
    setClipboard({ clips: [], labels, operation: 'cut' });
    const removedByTrack = new Map<number, Set<number>>();
    labels.forEach((l) => {
      if (!removedByTrack.has(l.trackIndex)) removedByTrack.set(l.trackIndex, new Set());
      removedByTrack.get(l.trackIndex)!.add(l.id);
    });
    removedByTrack.forEach((ids, trackIndex) => {
      const track = state.tracks[trackIndex];
      if (!track?.labels) return;
      dispatch({
        type: 'UPDATE_TRACK',
        payload: { index: trackIndex, track: { labels: track.labels.filter((l) => !ids.has(l.id)) } },
      });
    });
    dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });
    return;
  }

  // Priority 1: Cut time selection if it exists (skip clip-derived selections)
  if (state.timeSelection && state.timeSelection.renderOnCanvas !== false) {
    const { startTime, endTime } = state.timeSelection;

    const scopedTracks = resolveTimeSelectionScope(
      state.timeSelection,
      state.selectedTrackIndices,
      state.tracks.map((_, idx) => idx),
    );
    const clipsInSelection: (Clip & { trackIndex: number })[] = [];
    state.tracks.forEach((track, trackIndex) => {
      if (!scopedTracks.includes(trackIndex)) return;
      track.clips.forEach(clip => {
        const clipEnd = clip.start + clip.duration;
        if (clip.start < endTime && clipEnd > startTime) {
          clipsInSelection.push({ ...clip, trackIndex });
        }
      });
    });

    if (clipsInSelection.length > 0) {
      setClipboard({
        clips: clipsInSelection,
        operation: 'cut',
        timeSelection: { startTime, endTime },
        wholeGroupIds: Array.from(
          computeWholeGroupIds(clipsInSelection, state.tracks, { startTime, endTime })
        ),
      });

      // Use split cut to trim partially-overlapping clips instead of deleting them
      const tracksAfterCut = applySplitCut(
        state.tracks,
        startTime,
        endTime,
        scopedTracks
      );

      dispatch({ type: 'REPLACE_TRACKS_EDIT', payload: dissolveDegenerateGroups(tracksAfterCut) });
      dispatch({ type: 'SET_TIME_SELECTION', payload: null });
    }
    return;
  }

  // Priority 2: Cut selected clips…
  const selectedClips: (Clip & { trackIndex: number })[] = [];
  state.tracks.forEach((track, trackIndex) => {
    track.clips.forEach(clip => {
      if (clip.selected) {
        selectedClips.push({ ...clip, trackIndex });
      }
    });
  });
  // …else the FOCUSED clip (2026-10-13, selection else focus)
  if (selectedClips.length === 0) {
    const f = focusedAudioClip(state);
    if (f) selectedClips.push(f);
  }

  if (selectedClips.length > 0) {
    setClipboard({
      clips: selectedClips,
      operation: 'cut',
      wholeGroupIds: Array.from(computeWholeGroupIds(selectedClips, state.tracks)),
    });

    // Immediately remove the cut clips from tracks
    const tracksAfterCut = state.tracks.map((track, tIndex) => ({
      ...track,
      clips: track.clips.filter(clip =>
        !selectedClips.some(cutClip => cutClip.id === clip.id && cutClip.trackIndex === tIndex)
      ),
    }));

    dispatch({ type: 'REPLACE_TRACKS_EDIT', payload: dissolveDegenerateGroups(tracksAfterCut) });
  }
}

/** Where a paste lands when it is not the playhead on the focused track:
 *  the canvas menu's "Paste" at the point that was right-clicked (2026-10-22). */
export interface PasteAt {
  time: number;
  trackIndex: number;
}

export function handlePaste(deps: ClipboardHandlerDeps, at?: PasteAt): void {
  const { state, dispatch, clipboard, audioManagerRef } = deps;

  if (!clipboard) return;

  // LABELS clipboard: paste onto the focused label track (or the first
  // label track), aligned so the earliest label lands at the playhead,
  // relative spacing preserved. One UPDATE_TRACK = one undo step.
  if (clipboard.labels && clipboard.labels.length > 0) {
    const focused = at?.trackIndex ?? state.focusedTrackIndex;
    const targetTrackIndex =
      focused !== null && focused !== undefined && state.tracks[focused]?.type === 'label'
        ? focused
        : state.tracks.findIndex((t) => t.type === 'label');
    if (targetTrackIndex === -1) {
      announce('No label track to paste into');
      return;
    }
    const targetTrack = state.tracks[targetTrackIndex];

    const earliest = Math.min(...clipboard.labels.map((l) => l.startTime));
    const timeOffset = (at?.time ?? state.playheadPosition) - earliest;
    let maxLabelId = 0;
    state.tracks.forEach((t) => t.labels?.forEach((l) => { maxLabelId = Math.max(maxLabelId, l.id); }));

    const pasted = clipboard.labels.map((l, i) => {
      const { trackIndex: _src, ...label } = l;
      return {
        ...label,
        id: maxLabelId + i + 1,
        trackIndex: targetTrackIndex,
        startTime: Math.max(0, label.startTime + timeOffset),
        endTime: label.endTime !== undefined ? Math.max(0, label.endTime + timeOffset) : undefined,
      };
    });

    dispatch({
      type: 'UPDATE_TRACK',
      payload: { index: targetTrackIndex, track: { labels: [...(targetTrack.labels ?? []), ...pasted] } },
    });
    dispatch({
      type: 'SET_SELECTED_LABELS',
      payload: pasted.map((l) => `${targetTrackIndex}-${l.id}`),
    });
    return;
  }

  if (clipboard.clips.length === 0) {
    return;
  }

  // Paste at the playhead on the focused track — or at the point asked for
  const targetTrackIndex = at?.trackIndex ?? state.focusedTrackIndex ?? 0;
  if (targetTrackIndex < 0 || targetTrackIndex >= state.tracks.length) {
    return;
  }

  // THE DESTINATION IS A RANGE when the project has a live time
  // selection and the paste wasn't aimed at an explicit point (the
  // canvas menu's PasteAt only opens with no selection): the pasted
  // content REPLACES the selection (2026-11-12 spec). Otherwise it is
  // a POINT — the playhead, or the point asked for.
  const rangeDest =
    !at && state.timeSelection && state.timeSelection.renderOnCanvas !== false
      ? { start: state.timeSelection.startTime, end: state.timeSelection.endTime }
      : null;
  const pasteTime = rangeDest ? rangeDest.start : (at?.time ?? state.playheadPosition);

  // Calculate time offset based on time selection or clip start times
  let timeOffset: number;
  let clipsToPaste = clipboard.clips;

  if (clipboard.timeSelection) {
    // Time selection paste: align selection start to playhead
    timeOffset = pasteTime - clipboard.timeSelection.startTime;

    // Trim clips to only include the time selection range
    clipsToPaste = clipboard.clips.map(clipData => {
      const clipEnd = clipData.start + clipData.duration;
      const selStart = clipboard.timeSelection!.startTime;
      const selEnd = clipboard.timeSelection!.endTime;

      // Calculate intersection with time selection
      const leftTrim = Math.max(0, selStart - clipData.start);
      const rightTrim = Math.max(0, clipEnd - selEnd);
      const newDuration = clipData.duration - leftTrim - rightTrim;

      if (newDuration <= 0) return null; // Clip doesn't intersect selection

      // The clip's own trimStart must advance by the clipped-off left
      // portion (same plain-seconds math as the split reducer and the
      // time-selection duplicate) — without this, a partial-clip paste
      // rendered and played from the clip's ORIGINAL source offset, i.e.
      // the wrong audio. fullDuration pins the true source extent for
      // waveform geometry on audio clips (MidiClip has no such field).
      const originalTrimStart = clipData.trimStart ?? 0;
      return {
        ...clipData,
        start: clipData.start + leftTrim,
        duration: newDuration,
        trimStart: originalTrimStart + leftTrim,
        ...('envelopePoints' in clipData
          ? { fullDuration: clipData.fullDuration ?? (originalTrimStart + clipData.duration) }
          : {}),
      };
    }).filter(Boolean);
  } else {
    // Whole clip paste: use earliest clip start
    const earliestClipStart = Math.min(...clipboard.clips.map(c => c.start));
    timeOffset = pasteTime - earliestClipStart;
  }

  // Calculate track offset to maintain relative positioning across tracks
  const minSourceTrackIndex = Math.min(...clipboard.clips.map(c => c.trackIndex));
  const trackOffset = targetTrackIndex - minSourceTrackIndex;

  // Type guard: discriminate audio clips (have envelopePoints) from MIDI clips (have notes).
  // Paste currently only supports audio clips into track.clips; MIDI clips are skipped here
  // pending a dedicated MIDI paste path.
  function isAudioClip(c: (Clip | MidiClip) & { trackIndex: number }): c is Clip & { trackIndex: number } {
    return 'envelopePoints' in c;
  }

  // LANDINGS: where each pasted clip will sit. Ids are minted AFTER the
  // room-making transforms below — their splits mint ids from the same
  // counter space, so ids assigned first would collide with them.
  let skippedMidiClips = 0;
  const landings: Array<{
    clipData: Clip & { trackIndex: number };
    sourceClipId: number;
    destTrackIndex: number;
    start: number;
  }> = [];
  clipsToPaste.forEach((clipData) => {
    const destTrackIndex = clipData.trackIndex + trackOffset;
    // Skip clips that would paste outside available tracks
    if (destTrackIndex < 0 || destTrackIndex >= state.tracks.length) return;
    if (!isAudioClip(clipData)) { skippedMidiClips++; return; } // no dedicated MIDI paste path yet
    landings.push({ clipData, sourceClipId: clipData.id, destTrackIndex, start: clipData.start + timeOffset });
  });
  if (skippedMidiClips > 0) {
    announce("MIDI clips can't be pasted yet");
  }
  if (landings.length === 0) return;

  // ——— THE PASTE MATRIX (2026-11-12 spec) ———
  // What pasting does to the audio already there is the paste
  // preferences' choice: OVERLAPS carves the landing span out of the
  // clips underneath; PUSHES splits at the paste point and shifts later
  // clips right, on the destination track(s) or on every track. A RANGE
  // destination REPLACES the selection. alwaysPasteAsNewClip OFF (merge
  // the audio into the recipient clip) is the matrix's second half —
  // until it lands, OFF pastes as a new clip too.
  const { pastePrefs } = deps;

  // The clipboard's span: a copied time selection keeps its silence
  // (room is made for the whole selection), bare clips their extent.
  const cbDur = clipboard.timeSelection
    ? clipboard.timeSelection.endTime - clipboard.timeSelection.startTime
    : Math.max(...landings.map((l) => l.start + l.clipData.duration)) - pasteTime;

  // A range destination SMALLER than the clipboard truncates the paste
  // to what fits the selection (the spec's cell b: sized to the range).
  let effectiveDur = cbDur;
  let finalLandings = landings;
  if (rangeDest) {
    const destLen = rangeDest.end - rangeDest.start;
    if (destLen < cbDur - PASTE_EPSILON) {
      finalLandings = landings
        .filter((l) => l.start < rangeDest.end - PASTE_EPSILON)
        .map((l) => {
          if (l.start + l.clipData.duration <= rangeDest.end + PASTE_EPSILON) return l;
          const duration = rangeDest.end - l.start;
          const fadeIn = Math.min(l.clipData.fadeIn ?? 0, duration);
          const fadeOut = Math.min(l.clipData.fadeOut ?? 0, Math.max(0, duration - fadeIn));
          return {
            ...l,
            clipData: {
              ...l.clipData,
              duration,
              fadeIn: fadeIn >= MIN_PASTED_FADE ? fadeIn : undefined,
              fadeOut: fadeOut >= MIN_PASTED_FADE ? fadeOut : undefined,
              envelopePoints: l.clipData.envelopePoints.filter((p) => p.time < duration),
            },
          };
        });
      effectiveDur = destLen;
      if (finalLandings.length === 0) return;
    }
  }

  // Make room, starting from the tracks with everything deselected
  let working: Track[] = state.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((c) => ({ ...c, selected: false })),
  }));
  const destIndices = Array.from(new Set(finalLandings.map((l) => l.destTrackIndex)));
  const pushScopeIndices = pastePrefs.pushScope === 'all-tracks'
    ? state.tracks.map((_, i) => i)
    : destIndices;

  if (rangeDest) {
    // REPLACE: empty the selection on the destination tracks…
    working = applySplitCut(working, rangeDest.start, rangeDest.end, destIndices);
    // …and in push mode close the excess so everything later keeps its
    // relative position (cell 2a); overlap mode leaves the gap (1a)
    const excessStart = rangeDest.start + effectiveDur;
    if (pastePrefs.mode === 'pushes' && rangeDest.end > excessStart + PASTE_EPSILON) {
      working = applyRippleCut(working, excessStart, rangeDest.end, pushScopeIndices);
    }
  } else if (pastePrefs.mode === 'overlaps') {
    working = carveIntervals(
      working,
      finalLandings.map((l) => ({ trackIndex: l.destTrackIndex, start: l.start, end: l.start + l.clipData.duration }))
    );
  } else {
    working = rippleInsert(working, pushScopeIndices, pasteTime, cbDur);
  }

  // Mint ids above everything the transforms produced
  let maxClipId = 0;
  working.forEach((track) => track.clips.forEach((clip) => { maxClipId = Math.max(maxClipId, clip.id); }));

  // Re-group the pasted set per the copy invariant: one fresh groupId per
  // source group captured whole at copy time; everything else ungrouped.
  // Runs on the post-drop set (out-of-range/MIDI clips excluded) so a
  // whole group whose siblings were dropped dissolves below two.
  const pastedFlat = finalLandings.map((l, i) => ({
    ...l.clipData,
    id: maxClipId + i + 1,
    start: l.start,
    selected: true,
    color: state.tracks[l.destTrackIndex].color,
  }));
  const regrouped = regroupCopiedClips(pastedFlat, new Set(clipboard.wholeGroupIds ?? []));

  const pastedPerTrack = new Map<number, Clip[]>();
  regrouped.forEach((clip, i) => {
    const dest = finalLandings[i].destTrackIndex;
    if (!pastedPerTrack.has(dest)) pastedPerTrack.set(dest, []);
    pastedPerTrack.get(dest)!.push(clip);
  });

  // Add clips to their respective tracks (a carve that emptied a whole
  // grouped clip can degenerate its group — dissolve, as the cuts do)
  const updatedTracks = dissolveDegenerateGroups(
    working.map((track, index) => {
      const extra = pastedPerTrack.get(index);
      return extra ? { ...track, clips: [...track.clips, ...extra] } : track;
    })
  );

  dispatch({ type: 'REPLACE_TRACKS_EDIT', payload: updatedTracks });

  // A replaced selection shrinks to what was pasted into it (spec 1a)
  if (rangeDest && state.timeSelection) {
    dispatch({
      type: 'SET_TIME_SELECTION',
      payload: { ...state.timeSelection, startTime: rangeDest.start, endTime: rangeDest.start + effectiveDur },
    });
  }

  // Copy audio buffers for pasted clips so they play back correctly
  const audioManager = audioManagerRef.current;
  if (audioManager) {
    regrouped.forEach((clip, i) => {
      const buffer = audioManager.getClipBuffer(finalLandings[i].sourceClipId);
      if (buffer) {
        audioManager.addClipBuffer(clip.id, buffer);
      }
    });
  }
}

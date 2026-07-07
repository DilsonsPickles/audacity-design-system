import { announce } from '@dilsonspickles/components';
import type { TracksState, TracksAction, Clip } from '../../contexts/TracksContext';
import { dissolveDegenerateGroups } from '../../contexts/TracksContext';
import type { MidiClip } from '@audacity-ui/core';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { applySplitCut } from '../../utils/cutOperations';
import { computeWholeGroupIds, regroupCopiedClips } from '../../utils/clipGroupCopy';
import type { ClipboardState } from '../useKeyboardShortcuts';

export interface ClipboardHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  clipboard: ClipboardState | null;
  setClipboard: React.Dispatch<React.SetStateAction<ClipboardState | null>>;
  audioManagerRef: React.RefObject<AudioPlaybackManager>;
}

export function handleCopy(deps: ClipboardHandlerDeps): void {
  const { state, setClipboard } = deps;

  // Priority 1: Copy time selection if it exists (skip clip-derived selections)
  if (state.timeSelection && state.timeSelection.renderOnCanvas !== false) {
    const { startTime, endTime } = state.timeSelection;

    // Collect clips that intersect with the time selection on selected tracks
    const selectedTracks = state.selectedTrackIndices;
    const clipsInSelection: (Clip & { trackIndex: number })[] = [];
    state.tracks.forEach((track, trackIndex) => {
      if (selectedTracks.length > 0 && !selectedTracks.includes(trackIndex)) return;
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

  // Priority 2: Copy selected clips
  const selectedClips: (Clip & { trackIndex: number })[] = [];
  state.tracks.forEach((track, trackIndex) => {
    track.clips.forEach(clip => {
      if (clip.selected) {
        selectedClips.push({ ...clip, trackIndex });
      }
    });
  });

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

  // Priority 1: Cut time selection if it exists (skip clip-derived selections)
  if (state.timeSelection && state.timeSelection.renderOnCanvas !== false) {
    const { startTime, endTime } = state.timeSelection;

    const selectedTracks = state.selectedTrackIndices;
    const clipsInSelection: (Clip & { trackIndex: number })[] = [];
    state.tracks.forEach((track, trackIndex) => {
      if (selectedTracks.length > 0 && !selectedTracks.includes(trackIndex)) return;
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
        selectedTracks.length > 0 ? selectedTracks : state.tracks.map((_, i) => i)
      );

      dispatch({ type: 'REPLACE_TRACKS_EDIT', payload: dissolveDegenerateGroups(tracksAfterCut) });
      dispatch({ type: 'SET_TIME_SELECTION', payload: null });
    }
    return;
  }

  // Priority 2: Cut selected clips
  const selectedClips: (Clip & { trackIndex: number })[] = [];
  state.tracks.forEach((track, trackIndex) => {
    track.clips.forEach(clip => {
      if (clip.selected) {
        selectedClips.push({ ...clip, trackIndex });
      }
    });
  });

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

export function handlePaste(deps: ClipboardHandlerDeps): void {
  const { state, dispatch, clipboard, audioManagerRef } = deps;

  if (!clipboard || clipboard.clips.length === 0) {
    return;
  }

  // Paste at playhead position on the focused track
  const targetTrackIndex = state.focusedTrackIndex ?? 0;
  if (targetTrackIndex < 0 || targetTrackIndex >= state.tracks.length) {
    return;
  }

  const pasteTime = state.playheadPosition;

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
      const trimStart = Math.max(0, selStart - clipData.start);
      const trimEnd = Math.max(0, clipEnd - selEnd);
      const newDuration = clipData.duration - trimStart - trimEnd;

      if (newDuration <= 0) return null; // Clip doesn't intersect selection

      return {
        ...clipData,
        start: clipData.start + trimStart,
        duration: newDuration,
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

  // Generate new clip IDs
  let maxClipId = 0;
  state.tracks.forEach(track => {
    track.clips.forEach(clip => {
      maxClipId = Math.max(maxClipId, clip.id);
    });
  });

  // Create new clips with updated positions and track assignments
  const newClipsWithTracks = clipsToPaste
    .map((clipData, index) => {
      const destTrackIndex = clipData.trackIndex + trackOffset;

      // Skip clips that would paste outside available tracks
      if (destTrackIndex < 0 || destTrackIndex >= state.tracks.length) {
        return null;
      }

      return {
        clip: {
          ...clipData,
          id: maxClipId + index + 1,
          start: clipData.start + timeOffset,
          selected: true,
          color: state.tracks[destTrackIndex].color,
        },
        sourceClipId: clipData.id,
        destTrackIndex,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Type guard: discriminate audio clips (have envelopePoints) from MIDI clips (have notes).
  // Paste currently only supports audio clips into track.clips; MIDI clips are skipped here
  // pending a dedicated MIDI paste path.
  function isAudioClip(c: (Clip | MidiClip) & { trackIndex: number }): c is Clip & { trackIndex: number } {
    return 'envelopePoints' in c;
  }

  // Group clips by destination track
  const clipsByTrack = new Map<number, (Clip & { trackIndex: number })[]>();
  let skippedMidiClips = 0;
  newClipsWithTracks.forEach(({ clip, destTrackIndex }) => {
    if (!isAudioClip(clip)) { skippedMidiClips++; return; } // skip MIDI clips — no dedicated paste path yet
    if (!clipsByTrack.has(destTrackIndex)) {
      clipsByTrack.set(destTrackIndex, []);
    }
    clipsByTrack.get(destTrackIndex)!.push(clip);
  });
  if (skippedMidiClips > 0) {
    announce("MIDI clips can't be pasted yet");
  }

  // Re-group the pasted set per the copy invariant: one fresh groupId per
  // source group captured whole at copy time; everything else ungrouped.
  // Runs on the post-drop set (out-of-range/MIDI clips excluded) so a
  // whole group whose siblings were dropped dissolves below two.
  const pastedFlat = Array.from(clipsByTrack.values()).flat();
  const regrouped = regroupCopiedClips(
    pastedFlat,
    new Set(clipboard.wholeGroupIds ?? [])
  );
  let regroupIdx = 0;
  for (const [destIndex, trackClips] of clipsByTrack) {
    clipsByTrack.set(destIndex, trackClips.map(() => regrouped[regroupIdx++]));
  }

  // Add clips to their respective tracks
  const updatedTracks = state.tracks.map((track, index) => {
    const clipsForThisTrack = clipsByTrack.get(index) || [];
    return {
      ...track,
      clips: [
        ...track.clips.map(c => ({ ...c, selected: false })),
        ...clipsForThisTrack,
      ],
    };
  });

  dispatch({ type: 'REPLACE_TRACKS_EDIT', payload: updatedTracks });

  // Copy audio buffers for pasted clips so they play back correctly
  const audioManager = audioManagerRef.current;
  if (audioManager) {
    newClipsWithTracks.forEach(({ clip, sourceClipId }) => {
      const buffer = audioManager.getClipBuffer(sourceClipId);
      if (buffer) {
        audioManager.addClipBuffer(clip.id, buffer);
      }
    });
  }
}

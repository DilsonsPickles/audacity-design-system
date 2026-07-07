import type { TracksState, TracksAction, Clip } from '../TracksContext';
import { applyCut } from '../../utils/cutOperations';
import { dissolveDegenerateGroups } from './shared';

export function clipsReducer(state: TracksState, action: TracksAction): TracksState {
  switch (action.type) {
    case 'ADD_CLIP': {
      const { trackIndex, clip } = action.payload;
      const track = state.tracks[trackIndex];
      // Default clip color to the track's color
      const coloredClip = clip.color ? clip : { ...clip, color: track.color };
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: [...newTracks[trackIndex].clips, coloredClip],
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_CLIP': {
      const { trackIndex, clipId, updates } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: newTracks[trackIndex].clips.map(clip =>
          clip.id === clipId
            ? { ...clip, ...updates }
            : clip
        ),
      };
      return { ...state, tracks: newTracks };
    }

    case 'DELETE_CLIP': {
      const { trackIndex, clipId } = action.payload;

      // Check if the deleted clip was selected (in either clips or midiClips)
      const deletedClip = state.tracks[trackIndex]?.clips.find(c => c.id === clipId)
        || state.tracks[trackIndex]?.midiClips?.find(c => c.id === clipId);

      // Find the index of the deleted MIDI clip (for piano roll adjustment)
      const deletedMidiIndex = state.tracks[trackIndex]?.midiClips?.findIndex(c => c.id === clipId) ?? -1;

      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: newTracks[trackIndex].clips.filter(c => c.id !== clipId),
        midiClips: newTracks[trackIndex].midiClips?.filter(c => c.id !== clipId),
      };

      // Clear clip duration indicator if the deleted clip was selected
      const newClipDurationIndicator = deletedClip?.selected ? null : state.clipDurationIndicator;

      // Adjust piano roll clip index when a MIDI clip is deleted from the same track
      // Never close the piano roll from here — let the user control that
      let newPianoRollClipIndex = state.pianoRollClipIndex;
      if (deletedMidiIndex >= 0 && state.pianoRollTrackIndex === trackIndex && state.pianoRollClipIndex !== null) {
        const remainingMidiClips = newTracks[trackIndex].midiClips?.length ?? 0;
        if (remainingMidiClips === 0) {
          newPianoRollClipIndex = null;
        } else if (deletedMidiIndex < state.pianoRollClipIndex) {
          newPianoRollClipIndex = state.pianoRollClipIndex - 1;
        } else if (deletedMidiIndex === state.pianoRollClipIndex) {
          newPianoRollClipIndex = Math.min(state.pianoRollClipIndex, remainingMidiClips - 1);
        }
      }

      return {
        ...state,
        tracks: dissolveDegenerateGroups(newTracks),
        clipDurationIndicator: newClipDurationIndicator,
        pianoRollClipIndex: newPianoRollClipIndex,
      };
    }

    case 'MOVE_CLIP': {
      const { clipId, fromTrackIndex, toTrackIndex, newStartTime } = action.payload;
      const newTracks = [...state.tracks];

      // Find the clip in the source track (audio or midi)
      const clip = newTracks[fromTrackIndex].clips.find(c => c.id === clipId);
      const midiClip = !clip ? newTracks[fromTrackIndex].midiClips?.find(c => c.id === clipId) : null;
      if (!clip && !midiClip) return state;

      const movingClip = (clip || midiClip)!;
      const isMidi = !clip;

      // Calculate the delta for time selection update
      const timeDelta = newStartTime - movingClip.start;

      if (fromTrackIndex === toTrackIndex) {
        // Moving within the same track - just update start time
        if (isMidi) {
          newTracks[fromTrackIndex] = {
            ...newTracks[fromTrackIndex],
            midiClips: newTracks[fromTrackIndex].midiClips?.map(c =>
              c.id === clipId ? { ...c, start: newStartTime } : c
            ),
          };
        } else {
          newTracks[fromTrackIndex] = {
            ...newTracks[fromTrackIndex],
            clips: newTracks[fromTrackIndex].clips.map(c =>
              c.id === clipId ? { ...c, start: newStartTime } : c
            ),
          };
        }
      } else {
        // Moving to a different track
        if (isMidi) {
          // Remove from source track
          newTracks[fromTrackIndex] = {
            ...newTracks[fromTrackIndex],
            midiClips: newTracks[fromTrackIndex].midiClips?.filter(c => c.id !== clipId),
          };
          // Add to destination track with new start time
          newTracks[toTrackIndex] = {
            ...newTracks[toTrackIndex],
            midiClips: [...(newTracks[toTrackIndex].midiClips || []), { ...midiClip!, start: newStartTime, color: newTracks[toTrackIndex].color }],
          };
        } else {
          // Remove from source track
          newTracks[fromTrackIndex] = {
            ...newTracks[fromTrackIndex],
            clips: newTracks[fromTrackIndex].clips.filter(c => c.id !== clipId),
          };
          // Add to destination track with new start time
          newTracks[toTrackIndex] = {
            ...newTracks[toTrackIndex],
            clips: [...newTracks[toTrackIndex].clips, { ...clip!, start: newStartTime, color: newTracks[toTrackIndex].color }],
          };
        }
      }

      // Update time selection if the moved clip is selected
      let newTimeSelection = state.timeSelection;
      if (movingClip.selected && state.timeSelection) {
        newTimeSelection = {
          ...state.timeSelection,
          startTime: state.timeSelection.startTime + timeDelta,
          endTime: state.timeSelection.endTime + timeDelta,
        };
      }

      // Update clip duration indicator if the moved clip is selected
      let newClipDurationIndicator = state.clipDurationIndicator;
      if (movingClip.selected && state.clipDurationIndicator) {
        newClipDurationIndicator = {
          startTime: newStartTime,
          endTime: newStartTime + movingClip.duration,
        };
      }

      return { ...state, tracks: newTracks, timeSelection: newTimeSelection, clipDurationIndicator: newClipDurationIndicator };
    }

    case 'APPLY_CLIP_PLACEMENT': {
      const { placements, mutations } = action.payload;

      // Generate fresh ids for split right-segments. Use a single counter
      // anchored to the current max id so all splits in this dispatch get unique ids.
      let nextId = 1;
      for (const t of state.tracks) {
        for (const c of t.clips) if (c.id >= nextId) nextId = c.id + 1;
      }

      const newTracks = state.tracks.map((track, trackIndex) => {
        const trackMutations = mutations.filter(m => m.trackIndex === trackIndex);
        const trackPlacements = placements.filter(p => p.trackIndex === trackIndex);

        if (trackMutations.length === 0 && trackPlacements.length === 0) return track;

        // Apply mutations to existing clips, producing a list of new clips.
        let newClips: Clip[] = [];
        for (const clip of track.clips) {
          const mutation = trackMutations.find(m => m.clipId === clip.id);

          if (!mutation) {
            newClips.push(clip);
            continue;
          }

          if (mutation.type === 'delete') {
            // omit
            continue;
          }

          if (mutation.type === 'trim') {
            newClips.push({
              ...clip,
              start: mutation.newStart,
              duration: mutation.newDuration,
              trimStart: mutation.newTrimStart,
              fullDuration: clip.fullDuration ?? ((clip.trimStart ?? 0) + clip.duration),
            });
            continue;
          }

          // mutation.type === 'split'
          const originalTrimStart = clip.trimStart ?? 0;
          const originalEnd = clip.start + clip.duration;
          const fullDuration = clip.fullDuration ?? (originalTrimStart + clip.duration);

          // Left segment keeps the original id and waveform reference.
          const leftSegment: Clip = {
            ...clip,
            duration: mutation.leftEnd - clip.start,
            fullDuration,
          };

          // Right segment gets a fresh id; trimStart advances by skipped audio length.
          // `sourceClipId` is carried forward (or set to the original id on
          // first split) so the audio engine can find the shared buffer.
          const rightSegment: Clip = {
            ...clip,
            id: nextId++,
            start: mutation.rightStart,
            duration: originalEnd - mutation.rightStart,
            trimStart: originalTrimStart + (mutation.rightStart - clip.start),
            fullDuration,
            sourceClipId: clip.sourceClipId ?? clip.id,
          };

          newClips.push(leftSegment, rightSegment);
        }

        // Apply placements: update start/duration on moving clips already in the track.
        if (trackPlacements.length > 0) {
          newClips = newClips.map(clip => {
            const placement = trackPlacements.find(p => p.clipId === clip.id);
            if (!placement) return clip;
            return { ...clip, start: placement.start, duration: placement.duration };
          });
        }

        return { ...track, clips: newClips };
      });

      return { ...state, tracks: dissolveDegenerateGroups(newTracks) };
    }

    case 'TRIM_CLIP': {
      const { trackIndex, clipId, newTrimStart, newDuration, newStart } = action.payload;

      // Find the clip to check if it's selected (in either clips or midiClips)
      const clip = state.tracks[trackIndex]?.clips.find(c => c.id === clipId)
        || state.tracks[trackIndex]?.midiClips?.find(c => c.id === clipId);

      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: newTracks[trackIndex].clips.map(clip => {
          if (clip.id === clipId) {
            const updatedClip: Clip = {
              ...clip,
              trimStart: newTrimStart,
              duration: newDuration,
            };
            if (newStart !== undefined) {
              updatedClip.start = newStart;
            }
            // Store full duration if not already stored
            if (!clip.fullDuration) {
              updatedClip.fullDuration = newTrimStart + newDuration;
            }
            return updatedClip;
          }
          return clip;
        }),
        midiClips: newTracks[trackIndex].midiClips?.map(mc => {
          if (mc.id === clipId) {
            const updated = { ...mc, trimStart: newTrimStart, duration: newDuration };
            if (newStart !== undefined) {
              updated.start = newStart;
            }
            return updated;
          }
          return mc;
        }),
      };

      // Update clip duration indicator if the trimmed clip is selected
      let newClipDurationIndicator = state.clipDurationIndicator;
      if (clip?.selected && state.clipDurationIndicator) {
        const finalStart = newStart !== undefined ? newStart : clip.start;
        newClipDurationIndicator = {
          startTime: finalStart,
          endTime: finalStart + newDuration,
        };
      }

      // If a time selection is currently locked to this clip's bounds
      // (e.g. set by SELECT_CLIP), follow the edit so it doesn't drift.
      let newTimeSelection = state.timeSelection;
      if (clip && state.timeSelection
        && Math.abs(state.timeSelection.startTime - clip.start) < 0.001
        && Math.abs(state.timeSelection.endTime - (clip.start + clip.duration)) < 0.001) {
        const finalStart = newStart !== undefined ? newStart : clip.start;
        newTimeSelection = {
          ...state.timeSelection,
          startTime: finalStart,
          endTime: finalStart + newDuration,
        };
      }

      return { ...state, tracks: newTracks, clipDurationIndicator: newClipDurationIndicator, timeSelection: newTimeSelection };
    }

    case 'STRETCH_CLIP': {
      // Visual-only time-stretch: changes the clip's visible duration while
      // keeping its trimStart fixed and recording a `stretchFactor` so the
      // waveform render expands (or compresses) horizontally instead of
      // exposing more / less of the source audio.
      const { trackIndex, clipId, newDuration, newStretchFactor, newStart } = action.payload;
      const targetClip = state.tracks[trackIndex]?.clips.find(c => c.id === clipId);
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        clips: newTracks[trackIndex].clips.map(clip => {
          if (clip.id !== clipId) return clip;
          const oldStretch = (clip as any).stretchFactor ?? 1; // justified: stretchFactor is audio-only, not on Clip type (MidiClip must NOT get it)
          const trimStart = clip.trimStart ?? 0;
          // Lock in fullDuration (source-audio length) on first stretch so
          // subsequent trim operations have an accurate audio-bound to
          // clamp against.
          const fullDuration =
            clip.fullDuration ?? (trimStart + clip.duration / oldStretch);
          const updatedClip = {
            ...clip,
            duration: newDuration,
            stretchFactor: newStretchFactor,
            fullDuration,
          } as Clip & { stretchFactor: number };
          if (newStart !== undefined) updatedClip.start = newStart;
          return updatedClip;
        }),
      };

      // If a time selection or clip duration indicator was locked to this
      // clip's bounds (e.g. set by SELECT_CLIP), follow the stretch so the
      // overlay doesn't drift away from the clip.
      const finalStart = newStart !== undefined ? newStart : targetClip?.start ?? 0;
      const finalEnd = finalStart + newDuration;

      let newTimeSelection = state.timeSelection;
      if (targetClip && state.timeSelection
        && Math.abs(state.timeSelection.startTime - targetClip.start) < 0.001
        && Math.abs(state.timeSelection.endTime - (targetClip.start + targetClip.duration)) < 0.001) {
        newTimeSelection = {
          ...state.timeSelection,
          startTime: finalStart,
          endTime: finalEnd,
        };
      }

      let newClipDurationIndicator = state.clipDurationIndicator;
      if (targetClip?.selected && state.clipDurationIndicator) {
        newClipDurationIndicator = { startTime: finalStart, endTime: finalEnd };
      }

      return {
        ...state,
        tracks: newTracks,
        timeSelection: newTimeSelection,
        clipDurationIndicator: newClipDurationIndicator,
      };
    }

    case 'MOVE_SELECTED_CLIPS': {
      const { deltaSeconds } = action.payload;

      // Find the leftmost selected clip. Clamp the group's shared
      // delta so that clip never crosses time 0 — otherwise a
      // leftward move where the leftmost clip hits 0 would
      // individually clamp only that clip and collapse the others
      // into it, breaking the group's relative spacing.
      let leftmostStart = Infinity;
      let firstSelectedClip: { start: number; duration: number } | null = null;
      state.tracks.forEach(track => {
        track.clips.forEach(clip => {
          if (clip.selected) {
            if (clip.start < leftmostStart) leftmostStart = clip.start;
            if (!firstSelectedClip) firstSelectedClip = clip;
          }
        });
        track.midiClips?.forEach(clip => {
          if (clip.selected) {
            if (clip.start < leftmostStart) leftmostStart = clip.start;
            if (!firstSelectedClip) firstSelectedClip = clip;
          }
        });
      });

      const clampedDelta = leftmostStart !== Infinity && leftmostStart + deltaSeconds < 0
        ? -leftmostStart
        : deltaSeconds;

      const newTracks = state.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (!clip.selected) return clip;
          return { ...clip, start: clip.start + clampedDelta };
        }),
        midiClips: track.midiClips?.map(clip => {
          if (!clip.selected) return clip;
          return { ...clip, start: clip.start + clampedDelta };
        }),
      }));

      // Update time selection
      let newTimeSelection = state.timeSelection;
      if (state.timeSelection) {
        newTimeSelection = {
          ...state.timeSelection,
          startTime: state.timeSelection.startTime + clampedDelta,
          endTime: state.timeSelection.endTime + clampedDelta,
        };
      }

      // Update clip duration indicator for the first selected clip
      let newClipDurationIndicator = state.clipDurationIndicator;
      if (firstSelectedClip) {
        const newStart = (firstSelectedClip as { start: number }).start + clampedDelta;
        newClipDurationIndicator = {
          startTime: newStart,
          endTime: newStart + (firstSelectedClip as { start: number; duration: number }).duration,
        };
      }

      return { ...state, tracks: newTracks, timeSelection: newTimeSelection, clipDurationIndicator: newClipDurationIndicator };
    }

    case 'MOVE_SELECTED_CLIPS_TO_TRACK': {
      const { direction } = action.payload;

      // Collect all selected clips (audio + midi) with their track indices
      const selectedEntries: Array<{ trackIndex: number; clip: Clip; isMidi: boolean }> = [];
      state.tracks.forEach((track, trackIndex) => {
        track.clips.forEach(clip => {
          if (clip.selected) {
            selectedEntries.push({ trackIndex, clip, isMidi: false });
          }
        });
        track.midiClips?.forEach(clip => {
          if (clip.selected) {
            selectedEntries.push({ trackIndex, clip: clip as unknown as Clip, isMidi: true }); // justified: MidiClip treated as Clip in cross-track move (common id/start/duration fields used)
          }
        });
      });

      if (selectedEntries.length === 0) return state;

      // Validate: if ANY selected clip would move out of bounds, skip entirely
      for (const entry of selectedEntries) {
        const targetIndex = entry.trackIndex + direction;
        if (targetIndex < 0 || targetIndex >= state.tracks.length) return state;
      }

      // Remove selected clips from source tracks, add to destination tracks
      const newTracks = state.tracks.map(track => ({
        ...track,
        clips: [...track.clips],
        midiClips: track.midiClips ? [...track.midiClips] : undefined,
      }));

      // First pass: remove selected clips from their source tracks
      for (const entry of selectedEntries) {
        if (entry.isMidi) {
          newTracks[entry.trackIndex] = {
            ...newTracks[entry.trackIndex],
            midiClips: newTracks[entry.trackIndex].midiClips?.filter(c => c.id !== entry.clip.id),
          };
        } else {
          newTracks[entry.trackIndex] = {
            ...newTracks[entry.trackIndex],
            clips: newTracks[entry.trackIndex].clips.filter(c => c.id !== entry.clip.id),
          };
        }
      }

      // Second pass: add selected clips to destination tracks
      for (const entry of selectedEntries) {
        const destIndex = entry.trackIndex + direction;
        if (entry.isMidi) {
          newTracks[destIndex] = {
            ...newTracks[destIndex],
            midiClips: [...(newTracks[destIndex].midiClips || []), { ...(entry.clip as unknown as import('@audacity-ui/core').MidiClip), color: newTracks[destIndex].color }], // justified: entry.clip is already a MidiClip stored as Clip for uniform handling
          };
        } else {
          newTracks[destIndex] = {
            ...newTracks[destIndex],
            clips: [...newTracks[destIndex].clips, { ...entry.clip, color: newTracks[destIndex].color }],
          };
        }
      }

      // Track selection intentionally left untouched — moving clips
      // between tracks does not promote destination tracks into the
      // selection set. Matches the SELECT_CLIP / drag decoupling.

      return {
        ...state,
        tracks: newTracks,
      };
    }

    case 'DELETE_TIME_RANGE': {
      const { startTime, endTime } = action.payload;

      // If no tracks are selected, apply cut to all tracks
      const trackIndicesToCut = state.selectedTrackIndices.length > 0
        ? state.selectedTrackIndices
        : state.tracks.map((_, idx) => idx);

      const newTracks = applyCut(
        state.tracks,
        startTime,
        endTime,
        state.cutMode,
        trackIndicesToCut
      );

      return {
        ...state,
        tracks: dissolveDegenerateGroups(newTracks),
      };
    }

    case 'GROUP_SELECTED_CLIPS': {
      // Collect selected clips and any old group IDs they belong to
      let selectedCount = 0;
      const oldGroupIds = new Set<string>();
      for (const t of state.tracks) {
        for (const c of t.clips) {
          if (c.selected) {
            selectedCount++;
            if (c.groupId) oldGroupIds.add(c.groupId);
          }
        }
      }

      // Need at least 2 selected clips to form a group
      if (selectedCount < 2) return state;

      const newGroupId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Pass 1: assign new groupId to every selected clip
      let newTracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.selected ? { ...c, groupId: newGroupId } : c
        ),
      }));

      // Pass 2: for each old group, dissolve it if only 1 member remains
      for (const oldId of oldGroupIds) {
        let remainingCount = 0;
        for (const t of newTracks) {
          for (const c of t.clips) {
            if (c.groupId === oldId) remainingCount++;
          }
        }
        if (remainingCount <= 1) {
          newTracks = newTracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.groupId === oldId ? { ...c, groupId: undefined } : c),
          }));
        }
      }

      return { ...state, tracks: newTracks };
    }

    case 'UNGROUP_CLIPS': {
      const targetGroupId = action.payload.groupId;
      const newTracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.groupId === targetGroupId ? { ...c, groupId: undefined } : c
        ),
      }));
      return { ...state, tracks: newTracks };
    }

    case 'ADD_LABEL': {
      const { trackIndex, label } = action.payload;
      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        labels: [label, ...(newTracks[trackIndex].labels || [])],
      };
      return { ...state, tracks: newTracks };
    }

    case 'UPDATE_LABEL': {
      const { trackIndex, labelId, label } = action.payload;

      // Find the original label before update
      const originalLabel = state.tracks[trackIndex]?.labels?.find(l => l.id === labelId);

      const newTracks = [...state.tracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        labels: (newTracks[trackIndex].labels || []).map(l =>
          l.id === labelId ? { ...l, ...label } : l
        ),
      };

      // Update time selection if ONLY this label is selected and its startTime/endTime changed
      // (Don't update time selection for multi-selection, matching clip behavior)
      let newTimeSelection = state.timeSelection;
      const labelKeyId = `${trackIndex}-${labelId}`;
      if (originalLabel && state.selectedLabelIds.includes(labelKeyId) && state.selectedLabelIds.length === 1) {
        // Check if startTime or endTime changed
        const timeChanged = label.startTime !== undefined && label.startTime !== originalLabel.startTime;
        const endTimeChanged = label.endTime !== undefined && label.endTime !== originalLabel.endTime;

        if (timeChanged || endTimeChanged) {
          // Get the updated label from newTracks
          const updatedLabel = newTracks[trackIndex].labels?.find(l => l.id === labelId);
          if (updatedLabel) {
            // Recalculate time selection from the updated label
            newTimeSelection = {
              startTime: updatedLabel.startTime,
              endTime: updatedLabel.endTime,
            };
          }
        }
      }

      return { ...state, tracks: newTracks, timeSelection: newTimeSelection };
    }

    default:
      return state;
  }
}

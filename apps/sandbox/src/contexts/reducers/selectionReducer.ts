import type { TracksState, TracksAction, Label, TimeSelection } from '../TracksContext';
import { expandSelectionToGroups } from '../TracksContext';

export function selectionReducer(state: TracksState, action: TracksAction): TracksState {
  switch (action.type) {
    case 'SET_SELECTED_TRACKS':
      return { ...state, selectedTrackIndices: action.payload };

    case 'SET_FOCUSED_TRACK':
      return { ...state, focusedTrackIndex: action.payload };

    case 'SELECT_TRACK': {
      return {
        ...state,
        selectedTrackIndices: [action.payload],
        focusedTrackIndex: action.payload,
      };
    }

    case 'SELECT_CLIP': {
      const { trackIndex, clipId } = action.payload;
      const newTracks = state.tracks.map((track, tIndex) => ({
        ...track,
        clips: track.clips.map(clip => ({
          ...clip,
          selected: tIndex === trackIndex && clip.id === clipId
        })),
        midiClips: track.midiClips?.map(clip => ({
          ...clip,
          selected: tIndex === trackIndex && clip.id === clipId
        })),
      }));

      const expandedTracks = expandSelectionToGroups(newTracks);

      // Track selection is intentionally decoupled from clip
      // selection — selecting a clip no longer promotes its track
      // into the selection set. Callers that want the classic
      // "clip select selects track" behaviour dispatch
      // SET_SELECTED_TRACKS themselves.

      return {
        ...state,
        tracks: expandedTracks,
        focusedTrackIndex: trackIndex,
        selectedLabelIds: [],
        timeSelection: null,
        clipDurationIndicator: null,
        lastSelectedClip: { trackIndex, clipId },
      };
    }

    case 'SELECT_CLIPS': {
      // Multi-clip exclusive selection — sets `selected: true` on every
      // clip in the payload and clears it on every other clip.
      const wanted = new Set(action.payload.map(p => `${p.trackIndex}:${p.clipId}`));
      const newTracks = state.tracks.map((track, tIndex) => ({
        ...track,
        clips: track.clips.map(clip => ({
          ...clip,
          selected: wanted.has(`${tIndex}:${clip.id}`),
        })),
        midiClips: track.midiClips?.map(clip => ({
          ...clip,
          selected: wanted.has(`${tIndex}:${clip.id}`),
        })),
      }));
      const expandedTracks = expandSelectionToGroups(newTracks);
      const last = action.payload[action.payload.length - 1];
      // Track selection intentionally left untouched — clip
      // selection no longer implies track selection.
      return {
        ...state,
        tracks: expandedTracks,
        focusedTrackIndex: last ? last.trackIndex : state.focusedTrackIndex,
        selectedLabelIds: [],
        // Clear the time selection — a batch clip select has no single
        // representative range to mirror in the ruler.
        timeSelection: null,
        clipDurationIndicator: null,
        lastSelectedClip: last ? { trackIndex: last.trackIndex, clipId: last.clipId } : state.lastSelectedClip,
      };
    }

    case 'SELECT_CLIP_RANGE': {
      const { trackIndex, clipId } = action.payload;

      // Helper: look up a clip on a given track, in either audio or midi pool.
      const findClipOn = (ti: number, cid: number) => {
        const t = state.tracks[ti];
        if (!t) return null;
        const audio = t.clips.find(c => c.id === cid);
        if (audio) return audio;
        return (t.midiClips || []).find(c => c.id === cid) || null;
      };

      const targetClip = findClipOn(trackIndex, clipId);

      // With no anchor (or the anchor's clip has disappeared), the shift-click
      // collapses to a plain single-clip selection and becomes the new anchor.
      const anchorRef = state.lastSelectedClip;
      const anchorClip = anchorRef ? findClipOn(anchorRef.trackIndex, anchorRef.clipId) : null;

      if (!targetClip || !anchorRef || !anchorClip) {
        const newTracks = state.tracks.map((track, tIndex) => ({
          ...track,
          clips: track.clips.map(clip => ({
            ...clip,
            selected: tIndex === trackIndex && clip.id === clipId,
          })),
          midiClips: track.midiClips?.map(clip => ({
            ...clip,
            selected: tIndex === trackIndex && clip.id === clipId,
          })),
        }));

        const expandedTracks = expandSelectionToGroups(newTracks);
        // Track selection untouched — see SELECT_CLIP.

        return {
          ...state,
          tracks: expandedTracks,
          focusedTrackIndex: trackIndex,
          selectedLabelIds: [],
          lastSelectedClip: { trackIndex, clipId },
        };
      }

      // Box-select: build the invisible bounding rectangle that spans both
      // the anchor and the shift-clicked clip, then mark every clip whose
      // time range overlaps the box and whose track is inside the band as
      // selected. Works in any direction (right+down, left+up, same track,
      // etc.) because we use min/max on both axes.
      const timeStart = Math.min(anchorClip.start, targetClip.start);
      const timeEnd = Math.max(
        anchorClip.start + anchorClip.duration,
        targetClip.start + targetClip.duration,
      );
      const trackMin = Math.min(anchorRef.trackIndex, trackIndex);
      const trackMax = Math.max(anchorRef.trackIndex, trackIndex);
      const EPS = 0.0001;

      const clipInBox = (c: { start: number; duration: number }, tIndex: number) =>
        tIndex >= trackMin
        && tIndex <= trackMax
        && c.start < timeEnd - EPS
        && c.start + c.duration > timeStart + EPS;

      const newTracks = state.tracks.map((track, tIndex) => ({
        ...track,
        clips: track.clips.map(clip => ({
          ...clip,
          selected: clipInBox(clip, tIndex),
        })),
        midiClips: track.midiClips?.map(clip => ({
          ...clip,
          selected: clipInBox(clip, tIndex),
        })),
      }));

      const expandedTracks = expandSelectionToGroups(newTracks);
      // Track selection untouched — see SELECT_CLIP.

      return {
        ...state,
        tracks: expandedTracks,
        focusedTrackIndex: trackIndex,
        selectedLabelIds: [],
        // Preserve the anchor so chained shift-clicks always extend from
        // the original selection point, not the most recent one.
        lastSelectedClip: anchorRef,
      };
    }

    case 'TOGGLE_CLIP_SELECTION': {
      const { trackIndex, clipId } = action.payload;
      const newTracks = state.tracks.map((track, tIndex) => ({
        ...track,
        clips: track.clips.map(clip => {
          if (tIndex === trackIndex && clip.id === clipId) {
            return { ...clip, selected: !clip.selected };
          }
          return clip;
        }),
        midiClips: track.midiClips?.map(clip => {
          if (tIndex === trackIndex && clip.id === clipId) {
            return { ...clip, selected: !clip.selected };
          }
          return clip;
        }),
      }));

      const expandedTracks = expandSelectionToGroups(newTracks);

      // Track selection intentionally left untouched — see SELECT_CLIP.

      // Determine if the clip was selected (not deselected)
      const wasClipSelected = (expandedTracks[trackIndex]?.clips.find(c => c.id === clipId)?.selected
        || expandedTracks[trackIndex]?.midiClips?.find(c => c.id === clipId)?.selected) ?? false;

      return {
        ...state,
        tracks: expandedTracks,
        selectedLabelIds: [], // Clear label selection when toggling clip
        timeSelection: null,
        clipDurationIndicator: null,
        // Update lastSelectedClip only if the clip was selected (not deselected)
        lastSelectedClip: wasClipSelected ? { trackIndex, clipId } : state.lastSelectedClip,
      };
    }

    case 'DESELECT_ALL_CLIPS': {
      const newTracks = state.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => ({ ...clip, selected: false })),
        midiClips: track.midiClips?.map(clip => ({ ...clip, selected: false })),
      }));

      return {
        ...state,
        tracks: newTracks,
        clipDurationIndicator: null, // Clear duration indicator when deselecting
        // Clear ruler-only time selection that was showing clip duration
        timeSelection: state.timeSelection?.renderOnCanvas === false ? null : state.timeSelection,
        lastSelectedClip: null, // Clear range selection anchor when deselecting all
      };
    }

    case 'SET_SELECTED_LABELS': {
      // Clear all clip selections when selecting labels
      const newTracks = state.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => ({ ...clip, selected: false })),
        midiClips: track.midiClips?.map(clip => ({ ...clip, selected: false })),
      }));

      // If exactly one label is selected, mirror its time range on
      // the ruler (matches clip-selection behaviour).
      let newTimeSelection: TimeSelection | null = null;
      if (action.payload.length > 0) {
        const selectedLabels: Label[] = [];
        state.tracks.forEach((track, trackIndex) => {
          track.labels?.forEach(label => {
            const labelKeyId = `${trackIndex}-${label.id}`;
            if (action.payload.includes(labelKeyId)) {
              selectedLabels.push(label);
            }
          });
        });
        if (selectedLabels.length === 1) {
          const label = selectedLabels[0];
          newTimeSelection = {
            startTime: label.startTime,
            endTime: label.endTime,
          };
        }
      }

      // Track selection and focus are intentionally NOT touched here.
      // Clearing labels (SET_SELECTED_LABELS: []) used to reset
      // selectedTrackIndices to [] which — combined with the
      // follows-focus effect in App.tsx — rewrote the selection to
      // whatever track had focus, leaking through as "clicking
      // another track deselects the previous track". Label selection
      // is now orthogonal to track selection, matching the clip /
      // track decoupling.
      return {
        ...state,
        selectedLabelIds: action.payload,
        tracks: newTracks,
        timeSelection: newTimeSelection,
      };
    }

    case 'TOGGLE_LABEL_SELECTION': {
      const labelId = action.payload;
      const isSelected = state.selectedLabelIds.includes(labelId);
      const newSelectedLabelIds = isSelected
        ? state.selectedLabelIds.filter(id => id !== labelId)
        : [...state.selectedLabelIds, labelId];

      // Check if there are any selected clips
      const selectedClipsCount = state.tracks.reduce(
        (count, track) => count + track.clips.filter(c => c.selected).length,
        0
      );

      // Calculate time selection from selected labels
      // Only set time selection if there are NO selected clips and at least 1 label selected
      let newTimeSelection: TimeSelection | null = null;
      if (selectedClipsCount === 0 && newSelectedLabelIds.length > 0) {
        const selectedLabels: Label[] = [];
        state.tracks.forEach((track, trackIndex) => {
          track.labels?.forEach(label => {
            const labelKeyId = `${trackIndex}-${label.id}`;
            if (newSelectedLabelIds.includes(labelKeyId)) {
              selectedLabels.push(label);
            }
          });
        });

        // Only create time selection if exactly ONE label is selected (like clips)
        if (selectedLabels.length === 1) {
          const label = selectedLabels[0];
          newTimeSelection = {
            startTime: label.startTime,
            endTime: label.endTime,
          };
        }
      }

      return {
        ...state,
        selectedLabelIds: newSelectedLabelIds,
        timeSelection: newTimeSelection,
      };
    }

    case 'SET_HOVERED_POINT':
      return { ...state, hoveredPoint: action.payload };

    default:
      return state;
  }
}

import { announce } from '@dilsonspickles/components';
import type { TracksState, TracksAction, Clip, Track } from '../../contexts/TracksContext';

export interface DuplicateHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
}

/**
 * Ctrl/Cmd+D: Duplicate the focused clip(s) or track(s).
 *
 * Mirrors the Model-3 rule used by delete and split. Tries clip
 * duplication first when focus is on a clip; otherwise falls
 * through to track duplication.
 */
export function handleDuplicate(e: KeyboardEvent, deps: DuplicateHandlerDeps): void {
  const { state, dispatch } = deps;

  // Clip duplication path — when DOM focus is on a clip.
  const active = document.activeElement as HTMLElement | null;
  const focusedWrapper = active?.closest('[data-clip-id]') as HTMLElement | null;
  if (focusedWrapper) {
    const clipIdAttr = focusedWrapper.getAttribute('data-clip-id');
    const trackIdxAttr = focusedWrapper.getAttribute('data-track-index');
    if (clipIdAttr && trackIdxAttr) {
      e.preventDefault();
      const fti = Number(trackIdxAttr);
      const focusedClip = state.tracks[fti]?.clips.find(
        (c) => String(c.id) === clipIdAttr,
      );
      if (!focusedClip) return;

      // Model 3: focused-in-selection → duplicate selection;
      // focused-out-of-selection → duplicate only focused.
      type ClipTarget = { trackIndex: number; clip: Clip };
      const targets: ClipTarget[] = [];
      if (focusedClip.selected) {
        state.tracks.forEach((t, ti) => {
          t.clips.forEach((c) => {
            if (c.selected) targets.push({ trackIndex: ti, clip: c });
          });
        });
      } else {
        targets.push({ trackIndex: fti, clip: focusedClip });
      }

      // Allocate fresh clip ids in one pass over all tracks.
      let nextClipId = 1;
      for (const t of state.tracks) {
        for (const c of t.clips) if (c.id >= nextClipId) nextClipId = c.id + 1;
      }

      // Each duplicate starts immediately after its source clip
      // — the user's request. Subsequent clips on the same track
      // will overlap; resolveOverlap inside MOVE_CLIP / the
      // placement reducer handles ripple if needed elsewhere.
      const newSelectionIds: Array<{ trackIndex: number; clipId: number }> = [];
      targets.forEach(({ trackIndex, clip }) => {
        const dupId = nextClipId++;
        const dup = {
          ...clip,
          id: dupId,
          start: clip.start + clip.duration,
          selected: true,
          sourceClipId: clip.sourceClipId ?? clip.id,
        };
        dispatch({
          type: 'ADD_CLIP',
          payload: { trackIndex, clip: dup },
        });
        newSelectionIds.push({ trackIndex, clipId: dupId });
      });

      // Make the new duplicates the active selection.
      dispatch({ type: 'SELECT_CLIPS', payload: newSelectionIds });
      announce(
        targets.length === 1
          ? 'Clip duplicated.'
          : `${targets.length} clips duplicated.`,
      );
      return;
    }
  }

  // Track duplication path — Model 3 applied to selectedTrackIndices.
  const focused = state.focusedTrackIndex;
  if (focused === null || focused === undefined) return;
  e.preventDefault();

  const selectedTrackIndices = state.selectedTrackIndices || [];
  const focusInTrackSelection = selectedTrackIndices.includes(focused);
  const trackIndices = focusInTrackSelection
    ? [...selectedTrackIndices]
    : [focused];

  // Process from highest index down so each splice doesn't shift
  // the indices we haven't visited yet.
  trackIndices.sort((a, b) => b - a);

  let nextClipId = 1;
  for (const t of state.tracks) {
    for (const c of t.clips) if (c.id >= nextClipId) nextClipId = c.id + 1;
  }
  const nextIdAfterDeletes = (state.tracks.reduce(
    (max: number, t: Track) => (t.id > max ? t.id : max),
    0,
  ) + 1);
  let nextTrackId = nextIdAfterDeletes;

  for (const ti of trackIndices) {
    const src = state.tracks[ti];
    if (!src) continue;
    const clonedClips = (src.clips ?? []).map((c) => ({
      ...c,
      id: nextClipId++,
      sourceClipId: c.sourceClipId ?? c.id,
    }));
    dispatch({
      type: 'ADD_TRACK',
      payload: {
        ...src,
        id: nextTrackId++,
        name: `${src.name} copy`,
        clips: clonedClips,
        insertAt: ti + 1,
      },
    });
  }
  announce(
    trackIndices.length === 1
      ? 'Track duplicated.'
      : `${trackIndices.length} tracks duplicated.`,
  );
}

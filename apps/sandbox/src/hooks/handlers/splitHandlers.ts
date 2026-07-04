import { announce, formatTimeForA11y } from '@dilsonspickles/components';
import type { TracksState, TracksAction, Clip } from '../../contexts/TracksContext';

export interface SplitHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
}

/**
 * Cmd/Ctrl+I: Split clip(s) at the playhead.
 *
 * Mirrors the Model-3 delete rule: focus disambiguates the selection.
 * Resolve the user's intent in two steps:
 *   a) Find the focused "thing" — the DOM-focused clip if any,
 *      otherwise the clip on the focused track that sits under the playhead.
 *   b) Check whether that focused thing is part of the current selection
 *      (track multi-select or clip multi-select).
 *      If YES → split the whole selection (every selected clip plus every
 *               selected track's clip under the playhead).
 *      If NO  → split only the focused thing.
 */
export function handleSplitAtPlayhead(e: KeyboardEvent, deps: SplitHandlerDeps): void {
  e.preventDefault();

  const { state, dispatch } = deps;

  type Target = { trackIndex: number; clip: Clip };
  const playhead = state.playheadPosition;
  const EDGE_EPSILON = 0.0001;

  const findClipUnderPlayhead = (trackIndex: number) => {
    const t = state.tracks[trackIndex];
    return t?.clips.find(
      (c) =>
        playhead > c.start + EDGE_EPSILON
        && playhead < c.start + c.duration - EDGE_EPSILON,
    );
  };

  // a) Resolve focus.
  let focusedClip: { trackIndex: number; clip: Clip } | null = null;
  const active = document.activeElement as HTMLElement | null;
  const focusedWrapper = active?.closest('[data-clip-id]') as HTMLElement | null;
  if (focusedWrapper) {
    const clipIdAttr = focusedWrapper.getAttribute('data-clip-id');
    const trackIdxAttr = focusedWrapper.getAttribute('data-track-index');
    if (clipIdAttr && trackIdxAttr) {
      const ti = Number(trackIdxAttr);
      const c = state.tracks[ti]?.clips.find((cc) => String(cc.id) === clipIdAttr);
      if (c) focusedClip = { trackIndex: ti, clip: c };
    }
  }
  const focusedTrackIndex = state.focusedTrackIndex;
  let focusedTrackTarget: { trackIndex: number; clip: Clip } | null = null;
  if (
    focusedClip === null
    && focusedTrackIndex !== null
    && focusedTrackIndex !== undefined
  ) {
    const c = findClipUnderPlayhead(focusedTrackIndex);
    if (c) focusedTrackTarget = { trackIndex: focusedTrackIndex, clip: c };
  }

  // b) Is the focused thing part of the selection?
  const selectedTrackIndices = state.selectedTrackIndices || [];
  const hasTrackSelection = selectedTrackIndices.length > 0;
  const hasClipSelection = state.tracks.some((t) => t.clips.some((c) => c.selected));

  const focusInTrackSelection =
    focusedTrackTarget !== null
    && selectedTrackIndices.includes(focusedTrackTarget.trackIndex);
  const focusedClipIsSelected =
    focusedClip !== null && focusedClip.clip.selected === true;

  // Special case: there is a selection but no focus anywhere
  // (e.g. user clicked to multi-select then moved away with the
  // mouse but never set focus). In that case fall back to acting
  // on the selection — the user clearly meant SOMETHING.
  const noFocus = focusedClip === null && focusedTrackTarget === null;

  const targets: Target[] = [];
  const pushIfNew = (trackIndex: number, clip: Clip) => {
    if (!targets.some((x) => x.trackIndex === trackIndex && x.clip.id === clip.id)) {
      targets.push({ trackIndex, clip });
    }
  };

  const useSelection =
    (focusedClipIsSelected && hasClipSelection)
    || (focusInTrackSelection && hasTrackSelection)
    || (noFocus && (hasClipSelection || hasTrackSelection));

  if (useSelection) {
    // Selected clips
    state.tracks.forEach((t, ti) => {
      t.clips.forEach((c) => {
        if (c.selected) pushIfNew(ti, c);
      });
    });
    // Selected tracks → clip under playhead
    for (const ti of selectedTrackIndices) {
      const c = findClipUnderPlayhead(ti);
      if (c) pushIfNew(ti, c);
    }
  } else if (focusedClip) {
    pushIfNew(focusedClip.trackIndex, focusedClip.clip);
  } else if (focusedTrackTarget) {
    pushIfNew(focusedTrackTarget.trackIndex, focusedTrackTarget.clip);
  }

  if (targets.length === 0) {
    announce('Move the playhead inside a clip on the focused track to split it.');
    return;
  }

  type SplitMutation = { type: 'split'; clipId: number; trackIndex: number; leftEnd: number; rightStart: number };
  const mutations: SplitMutation[] = [];
  let lastDescription = '';
  for (const { trackIndex, clip } of targets) {
    const start = clip.start;
    const end = clip.start + clip.duration;
    // Use the playhead when it's inside the clip; otherwise fall
    // back to the clip's midpoint so the shortcut still does
    // something useful when the user hasn't moved the cursor.
    const within = playhead > start + EDGE_EPSILON && playhead < end - EDGE_EPSILON;
    const splitAt = within ? playhead : start + (end - start) / 2;
    mutations.push({
      type: 'split',
      clipId: clip.id,
      trackIndex,
      leftEnd: splitAt,
      rightStart: splitAt,
    });
    lastDescription = within
      ? `at the playhead. Left ${formatTimeForA11y(splitAt - start)}, right ${formatTimeForA11y(end - splitAt)}`
      : `at the midpoint. Left ${formatTimeForA11y(splitAt - start)}, right ${formatTimeForA11y(end - splitAt)}`;
  }

  dispatch({
    type: 'APPLY_CLIP_PLACEMENT',
    payload: { placements: [], mutations },
  });

  // The split reducer keeps the original clip id on the left
  // segment, so the mutation's clipId points to it. Match the
  // mouse-driven split tool by re-selecting every left piece
  // — the user's "current" clips after the cut.
  dispatch({
    type: 'SELECT_CLIPS',
    payload: mutations.map((m) => ({
      trackIndex: m.trackIndex,
      clipId: m.clipId,
    })),
  });

  if (targets.length === 1) {
    announce(`Clip split ${lastDescription}.`);
  } else {
    announce(`${targets.length} clips split.`);
  }
}

/**
 * Cmd/Ctrl+Shift+I: Slice every track at the playhead.
 *
 * Keyboard equivalent of Shift+click in split mode: walk every track
 * and split whichever clip the playhead currently sits inside.
 * No-ops on tracks where the playhead doesn't intersect any clip.
 */
export function handleSplitAllTracks(e: KeyboardEvent, deps: SplitHandlerDeps): void {
  e.preventDefault();

  const { state, dispatch } = deps;

  const playhead = state.playheadPosition;
  const EDGE_EPSILON = 0.0001;
  type SplitMutation = { type: 'split'; clipId: number; trackIndex: number; leftEnd: number; rightStart: number };
  const mutations: SplitMutation[] = [];
  state.tracks.forEach((t, ti) => {
    t.clips.forEach((c) => {
      if (playhead > c.start + EDGE_EPSILON && playhead < c.start + c.duration - EDGE_EPSILON) {
        mutations.push({
          type: 'split',
          clipId: c.id,
          trackIndex: ti,
          leftEnd: playhead,
          rightStart: playhead,
        });
      }
    });
  });

  if (mutations.length === 0) {
    announce('Playhead is not inside any clip.');
    return;
  }

  dispatch({
    type: 'APPLY_CLIP_PLACEMENT',
    payload: { placements: [], mutations },
  });
  // Match the mouse split tool by selecting each left segment
  // — the original clipId points to the left piece after the
  // split reducer runs.
  dispatch({
    type: 'SELECT_CLIPS',
    payload: mutations.map((m) => ({
      trackIndex: m.trackIndex,
      clipId: m.clipId,
    })),
  });
  announce(
    `${mutations.length} ${mutations.length === 1 ? 'clip' : 'clips'} split at the playhead across all tracks.`,
  );
}

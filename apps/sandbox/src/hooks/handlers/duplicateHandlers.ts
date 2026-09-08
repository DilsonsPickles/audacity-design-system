import { announce } from '@audacity-ui/components';
import type { TracksState, TracksAction, Clip, Track } from '../../contexts/TracksContext';
import { computeWholeGroupIds, regroupCopiedClips } from '../../utils/clipGroupCopy';
import { resolveTimeSelectionScope } from '../../utils/timeSelectionScope';

export interface DuplicateHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
}

/**
 * Time-selection duplicate (Audacity's Duplicate): copy the selected time
 * range of every audio track in the selection's scope onto NEW tracks,
 * inserted directly below their sources, at the same timeline position.
 *
 * Clips are trimmed to the selection bounds — `trimStart` advances by the
 * clipped-off left portion (same plain-seconds math as the split reducer)
 * so the copy plays exactly the selected audio. Copies share their source's
 * waveform arrays by reference and carry `sourceClipId`, so rendering and
 * playback resolve to the original decoded buffer. The selection and
 * playhead are left untouched.
 *
 * Returns true when it handled the event (a selection existed and captured
 * at least one clip portion); false lets handleDuplicate fall through to
 * the clip/track paths.
 */
function duplicateTimeSelectionToNewTracks(
  e: KeyboardEvent,
  state: TracksState,
  dispatch: React.Dispatch<TracksAction>,
): boolean {
  const sel = state.timeSelection;
  if (!sel || sel.renderOnCanvas === false) return false;
  const { startTime, endTime } = sel;
  if (endTime - startTime <= 1e-6) return false;

  const scopedTracks = resolveTimeSelectionScope(
    sel,
    state.selectedTrackIndices,
    state.tracks.map((_, idx) => idx),
  );

  let nextClipId = 1;
  for (const t of state.tracks) {
    for (const c of t.clips) if (c.id >= nextClipId) nextClipId = c.id + 1;
  }
  let nextTrackId = state.tracks.reduce(
    (max: number, t: Track) => (t.id > max ? t.id : max),
    0,
  ) + 1;

  // Collect the intersecting portion of every audio clip per scoped track.
  const perTrack: Array<{ ti: number; src: Track; sources: Clip[]; clones: Clip[] }> = [];
  for (const ti of scopedTracks) {
    const src = state.tracks[ti];
    // Audio tracks only — label tracks have no clips and MIDI duplication
    // (note slicing) is a separate path this deliberately does not attempt.
    if (!src || (src.type && src.type !== 'audio')) continue;
    const sources: Clip[] = [];
    const clones: Clip[] = [];
    for (const clip of src.clips ?? []) {
      const clipEnd = clip.start + clip.duration;
      if (!(clip.start < endTime && clipEnd > startTime)) continue;
      const leftTrim = Math.max(0, startTime - clip.start);
      const rightTrim = Math.max(0, clipEnd - endTime);
      const newDuration = clip.duration - leftTrim - rightTrim;
      if (newDuration <= 0) continue;
      const originalTrimStart = clip.trimStart ?? 0;
      sources.push(clip);
      clones.push({
        ...clip,
        id: nextClipId++,
        start: clip.start + leftTrim,
        duration: newDuration,
        trimStart: originalTrimStart + leftTrim,
        fullDuration: clip.fullDuration ?? (originalTrimStart + clip.duration),
        selected: false,
        sourceClipId: clip.sourceClipId ?? clip.id,
      });
    }
    if (clones.length > 0) perTrack.push({ ti, src, sources, clones });
  }
  if (perTrack.length === 0) return false;

  e.preventDefault();

  // Copy invariant: a fresh group iff the whole source group was captured
  // whole within the selection range; partial captures come out ungrouped.
  const allSources = perTrack.flatMap((p) => p.sources);
  const wholeGroups = computeWholeGroupIds(allSources, state.tracks, { startTime, endTime });
  const regrouped = regroupCopiedClips(perTrack.flatMap((p) => p.clones), wholeGroups);

  let cloneIdx = 0;
  const withRegrouped = perTrack.map((p) => ({
    ...p,
    regroupedClips: p.clones.map(() => regrouped[cloneIdx++]),
  }));
  // Insert from highest source index down so each insertAt doesn't shift
  // the indices we haven't visited yet (same discipline as track duplicate).
  withRegrouped.sort((a, b) => b.ti - a.ti);
  for (const p of withRegrouped) {
    dispatch({
      type: 'ADD_TRACK',
      payload: {
        ...p.src,
        id: nextTrackId++,
        name: `${p.src.name} copy`,
        clips: p.regroupedClips,
        insertAt: p.ti + 1,
      },
    });
  }

  announce(
    withRegrouped.length === 1
      ? 'Selection duplicated to new track.'
      : `Selection duplicated to ${withRegrouped.length} new tracks.`,
  );
  return true;
}

/**
 * Ctrl/Cmd+D: Duplicate the time selection, focused clip(s), or track(s).
 *
 * Priority order matches the clipboard handlers: an active time selection
 * wins (duplicates the selected range to new tracks); otherwise the
 * Model-3 rule used by delete and split applies — clip duplication when
 * focus is on a clip, falling through to track duplication.
 */
export function handleDuplicate(e: KeyboardEvent, deps: DuplicateHandlerDeps): void {
  const { state, dispatch } = deps;

  // Time-selection path — duplicate the selected range to new tracks.
  if (duplicateTimeSelectionToNewTracks(e, state, dispatch)) return;

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

      // Build all duplicates first, then re-group them per the copy
      // invariant: fresh group iff the whole source group was duplicated,
      // ungrouped otherwise — never tethered to the originals.
      const dupTargets = targets.map(({ trackIndex, clip }) => ({
        trackIndex,
        clip: {
          ...clip,
          id: nextClipId++,
          start: clip.start + clip.duration,
          selected: true,
          sourceClipId: clip.sourceClipId ?? clip.id,
        },
      }));
      const wholeGroups = computeWholeGroupIds(targets.map(t => t.clip), state.tracks);
      const regrouped = regroupCopiedClips(dupTargets.map(d => d.clip), wholeGroups);

      const newSelectionIds: Array<{ trackIndex: number; clipId: number }> = [];
      dupTargets.forEach(({ trackIndex }, i) => {
        const dup = regrouped[i];
        dispatch({
          type: 'ADD_CLIP',
          payload: { trackIndex, clip: dup },
        });
        newSelectionIds.push({ trackIndex, clipId: dup.id });
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

  // Clone every duplicated track's clips first, so group entirety is
  // judged on the union of everything this one operation copies — a
  // group spanning two tracks that are BOTH being duplicated is copied
  // whole and must come out as one fresh group across the new tracks.
  const perTrack: Array<{ ti: number; src: Track; clones: Clip[] }> = [];
  for (const ti of trackIndices) {
    const src = state.tracks[ti];
    if (!src) continue;
    perTrack.push({
      ti,
      src,
      clones: (src.clips ?? []).map((c) => ({
        ...c,
        id: nextClipId++,
        sourceClipId: c.sourceClipId ?? c.id,
      })),
    });
  }
  const sourceClips = perTrack.flatMap((p) => p.src.clips ?? []);
  const wholeGroups = computeWholeGroupIds(sourceClips, state.tracks);
  const regrouped = regroupCopiedClips(perTrack.flatMap((p) => p.clones), wholeGroups);

  let cloneIdx = 0;
  for (const p of perTrack) {
    const clonedClips = p.clones.map(() => regrouped[cloneIdx++]);
    dispatch({
      type: 'ADD_TRACK',
      payload: {
        ...p.src,
        id: nextTrackId++,
        name: `${p.src.name} copy`,
        clips: clonedClips,
        insertAt: p.ti + 1,
      },
    });
  }
  announce(
    trackIndices.length === 1
      ? 'Track duplicated.'
      : `${trackIndices.length} tracks duplicated.`,
  );
}

/**
 * THE PLAYHEAD'S CLIP, FROM A TRACK (user requests 2026-10-13: "if I have
 * a track focus and a cursor, it means I have x,y coordinates — so can't
 * I use alt + F to fade in/out on any clip?", then "can we have that to
 * trim and stretch too?", then "if my cursor and focus state allow me to
 * pinpoint a single clip, give me a shortcut that can select the clip
 * that I'm over"): with the focus on a TRACK — its header or row, or the
 * app's focused track with nothing more specific focused — and NOT on a
 * clip or a handle (those have TrackNew's own ⌥F / ⌥T / ⌥S, which stop
 * the key before it gets here), the playhead is x and the track is y,
 * and the clip under the playhead on that track is the chord's:
 *
 *   ⌥F      fades it to the playhead — the fade-in in its first half,
 *           the fade-out in its second (utils/fadeToPlayhead.ts)
 *   ⌥T      trims its NEARER edge to the playhead (the same halves)
 *   ⌥S      stretches its nearer edge to the playhead
 *   ⌥Enter  SELECTS it and gives it the focus — the clip becomes the
 *           one you have, so F / T / S and Enter follow
 *
 * EVERY ONE OF THEM MOVES THE FOCUS TO THAT CLIP (2026-10-13, "if we do
 * that option + enter, we can move the focus to the new target"): after
 * a cursor-based edit the clip you just edited is the clip you are on,
 * so the two ways of pointing — the focus and the cursor — meet.
 *
 * The edits take the fade / trim rule's targets (the clip, or every
 * selected audio clip when it is selected), each to the same playhead.
 * A playhead on no clip of the track does nothing and says so. A
 * document listener beside ⌥⇧F's (useFadeDialogHotkey): matched on
 * `e.code` (Option+F types "ƒ", Option+T "†", Option+S "ß"), refused in
 * a text field, yielding to a dialog that owns the keyboard; in the
 * CAPTURE phase so ⌥Enter is never also the app's Enter (track
 * selection).
 */
import React from 'react';
import { announce } from '@audacity-ui/components';
import { useTracks } from '../contexts/TracksContext';
import { clipOfElement } from './useFocusedClip';
import { dialogOwnsKeyboard } from '../utils/focusRouting';
import { fadeTargets } from '../utils/fadeTargets';
import { keyboardEditTargets } from '../utils/keyboardEditTargets';
import { computeFadeToTime, resolveTrackFadeToPlayhead } from '../utils/fadeToPlayhead';
import {
  computeKeyboardTrimToTimeBatch,
  computeKeyboardTrimToTimeAnnouncement,
  computeKeyboardStretchToTimeBatch,
  computeKeyboardStretchToTimeAnnouncement,
} from '../utils/clipKeyboardEdit';

export type PlayheadClipChord = 'fade' | 'trim' | 'stretch' | 'select';

/** Which of the family a key event is, by code — or null */
export function playheadClipChordOf(e: KeyboardEvent): PlayheadClipChord | null {
  if (!e.altKey || e.shiftKey || e.metaKey || e.ctrlKey) return null;
  switch (e.code) {
    case 'KeyF': return 'fade';
    case 'KeyT': return 'trim';
    case 'KeyS': return 'stretch';
    case 'Enter': case 'NumpadEnter': return 'select';
    default: return null;
  }
}

export function usePlayheadClipHotkeys(): void {
  const { state, dispatch } = useTracks();
  // Mirrored in a ref: ONE listener, reading the live state (the ref-mirror rule)
  const live = React.useRef({ state, dispatch });
  React.useEffect(() => { live.current = { state, dispatch }; }, [state, dispatch]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const chord = playheadClipChordOf(e);
      if (!chord) return;
      if (dialogOwnsKeyboard(e.target, document)) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      // A focused clip or handle has TrackNew's own edits; ⌥Enter from
      // one still means the clip under the playhead on ITS track
      if (chord !== 'select' && clipOfElement(document.activeElement)) return;
      const { state: s, dispatch: d } = live.current;
      const time = s.playheadPosition;
      const hit = resolveTrackFadeToPlayhead(s.tracks, s.focusedTrackIndex, document.activeElement, time);
      e.preventDefault();
      if (chord === 'select') e.stopPropagation();
      if (!hit) {
        announce('No clip under the playhead on this track');
        return;
      }
      // The clip edited (or selected) becomes the clip you are on — and
      // AN EDIT SELECTS ITS CLIP (2026-10-13): the three edits select it
      // too, exclusively, as a move does
      if (chord !== 'select') {
        const c = s.tracks[hit.trackIndex]?.clips.find((x) => x.id === hit.clipId);
        if (c && !c.selected) d({ type: 'SELECT_CLIP', payload: { trackIndex: hit.trackIndex, clipId: hit.clipId } });
      }
      const focusIt = () => requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-clip-id="${hit.clipId}"][data-track-index="${hit.trackIndex}"]`)?.focus({ preventScroll: true });
      });
      if (chord === 'select') {
        d({ type: 'SELECT_CLIP', payload: { trackIndex: hit.trackIndex, clipId: hit.clipId } });
        const name = s.tracks[hit.trackIndex]?.clips.find((c) => c.id === hit.clipId)?.name ?? 'Clip';
        announce(`${name} selected`);
        focusIt();
        return;
      }
      focusIt();
      if (chord === 'fade') {
        const targets = fadeTargets(s.tracks, hit.trackIndex, hit.clipId)
          .map((t) => ({ ...t, clip: s.tracks[t.trackIndex]?.clips.find((c) => c.id === t.clipId) }))
          .filter((t) => !!t.clip)
          .map((t) => ({ trackIndex: t.trackIndex, clipId: t.clipId, start: t.clip!.start, duration: t.clip!.duration }));
        const updates = computeFadeToTime(targets, hit.side, time);
        for (const u of updates) {
          d({ type: 'SET_CLIP_FADE', payload: { trackIndex: u.trackIndex, clipId: u.clipId, side: hit.side, seconds: u.seconds } });
        }
        if (updates.length > 0) announce(`${hit.side === 'in' ? 'Fade-in' : 'Fade-out'} ${updates[0].seconds.toFixed(2)} seconds, to the playhead`);
        return;
      }
      const targets = keyboardEditTargets(s.tracks, hit.trackIndex, hit.clipId);
      if (chord === 'trim') {
        const { updates } = computeKeyboardTrimToTimeBatch(targets, hit.edge, time);
        for (const u of updates) {
          d({ type: 'TRIM_CLIP', payload: { trackIndex: u.trackIndex, clipId: u.clipId, newTrimStart: u.newTrimStart, newDuration: u.newDuration, newStart: u.newStart } });
        }
        const own = updates.find((u) => u.trackIndex === hit.trackIndex && u.clipId === hit.clipId);
        if (own) announce(computeKeyboardTrimToTimeAnnouncement(own.newDuration));
        return;
      }
      const { updates } = computeKeyboardStretchToTimeBatch(targets, hit.edge, time);
      for (const u of updates) {
        d({ type: 'STRETCH_CLIP', payload: { trackIndex: u.trackIndex, clipId: u.clipId, newDuration: u.newDuration, newStretchFactor: u.newStretchFactor, newStart: u.newStart } });
      }
      const own = updates.find((u) => u.trackIndex === hit.trackIndex && u.clipId === hit.clipId);
      if (own) announce(computeKeyboardStretchToTimeAnnouncement(own.newDuration));
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
}

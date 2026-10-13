/**
 * ⌥F FROM A TRACK (user request 2026-10-13, "if I have a track focus and
 * a cursor, it means I have x,y coordinates — so can't I use alt + F to
 * fade in/out on any clip?"): with the focus on a TRACK — its header or
 * row, or the app's focused track with nothing more specific focused —
 * and NOT on a clip or a fade handle (those are TrackNew's own ⌥F, which
 * stops the key before it gets here), the chord fades the clip UNDER THE
 * PLAYHEAD on that track, the side inferred as a focused clip infers it
 * (utils/fadeToPlayhead.ts: first half = the fade-in's boundary, second
 * = the fade-out's); the targets are the fade rule's (the clip, or every
 * selected audio clip when it is selected), each to the same playhead.
 * A playhead on no clip of the track fades nothing and says so. A
 * document listener beside ⌥⇧F (useFadeDialogHotkey): matched on
 * `e.code` (Option+F types "ƒ"), refused in a text field, yielding to a
 * dialog that owns the keyboard.
 */
import React from 'react';
import { announce } from '@audacity-ui/components';
import { useTracks } from '../contexts/TracksContext';
import { clipOfElement } from './useFocusedClip';
import { dialogOwnsKeyboard } from '../utils/focusRouting';
import { fadeTargets } from '../utils/fadeTargets';
import { computeFadeToTime, resolveTrackFadeToPlayhead } from '../utils/fadeToPlayhead';

export function isFadeToPlayheadHotkey(e: KeyboardEvent): boolean {
  return e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyF';
}

export function useFadeToPlayheadHotkey(): void {
  const { state, dispatch } = useTracks();
  // Mirrored in a ref: ONE listener, reading the live state (the ref-mirror rule)
  const live = React.useRef({ state, dispatch });
  React.useEffect(() => { live.current = { state, dispatch }; }, [state, dispatch]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isFadeToPlayheadHotkey(e)) return;
      if (dialogOwnsKeyboard(e.target, document)) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      // A focused clip or fade handle is TrackNew's ⌥F
      if (clipOfElement(document.activeElement)) return;
      const { state: s, dispatch: d } = live.current;
      const hit = resolveTrackFadeToPlayhead(s.tracks, s.focusedTrackIndex, document.activeElement, s.playheadPosition);
      e.preventDefault();
      if (!hit) {
        announce('No clip under the playhead on this track');
        return;
      }
      const targets = fadeTargets(s.tracks, hit.trackIndex, hit.clipId)
        .map((t) => ({ ...t, clip: s.tracks[t.trackIndex]?.clips.find((c) => c.id === t.clipId) }))
        .filter((t) => !!t.clip)
        .map((t) => ({ trackIndex: t.trackIndex, clipId: t.clipId, start: t.clip!.start, duration: t.clip!.duration }));
      const updates = computeFadeToTime(targets, hit.side, s.playheadPosition);
      for (const u of updates) {
        d({ type: 'SET_CLIP_FADE', payload: { trackIndex: u.trackIndex, clipId: u.clipId, side: hit.side, seconds: u.seconds } });
      }
      if (updates.length > 0) announce(`${hit.side === 'in' ? 'Fade-in' : 'Fade-out'} ${updates[0].seconds.toFixed(2)} seconds, to the playhead`);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}

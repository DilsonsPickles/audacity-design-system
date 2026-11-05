import { useEffect, useRef } from 'react';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { getInputMode } from '@audacity-ui/components';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import { dialogOwnsKeyboard } from '../utils/focusRouting';
import { getProjectEnd } from '../macros/macroActions';
import { keepsItsArrowsWhilePlaying, playbackSeekKeyOf, playbackSeekTarget } from '../utils/playbackSeek';

export interface UsePlaybackSeekKeysDeps {
  audioManagerRef: React.RefObject<AudioPlaybackManager>;
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  /** A seek key went down while playing (true) and came up (false) —
   *  the status bar's "Seeking" cue */
  onSeekingChange?: (seeking: boolean) => void;
}

/**
 * SEEK WHILE PLAYING (2026-11-05, Audacity 3's arrows): ← / → jump the
 * playback a second back / forward, with Shift fifteen; comma / period
 * are the same pair. Only WHILE PLAYING — stopped, every one of these
 * keys keeps what it does (the playhead nudge, the clip focus, the
 * selection's Shift+Arrow), and a recording is never seeked.
 *
 * A document listener in the CAPTURE phase, bound once: the seek has to
 * come before the clip's, the track's and the ruler's own arrow
 * handlers, which would otherwise take the key (and preventDefault it)
 * whenever one of them has the focus — in Audacity 3 the seek works
 * wherever the focus is. `keepsItsArrowsWhilePlaying` names what is
 * left alone. State is read through a ref (the ref-mirror convention).
 */
export function usePlaybackSeekKeys({ audioManagerRef, state, dispatch, onSeekingChange }: UsePlaybackSeekKeysDeps): void {
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const onSeekingChangeRef = useRef(onSeekingChange);
  useEffect(() => { onSeekingChangeRef.current = onSeekingChange; }, [onSeekingChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const seek = playbackSeekKeyOf(e);
      if (!seek) return;
      const manager = audioManagerRef.current;
      if (!manager?.getIsPlaying?.()) return;
      const current = stateRef.current;
      if (current.isRecording) return;
      if (dialogOwnsKeyboard(e.target, document)) return;
      if (keepsItsArrowsWhilePlaying(e.target, getInputMode())) return;

      e.preventDefault();
      e.stopPropagation();
      // From where the audio IS, not the last frame the state heard of:
      // a held key seeks again before the next position update
      const live = manager.getCurrentPosition?.();
      const from = typeof live === 'number' && Number.isFinite(live) ? live : current.playheadPosition;
      const to = playbackSeekTarget(from, seek, getProjectEnd(current));
      manager.seek(to);
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: to });
      seeking = true;
      onSeekingChangeRef.current?.(true);
    };
    let seeking = false;
    const endSeeking = () => {
      if (!seeking) return;
      seeking = false;
      onSeekingChangeRef.current?.(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', endSeeking, true);
    window.addEventListener('blur', endSeeking);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', endSeeking, true);
      window.removeEventListener('blur', endSeeking);
    };
  }, [audioManagerRef, dispatch]);
}

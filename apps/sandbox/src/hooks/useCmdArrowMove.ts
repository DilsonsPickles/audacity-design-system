import { useCallback, useEffect, useRef, useState } from 'react';
import { useTracksDispatch, type Track } from '../contexts/TracksContext';
import { pendingClipMoveResolution } from '../utils/pendingClipMoveResolution';
import { provisionalKeyboardTrackIds } from '../utils/provisionalKeyboardTrackIds';

export interface UseCmdArrowMoveOptions {
  tracks: Track[];
}

export interface UseCmdArrowMoveReturn {
  isCmdArrowMoving: boolean;
  /** Record a pending keyboard clip-move; overlap resolution fires on Cmd/Ctrl release. */
  beginCmdMove: () => void;
}

/**
 * Owns the Cmd/Ctrl-release overlap resolution for Cmd+Arrow clip moves.
 *
 * The module-scoped `pendingClipMoveResolution` ref is written at the call
 * sites that perform the nudge (Canvas's onClipMove / onClipMoveToTrack /
 * onTrackReorder, plus the "time selection covers clips" flow in
 * useKeyboardShortcuts) via `beginCmdMove()`. This hook just listens for
 * the Cmd/Ctrl keyup and, if a move is pending, reconciles the final
 * resting positions of the selected clips against their neighbors.
 */
export function useCmdArrowMove(options: UseCmdArrowMoveOptions): UseCmdArrowMoveReturn {
  const { tracks } = options;
  const dispatch = useTracksDispatch();

  // Parallel state flag that mirrors the module-scoped
  // pendingClipMoveResolution ref, so React can lift the moving
  // clip's z-index while the Cmd hold is in progress. State
  // triggers re-render; a ref alone can't.
  const [isCmdArrowMoving, setIsCmdArrowMoving] = useState(false);

  // Stable identity — consumers (CanvasTrack memo) compare by reference
  const beginCmdMove = useCallback(() => setIsCmdArrowMoving(true), []);

  // Every Cmd+Arrow nudge dispatches a MOVE_SELECTED_CLIPS(_TO_TRACK)
  // action, which updates `tracks`. Listing `tracks` as an effect dep
  // would mean the document keyup listener gets removed + re-added on
  // every nudge. That's not lossy (cleanup + re-run is synchronous), but
  // it churns the DOM listener needlessly. Read the live value through a
  // ref instead so the effect binds the listener once, while onKeyUp
  // still sees up-to-date clip positions.
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // Cmd/Ctrl release ends the keyboard-move "hold". Overlap is legal
  // (2026-09-21) so there is nothing to resolve any more — the nudges
  // themselves committed the final positions (and raised the moved
  // clips' z). All that remains is dropping the raised-while-moving
  // visual state and sweeping up empty provisional tracks.
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Meta' && e.key !== 'Control') return;
      if (!pendingClipMoveResolution.current) return;
      pendingClipMoveResolution.current = false;
      setIsCmdArrowMoving(false);

      // Delete any empty provisional tracks that accumulated from repeated
      // Cmd+Down presses (clips passed through them and moved further down).
      // Must run before clear() so we still know which track IDs to check.
      for (const trackId of provisionalKeyboardTrackIds.current) {
        const pt = tracksRef.current.find(t => t.id === trackId);
        if (!pt) continue;
        const hasClips = pt.clips.length > 0 || (pt.midiClips || []).length > 0;
        if (!hasClips) {
          dispatch({ type: 'DELETE_PROVISIONAL_TRACK', payload: { trackId } });
        }
      }
      provisionalKeyboardTrackIds.current.clear();
    };
    document.addEventListener('keyup', onKeyUp);
    return () => document.removeEventListener('keyup', onKeyUp);
  }, [dispatch]);

  return { isCmdArrowMoving, beginCmdMove };
}

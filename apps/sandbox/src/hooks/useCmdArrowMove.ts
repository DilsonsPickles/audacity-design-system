import { useEffect, useRef, useState } from 'react';
import { useTracksDispatch, type Track } from '../contexts/TracksContext';
import { resolveOverlap, type ClipPlacement } from '../utils/resolveOverlap';
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

  const beginCmdMove = () => setIsCmdArrowMoving(true);

  // Every Cmd+Arrow nudge dispatches a MOVE_SELECTED_CLIPS(_TO_TRACK)
  // action, which updates `tracks`. Listing `tracks` as an effect dep
  // would mean the document keyup listener gets removed + re-added on
  // every nudge. That's not lossy (cleanup + re-run is synchronous), but
  // it churns the DOM listener needlessly. Read the live value through a
  // ref instead so the effect binds the listener once, while onKeyUp
  // still sees up-to-date clip positions.
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // Cmd/Ctrl release → apply the deferred overlap resolution from any
  // Cmd+Arrow clip moves. We build the intent from the *current* clip
  // positions (post-nudge) so only the final resting places are
  // reconciled with underlying clips — nothing in between gets eaten.
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

      const tracks = tracksRef.current;
      const intent: ClipPlacement[] = [];
      const movingIds = new Set<number>();
      tracks.forEach((t, tIndex) => {
        t.clips.forEach((c) => {
          if (c.selected) {
            intent.push({
              clipId: c.id,
              trackIndex: tIndex,
              start: c.start,
              duration: c.duration,
            });
            movingIds.add(c.id);
          }
        });
      });
      if (intent.length === 0) return;

      const resolution = resolveOverlap(tracks, intent, movingIds);
      if (resolution.mutations.length > 0) {
        dispatch({
          type: 'APPLY_CLIP_PLACEMENT',
          payload: { placements: [], mutations: resolution.mutations },
        });
      }
    };
    document.addEventListener('keyup', onKeyUp);
    return () => document.removeEventListener('keyup', onKeyUp);
  }, [dispatch]);

  return { isCmdArrowMoving, beginCmdMove };
}

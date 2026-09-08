import type { TracksState } from '../../contexts/TracksContext';
import type { EffectsPanelState } from '../useContextMenuState';
import type { PlayOptions } from '../usePlaybackControls';
import { pointerTimelineTimeRef } from '../pointerTimelineTime';

export interface TransportHandlerDeps {
  state: TracksState;
  handlePlay: (options?: PlayOptions) => void;
  handleRecord: () => void;
  handleStopRecording: () => void;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  toggleLoopRegion: () => void;
}

/** Space bar: play/pause or stop recording */
/** X key: Play/Stop and Set Cursor (Audacity heritage). Starts playback
 *  exactly like Space; stopping leaves the playhead where playback stopped
 *  instead of returning it to the playback-start marker. */
export function handlePlayStopSetCursor(deps: TransportHandlerDeps): void {
  if (deps.state.isRecording) {
    deps.handleStopRecording();
  } else {
    deps.handlePlay({ keepCursorOnStop: true });
  }
}

/** B key (AU3 heritage: Play to Selection): plays between the mouse
 *  pointer's timeline position and the cursor — up to the cursor when the
 *  pointer sits left of it, from the cursor outward when right of it. The
 *  playhead returns to the cursor when the range finishes. No-op unless
 *  the pointer is over the canvas timeline. Ignored while recording. */
export function handlePlayToCursor(deps: TransportHandlerDeps): void {
  if (deps.state.isRecording) return;
  const pointerTime = pointerTimelineTimeRef.current;
  if (pointerTime === null) return;
  const cursor = deps.state.playheadPosition;
  const start = Math.max(0, Math.min(pointerTime, cursor));
  const end = Math.max(pointerTime, cursor);
  if (end - start <= 1e-6) return;
  deps.handlePlay({ playRange: { start, end, returnTo: cursor } });
}

/** W key: play the selection — snap the playhead to the selection start
 *  and play the range (Shift+W plays through past its end).
 *  Ignored while recording. */
export function handlePlaySelection(
  deps: TransportHandlerDeps,
  options?: { ignoreSelectionEnd?: boolean },
): void {
  if (deps.state.isRecording) return;
  deps.handlePlay({ snapToSelection: true, ...options });
}

export function handleSpacebar(
  deps: TransportHandlerDeps,
  options?: { ignoreSelectionEnd?: boolean },
): void {
  if (deps.state.isRecording) {
    deps.handleStopRecording();
  } else {
    deps.handlePlay(options);
  }
}

/** R key: toggle recording */
export function handleRecordToggle(deps: TransportHandlerDeps): void {
  deps.handleRecord();
}

/** E key: toggle effects panel */
export function handleEffectsToggle(deps: TransportHandlerDeps): void {
  deps.setEffectsPanel(prev => {
    if (prev) {
      return { ...prev, isOpen: !prev.isOpen };
    }
    // Prefer the focused track (where the user's attention is) over
    // the first selected track or track 0 — matches how delete /
    // split / duplicate resolve their target.
    const focused = deps.state.focusedTrackIndex;
    const trackIndex =
      focused !== null && focused !== undefined
        ? focused
        : deps.state.selectedTrackIndices.length > 0
          ? deps.state.selectedTrackIndices[0]
          : 0;
    return {
      isOpen: true,
      trackIndex,
      left: 0,
      top: 0,
      height: 600,
      width: 240,
    };
  });
}

/** L key: toggle loop region */
export function handleLoopToggle(deps: TransportHandlerDeps): void {
  deps.toggleLoopRegion();
}

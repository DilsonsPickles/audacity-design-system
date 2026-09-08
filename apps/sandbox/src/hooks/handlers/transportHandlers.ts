import type { TracksState } from '../../contexts/TracksContext';
import type { EffectsPanelState } from '../useContextMenuState';

export interface TransportHandlerDeps {
  state: TracksState;
  handlePlay: (options?: { ignoreSelectionEnd?: boolean; snapToSelection?: boolean; keepCursorOnStop?: boolean }) => void;
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

/** B key: play the selection — snap the playhead to the selection start
 *  and play the range (Shift+B plays through past its end). Audacity
 *  heritage: B was Play to Selection. Ignored while recording. */
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

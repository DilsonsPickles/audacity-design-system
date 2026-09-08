import type { TracksState } from '../../contexts/TracksContext';
import type { EffectsPanelState } from '../useContextMenuState';

export interface TransportHandlerDeps {
  state: TracksState;
  handlePlay: (options?: { ignoreSelectionEnd?: boolean }) => void;
  handleRecord: () => void;
  handleStopRecording: () => void;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  toggleLoopRegion: () => void;
}

/** Space bar: play/pause or stop recording */
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

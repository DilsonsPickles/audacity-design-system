import type { TracksState } from '../../contexts/TracksContext';
import type { EffectsPanelState } from '../useContextMenuState';

export interface TransportHandlerDeps {
  state: TracksState;
  handlePlay: () => void;
  handleRecord: () => void;
  handleStopRecording: () => void;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  toggleLoopRegion: () => void;
}

/** Space bar: play/pause or stop recording */
export function handleSpacebar(deps: TransportHandlerDeps): void {
  if (deps.state.isRecording) {
    deps.handleStopRecording();
  } else {
    deps.handlePlay();
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
    } else {
      const trackIndex = deps.state.selectedTrackIndices.length > 0
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
    }
  });
}

/** L key: toggle loop region */
export function handleLoopToggle(deps: TransportHandlerDeps): void {
  deps.toggleLoopRegion();
}

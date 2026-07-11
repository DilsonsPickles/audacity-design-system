import { useCallback, useRef, useState } from 'react';
import type { Track } from '../contexts/TracksContext';
import { findTrackRulerByIndex } from '../utils/focusRouting';
import { TRACK_GAP, DEFAULT_TRACK_HEIGHT } from '../constants/canvas';

export interface RulerFlyoutState {
  isOpen: boolean;
  x: number;
  y: number;
  mode: 'waveform' | 'spectrogram';
  trackIndex: number;
}

export interface UseRulerFlyoutDeps {
  tracks: Track[];
  scrollY: number;
}

export interface UseRulerFlyoutResult {
  rulerFlyout: RulerFlyoutState | null;
  setRulerFlyout: React.Dispatch<React.SetStateAction<RulerFlyoutState | null>>;
  rulerTriggerRef: React.MutableRefObject<HTMLElement | null>;
  halfWave: boolean;
  setHalfWave: React.Dispatch<React.SetStateAction<boolean>>;
  /** Right-click anywhere on the vertical ruler panel — hit-tests the track stack by Y. */
  handleRulerContextMenu: (e: React.MouseEvent) => void;
  /** Keyboard/click activation of a specific track's ruler (`onRulerActivate`) — opens the
   *  flyout for that track and records the trigger element for focus restoration on close. */
  openRulerFlyoutForTrack: (trackIndex: number, rect: DOMRect) => void;
}

/**
 * Ruler flyout state + hit-testing. Owns `rulerTriggerRef` — written here
 * (context-menu hit-test and `openRulerFlyoutForTrack`), read by the
 * `<RulerFlyout>` JSX that stays in EditorLayout. Callers must pass the
 * SAME ref object through to `<RulerFlyout triggerRef>` for focus
 * restoration to work.
 */
export function useRulerFlyout(deps: UseRulerFlyoutDeps): UseRulerFlyoutResult {
  const { tracks, scrollY } = deps;

  // Store trigger element for focus restoration on close
  const rulerTriggerRef = useRef<HTMLElement | null>(null);
  const [rulerFlyout, setRulerFlyout] = useState<RulerFlyoutState | null>(null);
  const [halfWave, setHalfWave] = useState(false);

  const handleRulerContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Determine mode based on which track the cursor is over
    // For now, check if any track at the click position is in spectrogram mode
    const clickY = e.clientY;
    const panelRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = clickY - panelRect.top + scrollY;

    let accumulatedHeight = TRACK_GAP; // tracks container has paddingTop of TRACK_GAP
    let mode: 'waveform' | 'spectrogram' = 'waveform';
    let targetTrackIndex = 0;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const trackHeight = track.height || DEFAULT_TRACK_HEIGHT;
      if (relativeY >= accumulatedHeight && relativeY < accumulatedHeight + trackHeight) {
        targetTrackIndex = i;
        if (track.viewMode === 'spectrogram') {
          mode = 'spectrogram';
        } else if (track.viewMode === 'split') {
          // Determine which half of the split the click is in
          const yInTrack = relativeY - accumulatedHeight;
          const spacerHeight = trackHeight > 44 ? 20 : 0;
          const splitRatio = track.channelSplitRatio ?? 0.5;
          const topHeight = (trackHeight - spacerHeight) * splitRatio;
          mode = yInTrack < spacerHeight + topHeight ? 'spectrogram' : 'waveform';
        } else {
          mode = 'waveform';
        }
        break;
      }
      accumulatedHeight += trackHeight + TRACK_GAP;
    }

    // Position flyout 24px to the left of the ruler panel, vertically centered on click
    const flyoutWidth = 200;
    const flyoutHeight = mode === 'waveform' ? 242 : 280; // approximate heights
    const flyoutX = panelRect.left - flyoutWidth - 16;
    let flyoutY = e.clientY - flyoutHeight / 2;

    // Clamp to viewport
    const vh = window.innerHeight;
    if (flyoutY + flyoutHeight > vh - 10) flyoutY = vh - flyoutHeight - 10;
    if (flyoutY < 10) flyoutY = 10;

    setRulerFlyout({ isOpen: true, x: flyoutX, y: flyoutY, mode, trackIndex: targetTrackIndex });
  }, [tracks, scrollY]);

  const openRulerFlyoutForTrack = useCallback((trackIndex: number, rect: DOMRect) => {
    // Store trigger element for focus restoration on close
    rulerTriggerRef.current = findTrackRulerByIndex(document, trackIndex);
    // Determine mode for flyout
    const track = tracks[trackIndex];
    const mode: 'waveform' | 'spectrogram' =
      track?.viewMode === 'spectrogram' ? 'spectrogram' : 'waveform';
    // Position flyout to the left of the ruler
    const flyoutWidth = 200;
    const flyoutHeight = mode === 'waveform' ? 242 : 280;
    const flyoutX = rect.left - flyoutWidth - 16;
    let flyoutY = rect.top + rect.height / 2 - flyoutHeight / 2;
    const vh = window.innerHeight;
    if (flyoutY + flyoutHeight > vh - 10) flyoutY = vh - flyoutHeight - 10;
    if (flyoutY < 10) flyoutY = 10;
    setRulerFlyout({ isOpen: true, x: flyoutX, y: flyoutY, mode, trackIndex });
  }, [tracks]);

  return {
    rulerFlyout,
    setRulerFlyout,
    rulerTriggerRef,
    halfWave,
    setHalfWave,
    handleRulerContextMenu,
    openRulerFlyoutForTrack,
  };
}

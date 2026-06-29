import { useEffect, useRef } from 'react';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import { scrollIntoViewIfNeeded, usePreferences } from '@dilsonspickles/components';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import type { EffectsPanelState } from './useContextMenuState';
import { handleCopy, handleCut, handlePaste } from './handlers/clipboardHandlers';
import { handleDelete } from './handlers/deleteHandlers';
import { handleSpacebar, handleRecordToggle, handleEffectsToggle, handleLoopToggle } from './handlers/transportHandlers';
import { handleHomeEnd, handleF6, handleTrackFocus, handleEnterSelection } from './handlers/navigationHandlers';
import { handlePlayheadMove, handleEscape, handleDeleteTimeRange } from './handlers/playheadSelectionHandlers';

export interface ClipboardState {
  clips: any[];
  operation: 'copy' | 'cut';
  timeSelection?: { startTime: number; endTime: number };
}

export interface UseKeyboardShortcutsOptions {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  handlePlay: () => void;
  handleRecord: () => void;
  handleStopRecording: () => void;
  selectionAnchor: number | null;
  setSelectionAnchor: React.Dispatch<React.SetStateAction<number | null>>;
  selectionAnchorRef: React.MutableRefObject<number | null>;
  selectionEdgesRef: React.MutableRefObject<{ startTime: number; endTime: number } | null>;
  effectsPanel: EffectsPanelState | null;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  clipboard: ClipboardState | null;
  setClipboard: React.Dispatch<React.SetStateAction<ClipboardState | null>>;
  isFlatNavigation: boolean;
  controlPanelHasFocus: number | null;
  toggleLoopRegion: () => void;
  audioManagerRef: React.RefObject<AudioPlaybackManager>;
  /** Cmd/Ctrl+, opens the preferences modal. */
  onOpenPreferences?: () => void;
}

/**
 * Hook that manages global keyboard shortcuts for the application.
 * Routes key events to domain-specific handler modules.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const { preferences } = usePreferences();
  const {
    state,
    dispatch,
    handlePlay,
    handleRecord,
    handleStopRecording,
    selectionAnchor,
    setSelectionAnchor,
    selectionAnchorRef,
    selectionEdgesRef,
    setEffectsPanel,
    clipboard,
    setClipboard,
    isFlatNavigation,
    controlPanelHasFocus,
    toggleLoopRegion,
    audioManagerRef,
    onOpenPreferences,
  } = options;

  // Track whether the user is navigating via keyboard or mouse.
  const isKeyboardNavigatingRef = useRef(false);

  useEffect(() => {
    const handleMouseDown = () => { isKeyboardNavigatingRef.current = false; };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, []);

  const scrollPlayheadIntoView = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = document.querySelector('.canvas-scroll-container') as HTMLElement;
        const playhead = container?.querySelector('.playhead-cursor') as HTMLElement;
        if (playhead) scrollIntoViewIfNeeded(playhead, container);
      });
    });
  };

  useEffect(() => {
    const transportDeps = { state, handlePlay, handleRecord, handleStopRecording, setEffectsPanel, toggleLoopRegion };
    const navDeps = { state, dispatch, selectionAnchor, setSelectionAnchor, selectionAnchorRef, selectionEdgesRef, isFlatNavigation, scrollPlayheadIntoView, trackSelectionMode: preferences.trackSelectionMode };
    const playheadDeps = { state, dispatch, selectionAnchorRef, selectionEdgesRef, scrollPlayheadIntoView };
    const clipboardDeps = { state, dispatch, clipboard, setClipboard, audioManagerRef };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation keys indicate keyboard navigation mode
      const navKeys = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Home', 'End'];
      if (navKeys.includes(e.key)) {
        isKeyboardNavigatingRef.current = true;
      }

      // Skip if in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // --- Escape ---
      if (e.key === 'Escape') {
        // Highest priority: bail out of split mode if active.
        if (state.splitMode) {
          e.preventDefault();
          dispatch({ type: 'SET_SPLIT_MODE', payload: false });
          return;
        }
        // Next: clear any active "selection-ish" state — time selection
        // and any selected clips. Both go in one Escape press so the
        // user has a single "deselect everything" gesture instead of
        // hunting separate shortcuts.
        const hasTimeSelection = !!state.timeSelection;
        const hasSelectedClips = state.tracks.some(
          (t) =>
            t.clips.some((c) => c.selected)
            || t.midiClips?.some((c) => c.selected),
        );
        if (hasTimeSelection || hasSelectedClips) {
          e.preventDefault();
          if (hasTimeSelection) handleEscape(playheadDeps);
          if (hasSelectedClips) dispatch({ type: 'DESELECT_ALL_CLIPS' });
          return;
        }
        // Progressive Escape:
        //   - DOM focus is on a track container (BW outline)
        //       → exit keyboard nav entirely. Blur, and the next Tab
        //         starts the user from a clean state.
        //   - DOM focus is on something inside a track (clip, handle,
        //     etc.) and a track is logically focused
        //       → anchor DOM focus to the focused-track container so
        //         the next Tab is deterministic (this case is mostly
        //         already handled by the clip's local Escape handler,
        //         but keep as a fallback for paths that don't have one).
        //   - Otherwise → blur whatever's focused.
        const active = document.activeElement as HTMLElement | null;
        if (
          state.focusedTrackIndex !== null
          && state.focusedTrackIndex !== undefined
          && active
          && active.classList.contains('track')
        ) {
          // Already on a track container — Escape exits.
          e.preventDefault();
          active.blur();
          isKeyboardNavigatingRef.current = false;
          return;
        }
        if (state.focusedTrackIndex !== null && state.focusedTrackIndex !== undefined) {
          const trackEl = document.querySelector(
            `.track-wrapper[data-track-index="${state.focusedTrackIndex}"] .track`,
          ) as HTMLElement | null;
          if (trackEl) {
            e.preventDefault();
            trackEl.focus();
            isKeyboardNavigatingRef.current = false;
            return;
          }
        }
        // No focused track to land on — fall back to clearing focus.
        if (active && active !== document.body && typeof active.blur === 'function') {
          e.preventDefault();
          active.blur();
          isKeyboardNavigatingRef.current = false;
          return;
        }
      }

      // --- Cmd/Ctrl+, : open Preferences ---
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        if (onOpenPreferences) {
          e.preventDefault();
          onOpenPreferences();
          return;
        }
      }

      // --- Home/End ---
      if (e.key === 'Home' || e.key === 'End') {
        const target = e.target as HTMLElement;
        if (target.closest('[role="toolbar"], [role="group"], [role="menubar"]')) {
          return;
        }
        e.preventDefault();
        handleHomeEnd(e, navDeps);
        return;
      }

      // --- Spacebar ---
      if (e.key === ' ') {
        const target = e.target as HTMLElement;
        const isTextField = target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && ['text', 'search', 'url', 'email', 'tel', 'password', 'number'].includes((target as HTMLInputElement).type)) ||
          target.isContentEditable;

        if (!isTextField) {
          e.preventDefault();
          handleSpacebar(transportDeps);
          return;
        }
      }

      // --- R: Record ---
      if (e.key === 'r' || e.key === 'R') {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.isContentEditable;
        if (!isTextInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          handleRecordToggle(transportDeps);
          return;
        }
      }

      // --- E: Effects panel ---
      if (e.key === 'e' || e.key === 'E') {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true';
        if (!isTextInput) {
          e.preventDefault();
          handleEffectsToggle(transportDeps);
          return;
        }
      }

      // --- S: Toggle split tool (bare key, no modifiers) ---
      if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true';
        if (!isTextInput) {
          e.preventDefault();
          dispatch({ type: 'SET_SPLIT_MODE', payload: !state.splitMode });
          return;
        }
      }

      // --- L: Loop region (bare key, no Cmd/Ctrl — those are reserved for
      //     other shortcuts like Cmd+Shift+L for new label track) ---
      if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true';
        if (!isTextInput) {
          e.preventDefault();
          handleLoopToggle(transportDeps);
          return;
        }
      }

      // --- F6: Block navigation ---
      if (e.key === 'F6' && isFlatNavigation) {
        e.preventDefault();
        handleF6(e, navDeps);
        return;
      }

      // --- ArrowUp/Down: Track focus ---
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const target = e.target as HTMLElement;
        if (target.closest('[role="toolbar"], [role="group"], [role="menubar"], [role="region"], [role="menu"]') || target.hasAttribute('data-clip-id')) {
          return;
        }
        e.preventDefault();
        handleTrackFocus(e, navDeps);
        return;
      }

      // --- J / K: Playhead movement (replaces ArrowLeft/Right which now
      //     belong to arrow-key navigation inside toolbars/lists). ---
      if (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.defaultPrevented) return;
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true';
        if (isTextInput) return;
        e.preventDefault();
        const isLeftward = e.key === 'j' || e.key === 'J';
        handlePlayheadMove(e, isLeftward, 0.1, playheadDeps);
        return;
      }

      // Clear selection edges ref when not actively resizing
      if (selectionEdgesRef.current) {
        selectionEdgesRef.current = null;
      }

      // --- Enter: Clip/track selection ---
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const interactiveElements = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'];
        const hasRole = target.getAttribute('role');
        // `.track` is intentionally NOT considered interactive here —
        // when keyboard focus lands on a track element we want Enter to
        // select / deselect it (handleEnterSelection toggles when the
        // focused track is already the sole selection).
        const isInteractive = interactiveElements.includes(target.tagName) ||
          hasRole === 'button' || hasRole === 'checkbox' ||
          hasRole === 'menuitem' || hasRole === 'menuitemcheckbox' || hasRole === 'menuitemradio' ||
          hasRole === 'group';
        if (isInteractive) return;

        e.preventDefault();
        handleEnterSelection(e, navDeps);
        return;
      }

      // --- Comma/Period: Large playhead jumps ---
      // Skip when Cmd/Ctrl is held — Cmd+, is reserved for opening
      // Preferences (handled higher up). Shift is still allowed
      // because handlePlayheadMove uses it to extend the selection.
      if ((e.key === ',' || e.key === '.' || e.key === '<' || e.key === '>')
          && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const isLeftward = e.key === ',' || e.key === '<';
        handlePlayheadMove(e, isLeftward, 1.0, playheadDeps);
        return;
      }

      // --- Ctrl+K: Delete time range ---
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleDeleteTimeRange(playheadDeps);
        return;
      }

      // --- Ctrl+Z / Ctrl+Shift+Z: Undo / Redo (also Ctrl+Y as redo alias) ---
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      // --- Ctrl+C: Copy ---
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy(clipboardDeps);
        return;
      }

      // --- Ctrl+X: Cut ---
      if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        e.preventDefault();
        handleCut(clipboardDeps);
        return;
      }

      // --- Ctrl+V: Paste ---
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste(clipboardDeps);
        return;
      }

      // --- Ctrl+T / Ctrl+Shift+T / Ctrl+Shift+L: Create new tracks ---
      // Cmd+T  → new mono audio track
      // Cmd+Shift+T → new stereo audio track
      // Cmd+Shift+L → new label track
      // Pick a non-colliding id and a non-colliding numeric suffix from
      // existing tracks (length+1 collides after you delete a middle track).
      const nextIdAfterDeletes = (state.tracks.reduce(
        (max: number, t: any) => (t.id > max ? t.id : max),
        0,
      ) + 1);
      const nextNameNumber = (prefix: string) => {
        const pattern = new RegExp(`^${prefix} (\\d+)$`);
        const usedNumbers = state.tracks
          .map((t: any) => {
            const m = pattern.exec(t.name ?? '');
            return m ? parseInt(m[1], 10) : NaN;
          })
          .filter((n: number) => !isNaN(n));
        if (usedNumbers.length === 0) return 1;
        return Math.max(...usedNumbers) + 1;
      };
      if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        const prefix = e.shiftKey ? 'Stereo' : 'Audio';
        const baseTrack: any = {
          id: nextIdAfterDeletes,
          name: `${prefix} ${nextNameNumber(prefix)}`,
          type: 'audio',
          height: 114,
          clips: [],
        };
        if (e.shiftKey) baseTrack.channelSplitRatio = 0.5; // stereo signifier
        dispatch({ type: 'ADD_TRACK', payload: baseTrack });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        dispatch({
          type: 'ADD_TRACK',
          payload: {
            id: nextIdAfterDeletes,
            name: `Label ${nextNameNumber('Label')}`,
            type: 'label',
            height: 76, // matches the AddTrackFlyout default in EditorLayout
            clips: [],
          } as any,
        });
        return;
      }

      // --- Ctrl+D: Duplicate focused track ---
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        const focused = state.focusedTrackIndex;
        if (focused === null || focused === undefined) return;
        e.preventDefault();
        const src = state.tracks[focused];
        if (!src) return;
        // Re-id clips so they don't collide with the source.
        let nextClipId = Date.now();
        const clonedClips = (src.clips ?? []).map((c: any) => ({
          ...c,
          id: nextClipId++,
          sourceClipId: c.sourceClipId ?? c.id,
        }));
        dispatch({
          type: 'ADD_TRACK',
          payload: {
            ...src,
            id: nextIdAfterDeletes,
            name: `${src.name} copy`,
            clips: clonedClips,
          } as any,
        });
        return;
      }

      // --- Ctrl+W: Close (delete) focused track ---
      if ((e.metaKey || e.ctrlKey) && (e.key === 'w' || e.key === 'W')) {
        const focused = state.focusedTrackIndex;
        if (focused === null || focused === undefined) return;
        e.preventDefault();
        dispatch({ type: 'DELETE_TRACK', payload: focused });
        return;
      }

      // --- Cmd/Ctrl+Delete: Always delete the focused clip ---
      // Skips the priority cascade (labels → time → clips → tracks). Useful
      // when, e.g., a track is the most-recently-selected thing but you
      // want to delete the clip you've actually got focused.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
        const activeElement = document.activeElement as HTMLElement | null;
        const clipIdStr = activeElement?.getAttribute('data-clip-id');
        const trackIndexStr = activeElement?.getAttribute('data-track-index');
        if (clipIdStr !== null && clipIdStr !== undefined && trackIndexStr !== null && trackIndexStr !== undefined) {
          e.preventDefault();
          const clipId = !isNaN(Number(clipIdStr)) ? Number(clipIdStr) : clipIdStr;
          dispatch({
            type: 'DELETE_CLIP',
            payload: { trackIndex: parseInt(trackIndexStr, 10), clipId: typeof clipId === 'string' ? Number(clipId) : clipId },
          });
          return;
        }
        // No focused clip — fall through to the normal priority cascade.
      }

      // --- Delete/Backspace ---
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete({
          state,
          dispatch,
          selectionAnchorRef,
          selectionEdgesRef,
          isKeyboardNavigating: isKeyboardNavigatingRef.current,
        });
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    state.tracks,
    state.focusedTrackIndex,
    state.playheadPosition,
    state.selectedTrackIndices,
    state.timeSelection,
    state.focusedTrackIndex,
    state.splitMode,
    controlPanelHasFocus,
    dispatch,
    isFlatNavigation,
    toggleLoopRegion,
    preferences.trackSelectionMode,
  ]);
}

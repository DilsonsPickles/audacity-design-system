import { useEffect, useRef } from 'react';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import { scrollIntoViewIfNeeded } from '@audacity-ui/components';
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
}

/**
 * Hook that manages global keyboard shortcuts for the application.
 * Routes key events to domain-specific handler modules.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
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
    const navDeps = { state, dispatch, selectionAnchor, setSelectionAnchor, selectionAnchorRef, selectionEdgesRef, isFlatNavigation, scrollPlayheadIntoView };
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
        if (state.timeSelection) {
          e.preventDefault();
          handleEscape(playheadDeps);
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

      // --- L: Loop region ---
      if (e.key === 'l' || e.key === 'L') {
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

      // --- ArrowLeft/Right: Playhead movement ---
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (e.defaultPrevented) return;
        const target = e.target as HTMLElement;
        if (target.closest('[role="toolbar"], [role="menubar"], [role="menu"]') || target.hasAttribute('data-clip-id')) {
          return;
        }
        e.preventDefault();
        handlePlayheadMove(e, e.key === 'ArrowLeft', 0.1, playheadDeps);
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
        const isInteractive = interactiveElements.includes(target.tagName) ||
          hasRole === 'button' || hasRole === 'checkbox' ||
          hasRole === 'menuitem' || hasRole === 'menuitemcheckbox' || hasRole === 'menuitemradio' ||
          hasRole === 'group' || target.classList.contains('track');
        if (isInteractive) return;

        e.preventDefault();
        handleEnterSelection(e, navDeps);
        return;
      }

      // --- Comma/Period: Large playhead jumps ---
      if (e.key === ',' || e.key === '.' || e.key === '<' || e.key === '>') {
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
    controlPanelHasFocus,
    dispatch,
    isFlatNavigation,
    toggleLoopRegion,
  ]);
}

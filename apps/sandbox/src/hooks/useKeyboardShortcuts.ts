import { useEffect, useRef } from 'react';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import { scrollIntoViewIfNeeded } from '@audacity-ui/components';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { applySplitCut } from '../utils/cutOperations';
import { selectTrackExclusive, toggleTrackSelection } from '../utils/trackSelection';
import type { EffectsPanelState } from './useContextMenuState';

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
 *
 * Handles:
 * - Escape: Clear time selection
 * - Space: Play/pause
 * - R: Toggle recording
 * - E: Toggle effects panel
 * - F6: Flat navigation block jumping
 * - Arrow Up/Down: Track focus movement with Shift for range selection
 * - Arrow Left/Right: Playhead movement and time selection manipulation
 * - Enter: Clip and track selection toggling
 * - Home/End: Jump playhead to start/end of project
 * - Shift+Home/End: Extend time selection to start/end of project
 * - L: Toggle loop region
 * - Comma/Period: Large playhead jumps with Shift for time selection creation
 * - Ctrl+K: Delete selected time range
 * - Ctrl+C: Copy clips or time selection
 * - Ctrl+X: Cut selected clips
 * - Ctrl+V: Paste clips
 * - Delete/Backspace: Delete labels, time ranges, clips, or tracks (priority-based)
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
    // effectsPanel is accessed via setEffectsPanel's prev callback, not read directly
    setEffectsPanel,
    clipboard,
    setClipboard,
    isFlatNavigation,
    controlPanelHasFocus,
    toggleLoopRegion,
    audioManagerRef,
  } = options;

  // Track whether the user is navigating via keyboard or mouse.
  // Keyboard actions (Tab, Arrow, Enter) set this to true.
  // Mouse clicks set it to false.
  // Used to decide whether to move focus after clip deletion.
  const isKeyboardNavigatingRef = useRef(false);

  useEffect(() => {
    const handleMouseDown = () => { isKeyboardNavigatingRef.current = false; };
    // Use capture phase so this fires before any React handler can stopPropagation
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, []);

  // Scroll the canvas so the playhead stays visible after a position change
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
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation keys indicate keyboard navigation mode.
      // Non-navigation keys (Delete, Space, etc.) don't change the mode.
      const navKeys = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Home', 'End'];
      if (navKeys.includes(e.key)) {
        isKeyboardNavigatingRef.current = true;
      }

      // Only handle these keys if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape to clear time selection
      if (e.key === 'Escape') {
        if (state.timeSelection) {
          e.preventDefault();
          dispatch({ type: 'SET_TIME_SELECTION', payload: null });
          // Clear the selection anchor and edges refs
          selectionAnchorRef.current = null;
          selectionEdgesRef.current = null;
          return;
        }
      }

      // Home/End: Jump playhead to start/end of project (with Shift: extend time selection)
      if (e.key === 'Home' || e.key === 'End') {
        // Don't handle if focus is inside any tab group (toolbar, menubar, etc.)
        const target = e.target as HTMLElement;
        if (target.closest('[role="toolbar"], [role="group"], [role="menubar"]')) {
          return;
        }

        e.preventDefault();

        if (e.key === 'Home') {
          if (e.shiftKey) {
            // Shift+Home: Extend/create time selection from playhead to time 0
            if (selectionAnchorRef.current === null) {
              selectionAnchorRef.current = state.playheadPosition;
              dispatch({ type: 'DESELECT_ALL_CLIPS' });
              if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
                const allTrackIndices = state.tracks.map((_, idx) => idx);
                dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
              }
            }
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: 0,
                endTime: selectionAnchorRef.current,
              },
            });
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 0 });
          } else {
            // Home: Jump playhead to 0, clear selection
            selectionAnchorRef.current = null;
            selectionEdgesRef.current = null;
            dispatch({ type: 'SET_TIME_SELECTION', payload: null });
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 0 });
          }
        } else {
          // End key
          const projectEnd = state.tracks.reduce((max, track) => {
            const audioMax = track.clips.reduce((m, clip) => Math.max(m, clip.start + clip.duration), max);
            return (track.midiClips || []).reduce((m, clip) => Math.max(m, clip.start + clip.duration), audioMax);
          }, 0);

          if (e.shiftKey) {
            // Shift+End: Extend/create time selection from playhead to end of project
            if (selectionAnchorRef.current === null) {
              selectionAnchorRef.current = state.playheadPosition;
              dispatch({ type: 'DESELECT_ALL_CLIPS' });
              if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
                const allTrackIndices = state.tracks.map((_, idx) => idx);
                dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
              }
            }
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: selectionAnchorRef.current,
                endTime: projectEnd,
              },
            });
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: projectEnd });
          } else {
            // End: Jump playhead to end of project, clear selection
            selectionAnchorRef.current = null;
            selectionEdgesRef.current = null;
            dispatch({ type: 'SET_TIME_SELECTION', payload: null });
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: projectEnd });
          }
        }
        scrollPlayheadIntoView();
        return;
      }

      // Spacebar for play/pause (always, unless in a text field)
      if (e.key === ' ') {
        const target = e.target as HTMLElement;
        const isTextField = target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && ['text', 'search', 'url', 'email', 'tel', 'password', 'number'].includes((target as HTMLInputElement).type)) ||
          target.isContentEditable;

        if (!isTextField) {
          e.preventDefault(); // Prevent page scroll
          if (state.isRecording) {
            // Stop recording, keep the clip, leave playhead in place
            handleStopRecording();
          } else {
            handlePlay();
          }
          return;
        }
      }

      // "R" key to toggle recording
      if (e.key === 'r' || e.key === 'R') {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.getAttribute('role') === 'textbox' ||
                            target.isContentEditable;
        if (!isTextInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          handleRecord();
          return;
        }
      }

      // "E" key to toggle effects panel
      if (e.key === 'e' || e.key === 'E') {
        const target = e.target as HTMLElement;
        // Only skip if in a text input field
        const isTextInput = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.getAttribute('role') === 'textbox' ||
                            target.getAttribute('contenteditable') === 'true';

        if (!isTextInput) {
          e.preventDefault();
          setEffectsPanel(prev => {
            if (prev) {
              return { ...prev, isOpen: !prev.isOpen };
            } else {
              // Create new panel for the first selected track, or track 0 if none selected
              const trackIndex = state.selectedTrackIndices.length > 0
                ? state.selectedTrackIndices[0]
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
          // Focus is handled by EffectsPanel's own mount effect
          return;
        }
      }

      // "L" key to toggle loop region
      if (e.key === 'l' || e.key === 'L') {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.getAttribute('role') === 'textbox' ||
                            target.getAttribute('contenteditable') === 'true';

        if (!isTextInput) {
          e.preventDefault();
          toggleLoopRegion();
          return;
        }
      }

      // F6 key navigation for flat navigation mode - skip through major blocks
      if (e.key === 'F6' && isFlatNavigation) {
        e.preventDefault();

        // Define major blocks in order
        const majorBlocks = [
          () => document.querySelector('[aria-label="File"]') as HTMLElement,  // File menu
          () => document.querySelector('[aria-label="Home"]') as HTMLElement,  // Home tab
          () => document.querySelector('[aria-label="Play"]') as HTMLElement,  // Play button
          () => document.querySelector('[aria-label="Add Track"]') as HTMLElement,  // Add new track
          () => document.querySelector('[aria-label*="track controls"]') as HTMLElement,  // Track 1 header
        ];

        // Find current focused element
        const currentElement = document.activeElement as HTMLElement;
        let currentBlockIndex = -1;

        // Determine which block we're currently in
        for (let i = 0; i < majorBlocks.length; i++) {
          const blockElement = majorBlocks[i]();
          if (blockElement && (blockElement === currentElement || blockElement.contains(currentElement))) {
            currentBlockIndex = i;
            break;
          }
        }

        // Move to next block (or first if we're not in any block)
        const nextBlockIndex = e.shiftKey
          ? (currentBlockIndex <= 0 ? majorBlocks.length - 1 : currentBlockIndex - 1)
          : (currentBlockIndex + 1) % majorBlocks.length;

        const nextBlock = majorBlocks[nextBlockIndex]();
        if (nextBlock) {
          nextBlock.focus();
        }
        return;
      }

      // Move track focus with up/down arrow keys
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Don't handle if focus is inside any tab group or region (toolbar, menubar, effects panel, etc.)
        // These containers handle their own arrow key navigation.
        const target = e.target as HTMLElement;
        if (target.closest('[role="toolbar"], [role="group"], [role="menubar"], [role="region"], [role="menu"]') || target.hasAttribute('data-clip-id')) {
          return;
        }

        e.preventDefault();

        // If there's a focused track, move focus up or down
        if (state.focusedTrackIndex !== null) {
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          const newIndex = state.focusedTrackIndex + delta;

          // Clamp to valid track indices
          if (newIndex >= 0 && newIndex < state.tracks.length) {
            dispatch({ type: 'SET_FOCUSED_TRACK', payload: newIndex });

            // If Shift is held, extend/contract selection
            if (e.shiftKey) {
              // Set anchor on first Shift+Arrow press
              const anchor = selectionAnchor ?? state.focusedTrackIndex;
              if (selectionAnchor === null) {
                setSelectionAnchor(state.focusedTrackIndex);
              }

              // Calculate range selection from anchor to newIndex
              const start = Math.min(anchor, newIndex);
              const end = Math.max(anchor, newIndex);
              const newSelection: number[] = [];
              for (let i = start; i <= end; i++) {
                newSelection.push(i);
              }
              dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
            } else {
              // Clear anchor when Shift is not held
              setSelectionAnchor(null);
            }
            // Don't change selection if Shift is not held - focus moves independently
          }
        } else if (state.tracks.length > 0) {
          // If no track is focused, focus the first track
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
          // Don't change selection - focus moves independently
        }
        return;
      }

      // Left/Right arrow keys for playhead movement and time selection manipulation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Skip if a component already handled this event (e.g. useContainerTabGroup cycling clips)
        if (e.defaultPrevented) return;

        // Skip elements that handle their own arrow key navigation
        const target = e.target as HTMLElement;
        if (target.closest('[role="toolbar"], [role="menubar"], [role="menu"]') || target.hasAttribute('data-clip-id')) {
          return;
        }

        const moveAmount = 0.1; // Move by 0.1 seconds
        const isLeftward = e.key === 'ArrowLeft';

        if (e.shiftKey && e.metaKey && state.timeSelection) {
          // REDUCE mode (Cmd+Shift): Trim existing selection inward
          e.preventDefault();

          // Initialize ref with current selection if not set
          if (!selectionEdgesRef.current) {
            selectionEdgesRef.current = {
              startTime: state.timeSelection.startTime,
              endTime: state.timeSelection.endTime,
            };
          }

          if (isLeftward) {
            // Cmd+Shift+Left: Move RIGHT edge LEFT (trim from right)
            const newEndTime = Math.max(
              selectionEdgesRef.current.startTime + 0.1, // Min selection size
              selectionEdgesRef.current.endTime - moveAmount
            );
            selectionEdgesRef.current.endTime = newEndTime;
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: selectionEdgesRef.current.startTime,
                endTime: newEndTime,
              },
            });
          } else {
            // Cmd+Shift+Right: Move LEFT edge RIGHT (trim from left)
            const newStartTime = Math.min(
              selectionEdgesRef.current.endTime - 0.1, // Min selection size
              selectionEdgesRef.current.startTime + moveAmount
            );
            selectionEdgesRef.current.startTime = newStartTime;
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: newStartTime,
                endTime: selectionEdgesRef.current.endTime,
              },
            });
          }
          // Keep playhead pinned to left edge of selection
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: selectionEdgesRef.current.startTime });
          scrollPlayheadIntoView();
        } else if (e.shiftKey) {
          // EXTEND mode (Shift): extend selection edges outward, don't move playhead
          e.preventDefault();

          // If playhead is outside the current selection, start a new selection from playhead
          const playheadOutsideSelection = state.timeSelection && (
            state.playheadPosition < state.timeSelection.startTime - 0.001 ||
            state.playheadPosition > state.timeSelection.endTime + 0.001
          );

          if (!state.timeSelection || playheadOutsideSelection) {
            // No selection or playhead moved away — start fresh from playhead
            dispatch({ type: 'DESELECT_ALL_CLIPS' });
            if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
              const allTrackIndices = state.tracks.map((_, idx) => idx);
              dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
            }
            selectionEdgesRef.current = { startTime: state.playheadPosition, endTime: state.playheadPosition };
          }

          // Initialize edges ref from existing selection if not yet set
          if (!selectionEdgesRef.current) {
            selectionEdgesRef.current = {
              startTime: state.timeSelection!.startTime,
              endTime: state.timeSelection!.endTime,
            };
          }

          if (isLeftward) {
            // Shift+Left: extend left edge leftward, playhead follows left edge
            selectionEdgesRef.current.startTime = Math.max(0, selectionEdgesRef.current.startTime - moveAmount);
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: selectionEdgesRef.current.startTime });
          } else {
            // Shift+Right: extend right edge rightward, playhead stays
            selectionEdgesRef.current.endTime = selectionEdgesRef.current.endTime + moveAmount;
          }

          dispatch({
            type: 'SET_TIME_SELECTION',
            payload: {
              startTime: selectionEdgesRef.current.startTime,
              endTime: selectionEdgesRef.current.endTime,
            },
          });
          scrollPlayheadIntoView();
        } else {
          // Plain arrow keys: move playhead
          e.preventDefault();
          selectionAnchorRef.current = null;
          selectionEdgesRef.current = null;
          const delta = e.key === 'ArrowRight' ? moveAmount : -moveAmount;
          const newPosition = Math.max(0, state.playheadPosition + delta);
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPosition });
          scrollPlayheadIntoView();
        }
      return;
    }

      // Clear the selection edges ref when not actively resizing
      // This ensures fresh state for next time
      if (selectionEdgesRef.current) {
        selectionEdgesRef.current = null;
      }

      // Handle clip and track selection with Enter key
      if (e.key === 'Enter') {
        // Don't interfere with interactive elements (buttons, inputs, etc.)
        // Also allow track headers (role="group") to handle their own Enter key
        const target = e.target as HTMLElement;
        const interactiveElements = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'];
        const hasRole = target.getAttribute('role');
        const isInteractive = interactiveElements.includes(target.tagName) ||
                              hasRole === 'button' ||
                              hasRole === 'checkbox' ||
                              hasRole === 'menuitem' ||
                              hasRole === 'menuitemcheckbox' ||
                              hasRole === 'menuitemradio' ||
                              hasRole === 'group' || // Track headers handle their own Enter key
                              target.classList.contains('track'); // Track container handles its own Enter key

        if (isInteractive) {
          // Let the interactive element handle the Enter key
          return;
        }

        // Check if any clips are selected
        const selectedClips: Array<{ trackIndex: number; clipId: number }> = [];
        state.tracks.forEach((track, trackIndex) => {
          track.clips.forEach(clip => {
            if (clip.selected) {
              selectedClips.push({ trackIndex, clipId: clip.id });
            }
          });
        });

        if (selectedClips.length > 0) {
          // Clips are selected - handle clip selection
          e.preventDefault();

          // Get the first selected clip (or last selected for range anchor)
          const firstSelectedClip = selectedClips[0];

          if (e.shiftKey && state.lastSelectedClip) {
            // Shift+Enter: Range selection from last selected clip to first selected clip
            dispatch({
              type: 'SELECT_CLIP_RANGE',
              payload: { trackIndex: state.lastSelectedClip.trackIndex, clipId: state.lastSelectedClip.clipId },
            });
          } else if (e.metaKey || e.ctrlKey) {
            // Cmd/Ctrl+Enter: Toggle the first selected clip
            dispatch({
              type: 'TOGGLE_CLIP_SELECTION',
              payload: { trackIndex: firstSelectedClip.trackIndex, clipId: firstSelectedClip.clipId },
            });
          } else {
            // Regular Enter: Toggle selection
            // If only one clip is selected, deselect it
            // If multiple clips are selected, exclusively select the first one
            if (selectedClips.length === 1) {
              // Deselect the only selected clip
              dispatch({ type: 'DESELECT_ALL_CLIPS' });
            } else {
              // Multiple clips selected - exclusively select the first one
              dispatch({
                type: 'SELECT_CLIP',
                payload: { trackIndex: firstSelectedClip.trackIndex, clipId: firstSelectedClip.clipId },
              });
            }
          }
          return;
        }

        // No clips selected - fall back to track selection
        if (state.focusedTrackIndex !== null) {
          e.preventDefault();

          if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
            // Shift+Enter: range-select from anchor to focused track
            const anchor = selectionAnchor ?? (state.selectedTrackIndices.length > 0 ? state.selectedTrackIndices[0] : state.focusedTrackIndex);
            if (selectionAnchor === null) setSelectionAnchor(state.focusedTrackIndex);
            const start = Math.min(anchor, state.focusedTrackIndex);
            const end = Math.max(anchor, state.focusedTrackIndex);
            const newSelection: number[] = [];
            for (let i = start; i <= end; i++) newSelection.push(i);
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
          } else if (e.metaKey || e.ctrlKey) {
            toggleTrackSelection(state.focusedTrackIndex, state.selectedTrackIndices, dispatch);
          } else {
            selectTrackExclusive(state.focusedTrackIndex, dispatch);
          }
        }
        return;
      }

      // Comma/Period: Same as ArrowLeft/ArrowRight but with 1s jumps
      // Note: When shift is held, browser sends '<' for shift+comma and '>' for shift+period
      if (e.key === ',' || e.key === '.' || e.key === '<' || e.key === '>') {
        e.preventDefault();
        const moveAmount = 1.0; // Move by 1 second (larger jumps than arrow keys)
        const isLeftward = e.key === ',' || e.key === '<';

        if (e.shiftKey && e.metaKey && state.timeSelection) {
          // REDUCE mode (Cmd+Shift): Trim existing selection inward
          if (!selectionEdgesRef.current) {
            selectionEdgesRef.current = {
              startTime: state.timeSelection.startTime,
              endTime: state.timeSelection.endTime,
            };
          }

          if (isLeftward) {
            const newEndTime = Math.max(
              selectionEdgesRef.current.startTime + 0.1,
              selectionEdgesRef.current.endTime - moveAmount
            );
            selectionEdgesRef.current.endTime = newEndTime;
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: selectionEdgesRef.current.startTime,
                endTime: newEndTime,
              },
            });
          } else {
            const newStartTime = Math.min(
              selectionEdgesRef.current.endTime - 0.1,
              selectionEdgesRef.current.startTime + moveAmount
            );
            selectionEdgesRef.current.startTime = newStartTime;
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: newStartTime,
                endTime: selectionEdgesRef.current.endTime,
              },
            });
          }
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: selectionEdgesRef.current.startTime });
          scrollPlayheadIntoView();
        } else if (e.shiftKey || e.key === '<' || e.key === '>') {
          // EXTEND mode (Shift): extend selection edges outward

          // If playhead is outside the current selection, start a new selection from playhead
          const playheadOutsideSelection = state.timeSelection && (
            state.playheadPosition < state.timeSelection.startTime - 0.001 ||
            state.playheadPosition > state.timeSelection.endTime + 0.001
          );

          if (!state.timeSelection || playheadOutsideSelection) {
            dispatch({ type: 'DESELECT_ALL_CLIPS' });
            if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
              const allTrackIndices = state.tracks.map((_, idx) => idx);
              dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
            }
            selectionEdgesRef.current = { startTime: state.playheadPosition, endTime: state.playheadPosition };
          }

          if (!selectionEdgesRef.current) {
            selectionEdgesRef.current = {
              startTime: state.timeSelection!.startTime,
              endTime: state.timeSelection!.endTime,
            };
          }

          if (isLeftward) {
            selectionEdgesRef.current.startTime = Math.max(0, selectionEdgesRef.current.startTime - moveAmount);
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: selectionEdgesRef.current.startTime });
          } else {
            selectionEdgesRef.current.endTime = selectionEdgesRef.current.endTime + moveAmount;
          }

          dispatch({
            type: 'SET_TIME_SELECTION',
            payload: {
              startTime: selectionEdgesRef.current.startTime,
              endTime: selectionEdgesRef.current.endTime,
            },
          });
          scrollPlayheadIntoView();
        } else {
          // Plain , / .: move playhead
          selectionAnchorRef.current = null;
          selectionEdgesRef.current = null;
          const delta = isLeftward ? -moveAmount : moveAmount;
          const newPosition = Math.max(0, state.playheadPosition + delta);
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPosition });
          scrollPlayheadIntoView();
        }
        return;
      }

      // Ctrl+K: Delete selected time range
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();

        if (state.timeSelection) {
          const { startTime, endTime } = state.timeSelection;

          // Ensure we have tracks selected - if not, select all tracks
          if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
            const allTrackIndices = state.tracks.map((_, idx) => idx);
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
          }

          // Dispatch DELETE_TIME_RANGE action
          dispatch({
            type: 'DELETE_TIME_RANGE',
            payload: { startTime, endTime },
          });

          // Clear time selection after deletion
          dispatch({ type: 'SET_TIME_SELECTION', payload: null });
          // Clear selection anchor so next Shift+. starts fresh
          selectionAnchorRef.current = null;
          selectionEdgesRef.current = null;

        } else {
        }
        return;
      }

      // Copy selected clips or time selection (Cmd+C / Ctrl+C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();

        // Priority 1: Copy time selection if it exists (skip clip-derived selections)
        if (state.timeSelection && state.timeSelection.renderOnCanvas !== false) {
          const { startTime, endTime } = state.timeSelection;

          // Collect clips that intersect with the time selection on selected tracks
          const selectedTracks = state.selectedTrackIndices;
          const clipsInSelection: any[] = [];
          state.tracks.forEach((track, trackIndex) => {
            if (selectedTracks.length > 0 && !selectedTracks.includes(trackIndex)) return;
            track.clips.forEach(clip => {
              const clipEnd = clip.start + clip.duration;
              // Check if clip intersects with selection
              if (clip.start < endTime && clipEnd > startTime) {
                clipsInSelection.push({ ...clip, trackIndex });
              }
            });
          });

          if (clipsInSelection.length > 0) {
            setClipboard({
              clips: clipsInSelection,
              operation: 'copy',
              timeSelection: { startTime, endTime }
            });
          } else {
          }
          return;
        }

        // Priority 2: Copy selected clips
        const selectedClips: any[] = [];
        state.tracks.forEach((track, trackIndex) => {
          track.clips.forEach(clip => {
            if (clip.selected) {
              selectedClips.push({ ...clip, trackIndex });
            }
          });
        });

        if (selectedClips.length > 0) {
          setClipboard({ clips: selectedClips, operation: 'copy' });
        } else {
        }
        return;
      }

      // Cut selected clips or time selection (Cmd+X / Ctrl+X)
      if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        e.preventDefault();

        // Priority 1: Cut time selection if it exists (skip clip-derived selections)
        if (state.timeSelection && state.timeSelection.renderOnCanvas !== false) {
          const { startTime, endTime } = state.timeSelection;

          // Collect clips that intersect with the time selection on selected tracks
          const selectedTracks = state.selectedTrackIndices;
          const clipsInSelection: any[] = [];
          state.tracks.forEach((track, trackIndex) => {
            if (selectedTracks.length > 0 && !selectedTracks.includes(trackIndex)) return;
            track.clips.forEach(clip => {
              const clipEnd = clip.start + clip.duration;
              if (clip.start < endTime && clipEnd > startTime) {
                clipsInSelection.push({ ...clip, trackIndex });
              }
            });
          });

          if (clipsInSelection.length > 0) {
            setClipboard({
              clips: clipsInSelection,
              operation: 'cut',
              timeSelection: { startTime, endTime }
            });

            // Use split cut to trim partially-overlapping clips instead of deleting them
            const tracksAfterCut = applySplitCut(
              state.tracks,
              startTime,
              endTime,
              selectedTracks.length > 0 ? selectedTracks : state.tracks.map((_, i) => i)
            );

            dispatch({ type: 'SET_TRACKS', payload: tracksAfterCut });
            dispatch({ type: 'SET_TIME_SELECTION', payload: null });
          } else {
          }
          return;
        }

        // Priority 2: Cut selected clips
        const selectedClips: any[] = [];
        state.tracks.forEach((track, trackIndex) => {
          track.clips.forEach(clip => {
            if (clip.selected) {
              selectedClips.push({ ...clip, trackIndex });
            }
          });
        });

        if (selectedClips.length > 0) {
          setClipboard({ clips: selectedClips, operation: 'cut' });

          // Immediately remove the cut clips from tracks
          const tracksAfterCut = state.tracks.map((track, tIndex) => ({
            ...track,
            clips: track.clips.filter(clip =>
              !selectedClips.some(cutClip => cutClip.id === clip.id && cutClip.trackIndex === tIndex)
            ),
          }));

          dispatch({ type: 'SET_TRACKS', payload: tracksAfterCut });
        }
        return;
      }

      // Paste clips (Cmd+V / Ctrl+V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();

        if (!clipboard || clipboard.clips.length === 0) {
          return;
        }

        // Paste at playhead position on the focused track
        const targetTrackIndex = state.focusedTrackIndex ?? 0;
        if (targetTrackIndex < 0 || targetTrackIndex >= state.tracks.length) {
          return;
        }

        const pasteTime = state.playheadPosition;

        // Calculate time offset based on time selection or clip start times
        let timeOffset: number;
        let clipsToPaste = clipboard.clips;

        if (clipboard.timeSelection) {
          // Time selection paste: align selection start to playhead
          timeOffset = pasteTime - clipboard.timeSelection.startTime;

          // Trim clips to only include the time selection range
          clipsToPaste = clipboard.clips.map(clipData => {
            const clipEnd = clipData.start + clipData.duration;
            const selStart = clipboard.timeSelection!.startTime;
            const selEnd = clipboard.timeSelection!.endTime;

            // Calculate intersection with time selection
            const trimStart = Math.max(0, selStart - clipData.start);
            const trimEnd = Math.max(0, clipEnd - selEnd);
            const newDuration = clipData.duration - trimStart - trimEnd;

            if (newDuration <= 0) return null; // Clip doesn't intersect selection

            return {
              ...clipData,
              start: clipData.start + trimStart,
              duration: newDuration,
              // Note: In a real implementation, we'd also trim waveform data and adjust envelope points
            };
          }).filter(Boolean);
        } else {
          // Whole clip paste: use earliest clip start
          const earliestClipStart = Math.min(...clipboard.clips.map(c => c.start));
          timeOffset = pasteTime - earliestClipStart;
        }

        // Calculate track offset to maintain relative positioning across tracks
        const minSourceTrackIndex = Math.min(...clipboard.clips.map(c => c.trackIndex));
        const trackOffset = targetTrackIndex - minSourceTrackIndex;

        // Generate new clip IDs
        let maxClipId = 0;
        state.tracks.forEach(track => {
          track.clips.forEach(clip => {
            maxClipId = Math.max(maxClipId, clip.id);
          });
        });

        // Create new clips with updated positions and track assignments
        const newClipsWithTracks = clipsToPaste
          .map((clipData, index) => {
            const destTrackIndex = clipData.trackIndex + trackOffset;

            // Skip clips that would paste outside available tracks
            if (destTrackIndex < 0 || destTrackIndex >= state.tracks.length) {
              return null;
            }

            return {
              clip: {
                ...clipData,
                id: maxClipId + index + 1,
                start: clipData.start + timeOffset,
                selected: true,
                color: state.tracks[destTrackIndex].color,
              },
              sourceClipId: clipData.id,
              destTrackIndex,
            };
          })
          .filter((item): item is { clip: any; sourceClipId: string | number; destTrackIndex: number } => item !== null);

        // Group clips by destination track
        const clipsByTrack = new Map<number, any[]>();
        newClipsWithTracks.forEach(({ clip, destTrackIndex }) => {
          if (!clipsByTrack.has(destTrackIndex)) {
            clipsByTrack.set(destTrackIndex, []);
          }
          clipsByTrack.get(destTrackIndex)!.push(clip);
        });

        // Add clips to their respective tracks
        const updatedTracks = state.tracks.map((track, index) => {
          const clipsForThisTrack = clipsByTrack.get(index) || [];
          return {
            ...track,
            clips: [
              ...track.clips.map(c => ({ ...c, selected: false })),
              ...clipsForThisTrack,
            ],
          };
        });

        dispatch({ type: 'SET_TRACKS', payload: updatedTracks });

        // Copy audio buffers for pasted clips so they play back correctly
        const audioManager = audioManagerRef.current;
        if (audioManager) {
          newClipsWithTracks.forEach(({ clip, sourceClipId }) => {
            const buffer = audioManager.getClipBuffer(sourceClipId);
            if (buffer) {
              audioManager.addClipBuffer(clip.id, buffer);
            }
          });
        }

        // Note: Clipboard is NOT cleared after paste, allowing multiple pastes for both cut and copy
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        // Priority 1: If there are selected labels, delete them
        if (state.selectedLabelIds.length > 0) {
          // Check if we should also delete time (all tracks selected + time selection exists)
          const allTracksSelected = state.selectedTrackIndices.length === state.tracks.length;
          const hasTimeSelection = state.timeSelection !== null;
          const shouldDeleteTime = allTracksSelected && hasTimeSelection;

          // If deleting with time selection, also delete point labels within the region's time range
          if (shouldDeleteTime && state.timeSelection) {
            const { startTime, endTime } = state.timeSelection;

            // For each track that has a selected label
            state.selectedLabelIds.forEach(labelId => {
              const [trackIndexStr, labelIdStr] = labelId.split('-');
              const trackIndex = parseInt(trackIndexStr, 10);
              const labelIdNum = parseInt(labelIdStr, 10);
              const track = state.tracks[trackIndex];

              if (track && track.labels) {
                // Filter out:
                // 1. The selected label itself
                // 2. Any point labels that fall within the time range
                const updatedLabels = track.labels.filter(l => {
                  // Keep if it's not the selected label
                  if (l.id === labelIdNum) return false;

                  // If it's a point label and falls within the time range, remove it
                  if (l.startTime === l.endTime && l.startTime >= startTime && l.startTime <= endTime) {
                    return false;
                  }

                  return true;
                });

                dispatch({
                  type: 'UPDATE_TRACK',
                  payload: {
                    index: trackIndex,
                    track: { labels: updatedLabels }
                  }
                });
              }
            });
          } else {
            // Normal label deletion (no time range deletion)
            state.selectedLabelIds.forEach(labelId => {
              const [trackIndexStr, labelIdStr] = labelId.split('-');
              const trackIndex = parseInt(trackIndexStr, 10);
              const labelIdNum = parseInt(labelIdStr, 10);

              const track = state.tracks[trackIndex];
              if (track && track.labels) {
                const labelIndex = track.labels.findIndex(l => l.id === labelIdNum);
                if (labelIndex !== -1) {
                  const updatedLabels = [...track.labels];
                  updatedLabels.splice(labelIndex, 1);

                  dispatch({
                    type: 'UPDATE_TRACK',
                    payload: {
                      index: trackIndex,
                      track: { labels: updatedLabels }
                    }
                  });
                }
              }
            });
          }

          // Clear label selection after deletion
          dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });

          // If conditions met, also delete time range across all tracks
          if (shouldDeleteTime && state.timeSelection) {
            const { startTime, endTime } = state.timeSelection;
            const deletionDuration = endTime - startTime;

            // Use DELETE_TIME_RANGE to respect cut mode
            dispatch({
              type: 'DELETE_TIME_RANGE',
              payload: { startTime, endTime },
            });
            dispatch({ type: 'SET_TIME_SELECTION', payload: null });
            // Clear selection anchor so next Shift+. starts fresh
            selectionAnchorRef.current = null;
            selectionEdgesRef.current = null;

            // Adjust playhead position based on cut mode
            if (state.cutMode === 'ripple' && state.playheadPosition > startTime) {
              // In ripple mode, if playhead is after the deletion, shift it left
              const newPlayheadPosition = Math.max(startTime, state.playheadPosition - deletionDuration);
              dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPlayheadPosition });
            }

          } else {
            // Clear time selection even when not deleting time
            dispatch({ type: 'SET_TIME_SELECTION', payload: null });
            // Clear selection anchor so next Shift+. starts fresh
            selectionAnchorRef.current = null;
            selectionEdgesRef.current = null;
          }
          return;
        }

        // Priority 2: If there's a real time selection (not ruler-only from clip selection), perform cut operation
        if (state.timeSelection && state.timeSelection.renderOnCanvas !== false) {

          const { startTime, endTime } = state.timeSelection;
          const deletionDuration = endTime - startTime;


          // Dispatch DELETE_TIME_RANGE action (respects cut mode: split/ripple)
          dispatch({
            type: 'DELETE_TIME_RANGE',
            payload: { startTime, endTime },
          });

          // Clear time selection after deletion
          dispatch({ type: 'SET_TIME_SELECTION', payload: null });
          // Clear selection anchor so next Shift+. starts fresh
          selectionAnchorRef.current = null;
          selectionEdgesRef.current = null;

          // Adjust playhead position based on cut mode
          if (state.cutMode === 'ripple' && state.playheadPosition > startTime) {
            // In ripple mode, if playhead is after the deletion, shift it left
            const newPlayheadPosition = Math.max(startTime, state.playheadPosition - deletionDuration);
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPlayheadPosition });
          }

          return;
        }

        // Priority 3: Delete focused clip and/or selected clips
        // Only track focused clip for focus-after-delete when using keyboard navigation
        let focusedClipInfo: { clipId: string | number; trackIndex: number } | null = null;
        if (isKeyboardNavigatingRef.current) {
          const activeElement = document.activeElement;
          if (activeElement) {
            const clipIdStr = activeElement.getAttribute('data-clip-id');
            const trackIndexStr = activeElement.getAttribute('data-track-index');
            if (clipIdStr !== null && trackIndexStr !== null) {
              const clipId = !isNaN(Number(clipIdStr)) ? Number(clipIdStr) : clipIdStr;
              focusedClipInfo = {
                clipId: clipId,
                trackIndex: parseInt(trackIndexStr, 10),
              };
            }
          }
        }

        // Collect all clips to delete (union of focused + selected)
        const clipsToDelete: Array<{ trackIndex: number; clipId: string | number }> = [];

        // Add focused clip if present
        if (focusedClipInfo) {
          clipsToDelete.push(focusedClipInfo);
        }

        // Add all selected clips (audio + midi)
        state.tracks.forEach((track, trackIndex) => {
          track.clips.forEach((clip) => {
            if (clip.selected) {
              const isDuplicate = clipsToDelete.some(
                item => item.clipId === clip.id && item.trackIndex === trackIndex
              );
              if (!isDuplicate) {
                clipsToDelete.push({ trackIndex, clipId: clip.id });
              }
            }
          });
          track.midiClips?.forEach((clip) => {
            if (clip.selected) {
              const isDuplicate = clipsToDelete.some(
                item => item.clipId === clip.id && item.trackIndex === trackIndex
              );
              if (!isDuplicate) {
                clipsToDelete.push({ trackIndex, clipId: clip.id });
              }
            }
          });
        });


        // Delete all clips in the union
        if (clipsToDelete.length > 0) {
          // Before deleting, determine where to move focus
          let shouldMoveFocus = false;
          let focusTrackIndex = 0;
          let focusClipId: number | null = null;

          if (focusedClipInfo) {
            const track = state.tracks[focusedClipInfo.trackIndex];
            const deletedClip = track.clips.find(c => c.id === focusedClipInfo.clipId)
              || track.midiClips?.find(c => c.id === focusedClipInfo.clipId);

            if (deletedClip) {
              focusTrackIndex = focusedClipInfo.trackIndex;

              // Find nearest remaining clip by start time (audio + midi)
              const remainingClips = [
                ...track.clips.filter(
                  c => !clipsToDelete.some(item => item.clipId === c.id && item.trackIndex === focusedClipInfo.trackIndex)
                ),
                ...(track.midiClips || []).filter(
                  c => !clipsToDelete.some(item => item.clipId === c.id && item.trackIndex === focusedClipInfo.trackIndex)
                ),
              ];

              if (remainingClips.length > 0) {
                shouldMoveFocus = true;
                let nearest = remainingClips[0];
                let nearestDist = Math.abs(nearest.start - deletedClip.start);
                for (const c of remainingClips) {
                  const dist = Math.abs(c.start - deletedClip.start);
                  if (dist < nearestDist) {
                    nearest = c;
                    nearestDist = dist;
                  }
                }
                focusClipId = nearest.id;
              } else {
                // No clips left on this track — find nearest clip on the next available track
                const trackCount = state.tracks.length;
                for (let offset = 1; offset < trackCount; offset++) {
                  // Check next track first, then previous, alternating outward
                  const candidates = [
                    focusedClipInfo.trackIndex + offset,
                    focusedClipInfo.trackIndex - offset,
                  ];
                  for (const ti of candidates) {
                    if (ti < 0 || ti >= trackCount) continue;
                    const otherRemaining = [
                      ...state.tracks[ti].clips.filter(
                        c => !clipsToDelete.some(item => item.clipId === c.id && item.trackIndex === ti)
                      ),
                      ...(state.tracks[ti].midiClips || []).filter(
                        c => !clipsToDelete.some(item => item.clipId === c.id && item.trackIndex === ti)
                      ),
                    ];
                    if (otherRemaining.length > 0) {
                      // Pick the closest clip by start time on this track
                      let nearest = otherRemaining[0];
                      let nearestDist = Math.abs(nearest.start - deletedClip.start);
                      for (const c of otherRemaining) {
                        const dist = Math.abs(c.start - deletedClip.start);
                        if (dist < nearestDist) {
                          nearest = c;
                          nearestDist = dist;
                        }
                      }
                      focusTrackIndex = ti;
                      focusClipId = nearest.id;
                      shouldMoveFocus = true;
                      break;
                    }
                  }
                  if (shouldMoveFocus) break;
                }
              }
            }
          }

          // Delete all clips
          clipsToDelete.forEach(({ trackIndex, clipId }) => {
            dispatch({
              type: 'DELETE_CLIP',
              payload: { trackIndex, clipId: typeof clipId === 'string' ? Number(clipId) : clipId },
            });
          });

          // Move focus to nearest clip after deletion completes
          if (shouldMoveFocus && focusClipId !== null) {
            setTimeout(() => {
              const clipEl = document.querySelector(
                `[data-track-index="${focusTrackIndex}"] [data-clip-id="${focusClipId}"]`
              ) as HTMLElement;
              if (clipEl) {
                clipEl.focus({ preventScroll: true });
                scrollIntoViewIfNeeded(clipEl);
              }
            }, 50);
          }

          return;
        }

        // Priority 4: If there are selected tracks (and no labels/clips/time selected), delete the tracks
        // Only delete the tracks if they were selected via the track header (not via clip selection)
        if (state.selectedTrackIndices.length > 0) {
          // Double-check no clips are selected in any track
          const anyClipsSelected = state.tracks.some(track =>
            track.clips.some(clip => clip.selected) || track.midiClips?.some(clip => clip.selected)
          );

          if (!anyClipsSelected) {
            dispatch({
              type: 'DELETE_TRACKS',
              payload: state.selectedTrackIndices,
            });
          }
          return;
        }
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

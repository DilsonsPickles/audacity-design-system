import { useEffect, useRef } from 'react';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import { toast, scrollIntoViewIfNeeded } from '@audacity-ui/components';

export interface EffectsPanelState {
  isOpen: boolean;
  trackIndex: number;
  left: number;
  top: number;
  height: number;
  width: number;
}

export interface ClipboardState {
  clips: any[];
  operation: 'copy' | 'cut';
  timeSelection?: { startTime: number; endTime: number };
}

export interface UseKeyboardShortcutsOptions {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  handlePlay: () => void;
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
}

/**
 * Hook that manages global keyboard shortcuts for the application.
 *
 * Handles:
 * - Escape: Clear time selection
 * - Space: Play/pause
 * - E: Toggle effects panel
 * - F6: Flat navigation block jumping
 * - Arrow Up/Down: Track focus movement with Shift for range selection
 * - Arrow Left/Right: Playhead movement and time selection manipulation
 * - Enter: Clip and track selection toggling
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

      // Spacebar for play/pause (unless on a real interactive element that uses spacebar)
      if (e.key === ' ') {
        const target = e.target as HTMLElement;
        const isClip = target.hasAttribute('data-clip-id');
        const isTrackContainer = target.classList.contains('track');
        const interactiveElements = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'];
        const hasRole = target.getAttribute('role');
        const isInteractive = !isClip && !isTrackContainer && (
                              interactiveElements.includes(target.tagName) ||
                              hasRole === 'button' ||
                              hasRole === 'checkbox' ||
                              hasRole === 'menuitem' ||
                              hasRole === 'menuitemcheckbox' ||
                              hasRole === 'menuitemradio');

        if (!isInteractive) {
          e.preventDefault(); // Prevent page scroll
          handlePlay();
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
              // Toggle existing panel
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
        // Don't handle if focus is inside any tab group (toolbar, menubar, track header, etc.)
        // These containers handle their own arrow key navigation.
        const target = e.target as HTMLElement;
        if (target.closest('[role="toolbar"], [role="group"], [role="menubar"]')) {
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
        const activeElement = document.activeElement as HTMLElement;

        // Only handle if focus is on body, canvas, label, or clip header (for time selection shortcuts)
        // Labels need Shift+Arrow and Cmd+Shift+Arrow to work for time selection extend/reduce
        // Clip headers should allow arrow keys to pass through for playhead movement
        const isLabelFocused = activeElement?.classList.contains('label-wrapper');
        const isClipHeaderFocused = activeElement?.getAttribute('role') === 'button' &&
                                    activeElement?.getAttribute('aria-label')?.startsWith('Clip:');
        if (activeElement && activeElement !== document.body && activeElement.tagName !== 'CANVAS' && !isLabelFocused && !isClipHeaderFocused) {
          return; // Let the focused element handle arrow keys
        }

        const moveAmount = 0.1; // Move by 0.1 seconds

        // Handle time selection manipulation with Shift or Cmd+Shift (only if selection exists)
        if (state.timeSelection && (e.shiftKey || e.metaKey)) {
          e.preventDefault();

          // Initialize ref with current selection if not set
          if (!selectionEdgesRef.current) {
            selectionEdgesRef.current = {
              startTime: state.timeSelection.startTime,
              endTime: state.timeSelection.endTime,
            };
          }

          if (e.shiftKey && e.metaKey) {
          // REDUCE mode (Cmd+Shift): Trim inward
          if (e.key === 'ArrowLeft') {
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
        } else if (e.shiftKey) {
          // EXTEND mode (Shift): Expand outward
          if (e.key === 'ArrowLeft') {
            // Shift+Left: Move LEFT edge LEFT (expand leftward)
            const newStartTime = Math.max(0, selectionEdgesRef.current.startTime - moveAmount);
            selectionEdgesRef.current.startTime = newStartTime;
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: newStartTime,
                endTime: selectionEdgesRef.current.endTime,
              },
            });
          } else {
            // Shift+Right: Move RIGHT edge RIGHT (expand rightward)
            const newEndTime = selectionEdgesRef.current.endTime + moveAmount;
            selectionEdgesRef.current.endTime = newEndTime;
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: selectionEdgesRef.current.startTime,
                endTime: newEndTime,
              },
            });
          }
        }
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
                              hasRole === 'group'; // Track headers handle their own Enter key

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

          // Check if the focused track is already selected
          const isSelected = state.selectedTrackIndices.includes(state.focusedTrackIndex);

          if (isSelected) {
            // Remove from selection
            const newSelection = state.selectedTrackIndices.filter(idx => idx !== state.focusedTrackIndex);
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
          } else {
            // Add to selection
            const newSelection = [...state.selectedTrackIndices, state.focusedTrackIndex];
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
          }
        }
        return;
      }

      // Move playhead with comma and period keys for larger jumps (or create time selection with Shift)
      // Note: When shift is held, browser sends '<' for shift+comma and '>' for shift+period
      if (e.key === ',' || e.key === '.' || e.key === '<' || e.key === '>') {
        e.preventDefault();
        const moveAmount = 1.0; // Move by 1 second (larger jumps than arrow keys)
        // Handle both , and < (shift+comma), . and > (shift+period)
        const delta = (e.key === '.' || e.key === '>') ? moveAmount : -moveAmount;

        if (e.shiftKey || e.key === '<' || e.key === '>') {
          // Create or extend time selection
          const newPlayheadPosition = Math.max(0, state.playheadPosition + delta);

          if (selectionAnchorRef.current === null) {
            // Start a new selection - set anchor to current playhead position
            selectionAnchorRef.current = state.playheadPosition;

            // Deselect all clips when making a time selection
            dispatch({ type: 'DESELECT_ALL_CLIPS' });

            // Auto-select all tracks when creating a new time selection
            if (state.selectedTrackIndices.length === 0 && state.tracks.length > 0) {
              const allTrackIndices = state.tracks.map((_, idx) => idx);
              dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
            }
          }

          // Create selection between anchor and new playhead position
          const newSelection = {
            startTime: Math.min(selectionAnchorRef.current, newPlayheadPosition),
            endTime: Math.max(selectionAnchorRef.current, newPlayheadPosition),
          };
          dispatch({
            type: 'SET_TIME_SELECTION',
            payload: newSelection,
          });

          // Always update playhead position
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPlayheadPosition });
          scrollPlayheadIntoView();
        } else {
          // Normal playhead movement (no shift) - clear the selection anchor
          selectionAnchorRef.current = null;
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

          toast.success(`Deleted ${(endTime - startTime).toFixed(2)}s from timeline`);
        } else {
          toast.warning('No time selection - create a time selection first (Shift+, and Shift+. or Shift+click and drag)');
        }
        return;
      }

      // Copy selected clips or time selection (Cmd+C / Ctrl+C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();

        // Priority 1: Copy time selection if it exists
        if (state.timeSelection) {
          const { startTime, endTime } = state.timeSelection;

          // Collect all clips that intersect with the time selection
          const clipsInSelection: any[] = [];
          state.tracks.forEach((track, trackIndex) => {
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
            const duration = (endTime - startTime).toFixed(2);
            toast.success(`Copied ${duration}s of audio from ${clipsInSelection.length} clip${clipsInSelection.length > 1 ? 's' : ''}`);
          } else {
            toast.warning('No audio in time selection');
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
          toast.success(`Copied ${selectedClips.length} clip${selectedClips.length > 1 ? 's' : ''}`);
        } else {
          toast.warning('No selection to copy');
        }
        return;
      }

      // Cut selected clips (Cmd+X / Ctrl+X)
      if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        e.preventDefault();

        // Find all selected clips across all tracks
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
          toast.success(`Cut ${selectedClips.length} clip${selectedClips.length > 1 ? 's' : ''}`);
        }
        return;
      }

      // Paste clips (Cmd+V / Ctrl+V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();

        if (!clipboard || clipboard.clips.length === 0) {
          toast.warning('Nothing to paste');
          return;
        }

        // Paste at playhead position on the focused track
        const targetTrackIndex = state.focusedTrackIndex ?? 0;
        if (targetTrackIndex < 0 || targetTrackIndex >= state.tracks.length) {
          toast.error('No valid track to paste to');
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
              },
              destTrackIndex,
            };
          })
          .filter((item): item is { clip: any; destTrackIndex: number } => item !== null);

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

        // Note: Clipboard is NOT cleared after paste, allowing multiple pastes for both cut and copy
        const totalPasted = newClipsWithTracks.length;
        const tracksAffected = clipsByTrack.size;
        const message = tracksAffected > 1
          ? `Pasted ${totalPasted} clip${totalPasted > 1 ? 's' : ''} across ${tracksAffected} tracks`
          : `Pasted ${totalPasted} clip${totalPasted > 1 ? 's' : ''}`;
        toast.success(message);
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

            const cutModeLabel = state.cutMode === 'split' ? 'Split cut' : 'Ripple cut';
            toast.success(`${cutModeLabel}: Deleted label(s) and ${(endTime - startTime).toFixed(2)}s from timeline`);
          } else {
            // Clear time selection even when not deleting time
            dispatch({ type: 'SET_TIME_SELECTION', payload: null });
            // Clear selection anchor so next Shift+. starts fresh
            selectionAnchorRef.current = null;
            selectionEdgesRef.current = null;
            toast.info(`Deleted ${state.selectedLabelIds.length} label(s)`);
          }
          return;
        }

        // Priority 2: If there's a time selection, perform cut operation (BEFORE checking clips)
        if (state.timeSelection) {

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

          const cutModeLabel = state.cutMode === 'split' ? 'Split cut' : 'Ripple cut';
          toast.success(`${cutModeLabel}: Deleted ${(endTime - startTime).toFixed(2)}s from timeline`);
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

        // Add all selected clips
        state.tracks.forEach((track, trackIndex) => {
          track.clips.forEach((clip) => {
            if (clip.selected) {
              // Avoid duplicates (if focused clip is also selected)
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
            const deletedClip = track.clips.find(c => c.id === focusedClipInfo.clipId);

            if (deletedClip) {
              focusTrackIndex = focusedClipInfo.trackIndex;

              // Find nearest remaining clip by start time
              const remainingClips = track.clips.filter(
                c => !clipsToDelete.some(item => item.clipId === c.id && item.trackIndex === focusedClipInfo.trackIndex)
              );

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
                    const otherRemaining = state.tracks[ti].clips.filter(
                      c => !clipsToDelete.some(item => item.clipId === c.id && item.trackIndex === ti)
                    );
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
            track.clips.some(clip => clip.selected)
          );

          if (!anyClipsSelected) {
            const count = state.selectedTrackIndices.length;
            dispatch({
              type: 'DELETE_TRACKS',
              payload: state.selectedTrackIndices,
            });
            toast.info(`${count} track${count > 1 ? 's' : ''} deleted`);
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
  ]);
}

import React from 'react';
import { TracksProvider } from './contexts/TracksContext';
import { Canvas } from './components/Canvas';
import { ApplicationHeader, OperatingSystem, ProjectToolbar, GhostButton, ToolbarGroup, Toolbar, ToolbarButtonGroup, ToolbarDivider, TransportButton, ToolButton, ToggleToolButton, TrackControlSidePanel, TrackControlPanel, TimelineRuler, PlayheadCursor, TimeCode, TimeCodeFormat, ToastContainer, toast, SelectionToolbar, Dialog, DialogFooter, SignInActionBar, LabeledInput, SocialSignInButton, LabeledFormDivider, TextLink, Button, LabeledCheckbox, MenuItem, SaveProjectModal, HomeTab, PreferencesModal, AccessibilityProfileProvider, PreferencesProvider, useAccessibilityProfile, ClipContextMenu, TrackContextMenu, TrackType, WelcomeDialog, useWelcomeDialog, SwipeyDots } from '@audacity-ui/components';
import { useTracks } from './contexts/TracksContext';
import { DebugPanel } from './components/DebugPanel';
import { getAudioPlaybackManager } from '@audacity-ui/audio';

// Generate realistic waveform data
function generateWaveform(durationSeconds: number, samplesPerSecond: number = 100): number[] {
  const totalSamples = Math.floor(durationSeconds * samplesPerSecond);
  const waveform: number[] = [];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / samplesPerSecond;
    // Combine multiple frequencies for a more realistic waveform
    const wave1 = Math.sin(2 * Math.PI * 2 * t) * 0.3;  // Low frequency
    const wave2 = Math.sin(2 * Math.PI * 5 * t) * 0.2;  // Mid frequency
    const wave3 = Math.sin(2 * Math.PI * 10 * t) * 0.1; // Higher frequency
    // Add some randomness for noise
    const noise = (Math.random() - 0.5) * 0.1;
    // Envelope for more natural fade in/out
    const envelope = Math.sin((i / totalSamples) * Math.PI) * 0.8 + 0.2;

    waveform.push((wave1 + wave2 + wave3 + noise) * envelope);
  }

  return waveform;
}

// Sample track data
const sampleTracks = [
  {
    id: 1,
    name: 'Track 1',
    height: 114,
    channelSplitRatio: 0.5,
    clips: [
      {
        id: 1,
        name: 'Vocal Take 1',
        start: 0.5,
        duration: 4.0,
        waveform: generateWaveform(4.0),
        envelopePoints: [],
      },
      {
        id: 2,
        name: 'Vocal Take 2',
        start: 5.0,
        duration: 3.5,
        waveform: generateWaveform(3.5),
        envelopePoints: [],
      },
    ],
  },
  {
    id: 2,
    name: 'Track 2',
    height: 114,
    channelSplitRatio: 0.5,
    clips: [
      {
        id: 3,
        name: 'Guitar',
        start: 2.0,
        duration: 6.0,
        waveform: generateWaveform(6.0),
        envelopePoints: [],
      },
    ],
  },
  {
    id: 3,
    name: 'Track 3',
    height: 114,
    channelSplitRatio: 0.5,
    clips: [
      {
        id: 4,
        name: 'Drums',
        start: 1.0,
        duration: 3.0,
        waveform: generateWaveform(3.0),
        envelopePoints: [],
      },
      {
        id: 5,
        name: 'Percussion',
        start: 5.5,
        duration: 1.5,
        waveform: generateWaveform(1.5),
        envelopePoints: [],
      },
    ],
  },
  {
    id: 4,
    name: 'Track 4 (Stereo)',
    height: 114,
    channelSplitRatio: 0.5,
    clips: [
      {
        id: 6,
        name: 'Synth Pad',
        start: 1.5,
        duration: 5.0,
        waveformLeft: generateWaveform(5.0),
        waveformRight: generateWaveform(5.0),
        envelopePoints: [],
      },
    ],
  },
  {
    id: 5,
    name: 'Label Track',
    height: 76, // Natural height for label track panel (header + button + padding)
    clips: [],
    labels: [
      {
        id: 1,
        text: 'Intro',
        time: 0.5,
      },
      {
        id: 2,
        text: 'Verse 1',
        time: 2.0,
        endTime: 4.5,
      },
      {
        id: 3,
        text: 'Chorus',
        time: 5.5,
        endTime: 7.0,
      },
    ],
  },
];

type Workspace = 'classic' | 'spectral-editing';

function CanvasDemoContent() {
  const { state, dispatch } = useTracks();
  const { activeProfile, profiles, setProfile } = useAccessibilityProfile();
  const isFlatNavigation = activeProfile.config.tabNavigation === 'sequential';
  const [scrollX, setScrollX] = React.useState(0);
  const welcomeDialog = useWelcomeDialog();
  const [activeMenuItem, setActiveMenuItem] = React.useState<'home' | 'project' | 'export' | 'debug'>('project');
  const [workspace, setWorkspace] = React.useState<Workspace>('classic');
  const [timeCodeFormat, setTimeCodeFormat] = React.useState<TimeCodeFormat>('hh:mm:ss');
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = React.useState(false);
  const [isSyncingDialogOpen, setIsSyncingDialogOpen] = React.useState(false);
  const [isCloudProject, setIsCloudProject] = React.useState(false);
  const [projectName, setProjectName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [emailError, setEmailError] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = React.useState('');
  const [dontShowSyncAgain, setDontShowSyncAgain] = React.useState(false);
  const [isSaveProjectModalOpen, setIsSaveProjectModalOpen] = React.useState(false);
  const [dontShowSaveModalAgain, setDontShowSaveModalAgain] = React.useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = React.useState(false);

  // Debug panel state
  const [isDebugPanelOpen, setIsDebugPanelOpen] = React.useState(false);
  const [isCloudUploading, setIsCloudUploading] = React.useState(false);
  const [showDuration, setShowDuration] = React.useState(false);
  const [showProjectRate, setShowProjectRate] = React.useState(false);
  const [operatingSystem, setOperatingSystem] = React.useState<OperatingSystem>('windows');
  const [debugTrackCount, setDebugTrackCount] = React.useState(4);
  const [showFocusDebug, setShowFocusDebug] = React.useState(false);
  const [focusedElement, setFocusedElement] = React.useState<string>('None');

  // Clip context menu state
  const [clipContextMenu, setClipContextMenu] = React.useState<{
    isOpen: boolean;
    x: number;
    y: number;
    clipId: number;
    trackIndex: number;
    openedViaKeyboard?: boolean;
  } | null>(null);

  // Track context menu state
  const [trackContextMenu, setTrackContextMenu] = React.useState<{
    isOpen: boolean;
    x: number;
    y: number;
    trackIndex: number;
    openedViaKeyboard?: boolean;
  } | null>(null);

  // Track keyboard focus state - only one track can have keyboard focus at a time
  const [keyboardFocusedTrack, setKeyboardFocusedTrack] = React.useState<number | null>(null);

  // Track whether the control panel specifically has focus (for the inset outline)
  const [controlPanelHasFocus, setControlPanelHasFocus] = React.useState<number | null>(null);

  // Track canvas height for playhead stalk
  const [canvasHeight, setCanvasHeight] = React.useState(1000);

  // Track mouse cursor position in timeline (in seconds)
  const [mouseCursorPosition, setMouseCursorPosition] = React.useState<number | undefined>(undefined);

  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const timelineRulerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const trackHeaderScrollRef = React.useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = React.useRef(false);

  // Audio playback state
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioManagerRef = React.useRef(getAudioPlaybackManager());

  // Track the anchor point for time selection (the fixed end while extending)
  const selectionAnchorRef = React.useRef<number | null>(null);

  // Track the current selection edges for rapid arrow key updates
  const selectionEdgesRef = React.useRef<{ startTime: number; endTime: number } | null>(null);

  // Sync playhead position with TimeCode display
  const currentTime = state.playheadPosition;

  // Initialize audio playback manager
  React.useEffect(() => {
    const audioManager = audioManagerRef.current;

    // Initialize Tone.js
    audioManager.initialize();

    // Set up position update callback to sync playhead with audio
    audioManager.setPositionUpdateCallback((position) => {
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: position });
    });

    // Cleanup on unmount
    return () => {
      audioManager.cleanup();
    };
  }, [dispatch]);

  // Handle play/pause transport controls
  const handlePlay = async () => {
    const audioManager = audioManagerRef.current;

    // Use audio manager's state as source of truth, not React state
    if (audioManager.getIsPlaying()) {
      audioManager.pause();
      setIsPlaying(false);
    } else {
      // Always load clips to ensure we're playing from the correct position
      // This handles:
      // - First play
      // - Resume after stop
      // - Resume after pause with position change (via , or .)
      audioManager.loadClips(state.tracks, state.playheadPosition);

      // Start playback from current playhead position
      await audioManager.play(state.playheadPosition);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    const audioManager = audioManagerRef.current;
    audioManager.stop();
    setIsPlaying(false);
  };

  // Focus and select first track on initial load if there are tracks
  React.useEffect(() => {
    if (state.tracks.length > 0 && keyboardFocusedTrack === null) {
      setKeyboardFocusedTrack(0);
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [0] });
    }
  }, []); // Only run on mount

  // Track focused element for accessibility debugging
  React.useEffect(() => {
    if (!showFocusDebug) return;

    const handleFocusChange = () => {
      const activeEl = document.activeElement;
      if (!activeEl || activeEl === document.body) {
        setFocusedElement('None');
        return;
      }

      // Build a descriptive label for the focused element
      const tagName = activeEl.tagName.toLowerCase();
      const ariaLabel = activeEl.getAttribute('aria-label');
      const label = activeEl.getAttribute('label');
      const id = activeEl.id;
      const className = activeEl.className;
      const textContent = activeEl.textContent?.trim().slice(0, 30);

      let description = `<${tagName}>`;
      if (ariaLabel) {
        description = `${ariaLabel} (${tagName})`;
      } else if (label) {
        description = `${label} (${tagName})`;
      } else if (id) {
        description = `#${id} (${tagName})`;
      } else if (textContent && textContent.length > 0 && textContent.length < 30) {
        description = `"${textContent}" (${tagName})`;
      } else if (className) {
        const firstClass = className.split(' ')[0];
        description = `.${firstClass} (${tagName})`;
      }

      setFocusedElement(description);
    };

    // Track focus changes
    document.addEventListener('focusin', handleFocusChange);
    handleFocusChange(); // Initial call

    return () => {
      document.removeEventListener('focusin', handleFocusChange);
    };
  }, [showFocusDebug]);

  // Keyboard handler for deleting selected clips and focused tracks, and moving playhead
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      // Spacebar for play/pause (unless on an interactive element that uses spacebar)
      if (e.key === ' ') {
        const target = e.target as HTMLElement;
        const interactiveElements = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'];
        const hasRole = target.getAttribute('role');
        const isInteractive = interactiveElements.includes(target.tagName) ||
                              hasRole === 'button' ||
                              hasRole === 'checkbox' ||
                              hasRole === 'menuitem' ||
                              hasRole === 'menuitemcheckbox' ||
                              hasRole === 'menuitemradio';

        if (!isInteractive) {
          e.preventDefault(); // Prevent page scroll
          handlePlay();
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
      // Only if we're NOT in tab navigation mode (no button/input has focus)
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const activeElement = document.activeElement as HTMLElement;

        // Only handle if focus is on body or canvas - not on any interactive element
        // This prevents arrow keys from moving track focus during tab navigation
        if (activeElement && activeElement !== document.body && activeElement.tagName !== 'CANVAS') {
          return; // Let the focused element handle arrow keys
        }

        e.preventDefault();

        // If there's a focused track, move focus up or down
        if (keyboardFocusedTrack !== null) {
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          const newIndex = keyboardFocusedTrack + delta;

          // Clamp to valid track indices
          if (newIndex >= 0 && newIndex < state.tracks.length) {
            setKeyboardFocusedTrack(newIndex);
            dispatch({ type: 'SET_FOCUSED_TRACK', payload: newIndex });
            // Don't change selection - focus moves independently
            // User must press Enter to select the focused track
          }
        } else if (state.tracks.length > 0) {
          // If no track is focused, focus the first track
          setKeyboardFocusedTrack(0);
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
          // Don't change selection - focus moves independently
        }
        return;
      }

      // Left/Right arrow keys for playhead movement and time selection manipulation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const activeElement = document.activeElement as HTMLElement;

        // Only handle if focus is on body, canvas, or label (for time selection shortcuts)
        // Labels need Shift+Arrow and Cmd+Shift+Arrow to work for time selection extend/reduce
        const isLabelFocused = activeElement?.classList.contains('label-wrapper');
        if (activeElement && activeElement !== document.body && activeElement.tagName !== 'CANVAS' && !isLabelFocused) {
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

      // Toggle track selection with Enter key
      if (e.key === 'Enter') {
        const activeElement = document.activeElement as HTMLElement;

        // Only handle if focus is on body or canvas - not on any interactive element
        if (activeElement && activeElement !== document.body && activeElement.tagName !== 'CANVAS') {
          return; // Let the focused element handle Enter
        }

        if (keyboardFocusedTrack !== null) {
          e.preventDefault();

          // Check if the focused track is already selected
          const isSelected = state.selectedTrackIndices.includes(keyboardFocusedTrack);

          if (isSelected) {
            // Remove from selection
            const newSelection = state.selectedTrackIndices.filter(idx => idx !== keyboardFocusedTrack);
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
          } else {
            // Add to selection
            const newSelection = [...state.selectedTrackIndices, keyboardFocusedTrack];
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
        } else {
          // Normal playhead movement (no shift) - clear the selection anchor
          selectionAnchorRef.current = null;
          const newPosition = Math.max(0, state.playheadPosition + delta);
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPosition });
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
              const track = state.tracks[trackIndex];

              if (track && track.labels) {
                // Filter out:
                // 1. The selected label itself
                // 2. Any point labels that fall within the time range
                const updatedLabels = track.labels.filter(l => {
                  // Keep if it's not the selected label
                  if (l.id === parseInt(labelIdStr, 10)) return false;

                  // If it's a point label and falls within the time range, remove it
                  if (l.endTime === undefined && l.time >= startTime && l.time <= endTime) {
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

            toast.success(`Deleted label(s) and ${(endTime - startTime).toFixed(2)}s from timeline`);
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

        // Priority 2: If there are any selected clips, delete them
        const hasSelectedClips = state.tracks.some(track =>
          track.clips.some(clip => clip.selected)
        );

        if (hasSelectedClips) {
          // Delete all selected clips
          state.tracks.forEach((track, trackIndex) => {
            track.clips.forEach((clip) => {
              if (clip.selected) {
                dispatch({
                  type: 'DELETE_CLIP',
                  payload: { trackIndex, clipId: clip.id },
                });
              }
            });
          });
          return;
        }

        // Priority 3: If there's a time selection, perform cut operation
        if (state.timeSelection) {
          const { startTime, endTime } = state.timeSelection;
          const deletionDuration = endTime - startTime;

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

          // Adjust playhead position based on cut mode
          if (state.cutMode === 'ripple' && state.playheadPosition > startTime) {
            // In ripple mode, if playhead is after the deletion, shift it left
            const newPlayheadPosition = Math.max(startTime, state.playheadPosition - deletionDuration);
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPlayheadPosition });
          }

          toast.success(`Deleted ${(endTime - startTime).toFixed(2)}s from timeline`);
          return;
        }

        // Priority 4: If there's a focused track (and no labels/clips/time selected), delete the track
        // Only delete the track if it was selected via the track header (not via clip selection)
        if (state.focusedTrackIndex !== null && state.focusedTrackIndex >= 0) {
          // Double-check no clips are selected in any track
          const anyClipsSelected = state.tracks.some(track =>
            track.clips.some(clip => clip.selected)
          );

          if (!anyClipsSelected) {
            dispatch({
              type: 'DELETE_TRACK',
              payload: state.focusedTrackIndex,
            });
            toast.info('Track deleted');
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
    keyboardFocusedTrack,
    controlPanelHasFocus,
    dispatch,
    isFlatNavigation
  ]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const scrollTop = e.currentTarget.scrollTop;
    setScrollX(scrollLeft);

    // Sync vertical scroll with track headers
    if (trackHeaderScrollRef.current && !isScrollingSyncRef.current) {
      isScrollingSyncRef.current = true;
      trackHeaderScrollRef.current.scrollTop = scrollTop;
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false;
      });
    }
  };

  const handleTrackHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;

    // Sync vertical scroll with canvas
    if (scrollContainerRef.current && !isScrollingSyncRef.current) {
      isScrollingSyncRef.current = true;
      scrollContainerRef.current.scrollTop = scrollTop;
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false;
      });
    }
  };

  const handleToggleEnvelope = () => {
    dispatch({ type: 'SET_ENVELOPE_MODE', payload: !state.envelopeMode });
  };

  const handleToggleSpectrogram = () => {
    const newSpectrogramMode = !state.spectrogramMode;
    dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: newSpectrogramMode });

    // Toggle all tracks between waveform and spectrogram
    state.tracks.forEach((_, index) => {
      dispatch({
        type: 'UPDATE_TRACK_VIEW',
        payload: { index, viewMode: newSpectrogramMode ? 'spectrogram' : 'waveform' }
      });
    });
  };

  // Calculate the effective time selection for the ruler
  // If spectral selection is full-height, show it as a time selection in the ruler
  const rulerTimeSelection = React.useMemo(() => {
    if (state.spectralSelection) {
      const { minFrequency, maxFrequency, startTime, endTime, trackIndex } = state.spectralSelection;

      // Check if it's a stereo track
      const track = state.tracks[trackIndex];
      const clip = track?.clips.find(c => c.id === state.spectralSelection?.clipId);
      const isStereo = clip && (clip as any).waveformLeft && (clip as any).waveformRight;
      const isSpectrogramMode = track?.viewMode === 'spectrogram';

      // Full-height spectral selection cases:
      // 1. Mono/split: full range 0-1
      // 2. Stereo spectrogram: full L channel (0.5-1) or full R channel (0-0.5)
      const isFullHeight = (minFrequency === 0 && maxFrequency === 1) ||
                           (isSpectrogramMode && isStereo && minFrequency === 0.5 && maxFrequency === 1.0) ||
                           (isSpectrogramMode && isStereo && minFrequency === 0.0 && maxFrequency === 0.5);

      if (isFullHeight) {
        return { startTime, endTime };
      }
    }
    // Otherwise show regular time selection
    return state.timeSelection;
  }, [state.spectralSelection, state.timeSelection, state.tracks]);

  // Define menu items for File menu
  const fileMenuItems: MenuItem[] = [
    {
      label: 'Save Project',
      shortcut: 'Ctrl+S',
      onClick: () => {
        // If it's already a cloud project, show syncing toast
        if (isCloudProject) {
          const syncToastId = toast.syncing('Syncing to audio.com...');

          // Simulate syncing progress over 3 seconds
          const totalDuration = 3000;
          const updateInterval = 100;
          let progress = 0;
          const startTime = Date.now();

          const interval = setInterval(() => {
            progress = Math.min(100, Math.floor((Date.now() - startTime) / totalDuration * 100));
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, totalDuration - elapsed);
            const secondsRemaining = Math.ceil(remaining / 1000);
            const timeRemainingText = secondsRemaining === 1
              ? '1 second remaining'
              : `${secondsRemaining} seconds remaining`;

            toast.updateProgress(syncToastId, progress, timeRemainingText);

            if (progress >= 100) {
              clearInterval(interval);
              setTimeout(() => {
                toast.dismiss(syncToastId);
              }, 200);
            }
          }, updateInterval);
        } else {
          // Show the save project modal for non-cloud projects
          setIsSaveProjectModalOpen(true);
        }
      }
    },
  ];

  // Define menu items for Edit menu
  const editMenuItems: MenuItem[] = [
    {
      label: 'Preferences',
      shortcut: 'Ctrl+,',
      onClick: () => {
        setIsPreferencesModalOpen(true);
      }
    },
  ];

  // Define menu items for Generate menu
  const generateMenuItems: MenuItem[] = [
    {
      label: 'Tone...',
      onClick: async () => {
        // Check if a track is selected
        if (state.selectedTrackIndices.length === 0) {
          toast.error('Please select a track first');
          return;
        }

        // Generate a 4-second tone on the selected track(s)
        const audioManager = audioManagerRef.current;

        for (const trackIndex of state.selectedTrackIndices) {
          // Generate a tone using Tone.js and create a clip
          const newClipId = Date.now() + trackIndex;
          const duration = 4.0; // 4 seconds
          const startTime = state.playheadPosition;

          // Generate actual audio using Tone.js
          const { buffer, waveformData } = await audioManager.generateTone(duration, 440, 'sine');

          // Store the audio buffer for playback
          audioManager.addClipBuffer(newClipId, buffer);

          const newClip = {
            id: newClipId,
            name: 'Tone',
            start: startTime,
            duration: duration,
            waveform: waveformData,
            envelopePoints: [],
          };

          // Add clip to track
          dispatch({
            type: 'ADD_CLIP',
            payload: { trackIndex, clip: newClip },
          });
        }

        // Reload clips for playback
        audioManager.loadClips(state.tracks);

        toast.success('Generated 4-second tone');
      }
    },
  ];

  const menuDefinitions = {
    File: fileMenuItems,
    Edit: editMenuItems,
    Generate: generateMenuItems,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <ApplicationHeader
        os={operatingSystem}
        menuDefinitions={menuDefinitions}
      />
      <ProjectToolbar
        activeItem={activeMenuItem}
        onMenuItemClick={(item) => {
          setActiveMenuItem(item);
          if (item === 'debug') {
            setIsDebugPanelOpen(true);
          }
        }}
        showDebugMenu={true}
        centerContent={
          <ToolbarGroup ariaLabel="Toolbar options" startTabIndex={3}>
            <GhostButton icon="mixer" label="Mixer" />
            <GhostButton icon="cog" label="Audio setup" />
            <GhostButton
              icon="cloud"
              label="Share audio"
              onClick={() => setIsShareDialogOpen(true)}
            />
          </ToolbarGroup>
        }
        rightContent={
          <>
            <span style={{ fontSize: '13px', color: '#3d3e42', marginRight: '8px' }}>Workspace</span>
            <ToolbarGroup ariaLabel="Workspace controls" startTabIndex={4}>
              <select
                style={{ fontSize: '13px', padding: '4px 8px', border: '1px solid #d4d5d9', borderRadius: '4px', backgroundColor: '#fff' }}
                value={workspace}
                onChange={(e) => {
                  const newWorkspace = e.target.value as Workspace;
                  setWorkspace(newWorkspace);

                  // When switching to spectral editing, enable spectrogram mode
                  if (newWorkspace === 'spectral-editing') {
                    // SET_SPECTROGRAM_MODE will save current viewModes and set all tracks to spectrogram
                    dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: true });
                  } else if (newWorkspace === 'classic') {
                    // When switching back to classic, disable spectrogram mode
                    // This will restore tracks to their saved viewModes from before spectral mode
                    dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: false });
                  }
                }}
                onKeyDown={(e) => {
                  // On Enter, trigger the select to show options (workaround for browsers where Enter doesn't open dropdown)
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLSelectElement;
                    // Show picker is a modern API to programmatically open the dropdown
                    if ('showPicker' in target) {
                      try {
                        (target as any).showPicker();
                      } catch (err) {
                        // showPicker() might fail in some contexts, fallback to native behavior
                      }
                    }
                  }
                }}
              >
                <option value="classic">Classic</option>
                <option value="spectral-editing">Spectral editing</option>
              </select>
              <GhostButton icon="undo" />
              <GhostButton icon="redo" />
            </ToolbarGroup>
          </>
        }
      />
      {activeMenuItem !== 'home' && (
        <Toolbar startTabIndex={5}>
          {/* Transport controls - shown in all workspaces */}
          <ToolbarButtonGroup gap={2}>
            <TransportButton icon={isPlaying ? "pause" : "play"} onClick={handlePlay} />
            <TransportButton icon="stop" onClick={handleStop} />
            <TransportButton icon="record" disabled={isPlaying} />
            <TransportButton icon="skip-back" disabled={isPlaying} />
            <TransportButton icon="skip-forward" disabled={isPlaying} />
            <TransportButton icon="loop" />
          </ToolbarButtonGroup>

          {workspace === 'classic' && (
            <>
              <ToolbarDivider />

              <ToolbarButtonGroup gap={2}>
                <ToggleToolButton
                  icon="automation"
                  isActive={state.envelopeMode}
                  onClick={handleToggleEnvelope}
                />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="zoom-in" />
                <ToolButton icon="zoom-out" />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton
                  icon="cut"
                  onClick={() => toast.info('Cut', 'Selected audio has been cut to clipboard', undefined, 6000)}
                />
                <ToolButton
                  icon="copy"
                  onClick={() => toast.info('Copy', 'Selected audio has been copied to clipboard', undefined, 6000)}
                />
                <ToolButton
                  icon="paste"
                  onClick={() => toast.info('Paste', 'Audio has been pasted from clipboard', undefined, 6000)}
                />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="trim" />
                <ToolButton icon="silence" />
              </ToolbarButtonGroup>
            </>
          )}

          {workspace === 'spectral-editing' && (
            <>
              <ToolbarButtonGroup gap={2}>
                <ToolButton icon="zoom-in" />
                <ToolButton icon="zoom-out" />
              </ToolbarButtonGroup>

              <ToolbarButtonGroup gap={2}>
                <ToggleToolButton
                  icon="waveform"
                  isActive={state.spectrogramMode}
                  onClick={handleToggleSpectrogram}
                />
              </ToolbarButtonGroup>
            </>
          )}

          <ToolbarDivider />

          {/* TimeCode display */}
          <ToolbarButtonGroup gap={2}>
            <TimeCode
              value={currentTime}
              format={timeCodeFormat}
              onChange={(newTime) => {
                // When user edits TimeCode, update the playhead position
                dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newTime });
              }}
              onFormatChange={setTimeCodeFormat}
            />
          </ToolbarButtonGroup>
        </Toolbar>
      )}

      {activeMenuItem === 'home' ? (
        <HomeTab
          isSignedIn={isSignedIn}
          onCreateAccount={() => setIsCreateAccountOpen(true)}
          onSignIn={() => setIsShareDialogOpen(true)}
          onNewProject={() => console.log('New project')}
          onOpenOther={() => console.log('Open other')}
        />
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Track Control Side Panel */}
          <TrackControlSidePanel
            trackHeights={state.tracks.map(t => t.height || 114)}
            trackViewModes={state.tracks.map(t => t.viewMode)}
            focusedTrackIndex={keyboardFocusedTrack}
            scrollRef={trackHeaderScrollRef}
            onScroll={handleTrackHeaderScroll}
            onTrackResize={(trackIndex, height) => {
              dispatch({ type: 'UPDATE_TRACK_HEIGHT', payload: { index: trackIndex, height } });
            }}
            onAddTrackType={(type: TrackType) => {
              const newTrack = {
                id: state.tracks.length + 1,
                name: type === 'label' ? `Label ${state.tracks.length + 1}` : `Track ${state.tracks.length + 1}`,
                height: type === 'label' ? 82 : 114,
                channelSplitRatio: 0.5,
                clips: [],
              };
              dispatch({ type: 'ADD_TRACK', payload: newTrack });
              toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} track added`);
            }}
            showMidiOption={false}
            onDeleteTrack={(trackIndex) => {
              dispatch({
                type: 'DELETE_TRACK',
                payload: trackIndex,
              });
            }}
            onMoveTrackUp={(trackIndex) => {
              console.log('Move track up:', trackIndex);
              // TODO: Implement move track up
            }}
            onMoveTrackDown={(trackIndex) => {
              console.log('Move track down:', trackIndex);
              // TODO: Implement move track down
            }}
            onTrackViewChange={(trackIndex, viewMode) => {
              dispatch({ type: 'UPDATE_TRACK_VIEW', payload: { index: trackIndex, viewMode } });
            }}
          >
            {state.tracks.map((track, index) => {
              // Determine track type from track name (temporary until we add trackType to state)
              const trackType = track.name.toLowerCase().includes('label') ? 'label' : 'mono';

              return (
                <TrackControlPanel
                  key={track.id}
                  trackName={track.name}
                  trackType={trackType}
                  volume={75}
                  pan={0}
                  isMuted={false}
                  isSolo={false}
                  isFocused={keyboardFocusedTrack === index}
                  onMuteToggle={() => {}}
                  onSoloToggle={() => {}}
                  tabIndex={isFlatNavigation ? 0 : (100 + index * 2)}
                  onFocusChange={(hasFocus) => {
                    // When control panel gets focus, set both states
                    setControlPanelHasFocus(hasFocus ? index : null);
                    setKeyboardFocusedTrack(hasFocus ? index : null);
                  }}
                  onNavigateVertical={(direction) => {
                    const nextIndex = direction === 'up' ? index - 1 : index + 1;
                    if (nextIndex >= 0 && nextIndex < state.tracks.length) {
                      // Find the next/previous track control panel and focus it
                      const panels = document.querySelectorAll('[aria-label*="track controls"]');
                      if (panels[nextIndex]) {
                        (panels[nextIndex] as HTMLElement).focus();
                      }
                    }
                  }}
                  onAddLabelClick={() => {
                    // Generate a unique label ID across all tracks
                    const allLabels = state.tracks.flatMap(t => t.labels || []);
                    const nextLabelId = allLabels.length > 0
                      ? Math.max(...allLabels.map(l => l.id)) + 1
                      : 1;

                    const newLabel = {
                      id: nextLabelId,
                      text: '',
                      time: state.playheadPosition,
                    };

                    dispatch({
                      type: 'ADD_LABEL',
                      payload: { trackIndex: index, label: newLabel }
                    });
                    toast.success('Label added at playhead');
                  }}
                  onMenuClick={(e) => {
                    const button = e.currentTarget;
                    const rect = button.getBoundingClientRect();
                    setTrackContextMenu({
                      isOpen: true,
                      x: rect.right - 20,
                      y: rect.top + 10,
                      trackIndex: index,
                      openedViaKeyboard: true, // Always true since this is triggered by Shift+F10
                    });
                  }}
                  state={state.selectedTrackIndices.includes(index) ? 'active' : 'idle'}
                  height="default"
                  onClick={() => {
                    dispatch({ type: 'SELECT_TRACK', payload: index });
                    setKeyboardFocusedTrack(index);
                  }}
                  onToggleSelection={() => {
                    // Toggle track selection: add if not selected, remove if already selected
                    const isSelected = state.selectedTrackIndices.includes(index);
                    if (isSelected) {
                      // Remove from selection
                      const newSelection = state.selectedTrackIndices.filter(i => i !== index);
                      dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                    } else {
                      // Add to selection
                      const newSelection = [...state.selectedTrackIndices, index];
                      dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                    }
                  }}
                  onTabOut={() => {
                    // Find the first clip in THIS track specifically
                    const trackElement = document.querySelector(`[data-track-index="${index}"]`);
                    if (trackElement) {
                      const firstClip = trackElement.querySelector(`[data-first-clip="true"]`) as HTMLElement;
                      if (firstClip) {
                        firstClip.focus();
                      }
                    }
                  }}
                />
              );
            })}
          </TrackControlSidePanel>

          {/* Timeline Ruler + Canvas Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Timeline Ruler - Fixed at top */}
            <div
              ref={canvasContainerRef}
              style={{ position: 'relative', backgroundColor: '#1a1b26', flexShrink: 0, overflow: 'hidden' }}
            >
              <div
                ref={timelineRulerRef}
                style={{ transform: `translateX(-${scrollX}px)`, width: '5000px', position: 'relative' }}
                onMouseMove={(e) => {
                  if (timelineRulerRef.current) {
                    const rect = timelineRulerRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const CLIP_CONTENT_OFFSET = 12; // Match the constant from components
                    const timePosition = (x - CLIP_CONTENT_OFFSET) / 100; // 100 = pixelsPerSecond
                    setMouseCursorPosition(timePosition >= 0 ? timePosition : undefined);
                  }
                }}
                onMouseLeave={() => {
                  setMouseCursorPosition(undefined);
                }}
              >
                <TimelineRuler
                  pixelsPerSecond={100}
                  scrollX={0}
                  totalDuration={50}
                  width={5000}
                  height={40}
                  timeSelection={rulerTimeSelection}
                  spectralSelection={state.spectralSelection}
                  selectionColor="rgba(112, 181, 255, 0.5)"
                  cursorPosition={mouseCursorPosition}
                />
                {/* Playhead icon only in ruler */}
                <PlayheadCursor
                  position={state.playheadPosition}
                  pixelsPerSecond={100}
                  height={0}
                  showTopIcon={true}
                  iconTopOffset={24}
                  onPositionChange={(newPosition) => {
                    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPosition });
                  }}
                  minPosition={0} // Allow playhead stalk to touch the 12px gap area
                />
              </div>
            </div>

            {/* Canvas - Scrollable (both directions) */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{ flex: 1, overflowX: 'scroll', overflowY: 'auto', backgroundColor: '#212433', cursor: 'text' }}
              onMouseMove={(e) => {
                if (scrollContainerRef.current) {
                  const rect = scrollContainerRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left + scrollX;
                  const CLIP_CONTENT_OFFSET = 12;
                  const timePosition = (x - CLIP_CONTENT_OFFSET) / 100;
                  setMouseCursorPosition(timePosition >= 0 ? timePosition : undefined);
                }
              }}
              onMouseLeave={() => {
                setMouseCursorPosition(undefined);
              }}
            >
              <div style={{ minWidth: '5000px', minHeight: `${canvasHeight}px`, position: 'relative', cursor: 'text' }}>
                <Canvas
                  pixelsPerSecond={100}
                  width={5000}
                  leftPadding={12}
                  keyboardFocusedTrack={keyboardFocusedTrack}
                  onClipMenuClick={(clipId, trackIndex, x, y, openedViaKeyboard) => {
                    setClipContextMenu({ isOpen: true, x, y, clipId, trackIndex, openedViaKeyboard });
                  }}
                  onTrackFocusChange={(trackIndex, hasFocus) => {
                    setKeyboardFocusedTrack(hasFocus ? trackIndex : null);
                    setControlPanelHasFocus(null);
                  }}
                  onHeightChange={setCanvasHeight}
                />
                {/* Playhead stalk only (no icon) - extends to fill scrollable area */}
                <PlayheadCursor
                  position={state.playheadPosition}
                  pixelsPerSecond={100}
                  height={Math.max(canvasHeight, scrollContainerRef.current?.clientHeight || 1000)}
                  showTopIcon={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Toolbar - Hidden in Home view */}
      {activeMenuItem !== 'home' && (
        <SelectionToolbar
          selectionStart={state.timeSelection?.startTime ?? null}
          selectionEnd={state.timeSelection?.endTime ?? null}
          format={timeCodeFormat}
          showCloudIndicator={isCloudProject || isCloudUploading}
          isCloudUploading={isCloudUploading}
          showDuration={showDuration}
          status={showFocusDebug ? 'Focused element' : undefined}
          instructionText={showFocusDebug ? focusedElement : undefined}
          onFormatChange={setTimeCodeFormat}
          onSelectionStartChange={(newStart) => {
            if (state.timeSelection) {
              dispatch({
                type: 'SET_TIME_SELECTION',
                payload: { ...state.timeSelection, startTime: newStart }
              });
            }
          }}
          onSelectionEndChange={(newEnd) => {
            if (state.timeSelection) {
              dispatch({
                type: 'SET_TIME_SELECTION',
                payload: { ...state.timeSelection, endTime: newEnd }
              });
            }
          }}
        />
      )}

      {/* Toast Container */}
      <ToastContainer />

      {/* Welcome Dialog */}
      <WelcomeDialog
        isOpen={welcomeDialog.isOpen}
        onClose={welcomeDialog.onClose}
      />

      {/* Share Audio Dialog */}
      <Dialog
        isOpen={isShareDialogOpen}
        title="Save to audio.com"
        onClose={() => setIsShareDialogOpen(false)}
        width={400}
        headerContent={
          <SignInActionBar
            signedIn={isSignedIn}
            userName="Alex Dawson"
            onSignOut={() => setIsSignedIn(false)}
          />
        }
        footer={
          <DialogFooter
            primaryText="Done"
            secondaryText="Cancel"
            onPrimaryClick={() => {
              if (isSignedIn) {
                // User is signed in, close share dialog, show syncing dialog, and start upload
                setIsShareDialogOpen(false);
                setIsSyncingDialogOpen(true);

                // Show uploading progress toast (10 seconds)
                const uploadToastId = toast.progress('Uploading project to audio.com...');
                setIsCloudUploading(true); // Start showing upload icon

                // Simulate upload progress over 10 seconds
                const totalDuration = 10000; // 10 seconds
                const updateInterval = 100; // Update every 100ms
                let progress = 0;
                const startTime = Date.now();

                const interval = setInterval(() => {
                  progress += 1;
                  const elapsed = Date.now() - startTime;
                  const remaining = Math.max(0, totalDuration - elapsed);
                  const secondsRemaining = Math.ceil(remaining / 1000);
                  const timeRemainingText = secondsRemaining === 1
                    ? '1 second remaining'
                    : `${secondsRemaining} seconds remaining`;

                  toast.updateProgress(uploadToastId, progress, timeRemainingText);

                  if (progress >= 100) {
                    clearInterval(interval);
                    // Dismiss upload toast and show success
                    setTimeout(() => {
                      toast.dismiss(uploadToastId);
                      setIsCloudUploading(false); // Stop showing upload icon
                      setIsCloudProject(true); // Mark project as cloud project
                      toast.success(
                        'Success!',
                        'All saved changes will now update to the cloud. You can manage this file from your uploaded projects page on audio.com',
                        [
                          { label: 'View on audio.com', onClick: () => console.log('View on audio.com') }
                        ],
                        0 // No auto-dismiss
                      );
                    }, 200);
                  }
                }, updateInterval);
              } else if (projectName.trim()) {
                // User needs to sign in, open Create Account dialog on top
                setIsCreateAccountOpen(true);
              } else {
                toast.error('Please enter a project name');
              }
            }}
            onSecondaryClick={() => {
              setIsShareDialogOpen(false);
              setProjectName('');
            }}
            primaryDisabled={!projectName.trim()}
          />
        }
      >
        <LabeledInput
          label="Project name"
          value={projectName}
          onChange={setProjectName}
          placeholder="Enter project name"
          width="100%"
        />
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog
        isOpen={isCreateAccountOpen}
        title="Save to audio.com"
        onClose={() => setIsCreateAccountOpen(false)}
        width={420}
        footer={
          <DialogFooter
            primaryText="Continue"
            secondaryText="Cancel"
            onPrimaryClick={() => {
              // Validate fields are filled
              const hasEmailError = !email.trim();
              const hasPasswordError = !password.trim();

              setEmailError(hasEmailError);
              setPasswordError(hasPasswordError);

              if (hasEmailError || hasPasswordError) {
                toast.error('Please fill in all fields');
                return;
              }

              // Check for correct credentials
              if (email === 'admin' && password === 'password') {
                setIsCreateAccountOpen(false);
                setIsSignedIn(true);
                setEmail('');
                setPassword('');
                setEmailError(false);
                setPasswordError(false);
                setValidationErrorMessage('');
              } else {
                setEmailError(true);
                setPasswordError(true);
                setValidationErrorMessage('Incorrect email or password. Please try again');
              }
            }}
            onSecondaryClick={() => {
              setIsCreateAccountOpen(false);
              setEmail('');
              setPassword('');
              setEmailError(false);
              setPasswordError(false);
              setValidationErrorMessage('');
            }}
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '12px', lineHeight: '16px', margin: 0 }}>
            Create a free cloud storage account to access your projects and audio from any device
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <SocialSignInButton
              provider="google"
              onClick={() => {
                setIsCreateAccountOpen(false);
                setIsSignedIn(true);
                setEmail('');
                setPassword('');
              }}
            />
            <SocialSignInButton
              provider="facebook"
              onClick={() => {
                setIsCreateAccountOpen(false);
                setIsSignedIn(true);
                setEmail('');
                setPassword('');
              }}
            />
          </div>

          <LabeledFormDivider label="Or use email and password" />

          <LabeledInput
            label="Email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setEmailError(false);
              setValidationErrorMessage('');
            }}
            placeholder="Enter email"
            width="100%"
            type="email"
            error={emailError}
          />

          <LabeledInput
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setPasswordError(false);
              setValidationErrorMessage('');
            }}
            placeholder="Enter password"
            width="100%"
            type="password"
            error={passwordError}
          />

          {validationErrorMessage && (
            <div style={{
              fontSize: '12px',
              lineHeight: 'normal',
              color: '#c41e3a',
              marginTop: '-8px'
            }}>
              {validationErrorMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: '4px', fontSize: '12px', lineHeight: 'normal' }}>
            <span>Already have an account?</span>
            <TextLink onClick={() => toast.info('Sign in clicked')}>
              Sign in here
            </TextLink>
          </div>
        </div>
      </Dialog>

      {/* Syncing Your Project Dialog */}
      <Dialog
        isOpen={isSyncingDialogOpen}
        onClose={() => {
          setIsSyncingDialogOpen(false);
          setIsShareDialogOpen(false);
          setProjectName('');
        }}
        title="Save to audio.com"
        width={400}
        footer={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: 'var(--background-surface-bg-surface-primary-idle, #f8f8f9)',
            borderTop: '1px solid var(--stroke-main-stroke-primary, #d4d5d9)',
            flexShrink: 0
          }}>
            <LabeledCheckbox
              label="Don't show this again"
              checked={dontShowSyncAgain}
              onChange={setDontShowSyncAgain}
            />

            {/* OK Button */}
            <Button
              variant="primary"
              size="default"
              onClick={() => {
                setIsSyncingDialogOpen(false);
                setProjectName('');
              }}
            >
              OK
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'var(--font-size-body-bold, 12px)',
            fontWeight: 600,
            lineHeight: '16px',
            color: 'var(--text-txt-primary, #14151a)'
          }}>
            Syncing your project
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'var(--font-size-body, 12px)',
            fontWeight: 400,
            lineHeight: '16px',
            color: 'var(--text-txt-primary, #14151a)'
          }}>
            The project will sync in the background while you work. You can check the sync status in the bottom right corner of Audacity at any time.
          </div>
        </div>
      </Dialog>

      {/* Save Project Modal */}
      <SaveProjectModal
        isOpen={isSaveProjectModalOpen}
        onClose={() => setIsSaveProjectModalOpen(false)}
        onSaveToCloud={() => {
          setIsSaveProjectModalOpen(false);
          setIsShareDialogOpen(true);
        }}
        onSaveToComputer={() => {
          console.log('Save to computer');
          setIsSaveProjectModalOpen(false);
          toast.info('Saving to computer...');
        }}
        dontShowAgain={dontShowSaveModalAgain}
        onDontShowAgainChange={setDontShowSaveModalAgain}
        cloudImageUrl="/saveToCloud.png"
        computerImageUrl="/saveToComputer.png"
      />

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
      />

      {/* Debug Panel */}
      <DebugPanel
        isOpen={isDebugPanelOpen}
        onClose={() => {
          setIsDebugPanelOpen(false);
          setActiveMenuItem('project');
        }}
        isSignedIn={isSignedIn}
        onSignedInChange={setIsSignedIn}
        isCloudProject={isCloudProject}
        onCloudProjectChange={setIsCloudProject}
        isCloudUploading={isCloudUploading}
        onCloudUploadingChange={setIsCloudUploading}
        showDuration={showDuration}
        onShowDurationChange={setShowDuration}
        showProjectRate={showProjectRate}
        onShowProjectRateChange={setShowProjectRate}
        operatingSystem={operatingSystem}
        onOperatingSystemChange={setOperatingSystem}
        trackCount={debugTrackCount}
        onTrackCountChange={setDebugTrackCount}
        onGenerateTracks={() => {
          // Generate tracks based on debugTrackCount
          const newTracks = Array.from({ length: debugTrackCount }, (_, i) => ({
            id: i + 1,
            name: `Track ${i + 1}`,
            height: 114,
            clips: [
              {
                id: i * 10 + 1,
                name: `Clip ${i + 1}`,
                start: Math.random() * 3,
                duration: 2 + Math.random() * 3,
                waveform: generateWaveform(2 + Math.random() * 3),
                envelopePoints: [],
              },
            ],
          }));
          dispatch({ type: 'SET_TRACKS', payload: newTracks });
          toast.success('Generated tracks successfully');
        }}
        onClearAllTracks={() => {
          dispatch({ type: 'SET_TRACKS', payload: [] });
          toast.info('Cleared all tracks');
        }}
        showFocusDebug={showFocusDebug}
        onShowFocusDebugChange={setShowFocusDebug}
        accessibilityProfileId={activeProfile.id}
        accessibilityProfiles={profiles.map(p => ({ id: p.id, name: p.name, description: p.description }))}
        onAccessibilityProfileChange={setProfile}
        cutMode={state.cutMode}
        onCutModeChange={(mode) => dispatch({ type: 'SET_CUT_MODE', payload: mode })}
      />

      {/* Clip Context Menu */}
      {clipContextMenu && (
        <ClipContextMenu
          isOpen={clipContextMenu.isOpen}
          x={clipContextMenu.x}
          y={clipContextMenu.y}
          autoFocus={clipContextMenu.openedViaKeyboard}
          onClose={() => setClipContextMenu(null)}
          onRename={() => {
            toast.info('Rename clip - not yet implemented');
            setClipContextMenu(null);
          }}
          onColorChange={(color) => {
            toast.info(`Change clip color to ${color} - not yet implemented`);
            setClipContextMenu(null);
          }}
          onCut={() => {
            toast.info('Cut clip - not yet implemented');
            setClipContextMenu(null);
          }}
          onCopy={() => {
            toast.info('Copy clip - not yet implemented');
            setClipContextMenu(null);
          }}
          onDuplicate={() => {
            toast.info('Duplicate clip - not yet implemented');
            setClipContextMenu(null);
          }}
          onDelete={() => {
            if (clipContextMenu) {
              dispatch({
                type: 'DELETE_CLIP',
                payload: {
                  trackIndex: clipContextMenu.trackIndex,
                  clipId: clipContextMenu.clipId,
                },
              });
              setClipContextMenu(null);
            }
          }}
          onSplit={() => {
            toast.info('Split clip - not yet implemented');
            setClipContextMenu(null);
          }}
          onExport={() => {
            toast.info('Export clip - not yet implemented');
            setClipContextMenu(null);
          }}
          stretchWithTempo={false}
          onToggleStretchWithTempo={() => {
            toast.info('Toggle stretch with tempo - not yet implemented');
          }}
          onOpenPitchSpeedDialog={() => {
            toast.info('Open pitch and speed dialog - not yet implemented');
            setClipContextMenu(null);
          }}
          onRenderPitchSpeed={() => {
            toast.info('Render pitch and speed - not yet implemented');
            setClipContextMenu(null);
          }}
        />
      )}

      {/* Track Context Menu */}
      {trackContextMenu && (
        <TrackContextMenu
          isOpen={trackContextMenu.isOpen}
          x={trackContextMenu.x}
          y={trackContextMenu.y}
          autoFocus={trackContextMenu.openedViaKeyboard}
          onClose={() => setTrackContextMenu(null)}
          onDelete={() => {
            if (trackContextMenu) {
              dispatch({
                type: 'DELETE_TRACK',
                payload: trackContextMenu.trackIndex,
              });
              setTrackContextMenu(null);
              toast.success('Track deleted');
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AccessibilityProfileProvider initialProfileId="wcag-flat">
      <PreferencesProvider>
        <TracksProvider initialTracks={sampleTracks}>
          <CanvasDemoContent />
        </TracksProvider>
      </PreferencesProvider>
    </AccessibilityProfileProvider>
  );
}

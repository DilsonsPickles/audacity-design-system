import React from 'react';
import { generateRmsWaveform } from './utils/rmsWaveform';
import { TracksProvider } from './contexts/TracksContext';
import { SpectralSelectionProvider } from './contexts/SpectralSelectionContext';
import { ApplicationHeader, ProjectToolbar, GhostButton, ToolbarGroup, TimeCodeFormat, ToastContainer, toast, SelectionToolbar, HomeTab, AccessibilityProfileProvider, PreferencesProvider, useAccessibilityProfile, usePreferences, useWelcomeDialog, ThemeProvider, useTheme, lightTheme, darkTheme, Plugin, ContextMenu, ContextMenuItem } from '@audacity-ui/components';
import { type EnvelopePointStyleKey } from '@audacity-ui/core';
import type { SpectrogramScale } from '@audacity-ui/components';
import { saveProject, getProject, getProjects, deleteProject } from './utils/projectDatabase';
// import { TimeSelectionContextMenu } from './components/TimeSelectionContextMenu';
import { useTracks } from './contexts/TracksContext';
import { useSpectralSelection } from './contexts/SpectralSelectionContext';
import { AudioEngineProvider, useAudioEngine } from './contexts/AudioEngineContext';
import { AppContextMenus } from './components/AppContextMenus';
import { AppDialogs } from './components/AppDialogs';
import { TransportToolbar } from './components/TransportToolbar';
import { EditorLayout } from './components/EditorLayout';
const TokenReview = React.lazy(() =>
  import('./pages/TokenReview').then(m => ({ default: m.TokenReview }))
);
const SpectralRulerDemo = React.lazy(() => import('./pages/SpectralRulerDemo'));
import { RecordingManager } from './utils/RecordingManager';
import { createMenuDefinitions } from './data/menuDefinitions';
import { createInitialPlugins } from './data/plugins';
import { useZoomControls } from './hooks/useZoomControls';
import { usePlaybackControls } from './hooks/usePlaybackControls';
import { useRecording } from './hooks/useRecording';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProjectManagement } from './hooks/useProjectManagement';
import { DialogProvider, useDialogs } from './contexts/DialogContext';
import { ContextMenuProvider, useContextMenus } from './contexts/ContextMenuContext';
import { useLoopRegion } from './hooks/useLoopRegion';

const MIN_ZOOM = 10; // Minimum pixels per second (matches useZoomControls)

type Workspace = 'classic' | 'spectral-editing';

function CanvasDemoContent() {
  const { theme: baseTheme } = useTheme();
  const { state, dispatch } = useTracks();
  const { spectralSelection } = useSpectralSelection();
  const audioEngine = useAudioEngine();
  const { activeProfile, profiles, setProfile } = useAccessibilityProfile();
  const { preferences, updatePreference } = usePreferences();
  const isFlatNavigation = activeProfile.config.tabNavigation === 'sequential';
  const [scrollX, setScrollX] = React.useState(0);
  const [scrollY, setScrollY] = React.useState(0);
  const scrollRafRef = React.useRef<number | null>(null);
  const pendingScrollRef = React.useRef<{ x: number; y: number } | null>(null);
  const welcomeDialog = useWelcomeDialog();
  const [activeMenuItem, setActiveMenuItem] = React.useState<'home' | 'project' | 'export' | 'debug'>('home');
  const [homeTabKey, setHomeTabKey] = React.useState(0);
  const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(null);
  const [indexedDBProjects, setIndexedDBProjects] = React.useState<any[]>([]);
  const [workspace, setWorkspace] = React.useState<Workspace>('classic');
  const [timeCodeFormat, setTimeCodeFormat] = React.useState<TimeCodeFormat>('hh:mm:ss');
  const [selectionTimeCodeFormat, setSelectionTimeCodeFormat] = React.useState<TimeCodeFormat>('hh:mm:ss');
  const [durationTimeCodeFormat, setDurationTimeCodeFormat] = React.useState<TimeCodeFormat>('hh:mm:ss');
  // Dialog state (from context) — only destructure what App.tsx uses directly
  const {
    isSaveToCloudDialogOpen,
    setIsShareDialogOpen, setIsCreateAccountOpen,
    setIsSaveProjectModalOpen, setIsPreferencesModalOpen,
    setIsExportModalOpen, setIsLabelEditorOpen,
    setIsPluginManagerOpen, setIsMacroManagerOpen,
    setAlertDialogOpen, setIsDebugPanelOpen, setIsPluginBrowserOpen,
  } = useDialogs();

  const [isSignedIn, setIsSignedIn] = React.useState(true);
  const [authMode, setAuthMode] = React.useState<'signin' | 'create'>('create');
  const [isCloudProject, setIsCloudProject] = React.useState(false);
  const [cloudProjectName, setCloudProjectName] = React.useState('');
  const [projectName, setProjectName] = React.useState('');
  const [cloudAudioFiles, setCloudAudioFiles] = React.useState<Array<{
    id: string;
    title: string;
    dateText: string;
    duration: string;
    size: string;
    blobUrl: string;
    waveformData: number[];
  }>>(() => {
    try {
      const saved = localStorage.getItem('cloudAudioFiles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [emailError, setEmailError] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = React.useState('');
  const [dontShowSyncAgain, setDontShowSyncAgain] = React.useState(false);
  const [dontShowSaveModalAgain, setDontShowSaveModalAgain] = React.useState(() => {
    const saved = localStorage.getItem('dontShowSaveModalAgain');
    return saved === 'true';
  });
  const [initialExportType, setInitialExportType] = React.useState<string>('full-project');
  const [alertDialogTitle, setAlertDialogTitle] = React.useState('');
  const [alertDialogMessage, setAlertDialogMessage] = React.useState('');
  const [showVendorUI, setShowVendorUI] = React.useState(true);

  // Save dontShowSaveModalAgain to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('dontShowSaveModalAgain', String(dontShowSaveModalAgain));
  }, [dontShowSaveModalAgain]);

  // Persist cloud audio files to localStorage
  React.useEffect(() => {
    localStorage.setItem('cloudAudioFiles', JSON.stringify(cloudAudioFiles));
  }, [cloudAudioFiles]);

  // Select and focus track 0 on mount
  React.useEffect(() => {
    if (state.tracks.length > 0 && state.selectedTrackIndices.length === 0) {
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [0] });
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
    }
  }, []); // Only run on mount

  // Convert EFFECT_REGISTRY to Plugin[] format for PluginManagerDialog
  const [plugins, setPlugins] = React.useState<Plugin[]>(createInitialPlugins);
  const [isCloudUploading, setIsCloudUploading] = React.useState(false);
  const [debugTrackCount, setDebugTrackCount] = React.useState(4);
  const [showFocusDebug, setShowFocusDebug] = React.useState(false);
  const [focusedElement, setFocusedElement] = React.useState<string>('None');
  const controlPointStyle: EnvelopePointStyleKey = 'solidGreenSimple';
  const [spectrogramScale, setSpectrogramScale] = React.useState<SpectrogramScale>('mel');
  const [useSplitRecordButton, setUseSplitRecordButton] = React.useState(false);
  const [rollInTimeEnabled, setRollInTimeEnabled] = React.useState(false);
  const [snapEnabled, setSnapEnabled] = React.useState(false);
  const [snapMode, setSnapMode] = React.useState<import('./components/TransportToolbar').SnapMode>('musical');
  const [showMixer, setShowMixer] = React.useState(true);
  const [mixerPanelOpen, setMixerPanelOpen] = React.useState(true);

  // Listen for close-mixer-panel events from the bottom drawer
  React.useEffect(() => {
    const handler = () => setMixerPanelOpen(false);
    window.addEventListener('close-mixer-panel', handler);
    return () => window.removeEventListener('close-mixer-panel', handler);
  }, []);
  const [macros, setMacros] = React.useState<Array<{ id: string; name: string; steps: Array<{ command: string; parameters: string }> }>>([]);
  const [selectedMacroId, setSelectedMacroId] = React.useState<string | undefined>(undefined);

  const [audioSetupMenuAnchor, setAudioSetupMenuAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const [selectedRecordingDevice, setSelectedRecordingDevice] = React.useState('MacBook Pro Microphone');
  const [selectedPlaybackDevice, setSelectedPlaybackDevice] = React.useState('Built-in Speakers');
  const [availableAudioInputs, setAvailableAudioInputs] = React.useState<MediaDeviceInfo[]>([]);
  const [availableAudioOutputs, setAvailableAudioOutputs] = React.useState<MediaDeviceInfo[]>([]);
  // View options
  const [showRmsInWaveform, setShowRmsInWaveform] = React.useState(false);
  const [showVerticalRulers, setShowVerticalRulers] = React.useState(true);

  // Timeline ruler format options
  const [timelineFormat, setTimelineFormat] = React.useState<'minutes-seconds' | 'beats-measures'>('minutes-seconds');
  const [bpm] = React.useState(120);
  const [beatsPerMeasure] = React.useState(4);

  // Context menu state (from context) — only destructure what App.tsx uses directly
  const {
    effectsPanel, setEffectsPanel,
    effectDialog,
    timeSelectionContextMenu, setTimeSelectionContextMenu,
    contextMenuClosedTimeRef,
    timeSelectionMenuRef,
  } = useContextMenus();

  // Initialize reverb effect when dialog opens
  React.useEffect(() => {
    if (effectDialog && effectDialog.effectName === 'Reverb') {
      const effectId = effectDialog.trackIndex !== undefined
        ? `track-${effectDialog.trackIndex}-effect-${effectDialog.effectIndex}`
        : `master-effect-${effectDialog.effectIndex}`;

      // Create reverb instance (will be reused if already exists)
      audioEngine.getReverbEffect(effectId);
    }
  }, [effectDialog, audioEngine]);

  // Update effect chains whenever effects change
  React.useEffect(() => {
    audioEngine.updateEffectChains(state.tracks, state.masterEffects);
  }, [state.tracks, state.masterEffects, audioEngine]);

  // Update effects panel when track selection changes
  React.useEffect(() => {
    if (effectsPanel?.isOpen && state.selectedTrackIndices.length > 0) {
      const selectedTrackIndex = state.selectedTrackIndices[0];
      if (effectsPanel.trackIndex !== selectedTrackIndex) {
        setEffectsPanel({
          ...effectsPanel,
          trackIndex: selectedTrackIndex,
        });
      }
    }
  }, [state.selectedTrackIndices, effectsPanel]);


  // Update display while playing - master toggle for auto-scroll
  const [updateDisplayWhilePlaying, setUpdateDisplayWhilePlaying] = React.useState(true);

  // Pinned playhead mode - playhead stays at center, canvas scrolls (only when updateDisplayWhilePlaying is true)
  const [pinnedPlayHead, setPinnedPlayHead] = React.useState(false);

  // Click ruler to start playback - clicking timeline ruler starts playback from that position
  const [clickRulerToStartPlayback, setClickRulerToStartPlayback] = React.useState(false);

  // Zoom toggle levels - two predefined zoom levels to toggle between
  const [zoomToggleLevel1, setZoomToggleLevel1] = React.useState('zoom-default');
  const [zoomToggleLevel2, setZoomToggleLevel2] = React.useState('5ths-of-seconds');

  // Track the anchor point for range selection (Shift+Arrow)
  const [selectionAnchor, setSelectionAnchor] = React.useState<number | null>(null);

  // Track whether the control panel specifically has focus (for the inset outline)
  const [controlPanelHasFocus, setControlPanelHasFocus] = React.useState<number | null>(null);

  // Track whether the track container (.track div) has keyboard focus
  const [containerFocusedTrack, setContainerFocusedTrack] = React.useState<number | null>(null);

  // Track canvas height for playhead stalk
  const [canvasHeight, setCanvasHeight] = React.useState(0);

  // Track mouse cursor position in timeline (in seconds)
  const [mouseCursorPosition, setMouseCursorPosition] = React.useState<number | undefined>(undefined);

  // Track mouse cursor Y position for vertical ruler (in pixels, relative to tracks container)
  const [mouseCursorY, setMouseCursorY] = React.useState<number | undefined>(undefined);

  // Track whether mouse is over a track (not gap between tracks)
  const [isOverTrack, setIsOverTrack] = React.useState(false);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const trackHeaderScrollRef = React.useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = React.useRef<'header' | 'canvas' | null>(null);
  const isProgrammaticScrollRef = React.useRef(false);

  // Zoom controls
  const {
    pixelsPerSecond, setPixelsPerSecond: _setPixelsPerSecond,
    zoomIn, zoomOut, zoomToSelection, zoomToFitProject, zoomToggle,
    timelineWidth, timelineDuration, maxPixelsPerSecond,
  } = useZoomControls({
    state: { tracks: state.tracks, timeSelection: state.timeSelection },
    scrollContainerRef,
    zoomToggleLevel1,
    zoomToggleLevel2,
  });

  // Track the anchor point for time selection (the fixed end while extending)
  const selectionAnchorRef = React.useRef<number | null>(null);

  // Track the current selection edges for rapid arrow key updates
  const selectionEdgesRef = React.useRef<{ startTime: number; endTime: number } | null>(null);

  // Clipboard for copy/cut/paste
  const [clipboard, setClipboard] = React.useState<{
    clips: any[]; // Array of clips with trackIndex
    operation: 'copy' | 'cut';
    timeSelection?: { startTime: number; endTime: number }; // Optional time range for partial clip copy
  } | null>(null);

  // Playback controls
  const recordingManagerRef = React.useRef<RecordingManager | null>(null);
  const {
    isPlaying, setIsPlaying, handlePlay, handleStop,
    audioManagerRef, trackMeterLevels, setTrackMeterLevels: _setTrackMeterLevels,
  } = usePlaybackControls({
    state, dispatch, recordingManagerRef, scrollContainerRef,
    pixelsPerSecond, updateDisplayWhilePlaying, pinnedPlayHead, isProgrammaticScrollRef,
  });

  // Recording
  const {
    handleRecord, handleStopRecording, isMicMonitoring, recordingClipId, punchPointPosition,
  } = useRecording({
    state, dispatch, audioManagerRef, recordingManagerRef,
    rollInTimeEnabled,
    rollInTime: parseFloat(preferences.rollInTime) || 3,
  });

  // Master meter: compute combined level from all track meters
  const [masterVolume, setMasterVolume] = React.useState(1);
  const handleMasterVolumeChange = React.useCallback((vol: number) => {
    setMasterVolume(vol);
    audioManagerRef.current.setMasterVolume(vol);
  }, []);
  const masterLevelLeft = React.useMemo(() => {
    if (trackMeterLevels.size === 0) return -60;
    // Convert track levels (0-100) to dB, combine as RMS-like sum
    let sumLinear = 0;
    trackMeterLevels.forEach((level) => {
      const linear = level / 100;
      sumLinear += linear * linear;
    });
    const rms = Math.sqrt(sumLinear / trackMeterLevels.size);
    if (rms <= 0) return -60;
    const db = 20 * Math.log10(rms * masterVolume);
    return Math.max(-60, Math.min(0, db));
  }, [trackMeterLevels, masterVolume]);
  const masterLevelRight = React.useMemo(() => {
    // For now, simulate slight stereo difference
    if (trackMeterLevels.size === 0) return -60;
    let sumLinear = 0;
    trackMeterLevels.forEach((level) => {
      const linear = level / 100;
      sumLinear += linear * linear;
    });
    const rms = Math.sqrt(sumLinear / trackMeterLevels.size) * 0.95;
    if (rms <= 0) return -60;
    const db = 20 * Math.log10(rms * masterVolume);
    return Math.max(-60, Math.min(0, db));
  }, [trackMeterLevels, masterVolume]);

  // Loop region
  const {
    loopRegionEnabled, setLoopRegionEnabled,
    loopRegionStart, setLoopRegionStart,
    loopRegionEnd, setLoopRegionEnd,
    loopRegionInteracting, setLoopRegionInteracting,
    loopRegionHovering, setLoopRegionHovering,
    toggleLoopRegion,
  } = useLoopRegion({
    audioManagerRef,
    timeSelection: state.timeSelection,
    bpm,
    beatsPerMeasure,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    state, dispatch, handlePlay, handleRecord, handleStopRecording,
    selectionAnchor, setSelectionAnchor,
    selectionAnchorRef, selectionEdgesRef,
    effectsPanel, setEffectsPanel,
    clipboard, setClipboard,
    isFlatNavigation, controlPanelHasFocus,
    toggleLoopRegion,
    audioManagerRef,
  });

  // Sync playhead position with TimeCode display
  const currentTime = state.playheadPosition;

  // Load projects from IndexedDB on mount
  React.useEffect(() => {
    const loadProjects = async () => {
      const projects = await getProjects();
      setIndexedDBProjects(projects);
      console.log('Initial load - projects from IndexedDB:', projects.length);
    };
    loadProjects();
  }, []);

  // Live-update the project title in IndexedDB + local state as the user types in the Save to Cloud dialog
  React.useEffect(() => {
    if (!isSaveToCloudDialogOpen || !currentProjectId || !cloudProjectName.trim()) return;
    setIndexedDBProjects(prev =>
      prev.map(p => p.id === currentProjectId ? { ...p, title: cloudProjectName } : p)
    );
    // Persist title to IndexedDB immediately so it shows on Home tab when navigating back
    getProject(currentProjectId).then(proj => {
      if (proj) saveProject({ ...proj, title: cloudProjectName });
    });
  }, [cloudProjectName, isSaveToCloudDialogOpen, currentProjectId]);

  // Load available audio devices when audio setup menu opens
  React.useEffect(() => {
    if (audioSetupMenuAnchor) {
      // Load input devices
      RecordingManager.getAudioInputDevices().then(devices => {
        setAvailableAudioInputs(devices);
        if (devices.length > 0 && !selectedRecordingDevice) {
          setSelectedRecordingDevice(devices[0].label || 'Default');
        }
      });

      // Load output devices
      RecordingManager.getAudioOutputDevices().then(devices => {
        setAvailableAudioOutputs(devices);
        if (devices.length > 0 && !selectedPlaybackDevice) {
          setSelectedPlaybackDevice(devices[0].label || 'Default');
        }
      });
    }
  }, [audioSetupMenuAnchor]);

  // Focus and select first track on initial load if there are tracks
  React.useEffect(() => {
    if (state.tracks.length > 0 && state.focusedTrackIndex === null) {
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

  // Wheel-to-zoom: Cmd/Ctrl + scroll zooms toward cursor (like piano roll)
  const ppsRef = React.useRef(pixelsPerSecond);
  const maxPpsRef = React.useRef(maxPixelsPerSecond);
  const setPixelsPerSecondRef = React.useRef(_setPixelsPerSecond);
  ppsRef.current = pixelsPerSecond;
  maxPpsRef.current = maxPixelsPerSecond;
  setPixelsPerSecondRef.current = _setPixelsPerSecond;

  const isZoomingRef = React.useRef(false);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const timeAtCursor = (cursorX + el.scrollLeft) / ppsRef.current;

        const zoomDelta = e.deltaY || e.deltaX;
        const zoomFactor = Math.pow(0.998, zoomDelta);
        const newPps = Math.max(MIN_ZOOM, Math.min(maxPpsRef.current, ppsRef.current * zoomFactor));

        // Update ref immediately so scroll correction uses new value
        ppsRef.current = newPps;

        // Suppress scroll state updates during zoom to avoid extra re-renders
        isZoomingRef.current = true;

        // Set scroll position before React re-render
        el.scrollLeft = Math.max(0, timeAtCursor * newPps - cursorX);

        // Trigger single React update for zoom level
        setPixelsPerSecondRef.current(newPps);

        // Clear zooming flag after React has processed the update
        requestAnimationFrame(() => {
          isZoomingRef.current = false;
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeMenuItem]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const scrollTop = e.currentTarget.scrollTop;

    // Sync vertical scroll with track headers immediately (DOM-only, no React)
    if (trackHeaderScrollRef.current && isScrollingSyncRef.current !== 'canvas') {
      isScrollingSyncRef.current = 'header';
      trackHeaderScrollRef.current.scrollTop = scrollTop;
      requestAnimationFrame(() => {
        if (isScrollingSyncRef.current === 'header') isScrollingSyncRef.current = null;
      });
    }

    // Throttle React state updates to once per animation frame
    pendingScrollRef.current = { x: scrollLeft, y: scrollTop };
    if (scrollRafRef.current === null) {
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const pending = pendingScrollRef.current;
        if (pending) {
          setScrollX(pending.x);
          setScrollY(pending.y);
        }
      });
    }
  };

  const handleTrackHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;

    // Sync vertical scroll with canvas (skip if this was triggered by sync)
    if (scrollContainerRef.current && isScrollingSyncRef.current !== 'header') {
      isScrollingSyncRef.current = 'canvas';
      scrollContainerRef.current.scrollTop = scrollTop;
      requestAnimationFrame(() => {
        if (isScrollingSyncRef.current === 'canvas') isScrollingSyncRef.current = null;
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
    if (spectralSelection) {
      const { minFrequency, maxFrequency, startTime, endTime, trackIndex } = spectralSelection;

      // Check if it's a stereo track
      const track = state.tracks[trackIndex];
      const clip = track?.clips.find(c => c.id === spectralSelection?.clipId);
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
    // Show time selection, or clip duration indicator if no time selection exists
    return state.timeSelection || state.clipDurationIndicator;
  }, [spectralSelection, state.timeSelection, state.clipDurationIndicator, state.tracks]);

  // Project management
  const { createNewProject, handleSaveToComputer } = useProjectManagement({
    dispatch, currentProjectId, state, scrollContainerRef,
    setIsCloudProject, setCurrentProjectId, audioManagerRef,
  });

  // Generate tone handler
  const handleGenerateTone = async () => {
    if (state.selectedTrackIndices.length === 0) {
      return;
    }

    const audioManager = audioManagerRef.current;

    for (const trackIndex of state.selectedTrackIndices) {
      const newClipId = Date.now() + trackIndex;
      const duration = 4.0;
      const startTime = state.playheadPosition;
      const track = state.tracks[trackIndex];
      const isStereo = track.channelSplitRatio !== undefined;
      const { buffer, waveformData } = await audioManager.generateTone(duration, 8000, 'sawtooth', isStereo);

      audioManager.addClipBuffer(newClipId, buffer);

      const newClip = isStereo && typeof waveformData === 'object' && 'left' in waveformData ? {
        id: newClipId,
        name: 'Tone',
        start: startTime,
        duration: duration,
        waveformLeft: waveformData.left,
        waveformRight: waveformData.right,
        waveformLeftRms: generateRmsWaveform(waveformData.left),
        waveformRightRms: generateRmsWaveform(waveformData.right),
        envelopePoints: [],
      } : {
        id: newClipId,
        name: 'Tone',
        start: startTime,
        duration: duration,
        waveform: Array.isArray(waveformData) ? waveformData : [],
        waveformRms: Array.isArray(waveformData) ? generateRmsWaveform(waveformData) : [],
        envelopePoints: [],
      };

      dispatch({
        type: 'ADD_CLIP',
        payload: { trackIndex, clip: newClip },
      });
    }

    audioManager.loadClips(state.tracks);
  };

  // Import audio file handler
  const handleImportAudio = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const toastId = toast.progress(`Importing ${file.name}...`);

      try {
        const audioManager = audioManagerRef.current;
        await audioManager.initialize();

        toast.updateProgress(toastId, 20, 'Reading file...');
        const arrayBuffer = await file.arrayBuffer();

        toast.updateProgress(toastId, 40, 'Decoding audio...');
        // Use a fresh AudioContext for decoding to avoid issues with Tone.js context state
        const decodeCtx = new AudioContext();
        const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
        await decodeCtx.close();

        toast.updateProgress(toastId, 70, 'Building waveform...');
        const duration = audioBuffer.duration;
        console.log(`[Import] File: ${file.name}, size: ${file.size}, decoded duration: ${duration}s, channels: ${audioBuffer.numberOfChannels}, sampleRate: ${audioBuffer.sampleRate}, samples: ${audioBuffer.length}`);
        const isStereo = audioBuffer.numberOfChannels >= 2;

        // Pick a target track — use first selected audio track, or first audio track
        let trackIndex = state.selectedTrackIndices.find(
          i => !state.tracks[i]?.type || state.tracks[i]?.type === 'audio'
        );
        if (trackIndex === undefined) {
          trackIndex = state.tracks.findIndex(t => !t.type || t.type === 'audio');
        }
        if (trackIndex === -1) {
          toast.dismiss(toastId);
          toast.error('No audio track available');
          return;
        }

        const newClipId = Date.now();
        audioManager.addClipBuffer(newClipId, audioBuffer);

        // Use full sample arrays for waveform display (matches recording flow)
        const leftChannel = Array.from(audioBuffer.getChannelData(0)) as number[];
        const startTime = state.playheadPosition;

        const clipName = file.name.replace(/\.[^/.]+$/, '');

        const newClip = isStereo ? {
          id: newClipId,
          name: clipName,
          start: startTime,
          duration,
          waveformLeft: leftChannel,
          waveformRight: Array.from(audioBuffer.getChannelData(1)) as number[],
          waveformLeftRms: generateRmsWaveform(leftChannel),
          waveformRightRms: generateRmsWaveform(Array.from(audioBuffer.getChannelData(1)) as number[]),
          envelopePoints: [],
          fullDuration: duration,
        } : {
          id: newClipId,
          name: clipName,
          start: startTime,
          duration,
          waveform: leftChannel,
          waveformRms: generateRmsWaveform(leftChannel),
          envelopePoints: [],
          fullDuration: duration,
        };

        toast.updateProgress(toastId, 100, 'Done');

        dispatch({
          type: 'ADD_CLIP',
          payload: { trackIndex, clip: newClip },
        });

        setTimeout(() => {
          toast.dismiss(toastId);
          const mins = Math.floor(duration / 60);
          const secs = Math.floor(duration % 60);
          toast.success('Import complete', `${clipName} (${mins}:${secs.toString().padStart(2, '0')}) added to track`);
        }, 500);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error('Import failed', err instanceof Error ? err.message : 'Could not decode audio file');
      }
    };
    input.click();
  };

  // Sync toast handler for cloud save
  const handleSyncToast = () => {
    const syncToastId = toast.syncing('Syncing to audio.com...');
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
  };

  const menuDefinitions = createMenuDefinitions({
    isCloudProject,
    dontShowSaveModalAgain,
    onImportAudio: handleImportAudio,
    onSyncToast: handleSyncToast,
    onShowSaveProjectModal: () => setIsSaveProjectModalOpen(true),
    onSaveToComputer: handleSaveToComputer,
    onOpenLabelEditor: () => setIsLabelEditorOpen(true),
    onOpenPreferences: () => setIsPreferencesModalOpen(true),
    effectsPanelOpen: effectsPanel?.isOpen ?? false,
    showRmsInWaveform,
    showVerticalRulers,
    selectedTrackIndices: state.selectedTrackIndices,
    onToggleEffectsPanel: () => {
      if (effectsPanel?.isOpen) {
        setEffectsPanel(null);
      } else {
        const trackIndex = state.selectedTrackIndices.length > 0
          ? state.selectedTrackIndices[0]
          : 0;
        setEffectsPanel({
          isOpen: true,
          trackIndex,
          left: 0,
          top: 0,
          height: 600,
          width: 240,
        });
      }
    },
    onToggleRmsInWaveform: () => setShowRmsInWaveform(!showRmsInWaveform),
    onToggleVerticalRulers: () => setShowVerticalRulers(!showVerticalRulers),
    pianoRollOpen: state.pianoRollOpen,
    onTogglePianoRoll: () => {
      if (state.pianoRollOpen) {
        dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: false } });
      } else {
        // Find first MIDI track to open piano roll for
        const midiTrackIndex = state.tracks.findIndex((t: any) => t.type === 'midi');
        if (midiTrackIndex >= 0) {
          const clipIndex = (state.tracks[midiTrackIndex] as any).midiClips?.length > 0 ? 0 : null;
          dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: true, trackIndex: midiTrackIndex, clipIndex } });
        } else {
          // Auto-create an empty MIDI track and open piano roll on it
          const newTrackIndex = state.tracks.length;
          const newTrack: any = {
            id: newTrackIndex + 1,
            name: `MIDI ${newTrackIndex + 1}`,
            type: 'midi',
            height: 114,
            clips: [],
            midiClips: [],
          };
          dispatch({ type: 'ADD_TRACK', payload: newTrack });
          dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: true, trackIndex: newTrackIndex, clipIndex: null } });
        }
      }
    },
    rollInTimeEnabled,
    onToggleRollInTime: () => setRollInTimeEnabled(!rollInTimeEnabled),
    onOpenPluginManager: () => setIsPluginManagerOpen(true),
    onGenerateTone: handleGenerateTone,
    onOpenMacroManager: () => setIsMacroManagerOpen(true),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <ApplicationHeader
        os={preferences.operatingSystem}
        menuDefinitions={menuDefinitions}
      />
      <ProjectToolbar
        activeItem={activeMenuItem}
        onMenuItemClick={async (item) => {
          setActiveMenuItem(item);
          // Force HomeTab to remount and reload projects when navigating back to home
          if (item === 'home') {
            setHomeTabKey(prev => prev + 1);
            // Load projects from IndexedDB
            const projects = await getProjects();
            setIndexedDBProjects(projects);
            console.log('Loaded projects from IndexedDB:', projects.length);
          }
          // Auto-create a new project if navigating to project tab with no active project
          if (item === 'project' && !currentProjectId) {
            await createNewProject();
            // Reload projects list so HomeTab will have the fresh project when user navigates back
            const projects = await getProjects();
            setIndexedDBProjects(projects);
          }
          if (item === 'debug') {
            setIsDebugPanelOpen(true);
          }
        }}
        showDebugMenu={true}
        centerContent={
          activeMenuItem !== 'export' ? (
            <ToolbarGroup ariaLabel="Toolbar options" tabGroupId="project-toolbar-actions">
              {showMixer && <GhostButton icon="mixer" label="Mixer" onClick={() => setMixerPanelOpen(prev => !prev)} />}
              <GhostButton
                icon="cog"
                label="Audio setup"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAudioSetupMenuAnchor({ x: rect.left, y: rect.bottom + 4 });
                }}
              />
              <GhostButton
                icon="cloud"
                label="Share audio"
                onClick={() => setIsShareDialogOpen(true)}
              />
              <GhostButton
                icon="plugins"
                label="Get effects"
                onClick={() => setIsPluginBrowserOpen(true)}
              />
            </ToolbarGroup>
          ) : null
        }
        rightContent={
          activeMenuItem !== 'export' ? (
            <>
              <span style={{ fontSize: '13px', color: '#3d3e42', marginRight: '8px' }}>Workspace</span>
              <ToolbarGroup ariaLabel="Workspace controls" tabGroupId="project-toolbar-workspace">
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
                <GhostButton icon="undo" ariaLabel="Undo" />
                <GhostButton icon="redo" ariaLabel="Redo" />
              </ToolbarGroup>
            </>
          ) : null
        }
      />
      <TransportToolbar
        activeMenuItem={activeMenuItem}
        workspace={workspace}
        isPlaying={isPlaying}
        isRecording={state.isRecording}
        onPlay={handlePlay}
        onStop={handleStop}
        onRecord={handleRecord}
        useSplitRecordButton={useSplitRecordButton}
        rollInTimeEnabled={rollInTimeEnabled}
        onToggleRollInTime={() => setRollInTimeEnabled(!rollInTimeEnabled)}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        snapSubdivision={state.canvasSnap.subdivision}
        onSnapSubdivisionChange={(subdivision) => dispatch({ type: 'SET_CANVAS_SNAP', payload: { ...state.canvasSnap, subdivision } })}
        snapTriplet={state.canvasSnap.triplet ?? false}
        onToggleSnapTriplet={() => dispatch({ type: 'SET_CANVAS_SNAP', payload: { ...state.canvasSnap, triplet: !state.canvasSnap.triplet } })}
        snapMode={snapMode}
        onSnapModeChange={setSnapMode}
        loopRegionEnabled={loopRegionEnabled}
        loopRegionStart={loopRegionStart}
        loopRegionEnd={loopRegionEnd}
        setLoopRegionEnabled={setLoopRegionEnabled}
        setLoopRegionStart={setLoopRegionStart}
        setLoopRegionEnd={setLoopRegionEnd}
        timeSelection={state.timeSelection}
        bpm={bpm}
        beatsPerMeasure={beatsPerMeasure}
        envelopeMode={state.envelopeMode}
        spectrogramMode={state.spectrogramMode}
        onToggleEnvelope={handleToggleEnvelope}
        onToggleSpectrogram={handleToggleSpectrogram}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomToSelection={zoomToSelection}
        onZoomToFitProject={zoomToFitProject}
        onZoomToggle={zoomToggle}
        currentTime={currentTime}
        timeCodeFormat={timeCodeFormat}
        onTimeCodeChange={(newTime) => dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newTime })}
        onTimeCodeFormatChange={setTimeCodeFormat}
        onShareClick={() => setIsShareDialogOpen(true)}
        onExportAudioClick={() => {
          setInitialExportType('full-project');
          setIsExportModalOpen(true);
        }}
        masterLevelLeft={masterLevelLeft}
        masterLevelRight={masterLevelRight}
        masterClippedLeft={masterLevelLeft >= 0}
        masterClippedRight={masterLevelRight >= 0}
        masterVolume={masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}
        onExportLoopRegionClick={() => {
          if (!loopRegionEnabled || loopRegionStart === null || loopRegionEnd === null) {
            setAlertDialogTitle('No loop region');
            setAlertDialogMessage('Export audio in loop region requires an active loop in the project. Please go back, create a loop and try again.');
            setAlertDialogOpen(true);
            return;
          }
          setInitialExportType('loop-region');
          setIsExportModalOpen(true);
        }}
      />

      {activeMenuItem === 'home' ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <HomeTab
            key={homeTabKey}
            isSignedIn={isSignedIn}
            userName="Username"
            userAvatarUrl="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop"
            projects={indexedDBProjects.filter(p =>
              // Always show uploading/cloud projects; otherwise only show projects with data or thumbnail
              p.isUploading || p.isCloudProject || (p.data?.tracks && p.data.tracks.length > 0) || p.thumbnailUrl
            )}
            audioFiles={cloudAudioFiles}
            onDeleteAudioFile={(id) => setCloudAudioFiles(prev => prev.filter(f => f.id !== id))}
            onCreateAccount={() => {
              setAuthMode('create');
              setIsCreateAccountOpen(true);
            }}
            onSignIn={() => {
              // Sign in - show dialog
              setAuthMode('signin');
              setIsCreateAccountOpen(true);
            }}
            onSignOut={() => {
              // Sign out
              setIsSignedIn(false);
            }}
            onNewProject={async () => {
              await createNewProject();
              // Reload projects list
              const projects = await getProjects();
              setIndexedDBProjects(projects);
              setActiveMenuItem('project');
            }}
            onOpenProject={async (projectId) => {
              console.log('Opening existing project:', projectId);
              const project = await getProject(projectId);
              if (project) {
                setCurrentProjectId(projectId);

                // Restore cloud project status (project-specific)
                setIsCloudProject(project.isCloudProject ?? false);

                // Restore tracks state from project data, or reset to empty if none
                if (project.data?.tracks) {
                  console.log('Restoring tracks:', project.data.tracks.length);
                  dispatch({ type: 'SET_TRACKS', payload: project.data.tracks });
                } else {
                  dispatch({ type: 'SET_TRACKS', payload: [] });
                }

                // Restore audio buffers from saved WAV data
                if (project.data?.audioBuffers) {
                  const audioManager = audioManagerRef.current;
                  await audioManager.importBuffersFromWav(project.data.audioBuffers);
                  // Reload clips for playback now that buffers are available
                  if (project.data.tracks) {
                    audioManager.loadClips(project.data.tracks, 0);
                  }
                  console.log('Restored audio buffers for', Object.keys(project.data.audioBuffers).length, 'clips');
                }

                // Always start playhead at 0 on project open
                dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 0 });

                setActiveMenuItem('project');
              } else {
              }
            }}
            onOpenOther={() => console.log('Open other')}
            onDeleteProject={async (projectId) => {
              await deleteProject(projectId);
              const updated = await getProjects();
              setIndexedDBProjects(updated);
            }}
          />
        </div>
      ) : (
        <EditorLayout
          state={state}
          dispatch={dispatch}
          activeMenuItem={activeMenuItem}
          scrollX={scrollX}
          scrollY={scrollY}
          onScroll={handleScroll}
          onTrackHeaderScroll={handleTrackHeaderScroll}
          scrollContainerRef={scrollContainerRef}
          trackHeaderScrollRef={trackHeaderScrollRef}
          pixelsPerSecond={pixelsPerSecond}
          timelineWidth={timelineWidth}
          timelineDuration={timelineDuration}
          timelineFormat={timelineFormat}
          bpm={bpm}
          beatsPerMeasure={beatsPerMeasure}
          showRmsInWaveform={showRmsInWaveform}
          controlPointStyle={controlPointStyle}
          spectrogramScale={spectrogramScale}
          setSpectrogramScale={setSpectrogramScale}
          showVerticalRulers={showVerticalRulers}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          trackMeterLevels={trackMeterLevels}
          isMicMonitoring={isMicMonitoring}
          recordingClipId={recordingClipId}
          punchPointPosition={punchPointPosition}
          snapEnabled={snapEnabled}
          selectionAnchor={selectionAnchor}
          setSelectionAnchor={setSelectionAnchor}
          controlPanelHasFocus={controlPanelHasFocus}
          setControlPanelHasFocus={setControlPanelHasFocus}
          containerFocusedTrack={containerFocusedTrack}
          setContainerFocusedTrack={setContainerFocusedTrack}
          mouseCursorPosition={mouseCursorPosition}
          setMouseCursorPosition={setMouseCursorPosition}
          mouseCursorY={mouseCursorY}
          setMouseCursorY={setMouseCursorY}
          isOverTrack={isOverTrack}
          setIsOverTrack={setIsOverTrack}
          loopRegionEnabled={loopRegionEnabled}
          setLoopRegionEnabled={setLoopRegionEnabled}
          loopRegionStart={loopRegionStart}
          setLoopRegionStart={setLoopRegionStart}
          loopRegionEnd={loopRegionEnd}
          setLoopRegionEnd={setLoopRegionEnd}
          loopRegionInteracting={loopRegionInteracting}
          setLoopRegionInteracting={setLoopRegionInteracting}
          loopRegionHovering={loopRegionHovering}
          setLoopRegionHovering={setLoopRegionHovering}
          audioManagerRef={audioManagerRef}
          rulerTimeSelection={rulerTimeSelection}
          spectralSelection={spectralSelection}
          theme={baseTheme}
          canvasHeight={canvasHeight}
          setCanvasHeight={setCanvasHeight}
          clickRulerToStartPlayback={clickRulerToStartPlayback}
          isFlatNavigation={isFlatNavigation}
          showMixer={mixerPanelOpen}
        />
      )}

      {/* Selection Toolbar - Hidden in Home view */}
      {activeMenuItem !== 'home' && (
        <SelectionToolbar
          selectionStart={state.timeSelection?.startTime ?? null}
          selectionEnd={state.timeSelection?.endTime ?? null}
          format={selectionTimeCodeFormat}
          durationFormat={durationTimeCodeFormat}
          showCloudIndicator={isCloudProject || isCloudUploading}
          isCloudUploading={isCloudUploading}
          showDuration={true}
          status={showFocusDebug ? 'Focused element' : undefined}
          instructionText={showFocusDebug ? focusedElement : undefined}
          onFormatChange={setSelectionTimeCodeFormat}
          onDurationFormatChange={setDurationTimeCodeFormat}
          onSelectionStartChange={(newStart) => {
            // Create selection if it doesn't exist, otherwise update start time
            const endTime = state.timeSelection?.endTime ?? newStart;
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: newStart,
                endTime: endTime,
              }
            });
          }}
          onSelectionEndChange={(newEnd) => {
            // Create selection if it doesn't exist, otherwise update end time
            const startTime = state.timeSelection?.startTime ?? 0;
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: startTime,
                endTime: newEnd,
              }
            });
          }}
        />
      )}

      {/* Toast Container */}
      <ToastContainer />

      <AppDialogs
        welcomeDialog={welcomeDialog}
        audioEngine={audioEngine}
        tracks={state.tracks}
        masterEffects={state.masterEffects}
        dispatch={dispatch}
        isSignedIn={isSignedIn}
        setIsSignedIn={setIsSignedIn}
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        emailError={emailError}
        setEmailError={setEmailError}
        passwordError={passwordError}
        setPasswordError={setPasswordError}
        validationErrorMessage={validationErrorMessage}
        setValidationErrorMessage={setValidationErrorMessage}
        isCloudProject={isCloudProject}
        setIsCloudProject={setIsCloudProject}
        isCloudUploading={isCloudUploading}
        setIsCloudUploading={setIsCloudUploading}
        cloudProjectName={cloudProjectName}
        setCloudProjectName={setCloudProjectName}
        currentProjectId={currentProjectId}
        dontShowSyncAgain={dontShowSyncAgain}
        setDontShowSyncAgain={setDontShowSyncAgain}
        dontShowSaveModalAgain={dontShowSaveModalAgain}
        setDontShowSaveModalAgain={setDontShowSaveModalAgain}
        indexedDBProjects={indexedDBProjects}
        setIndexedDBProjects={setIndexedDBProjects}
        projectName={projectName}
        setProjectName={setProjectName}
        cloudAudioFiles={cloudAudioFiles}
        setCloudAudioFiles={setCloudAudioFiles}
        showVendorUI={showVendorUI}
        setShowVendorUI={setShowVendorUI}
        audioSetupMenuAnchor={audioSetupMenuAnchor}
        setAudioSetupMenuAnchor={setAudioSetupMenuAnchor}
        selectedRecordingDevice={selectedRecordingDevice}
        setSelectedRecordingDevice={setSelectedRecordingDevice}
        selectedPlaybackDevice={selectedPlaybackDevice}
        setSelectedPlaybackDevice={setSelectedPlaybackDevice}
        availableAudioInputs={availableAudioInputs}
        availableAudioOutputs={availableAudioOutputs}
        audioManagerRef={audioManagerRef}
        macros={macros}
        setMacros={setMacros}
        selectedMacroId={selectedMacroId}
        setSelectedMacroId={setSelectedMacroId}
        plugins={plugins}
        setPlugins={setPlugins}
        initialExportType={initialExportType}
        loopRegionEnabled={loopRegionEnabled}
        loopRegionStart={loopRegionStart}
        loopRegionEnd={loopRegionEnd}
        alertDialogTitle={alertDialogTitle}
        setAlertDialogTitle={setAlertDialogTitle}
        alertDialogMessage={alertDialogMessage}
        setAlertDialogMessage={setAlertDialogMessage}
        zoomToggleLevel1={zoomToggleLevel1}
        setZoomToggleLevel1={setZoomToggleLevel1}
        zoomToggleLevel2={zoomToggleLevel2}
        setZoomToggleLevel2={setZoomToggleLevel2}
        scrollContainerRef={scrollContainerRef}
        handleSaveToComputer={handleSaveToComputer}
        os={preferences.operatingSystem}
        updatePreference={updatePreference}
        debugTrackCount={debugTrackCount}
        setDebugTrackCount={setDebugTrackCount}
        showFocusDebug={showFocusDebug}
        setShowFocusDebug={setShowFocusDebug}
        activeProfile={activeProfile}
        profiles={profiles}
        setProfile={setProfile}
        useSplitRecordButton={useSplitRecordButton}
        setUseSplitRecordButton={setUseSplitRecordButton}
        showMixer={showMixer}
        setShowMixer={setShowMixer}
        setActiveMenuItem={setActiveMenuItem}
        state={state}
      />

      <AppContextMenus
        spectrogramScale={spectrogramScale}
        setSpectrogramScale={setSpectrogramScale}
        tracks={state.tracks}
        masterEffects={state.masterEffects}
        dispatch={dispatch}
        timelineFormat={timelineFormat}
        setTimelineFormat={setTimelineFormat}
        updateDisplayWhilePlaying={updateDisplayWhilePlaying}
        setUpdateDisplayWhilePlaying={setUpdateDisplayWhilePlaying}
        pinnedPlayHead={pinnedPlayHead}
        setPinnedPlayHead={setPinnedPlayHead}
        clickRulerToStartPlayback={clickRulerToStartPlayback}
        setClickRulerToStartPlayback={setClickRulerToStartPlayback}
        showVerticalRulers={showVerticalRulers}
        setShowVerticalRulers={setShowVerticalRulers}
        loopRegionEnabled={loopRegionEnabled}
        setLoopRegionEnabled={setLoopRegionEnabled}
        loopRegionStart={loopRegionStart}
        setLoopRegionStart={setLoopRegionStart}
        loopRegionEnd={loopRegionEnd}
        setLoopRegionEnd={setLoopRegionEnd}
        timeSelection={state.timeSelection}
        bpm={bpm}
        beatsPerMeasure={beatsPerMeasure}
        onClipboardSet={setClipboard}
        os={preferences.operatingSystem}
      />

      {/* Time Selection Context Menu */}
      {timeSelectionContextMenu && timeSelectionContextMenu.isOpen && (
        <div ref={timeSelectionMenuRef}>
          <ContextMenu
            isOpen
            x={timeSelectionContextMenu.x}
            y={timeSelectionContextMenu.y}
            onClose={() => {
              contextMenuClosedTimeRef.current = Date.now();
              setTimeSelectionContextMenu(null);
            }}
          >
            {timeSelectionContextMenu.trackType === 'midi' && state.timeSelection && (
              <ContextMenuItem
                label="Create Empty MIDI Clip"
                onClick={() => {
                  const trackIdx = timeSelectionContextMenu.trackIndex!;
                  const ts = state.timeSelection!;
                  const clipStart = Math.min(ts.startTime, ts.endTime);
                  const clipDuration = Math.abs(ts.endTime - ts.startTime);
                  dispatch({
                    type: 'ADD_MIDI_CLIP',
                    payload: {
                      trackIndex: trackIdx,
                      clip: {
                        id: Date.now(),
                        name: 'MIDI Clip',
                        start: clipStart,
                        trimStart: 0,
                        duration: clipDuration,
                        notes: [],
                      },
                    },
                  });
                  dispatch({ type: 'SET_TIME_SELECTION', payload: null });
                  contextMenuClosedTimeRef.current = Date.now();
                  setTimeSelectionContextMenu(null);
                }}
              />
            )}
          </ContextMenu>
        </div>
      )}
    </div>
  );
}

// Wrapper component that applies the theme based on preferences
function ThemedApp() {
  const { preferences } = usePreferences();
  const currentTheme = preferences.theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        <AudioEngineProvider>
          <TracksProvider initialTracks={[]}>
            <SpectralSelectionProvider>
              <DialogProvider>
                <ContextMenuProvider>
                  <CanvasDemoContent />
                </ContextMenuProvider>
              </DialogProvider>
            </SpectralSelectionProvider>
          </TracksProvider>
        </AudioEngineProvider>
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

export default function App() {
  // Simple routing: check URL query params
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');

  // Show token review page if ?page=tokens
  if (page === 'tokens') {
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <TokenReview />
      </React.Suspense>
    );
  }

  // Show spectral ruler demo if ?page=spectral-ruler
  if (page === 'spectral-ruler') {
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <PreferencesProvider>
          <ThemeProvider>
            <SpectralRulerDemo />
          </ThemeProvider>
        </PreferencesProvider>
      </React.Suspense>
    );
  }

  // Default: show main app with preferences provider outside theme provider
  return (
    <PreferencesProvider>
      <ThemedApp />
    </PreferencesProvider>
  );
}

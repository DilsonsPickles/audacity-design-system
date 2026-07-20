import React from 'react';
import { TracksProvider } from './contexts/TracksContext';
import { SpectralSelectionProvider } from './contexts/SpectralSelectionContext';
import { ApplicationHeader, ToastContainer, SelectionToolbar, HomeTab, AccessibilityProfileProvider, PreferencesProvider, useAccessibilityProfile, usePreferences, useAppearancePrefs, useWelcomeDialog, ThemeProvider, useTheme, lightTheme, darkTheme, ContextMenu, ContextMenuItem, Dialog, Button, Footer, ProgressBar, MasterMeterVertical, type StoredProject } from '@dilsonspickles/components';
import { ADIEU_BASE } from './lib/adieu-client';
import { type EnvelopePointStyleKey } from '@audacity-ui/core';
import type { SpectrogramScale } from '@dilsonspickles/components';
import { saveProject, getProject, getProjects } from './utils/projectDatabase';
// import { TimeSelectionContextMenu } from './components/TimeSelectionContextMenu';
import { useTracks } from './contexts/TracksContext';
import { useSpectralSelection } from './contexts/SpectralSelectionContext';
import { AudioEngineProvider, useAudioEngine } from './contexts/AudioEngineContext';
import { AppContextMenus } from './components/AppContextMenus';
import { AppDialogs } from './components/AppDialogs';
import { InstallerWizardDialog } from './components/InstallerWizardDialog';
import { setTrackDeleteConfirmHandler } from './utils/confirmTrackDelete';
import { EditorLayout } from './components/EditorLayout';
import { TransportToolbarContainer, type TransportToolbarContainerProps } from './components/TransportToolbarContainer';
import { ProjectToolbarContainer } from './components/ProjectToolbarContainer';
const TokenReview = React.lazy(() =>
  import('./pages/TokenReview').then(m => ({ default: m.TokenReview }))
);

// In the Electron shell the native menu bar (set up in apps/desktop/src/main.cjs)
// already provides File/Edit/View/etc., so the in-app ApplicationHeader would
// be a duplicate. Browser builds keep it.
const IS_ELECTRON =
  typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent);
const SpectralRulerDemo = React.lazy(() => import('./pages/SpectralRulerDemo'));
const OAuthCallback = React.lazy(() =>
  import('./components/OAuthCallback').then(m => ({ default: m.OAuthCallback }))
);
import { RecordingManager } from './utils/RecordingManager';
import { MuseHubProvider, useMuseHub, useInstalledEffects } from './contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from './contexts/AdieuContext';
import { MuseIdProvider, useMuseId } from './contexts/MuseIdContext';
import { notifyPendingServiceAdoptFailure } from './lib/muse-id-client';
import { MuseHubHomeAccountCard } from './components/wallet/MuseHubHomeAccountCard';
import { AdieuHomeAccountCard } from './components/wallet/AdieuHomeAccountCard';
import { MuseIdHomeAccountCard } from './components/museid/MuseIdHomeAccountCard';
import { useZoomControls } from './hooks/useZoomControls';
import { useCanvasScrollSync } from './hooks/useCanvasScrollSync';
import { usePlaybackControls } from './hooks/usePlaybackControls';
import { useRecording } from './hooks/useRecording';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { ClipboardState } from './hooks/useKeyboardShortcuts';
import { useGrabToPan } from './hooks/useGrabToPan';
import { useProjectManagement } from './hooks/useProjectManagement';
import { usePlugins } from './hooks/usePlugins';
import { DialogProvider, useDialogs } from './contexts/DialogContext';
import { ContextMenuProvider, useContextMenus } from './contexts/ContextMenuContext';
import { useLoopRegion } from './hooks/useLoopRegion';
import { useMasterMeter } from './hooks/useMasterMeter';
import { useDraggableToolbar } from './hooks/useDraggableToolbar';
import { useAudioDeviceMenu } from './hooks/useAudioDeviceMenu';
import { useFocusDebugger } from './hooks/useFocusDebugger';
import { useMixerPanelListener } from './hooks/useMixerPanelListener';
import { useTimeCodeFormats } from './hooks/useTimeCodeFormats';
import { useLocalStorageBackedState } from './hooks/useLocalStorageBackedState';
import { useInitialTrackSelection } from './hooks/useInitialTrackSelection';
import { generateTone } from './utils/generateTone';
import { importAudio } from './utils/importAudio';
import { saveCloudProject } from './utils/saveCloudProject';
import { useProjectAutoSave } from './hooks/useProjectAutoSave';
import { useCloudProjectCleanup } from './hooks/useCloudProjectCleanup';
import { PlaybackProvider } from './contexts/PlaybackContext';
import { LoopRegionProvider } from './contexts/LoopRegionContext';
import { cloudSummaryToStored, type CloudAudioFile } from './utils/cloudProjects';
import { useProjectLifecycle } from './hooks/useProjectLifecycle';
import { useMenuDefinitions } from './hooks/useMenuDefinitions';
import { useElectronMenuBridge } from './hooks/useElectronMenuBridge';

type Workspace = 'classic' | 'spectral-editing' | 'modern' | 'music';

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
  const welcomeDialog = useWelcomeDialog();
  const [activeMenuItem, setActiveMenuItem] = React.useState<'home' | 'project' | 'export' | 'debug'>('home');
  const [homeTabKey, setHomeTabKey] = React.useState(0);
  const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(null);
  const [indexedDBProjects, setIndexedDBProjects] = React.useState<StoredProject[]>([]);
  const [workspace, setWorkspace] = React.useState<Workspace>('classic');
  const {
    timeCodeFormat,
    setTimeCodeFormat,
    selectionTimeCodeFormat,
    setSelectionTimeCodeFormat,
    durationTimeCodeFormat,
    setDurationTimeCodeFormat,
  } = useTimeCodeFormats();
  // Dialog state (from context) — only destructure what App.tsx uses directly
  const {
    isSaveToCloudDialogOpen,
    setIsShareDialogOpen,
    setIsSaveProjectModalOpen, setIsPreferencesModalOpen,
    setIsExportModalOpen, setIsLabelEditorOpen,
    setIsPluginManagerOpen, setIsMacroManagerOpen,
    setAlertDialogOpen,
    showMissingPlugins,
  } = useDialogs();

  // MuseHub marketplace modal — lifted from EditorLayout so the project
  // toolbar's "Get effects" button can open it the same way the in-track
  // EffectPickerMenu's "Get effects…" entry does.
  const [marketplaceModal, setMarketplaceModal] = React.useState<{
    open: boolean;
    trackIndex?: number;
    anchorRect?: DOMRect | null;
    replaceIndex?: number;
  }>({ open: false });

  // Blocking modal shown while a cloud project is being fetched + hydrated.
  // Cloud loads pull the full payload (incl. audio buffers) from adieu, which
  // can take seconds — without a modal the user can interact with stale state
  // mid-hydration. Progress is phase-based (mirrors the save toast pattern):
  // each await in the load flow bumps the percentage and updates the message.
  const [cloudLoadProgress, setCloudLoadProgress] = React.useState<{
    progress: number;
    message: string;
  } | null>(null);
  // Cancel is cooperative: we set this ref, the in-flight load checks it
  // between awaits and bails before touching app state. The pending fetch
  // still resolves in the background (we don't have an AbortSignal plumbed
  // through adieu-client yet), but its result is discarded.
  const cloudLoadCancelledRef = React.useRef(false);

  const [isCloudProject, setIsCloudProject] = React.useState(false);
  const [cloudProjectName, setCloudProjectName] = React.useState('');
  const [projectName, setProjectName] = React.useState('');
  // Track-delete confirmation: shows the styled Dialog when a delete
  // is requested via confirmTrackDelete(). onConfirm runs the actual
  // dispatch, letting each call site stay decoupled from UI plumbing.
  const [trackDeleteConfirm, setTrackDeleteConfirm] = React.useState<
    { count: number; onConfirm: () => void } | null
  >(null);
  React.useEffect(() => {
    setTrackDeleteConfirmHandler((count, onConfirm) => {
      setTrackDeleteConfirm({ count, onConfirm });
    });
    return () => setTrackDeleteConfirmHandler(null);
  }, []);
  // Task 6.4 review Bug 1: surfaces the "couldn't connect: X" notice
  // OAuthCallback.tsx may have queued (sessionStorage-backed — see
  // setPendingServiceAdoptFailureNotice's doc comment) before its
  // window.location.replace('/') reload landed here. No-ops when nothing
  // is pending; mount-once is correct since the notice is one-shot.
  React.useEffect(() => {
    notifyPendingServiceAdoptFailure();
  }, []);
  const [cloudAudioFiles, setCloudAudioFiles] = useLocalStorageBackedState<CloudAudioFile[]>(
    'cloudAudioFiles',
    [],
    JSON.stringify,
    (raw) => { try { return JSON.parse(raw) as CloudAudioFile[]; } catch { return []; } },
  );
  const [dontShowSyncAgain, setDontShowSyncAgain] = React.useState(false);
  const [dontShowSaveModalAgain, setDontShowSaveModalAgain] = useLocalStorageBackedState<boolean>(
    'dontShowSaveModalAgain',
    false,
    String,
    (raw) => raw === 'true',
  );
  const [initialExportType, setInitialExportType] = React.useState<string>('full-project');
  const [alertDialogTitle, setAlertDialogTitle] = React.useState('');
  const [alertDialogMessage, setAlertDialogMessage] = React.useState('');
  const [showVendorUI, setShowVendorUI] = React.useState(true);

  useInitialTrackSelection({ state, dispatch });

  // Append currently-installed MuseHub plugins so they show up in the
  // Plugin Manager. Uninstalled-but-owned effects are not listed here —
  // they only live in the Owned view of the marketplace modal until the
  // user reinstalls them.
  const installedEffects = useInstalledEffects();

  // Mirror the plugins' enabled/disabled state into the MuseHub context so
  // the picker context menu and slot caret menus filter disabled plugins out.
  const { syncDisabledFromList, signedIn: museHubSignedIn } = useMuseHub();
  const {
    signedIn: museIdSignedIn,
    linkedServices: museIdLinkedServices,
    legacyAuthDialogsEnabled,
    openAuthDialog: openMuseIdAuthDialog,
  } = useMuseId();

  // Cloud projects from adieu (the separate cloud-storage service).
  // AdieuContext owns the fetch + visibility-refresh; we just adapt its
  // summaries into StoredProject shape for the HomeTab list.
  const {
    signedIn: adieuSignedIn,
    user: adieuUser,
    cloudProjects: adieuCloudProjects,
    cloudProjectsLoaded: adieuCloudProjectsLoaded,
    refreshProjects: adieuRefreshProjects,
    signIn: adieuSignIn,
    signOut: adieuSignOut,
  } = useAdieu();
  const cloudProjects = React.useMemo<StoredProject[]>(
    () => (adieuSignedIn ? adieuCloudProjects.map(cloudSummaryToStored) : []),
    [adieuSignedIn, adieuCloudProjects],
  );
  const cloudProjectIds = React.useMemo(
    () => new Set(cloudProjects.map((p) => p.id)),
    [cloudProjects],
  );

  useCloudProjectCleanup({
    adieuSignedIn,
    adieuCloudProjectsLoaded,
    adieuCloudProjects,
    indexedDBProjects,
    setIndexedDBProjects,
    currentProjectId,
    setCurrentProjectId,
    setIsCloudProject,
    dispatch,
  });

  const { allPlugins, setPluginsWithSync } = usePlugins({
    state,
    showMissingPlugins,
    syncDisabledFromList,
    installedEffects,
  });

  const [isCloudUploading, setIsCloudUploading] = React.useState(false);
  const [debugTrackCount, setDebugTrackCount] = React.useState(4);
  const [showFocusDebug, setShowFocusDebug] = React.useState(false);
  const focusedElement = useFocusDebugger({ showFocusDebug });
  const controlPointStyle: EnvelopePointStyleKey = 'solidGreenSimple';
  const [spectrogramScale, setSpectrogramScale] = React.useState<SpectrogramScale>('mel');
  const [useSplitRecordButton, setUseSplitRecordButton] = React.useState(false);
  const [rollInTimeEnabled, setRollInTimeEnabled] = React.useState(false);
  const [snapEnabled, setSnapEnabled] = React.useState(false);
  const [snapMode, setSnapMode] = React.useState<import('@dilsonspickles/components').SnapMode>('musical');
  const [showMixer, setShowMixer] = React.useState(true);
  const { mixerPanelOpen, setMixerPanelOpen } = useMixerPanelListener();
  const [macros, setMacros] = React.useState<Array<{ id: string; name: string; steps: Array<{ command: string; parameters: string }> }>>([]);
  const [selectedMacroId, setSelectedMacroId] = React.useState<string | undefined>(undefined);

  const {
    audioSetupMenuAnchor, setAudioSetupMenuAnchor,
    selectedRecordingDevice, setSelectedRecordingDevice,
    selectedPlaybackDevice, setSelectedPlaybackDevice,
    availableAudioInputs, availableAudioOutputs,
  } = useAudioDeviceMenu();
  // View options
  const [showRmsInWaveform, setShowRmsInWaveform] = React.useState(false);
  const [showVerticalRulers, setShowVerticalRulers] = React.useState(true);

  // Timeline ruler format options
  const [timelineFormat, setTimelineFormat] = React.useState<'minutes-seconds' | 'beats-measures'>('minutes-seconds');
  const [bpm, setBpm] = React.useState(120);

  const { toolbarPosition, handleToolbarGripperMouseDown } = useDraggableToolbar();
  const [meterOrientation, setMeterOrientation] = React.useState<'horizontal' | 'vertical'>('horizontal');

  // Project-toolbar responsiveness (compact icon swap + label drop) is
  // now handled inside ProjectToolbar itself. We just provide the
  // workspace value/options and a single change handler.
  const handleWorkspacePick = (next: Workspace) => {
    setWorkspace(next);
    if (next === 'spectral-editing') dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: true });
    else if (next === 'classic') dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: false });
  };
  const [beatsPerMeasure, setBeatsPerMeasure] = React.useState(4);
  const [noteValue, setNoteValue] = React.useState(4);

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

  // Track whether the control panel specifically has focus. Only the
  // setter is consumed (EditorLayout's useTrackPanelHandlers writes it via
  // onFocusChange) — the read side was the now-removed EditorLayoutProps
  // `controlPanelHasFocus` prop, which EditorLayout never read.
  const [, setControlPanelHasFocus] = React.useState<number | null>(null);

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
  // Captures the menu button that opened the track context menu so
  // focus can return there once the menu closes (after an item is
  // picked or Escape). Shared between EditorLayout (writes the trigger)
  // and AppContextMenus (reads it on close).
  const trackMenuTriggerRef = React.useRef<HTMLElement | null>(null);
  // Tracks the scrollTop value we most recently wrote to each scroller.
  // When the resulting echo scroll event arrives, its scrollTop matches
  // and we know to absorb it instead of syncing back, which avoids the
  // ping-pong drift that the previous flag+RAF pattern was prone to.
  const lastWrittenScrollTopRef = React.useRef<{ canvas: number; header: number }>({ canvas: -1, header: -1 });
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
  const [clipboard, setClipboard] = React.useState<ClipboardState | null>(null);

  // Playback controls
  const recordingManagerRef = React.useRef<RecordingManager | null>(null);
  const playback = usePlaybackControls({
    state, dispatch, recordingManagerRef, scrollContainerRef,
    pixelsPerSecond, updateDisplayWhilePlaying, pinnedPlayHead, isProgrammaticScrollRef,
  });
  const {
    isPlaying, setIsPlaying, handlePlay, handleStop,
    audioManagerRef, trackMeterLevels, setTrackMeterLevels: _setTrackMeterLevels,
    masterMeterLevel,
  } = playback;

  // Recording
  const {
    handleRecord, handleStopRecording, isMicMonitoring, recordingClipId, punchPointPosition,
  } = useRecording({
    state, dispatch, audioManagerRef, recordingManagerRef,
    rollInTimeEnabled,
    rollInTime: parseFloat(preferences.rollInTime) || 3,
  });

  // Master meter: compute combined level from all track meters
  const {
    masterVolume, handleMasterVolumeChange, masterLevelLeft, masterLevelRight,
  } = useMasterMeter({ masterMeterLevel, audioManagerRef });

  // Loop region
  const loopRegion = useLoopRegion({
    audioManagerRef,
    timeSelection: state.timeSelection,
    bpm,
    beatsPerMeasure,
  });
  const {
    loopRegionEnabled,
    loopRegionStart,
    loopRegionEnd,
    toggleLoopRegion,
  } = loopRegion;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    state, dispatch, handlePlay, handleRecord, handleStopRecording,
    selectionAnchor, setSelectionAnchor,
    selectionAnchorRef, selectionEdgesRef,
    effectsPanel, setEffectsPanel,
    clipboard, setClipboard,
    isFlatNavigation,
    toggleLoopRegion,
    audioManagerRef,
    onOpenPreferences: () => setIsPreferencesModalOpen(true),
  });

  // Hold Cmd (Ctrl on Windows/Linux) to grab-pan the canvas. The
  // hook applies the hand cursor app-wide via a class on <html>, so
  // we don't need to thread state down into EditorLayout / Canvas.
  useGrabToPan({ scrollContainerRef });

  // Selection-follows-focus invariant: whenever the focused track is
  // set but the selection is empty (project load, after a delete,
  // after any code path that moves focus without explicitly seeding a
  // selection), bring selection into line with focus. Only fires when
  // selection is empty so we don't squash deliberate multi-select or
  // an in-flight Cmd+Arrow peek (which leaves selection > 0).
  React.useEffect(() => {
    if (preferences.trackSelectionMode !== 'follows-focus') return;
    const focused = state.focusedTrackIndex;
    if (focused === null || focused === undefined) return;
    if (state.selectedTrackIndices.length > 0) return;
    if (focused < 0 || focused >= state.tracks.length) return;
    dispatch({ type: 'SELECT_TRACK', payload: focused });
  }, [
    preferences.trackSelectionMode,
    state.focusedTrackIndex,
    state.selectedTrackIndices,
    state.tracks.length,
    dispatch,
  ]);

  // Sync playhead position with TimeCode display
  const currentTime = state.playheadPosition;

  // Load projects from IndexedDB on mount
  React.useEffect(() => {
    const loadProjects = async () => {
      const projects = await getProjects();
      setIndexedDBProjects(projects);
    };
    loadProjects();
  }, []);

  useProjectAutoSave({
    currentProjectId,
    tracks: state.tracks,
    masterEffects: state.masterEffects,
    playheadPosition: state.playheadPosition,
  });

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

  // Wheel-zoom + two-pane (canvas / track-header) scroll sync. Must be
  // called after useZoomControls — it consumes pixelsPerSecond,
  // maxPixelsPerSecond, and _setPixelsPerSecond from that hook.
  const { handleScroll, handleTrackHeaderScroll } = useCanvasScrollSync({
    scrollContainerRef,
    trackHeaderScrollRef,
    lastWrittenScrollTopRef,
    pixelsPerSecond,
    maxPixelsPerSecond,
    setPixelsPerSecond: _setPixelsPerSecond,
    activeMenuItem,
    setScrollX,
    setScrollY,
  });

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
      const isStereo = clip && clip.waveformLeft && clip.waveformRight;
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
    // Show only the user-drawn time selection in the ruler — never a
    // selected clip's auto-generated duration indicator. Keyboard nudges
    // (MOVE_CLIP / MOVE_SELECTED_CLIPS) still write to
    // state.clipDurationIndicator internally, but we deliberately don't
    // surface it; a selected clip's bounds shouldn't masquerade as a
    // time range in the ruler.
    return state.timeSelection;
  }, [spectralSelection, state.timeSelection, state.tracks]);

  // Project management
  const { createNewProject, handleSaveToComputer, openProjectFromFile } = useProjectManagement({
    dispatch, currentProjectId, state, scrollContainerRef,
    setIsCloudProject, setCurrentProjectId, audioManagerRef,
  });

  // HomeTab's new/open/delete project handlers
  const { handleNewProject, handleOpenProject, handleDeleteProject } = useProjectLifecycle({
    isElectron: IS_ELECTRON,
    createNewProject,
    audioManagerRef,
    museHubSignedIn,
    showMissingPlugins,
    cloudProjectIds,
    cloudLoadCancelledRef,
    setCloudLoadProgress,
    setCurrentProjectId,
    setIsCloudProject,
    setActiveMenuItem,
    setIndexedDBProjects,
    indexedDBProjects,
    adieuSignedIn,
    adieuCloudProjects,
    adieuRefreshProjects,
  });

  // When Electron opens a fresh window for "New Project", it appends
  // ?newProject=1 to the URL. Detect it on boot, create a blank project,
  // jump to the project view, and strip the query so a reload doesn't
  // spawn a second one.
  const newProjectBootRef = React.useRef(false);
  React.useEffect(() => {
    if (newProjectBootRef.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('newProject') !== '1') return;
    newProjectBootRef.current = true;
    params.delete('newProject');
    const next = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${next ? `?${next}` : ''}`,
    );
    (async () => {
      await createNewProject();
      const projects = await getProjects();
      setIndexedDBProjects(projects);
      setActiveMenuItem('project');
    })();
  }, [createNewProject]);

  // Hidden file input for "Open from Computer". Click triggered from
  // HomeTab's onOpenOther so we reuse an existing UI affordance instead
  // of teaching HomeTab about a new button.
  const openFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const handleOpenFromComputer = React.useCallback(() => {
    openFileInputRef.current?.click();
  }, []);
  const handleOpenFileSelected = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset so the same file can be picked again later.
      e.target.value = '';
      if (!file) return;
      const projectId = await openProjectFromFile(file);
      if (projectId) {
        const updated = await getProjects();
        setIndexedDBProjects(updated);
        setActiveMenuItem('project');
      }
    },
    [openProjectFromFile],
  );

  // Generate tone handler
  const handleGenerateTone = () => generateTone({ state, dispatch, audioManagerRef });

  // Import audio file handler
  const handleImportAudio = () => importAudio({ state, dispatch, audioManagerRef });

  // Ctrl+S on a cloud project: PUT the current in-memory project state
  // back to adieu (audio buffers + tracks + master effects + thumbnail)
  // and mirror the new snapshot to IndexedDB. Same flow as the initial
  // Save-to-Cloud dialog, minus the naming UI — the title and id are
  // already known.
  const handleSaveCloudProject = () => saveCloudProject({
    currentProjectId,
    adieuSignedIn,
    adieuSignIn,
    scrollContainerRef,
    audioManagerRef,
    state,
    setIndexedDBProjects,
    adieuRefreshProjects,
  });

  const menuDefinitions = useMenuDefinitions({
    isCloudProject,
    dontShowSaveModalAgain,
    handleImportAudio,
    handleSaveCloudProject,
    setIsSaveProjectModalOpen,
    handleSaveToComputer,
    setIsLabelEditorOpen,
    setIsPreferencesModalOpen,
    effectsPanel,
    setEffectsPanel,
    showRmsInWaveform,
    setShowRmsInWaveform,
    showVerticalRulers,
    setShowVerticalRulers,
    state,
    rollInTimeEnabled,
    setRollInTimeEnabled,
    setIsPluginManagerOpen,
    handleGenerateTone,
    setIsMacroManagerOpen,
  });

  // Route Electron native-menu clicks to the same handlers the in-app menu
  // uses.
  useElectronMenuBridge({ menuDefinitions });

  // Tools toolbar — defined once so we can render it at the top or the
  // bottom of the layout based on `toolToolbarDock`. The gripper inside
  // calls `onDockChange` on drag-release. Grouped into cohesive object
  // props consumed by TransportToolbarContainer (loop-region props are
  // read from LoopRegionContext by the container itself).
  const transportToolbarProps: TransportToolbarContainerProps = {
    transport: {
      activeMenuItem,
      workspace,
      isPlaying,
      isRecording: state.isRecording,
      onPlay: handlePlay,
      onStop: handleStop,
      onRecord: handleRecord,
      useSplitRecordButton,
      rollInTimeEnabled,
      onToggleRollInTime: () => setRollInTimeEnabled(!rollInTimeEnabled),
      timeSelection: state.timeSelection,
      bpm,
      onBpmChange: setBpm,
      beatsPerMeasure,
      noteValue,
      onTimeSignatureChange: (sig) => {
        setBeatsPerMeasure(sig.numerator);
        setNoteValue(sig.denominator);
      },
      envelopeMode: state.envelopeMode,
      spectrogramMode: state.spectrogramMode,
      splitMode: state.splitMode,
      onToggleEnvelope: handleToggleEnvelope,
      onToggleSpectrogram: handleToggleSpectrogram,
      onToggleSplit: () => dispatch({ type: 'SET_SPLIT_MODE', payload: !state.splitMode }),
      onZoomIn: zoomIn,
      onZoomOut: zoomOut,
      onZoomToSelection: zoomToSelection,
      onZoomToFitProject: zoomToFitProject,
      onZoomToggle: zoomToggle,
      onShareClick: () => setIsShareDialogOpen(true),
      onExportAudioClick: () => {
        setInitialExportType('full-project');
        setIsExportModalOpen(true);
      },
      onExportLoopRegionClick: () => {
        if (!loopRegionEnabled || loopRegionStart === null || loopRegionEnd === null) {
          setAlertDialogTitle('No loop region');
          setAlertDialogMessage('Export audio in loop region requires an active loop in the project. Please go back, create a loop and try again.');
          setAlertDialogOpen(true);
          return;
        }
        setInitialExportType('loop-region');
        setIsExportModalOpen(true);
      },
    },
    snap: {
      snapEnabled,
      onToggleSnap: () => setSnapEnabled(!snapEnabled),
      snapSubdivision: state.canvasSnap.subdivision,
      onSnapSubdivisionChange: (subdivision) => dispatch({ type: 'SET_CANVAS_SNAP', payload: { ...state.canvasSnap, subdivision } }),
      snapTriplet: state.canvasSnap.triplet ?? false,
      onToggleSnapTriplet: () => dispatch({ type: 'SET_CANVAS_SNAP', payload: { ...state.canvasSnap, triplet: !state.canvasSnap.triplet } }),
      snapMode,
      onSnapModeChange: setSnapMode,
    },
    timecode: {
      currentTime,
      timeCodeFormat,
      onTimeCodeChange: (newTime) => dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newTime }),
      onTimeCodeFormatChange: setTimeCodeFormat,
    },
    masterMeter: {
      masterVolume,
      handleMasterVolumeChange,
      masterLevelLeft,
      masterLevelRight,
      meterOrientation,
      onMeterOrientationChange: setMeterOrientation,
    },
    gripper: {
      onGripperMouseDown: handleToolbarGripperMouseDown,
    },
  };
  const transportToolbarElement = <TransportToolbarContainer {...transportToolbarProps} />;

  return (
    <PlaybackProvider value={playback}>
    <LoopRegionProvider value={loopRegion}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {!IS_ELECTRON && (
        <ApplicationHeader
          os={preferences.operatingSystem}
          menuDefinitions={menuDefinitions}
        />
      )}
      <ProjectToolbarContainer
        activeMenuItem={activeMenuItem}
        setActiveMenuItem={setActiveMenuItem}
        setHomeTabKey={setHomeTabKey}
        setIndexedDBProjects={setIndexedDBProjects}
        currentProjectId={currentProjectId}
        createNewProject={createNewProject}
        showMixer={showMixer}
        setMixerPanelOpen={setMixerPanelOpen}
        setAudioSetupMenuAnchor={setAudioSetupMenuAnchor}
        setMarketplaceModal={setMarketplaceModal}
        workspace={workspace}
        onWorkspacePick={handleWorkspacePick}
      />
      {toolbarPosition.kind === 'top' && transportToolbarElement}

      {/* Hidden file input for "Open from Computer" — triggered programmatically. */}
      <input
        ref={openFileInputRef}
        type="file"
        accept=".audacityweb,application/zip"
        style={{ display: 'none' }}
        onChange={handleOpenFileSelected}
      />

      {activeMenuItem === 'home' ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <HomeTab
            key={homeTabKey}
            // The built-in account card on the home tab represents adieu
            // (the audio.com-equivalent in our architecture). Reading state
            // from AdieuContext means refresh shows what the server actually
            // says — no auto-true reset on every mount.
            isSignedIn={adieuSignedIn}
            userName={adieuSignedIn ? adieuUser.name : 'Not signed in'}
            userAvatarUrl={adieuUser.avatarUrl}
            projects={(() => {
              // Signed out: never surface cloud-flagged entries, even if
              // their IndexedDB mirror still exists. They could belong to
              // a previous account on this browser.
              const localList = indexedDBProjects.filter(p => {
                if (!adieuSignedIn && p.isCloudProject) return false;
                return (
                  p.isUploading || p.isCloudProject ||
                  (p.data?.tracks && p.data.tracks.length > 0) || p.thumbnailUrl
                );
              });
              if (!adieuSignedIn) return localList;
              // Signed in to adieu: show cloud projects first, then any
              // local-only projects (those not also in the cloud list) so
              // the user doesn't lose sight of them.
              const cloudIds = new Set(cloudProjects.map(p => p.id));
              const localOnly = localList.filter(p => !cloudIds.has(p.id));
              return [...cloudProjects, ...localOnly];
            })()}
            audioFiles={cloudAudioFiles}
            onDeleteAudioFile={(id) => setCloudAudioFiles(prev => prev.filter(f => f.id !== id))}
            // "Create a Muse ID" is the primary CTA everywhere per the
            // design spec — the legacy direct-to-adieu sign-in stays reachable
            // only when the Debug panel's "Show legacy sign-in dialogs" toggle
            // is on (regression path + demo contrast).
            onCreateAccount={() => {
              if (legacyAuthDialogsEnabled) void adieuSignIn();
              else openMuseIdAuthDialog('sign-up');
            }}
            onSignIn={() => {
              if (legacyAuthDialogsEnabled) void adieuSignIn();
              else openMuseIdAuthDialog('sign-in');
            }}
            onSignOut={() => {
              void adieuSignOut();
            }}
            onManageAccount={() => {
              window.open(`${ADIEU_BASE}/account`, '_blank', 'noopener,noreferrer');
            }}
            onViewProjectOnCloud={(projectId) => {
              window.open(
                `${ADIEU_BASE}/projects/${encodeURIComponent(projectId)}`,
                '_blank',
                'noopener,noreferrer',
              );
            }}
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
            onOpenOther={handleOpenFromComputer}
            onDeleteProject={handleDeleteProject}
            currentProjectId={currentProjectId}
            // The design system's built-in Audio.com card renders hardcoded
            // placeholder copy ("Service name / URL") rather than real
            // state — always suppress it in favor of AdieuHomeAccountCard
            // below, which reads real AdieuContext data. MuseHub sign-in is
            // a first-class part of the linking story (not a debug-only
            // path), so its card is always visible too, independent of the
            // Debug panel's legacy-dialogs toggle and of Muse ID sign-in
            // state (Task 3.2c).
            //
            // Layout (Task 3.2d, design review): Muse ID is the umbrella
            // identity, not a peer of MuseHub/audio.com, so its card renders
            // full width on its own row (`--primary` modifier) and the two
            // services are grouped beneath it under a "Connected services"
            // subheading with subordinate (`--secondary`) card styling.
            hideBuiltInAccountCard={true}
            extraAccountsSections={
              <>
                <MuseIdHomeAccountCard />
                <div className="home-tab__accounts-services">
                  <h2 className="home-tab__accounts-services-title">Connected services</h2>
                  <div className="home-tab__accounts-services-grid">
                    <MuseHubHomeAccountCard />
                    <AdieuHomeAccountCard />
                  </div>
                </div>
              </>
            }
            // Deferred-link prompt (Task 3.2b item 4): only when Muse ID is
            // signed in AND audio.com isn't linked yet — the plain "not
            // signed in" copy would be misleading (the user DOES have an
            // identity, just not this service linked to it).
            {...(museIdSignedIn && !museIdLinkedServices.includes('adieu')
              ? {
                  cloudSignedOutTitle: 'audio.com isn’t linked yet',
                  cloudSignedOutDescription:
                    'Have an existing audio.com account? Sign in to it, then link it to your Muse ID from Preferences → Accounts.',
                  cloudSignedOutActions: (
                    <>
                      <Button variant="secondary" size="default" onClick={() => { void adieuSignIn(); }}>
                        Sign in to audio.com
                      </Button>
                      <Button variant="primary" size="default" onClick={() => setIsPreferencesModalOpen(true)}>
                        Open Preferences
                      </Button>
                    </>
                  ),
                }
              : {})}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flex: '1 1 0', minHeight: 0 }}>
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <EditorLayout
          activeMenuItem={activeMenuItem}
          trackMenuTriggerRef={trackMenuTriggerRef}
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
          setControlPanelHasFocus={setControlPanelHasFocus}
          containerFocusedTrack={containerFocusedTrack}
          setContainerFocusedTrack={setContainerFocusedTrack}
          mouseCursorPosition={mouseCursorPosition}
          setMouseCursorPosition={setMouseCursorPosition}
          mouseCursorY={mouseCursorY}
          setMouseCursorY={setMouseCursorY}
          isOverTrack={isOverTrack}
          setIsOverTrack={setIsOverTrack}
          rulerTimeSelection={rulerTimeSelection}
          spectralSelection={spectralSelection}
          theme={baseTheme}
          canvasHeight={canvasHeight}
          setCanvasHeight={setCanvasHeight}
          clickRulerToStartPlayback={clickRulerToStartPlayback}
          showMixer={mixerPanelOpen}
          marketplaceModal={marketplaceModal}
          setMarketplaceModal={setMarketplaceModal}
        />
        </div>
        {meterOrientation === 'vertical' && (
          <div style={{ width: 64, flexShrink: 0 }}>
            <MasterMeterVertical
              levelLeft={masterLevelLeft}
              levelRight={masterLevelRight}
              clippedLeft={masterLevelLeft >= 0}
              clippedRight={masterLevelRight >= 0}
              volume={masterVolume}
              onVolumeChange={handleMasterVolumeChange}
            />
          </div>
        )}
        </div>
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
                ...state.timeSelection,
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
                ...state.timeSelection,
                startTime: startTime,
                endTime: newEnd,
              }
            });
          }}
        />
      )}

      {toolbarPosition.kind === 'bottom' && transportToolbarElement}

      {toolbarPosition.kind === 'floating' && (
        <div
          style={{
            position: 'fixed',
            left: toolbarPosition.x,
            top: toolbarPosition.y,
            zIndex: 9000,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.15)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {transportToolbarElement}
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer />

      <Dialog
        isOpen={cloudLoadProgress !== null}
        title="Loading project"
        closeOnClickOutside={false}
        closeOnEscape={false}
        minHeight={0}
        footer={
          <Footer
            rightContent={
              <Button
                variant="secondary"
                onClick={() => {
                  cloudLoadCancelledRef.current = true;
                  setCloudLoadProgress(null);
                  setActiveMenuItem('home');
                }}
              >
                Cancel
              </Button>
            }
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px' }}>{cloudLoadProgress?.message ?? ''}</div>
          <ProgressBar value={cloudLoadProgress?.progress ?? 0} width="100%" />
        </div>
      </Dialog>

      <AppDialogs
        welcomeDialog={welcomeDialog}
        audioEngine={audioEngine}
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
        macros={macros}
        setMacros={setMacros}
        selectedMacroId={selectedMacroId}
        setSelectedMacroId={setSelectedMacroId}
        plugins={allPlugins}
        setPlugins={setPluginsWithSync}
        initialExportType={initialExportType}
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
        trackSelectionMode={preferences.trackSelectionMode}
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
      />

      <AppContextMenus
        spectrogramScale={spectrogramScale}
        setSpectrogramScale={setSpectrogramScale}
        trackMenuTriggerRef={trackMenuTriggerRef}
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
      <InstallerWizardDialog />
      {trackDeleteConfirm && (
        <Dialog
          isOpen={true}
          title={trackDeleteConfirm.count === 1 ? 'Delete track?' : `Delete ${trackDeleteConfirm.count} tracks?`}
          onClose={() => setTrackDeleteConfirm(null)}
          width={420}
          footer={
            <Footer
              primaryText="Delete"
              secondaryText="Cancel"
              onPrimaryClick={() => {
                const cb = trackDeleteConfirm.onConfirm;
                setTrackDeleteConfirm(null);
                cb();
              }}
              onSecondaryClick={() => setTrackDeleteConfirm(null)}
            />
          }
        >
          <p
            style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              lineHeight: '18px',
              fontWeight: 400,
            }}
          >
            {trackDeleteConfirm.count === 1
              ? 'This track and all clips on it will be removed. This can be undone with Cmd+Z.'
              : `These ${trackDeleteConfirm.count} tracks and all clips on them will be removed. This can be undone with Cmd+Z.`}
          </p>
        </Dialog>
      )}
    </div>
    </LoopRegionProvider>
    </PlaybackProvider>
  );
}

// Wrapper component that applies the theme based on preferences
function ThemedApp() {
  const { theme } = useAppearancePrefs();
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        <AudioEngineProvider>
          <TracksProvider initialTracks={[]}>
            <SpectralSelectionProvider>
              <DialogProvider>
                <ContextMenuProvider>
                  <MuseHubProvider>
                    <AdieuProvider>
                      {/* MuseIdProvider must sit inside BOTH MuseHubProvider
                          and AdieuProvider — its exchange/sign-out flows
                          call useMuseHub().adoptTokens/signOut and
                          useAdieu().adoptTokens/signOut directly, which are
                          only reachable as a descendant of both. See
                          MuseIdContext.tsx's file header for the full
                          provider-pattern justification. */}
                      <MuseIdProvider>
                        <CanvasDemoContent />
                      </MuseIdProvider>
                    </AdieuProvider>
                  </MuseHubProvider>
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

  // OAuth callback from moose-hub. Exchanges code for tokens, then redirects
  // to "/". Rendered outside the providers because the rest of the app
  // expects a hydrated MuseHubContext, which can't run until tokens land.
  if (window.location.pathname === '/oauth/callback') {
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <OAuthCallback />
      </React.Suspense>
    );
  }

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

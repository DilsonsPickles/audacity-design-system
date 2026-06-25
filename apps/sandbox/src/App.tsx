import React from 'react';
import { generateRmsWaveform } from './utils/rmsWaveform';
import { TracksProvider } from './contexts/TracksContext';
import { SpectralSelectionProvider } from './contexts/SpectralSelectionContext';
import { ApplicationHeader, ProjectToolbar, TimeCodeFormat, ToastContainer, toast, SelectionToolbar, HomeTab, AccessibilityProfileProvider, PreferencesProvider, useAccessibilityProfile, usePreferences, useWelcomeDialog, ThemeProvider, useTheme, lightTheme, darkTheme, Plugin, ContextMenu, ContextMenuItem, Dialog, Button, Footer, ProgressBar, MasterMeterVertical, type StoredProject } from '@dilsonspickles/components';
import {
  getProject as adieuGetProject,
  saveProject as adieuSaveProject,
  deleteProject as adieuDeleteProject,
  assetUrl as adieuAssetUrl,
  ADIEU_BASE,
  type AdieuProjectSummary,
} from './lib/adieu-client';
import { decodeBufferMap, encodeBufferMap } from './lib/binary';
import { SignInCancelledError } from './contexts/AdieuContext';
import { type EnvelopePointStyleKey, getAllEffects } from '@audacity-ui/core';
import type { SpectrogramScale } from '@dilsonspickles/components';
import { saveProject, getProject, getProjects, deleteProject } from './utils/projectDatabase';
// import { TimeSelectionContextMenu } from './components/TimeSelectionContextMenu';
import { useTracks } from './contexts/TracksContext';
import { useSpectralSelection } from './contexts/SpectralSelectionContext';
import { AudioEngineProvider, useAudioEngine } from './contexts/AudioEngineContext';
import { AppContextMenus } from './components/AppContextMenus';
import { AppDialogs } from './components/AppDialogs';
import { InstallerWizardDialog } from './components/InstallerWizardDialog';
import { TransportToolbar } from '@dilsonspickles/components';
import { EditorLayout } from './components/EditorLayout';
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
import { createMenuDefinitions } from './data/menuDefinitions';
import { createInitialPlugins } from './data/plugins';
import { MuseHubProvider, useMuseHub, useInstalledEffects } from './contexts/MuseHubContext';
import { AdieuProvider, useAdieu } from './contexts/AdieuContext';
import { MuseHubHomeAccountCard } from './components/wallet/MuseHubHomeAccountCard';
import { useZoomControls } from './hooks/useZoomControls';
import { usePlaybackControls } from './hooks/usePlaybackControls';
import { useRecording } from './hooks/useRecording';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProjectManagement } from './hooks/useProjectManagement';
import { DialogProvider, useDialogs } from './contexts/DialogContext';
import { ContextMenuProvider, useContextMenus } from './contexts/ContextMenuContext';
import { useLoopRegion } from './hooks/useLoopRegion';

const MIN_ZOOM = 10; // Minimum pixels per second (matches useZoomControls)

// Fetch a cloud project and shape it like an IndexedDB project so the
// existing onOpenProject hydration code can consume it unchanged.
async function loadCloudProjectAsStored(
  id: string,
): Promise<StoredProject | null> {
  try {
    const project = await adieuGetProject(id);
    const ts = Date.parse(project.updatedAt) || Date.now();
    // Cloud payload encodes audioBuffers as base64 strings; decode to
    // ArrayBuffers so downstream code (audioManager.importBuffersFromWav)
    // sees the same shape it gets from IndexedDB.
    const rawData = project.data as {
      tracks?: unknown[];
      masterEffects?: unknown[];
      playheadPosition?: number;
      audioBuffers?: Record<string, string | ArrayBuffer>;
    } | null;
    const data = rawData
      ? {
          ...rawData,
          audioBuffers: decodeBufferMap(rawData.audioBuffers),
        }
      : null;
    return {
      id: project.id,
      title: project.title,
      dateCreated: ts,
      dateModified: ts,
      thumbnailUrl: project.thumbnailUrl
        ? adieuAssetUrl(project.thumbnailUrl)
        : undefined,
      isCloudProject: true,
      data,
    };
  } catch {
    return null;
  }
}

function cloudSummaryToStored(p: AdieuProjectSummary): StoredProject {
  const ts = Date.parse(p.updatedAt) || Date.now();
  return {
    id: p.id,
    title: p.title,
    dateCreated: ts,
    dateModified: ts,
    thumbnailUrl: p.thumbnailUrl ? adieuAssetUrl(p.thumbnailUrl) : undefined,
    isCloudProject: true,
  };
}

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
    setIsShareDialogOpen,
    setIsSaveProjectModalOpen, setIsPreferencesModalOpen,
    setIsExportModalOpen, setIsLabelEditorOpen,
    setIsPluginManagerOpen, setIsMacroManagerOpen,
    setAlertDialogOpen, setIsDebugPanelOpen,
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
  // Append currently-installed MuseHub plugins so they show up in the
  // Plugin Manager. Uninstalled-but-owned effects are not listed here —
  // they only live in the Owned view of the marketplace modal until the
  // user reinstalls them.
  const installedEffects = useInstalledEffects();
  const allPlugins = React.useMemo<Plugin[]>(() => {
    if (installedEffects.length === 0) return plugins;
    const existing = new Set(plugins.map((p) => p.id));
    const extras: Plugin[] = installedEffects
      .filter((e) => !existing.has(e.id))
      .map((e) => ({
        id: e.id,
        name: e.name,
        type: 'VST3',
        category: 'Effect',
        path: `/Library/Audio/Plug-Ins/VST3/MuseHub/${e.vendor}/${e.name}.vst3`,
        enabled: true,
      }));
    return [...plugins, ...extras];
  }, [plugins, installedEffects]);

  // Mirror the plugins' enabled/disabled state into the MuseHub context so
  // the picker context menu and slot caret menus filter disabled plugins out.
  const { syncDisabledFromList, signedIn: museHubSignedIn } = useMuseHub();

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

  // When adieu's project list refreshes, prune any IndexedDB rows that were
  // cached copies of cloud projects but no longer exist on the server (e.g.
  // the user deleted them from adieu's web UI). Without this, the merge
  // re-surfaces them as local-only entries.
  //
  // Guarded on `cloudProjectsLoaded` so the initial empty cloudProjects
  // (before hydrate() returns) isn't mistaken for "every cached cloud
  // project was deleted." Without this guard, every page reload with a
  // valid token would wipe cached cloud-project thumbnails before the
  // network round-trip completes.
  React.useEffect(() => {
    if (!adieuSignedIn || !adieuCloudProjectsLoaded) return;
    const liveCloudIds = new Set(adieuCloudProjects.map((p) => p.id));
    const orphans = indexedDBProjects.filter(
      (p) => p.isCloudProject && !p.isUploading && !liveCloudIds.has(p.id),
    );
    if (orphans.length === 0) return;
    (async () => {
      await Promise.allSettled(orphans.map((o) => deleteProject(o.id)));
      const updated = await getProjects();
      setIndexedDBProjects(updated);
    })();
  }, [adieuSignedIn, adieuCloudProjectsLoaded, adieuCloudProjects, indexedDBProjects]);

  // When the user is signed out of audio.com, wipe any IndexedDB rows that
  // were cached cloud copies. They could belong to a previous account on
  // this browser — leaving them around would leak project titles +
  // thumbnails to whoever signs in next. Local-only projects are untouched.
  // Also nudges the editor out of a cloud project if one was open.
  React.useEffect(() => {
    if (adieuSignedIn) return;
    const cloudCached = indexedDBProjects.filter((p) => p.isCloudProject);
    if (cloudCached.length === 0) return;
    (async () => {
      await Promise.allSettled(cloudCached.map((p) => deleteProject(p.id)));
      const updated = await getProjects();
      setIndexedDBProjects(updated);
      if (currentProjectId && cloudCached.some((p) => p.id === currentProjectId)) {
        setCurrentProjectId(null);
        setIsCloudProject(false);
        dispatch({ type: 'SET_TRACKS', payload: [] });
        dispatch({ type: 'SET_MASTER_EFFECTS', payload: [] });
      }
    })();
  }, [adieuSignedIn, indexedDBProjects, currentProjectId, dispatch]);

  React.useEffect(() => {
    syncDisabledFromList(allPlugins.map((p) => ({ id: p.id, enabled: p.enabled })));
  }, [allPlugins, syncDisabledFromList]);

  // Flag effects in the current project whose underlying plugins are no
  // longer available — signed out (lost entitlement) or locally uninstalled.
  // Mirrors how a real DAW shows "Missing plugin" warnings.
  //
  // Only fires when the set of missing names actually changes, so editing
  // tracks doesn't re-pop the modal.
  const lastMissingMissingRef = React.useRef<string>('');
  React.useEffect(() => {
    const builtInIds = new Set(getAllEffects().map((e) => e.id));
    const installedIds = new Set(installedEffects.map((e) => e.id));
    const missing = new Set<string>();
    const scan = (effects: Array<{ id: string; name: string }> | undefined) => {
      for (const e of effects ?? []) {
        if (!builtInIds.has(e.id) && !installedIds.has(e.id)) missing.add(e.name);
      }
    };
    for (const t of state.tracks) scan(t.effects);
    scan(state.masterEffects);
    const names = Array.from(missing).sort();
    const sig = names.join('|');
    if (sig === lastMissingMissingRef.current) return;
    lastMissingMissingRef.current = sig;
    if (names.length > 0) showMissingPlugins(names);
  }, [
    museHubSignedIn,
    installedEffects,
    state.tracks,
    state.masterEffects,
    showMissingPlugins,
  ]);

  // Intercept setPlugins from the Plugin Manager so toggling an enabled
  // state both updates the local Plugin[] and the shared disabled-IDs set.
  const setPluginsWithSync: React.Dispatch<React.SetStateAction<Plugin[]>> = React.useCallback(
    (update) => {
      setPlugins((prev) => {
        const next = typeof update === 'function' ? (update as (p: Plugin[]) => Plugin[])(prev) : update;
        syncDisabledFromList(next.map((p) => ({ id: p.id, enabled: p.enabled })));
        return next;
      });
    },
    [syncDisabledFromList],
  );
  const [isCloudUploading, setIsCloudUploading] = React.useState(false);
  const [debugTrackCount, setDebugTrackCount] = React.useState(4);
  const [showFocusDebug, setShowFocusDebug] = React.useState(false);
  const [focusedElement, setFocusedElement] = React.useState<string>('None');
  const controlPointStyle: EnvelopePointStyleKey = 'solidGreenSimple';
  const [spectrogramScale, setSpectrogramScale] = React.useState<SpectrogramScale>('mel');
  const [useSplitRecordButton, setUseSplitRecordButton] = React.useState(false);
  const [rollInTimeEnabled, setRollInTimeEnabled] = React.useState(false);
  const [snapEnabled, setSnapEnabled] = React.useState(false);
  const [snapMode, setSnapMode] = React.useState<import('@dilsonspickles/components').SnapMode>('musical');
  const [showMixer, setShowMixer] = React.useState(true);
  const [mixerPanelOpen, setMixerPanelOpen] = React.useState(false);

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
  const [bpm, setBpm] = React.useState(120);

  // Tools toolbar position — gripper-drag detaches it and the user can drop
  // anywhere. Releasing near the top / bottom edge snaps to a dock; anywhere
  // else commits a floating position. Snap thresholds are intentionally
  // generous (1.5× toolbar height) so the user gets a free dock without
  // having to land precisely on the edge.
  type ToolbarPosition =
    | { kind: 'top' }
    | { kind: 'bottom' }
    | { kind: 'floating'; x: number; y: number };
  const [toolbarPosition, setToolbarPosition] = React.useState<ToolbarPosition>({ kind: 'top' });
  const [meterOrientation, setMeterOrientation] = React.useState<'horizontal' | 'vertical'>('horizontal');

  // Project-toolbar responsiveness (compact icon swap + label drop) is
  // now handled inside ProjectToolbar itself. We just provide the
  // workspace value/options and a single change handler.
  const handleWorkspacePick = (next: Workspace) => {
    setWorkspace(next);
    if (next === 'spectral-editing') dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: true });
    else if (next === 'classic') dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: false });
  };
  const dragStateRef = React.useRef<{ offsetX: number; offsetY: number } | null>(null);

  const handleToolbarGripperMouseDown = React.useCallback(
    (e: React.MouseEvent, rect: DOMRect) => {
      dragStateRef.current = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
      // Immediately flip to floating at the toolbar's current rect so the
      // first mousemove doesn't jump — the toolbar stays under the cursor.
      setToolbarPosition({ kind: 'floating', x: rect.left, y: rect.top });

      const SNAP_PX = 72;
      const onMove = (ev: MouseEvent) => {
        const state = dragStateRef.current;
        if (!state) return;
        setToolbarPosition({
          kind: 'floating',
          x: ev.clientX - state.offsetX,
          y: ev.clientY - state.offsetY,
        });
      };
      const onUp = (ev: MouseEvent) => {
        dragStateRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (ev.clientY < SNAP_PX) {
          setToolbarPosition({ kind: 'top' });
        } else if (ev.clientY > window.innerHeight - SNAP_PX) {
          setToolbarPosition({ kind: 'bottom' });
        }
        // else: leave it floating at the last position
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [],
  );
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
    masterMeterLevel,
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
  // Master meter — read directly from the dedicated master Tone.Meter in
  // the audio engine (post-mix, post-master-volume). The audio engine
  // applies its own smoothing, so the displayed value tracks the audio
  // continuously instead of dipping to −60 between samples.
  const masterLevelLeft = React.useMemo(() => {
    if (masterMeterLevel <= 0) return -60;
    const db = (masterMeterLevel / 100) * 60 - 60;
    return Math.max(-60, Math.min(0, db));
  }, [masterMeterLevel]);
  // Slight stereo simulation until the audio engine exposes per-channel
  // levels — same dB, 0.5 dB attenuated on the right.
  const masterLevelRight = React.useMemo(() => Math.max(-60, masterLevelLeft - 0.5), [masterLevelLeft]);

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
    };
    loadProjects();
  }, []);

  // Debounced auto-save: whenever the project state changes (tracks, effects,
  // playhead, etc.), persist it back to IndexedDB so navigating Home → Project
  // and re-opening the project picks up the latest edits.
  React.useEffect(() => {
    if (!currentProjectId) return;
    const handle = setTimeout(async () => {
      try {
        const existing = await getProject(currentProjectId);
        if (!existing) return;
        await saveProject({
          ...existing,
          data: {
            ...(existing.data ?? {}),
            tracks: state.tracks,
            masterEffects: state.masterEffects,
            playheadPosition: state.playheadPosition,
            audioBuffers: existing.data?.audioBuffers,
          },
        });
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [currentProjectId, state.tracks, state.masterEffects, state.playheadPosition]);

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

    // Sync vertical scroll with track headers immediately (DOM-only, no React).
    // Round to an integer so touchpad-driven sub-pixel scrollTop values don't
    // leave the two scrollers off by a fractional pixel — that fractional gap
    // shows up as a 1px drift between the canvas tracks and their side-panel
    // headers because browsers round each independently.
    if (trackHeaderScrollRef.current && isScrollingSyncRef.current !== 'canvas') {
      isScrollingSyncRef.current = 'header';
      trackHeaderScrollRef.current.scrollTop = Math.round(scrollTop);
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

    // Sync vertical scroll with canvas (skip if this was triggered by sync).
    // Same round-to-integer as the other direction to avoid 1px drift.
    if (scrollContainerRef.current && isScrollingSyncRef.current !== 'header') {
      isScrollingSyncRef.current = 'canvas';
      scrollContainerRef.current.scrollTop = Math.round(scrollTop);
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
  const { createNewProject, handleSaveToComputer, openProjectFromFile } = useProjectManagement({
    dispatch, currentProjectId, state, scrollContainerRef,
    setIsCloudProject, setCurrentProjectId, audioManagerRef,
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

  // Ctrl+S on a cloud project: PUT the current in-memory project state
  // back to adieu (audio buffers + tracks + master effects + thumbnail)
  // and mirror the new snapshot to IndexedDB. Same flow as the initial
  // Save-to-Cloud dialog, minus the naming UI — the title and id are
  // already known.
  const handleSaveCloudProject = async () => {
    if (!currentProjectId) return;
    if (!adieuSignedIn) {
      try {
        await adieuSignIn();
      } catch (err) {
        if (err instanceof SignInCancelledError) return;
        toast.error(`Sign-in failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return;
      }
    }

    const syncToastId = toast.progress('Saving to audio.com…');
    try {
      const existing = await getProject(currentProjectId);
      const title = existing?.title || 'Untitled project';

      toast.updateProgress(syncToastId, 10, 'Capturing preview…');
      let thumbnailDataUrl: string | undefined;
      if (scrollContainerRef.current) {
        try {
          const domtoimage = (await import('dom-to-image-more')).default;
          thumbnailDataUrl = await domtoimage.toJpeg(scrollContainerRef.current, {
            quality: 0.8,
            bgcolor: '#F5F5F7',
            width: 448,
            height: 252,
            style: { transform: 'scale(1)', transformOrigin: 'top left' },
          });
        } catch {
          // Thumbnail is optional.
        }
      }

      toast.updateProgress(syncToastId, 30, 'Packaging audio…');
      const audioBuffersRaw: Record<string, ArrayBuffer> = {};
      const audioManager = audioManagerRef.current;
      if (audioManager) {
        const exported = audioManager.exportBuffersAsWav();
        for (const [clipId, wav] of exported) audioBuffersRaw[clipId] = wav;
      }
      const audioBuffers = encodeBufferMap(audioBuffersRaw);

      toast.updateProgress(syncToastId, 60, 'Uploading…');
      // [save-debug] Confirm effects are present in the upload payload.
      await adieuSaveProject(currentProjectId, {
        title,
        data: {
          tracks: state.tracks,
          masterEffects: state.masterEffects,
          playheadPosition: state.playheadPosition,
          audioBuffers,
        },
        thumbnailDataUrl,
      });

      toast.updateProgress(syncToastId, 85, 'Saving locally…');
      await saveProject({
        id: currentProjectId,
        title,
        dateCreated: existing?.dateCreated ?? Date.now(),
        dateModified: Date.now(),
        isCloudProject: true,
        isUploading: false,
        thumbnailUrl: thumbnailDataUrl ?? existing?.thumbnailUrl,
        data: {
          tracks: state.tracks,
          masterEffects: state.masterEffects,
          playheadPosition: state.playheadPosition,
          audioBuffers: audioBuffersRaw,
        },
      });
      const updated = await getProjects();
      setIndexedDBProjects(updated);
      await adieuRefreshProjects().catch(() => {});

      toast.updateProgress(syncToastId, 100, 'Done');
      setTimeout(() => toast.dismiss(syncToastId), 400);
      toast.success('Saved to audio.com');
    } catch (err) {
      toast.dismiss(syncToastId);
      toast.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const menuDefinitions = createMenuDefinitions({
    isCloudProject,
    dontShowSaveModalAgain,
    onImportAudio: handleImportAudio,
    onSyncToast: handleSaveCloudProject,
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
          // Auto-create an empty MIDI track and open piano roll on it.
          // Use max(id)+1 so the id doesn't collide after a middle track was deleted.
          const newTrackIndex = state.tracks.length;
          const nextTrackId = Math.max(...state.tracks.map((t: any) => t.id), 0) + 1;
          const midiNamePattern = /^MIDI (\d+)$/;
          const usedMidiNumbers = state.tracks
            .map((t: any) => {
              const m = midiNamePattern.exec(t.name ?? '');
              return m ? parseInt(m[1], 10) : NaN;
            })
            .filter((n: number) => !isNaN(n));
          const nextMidiNumber = usedMidiNumbers.length === 0 ? 1 : Math.max(...usedMidiNumbers) + 1;
          const newTrack: any = {
            id: nextTrackId,
            name: `MIDI ${nextMidiNumber}`,
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

  // Route Electron native-menu clicks to the same handlers the in-app menu
  // uses. We look up by item label so renaming the in-app menu in
  // menuDefinitions automatically keeps the native menu in sync (rather
  // than via brittle array indices).
  const menuByLabel = React.useMemo(() => {
    const map = new Map<string, (() => void) | undefined>();
    for (const items of Object.values(menuDefinitions)) {
      for (const item of items) {
        if (item.label) map.set(item.label, item.onClick);
      }
    }
    return map;
  }, [menuDefinitions]);

  const electronCommandsRef = React.useRef<Record<string, () => void>>({});
  electronCommandsRef.current = {
    'file:import': () => menuByLabel.get('Import')?.(),
    'file:save': () => menuByLabel.get('Save Project')?.(),
    'edit:labels': () => menuByLabel.get('Edit Labels...')?.(),
    'edit:preferences': () => menuByLabel.get('Preferences')?.(),
    'view:toggle-effects': () => menuByLabel.get('Show effects')?.(),
    'view:toggle-rms': () => menuByLabel.get('Show RMS in waveform')?.(),
    'view:toggle-rulers': () => menuByLabel.get('Show vertical rulers')?.(),
    'view:toggle-piano-roll': () => menuByLabel.get('Show piano roll')?.(),
    'record:toggle-lead-in': () => menuByLabel.get('Enable lead in time')?.(),
    'effect:manage-plugins': () => menuByLabel.get('Manage Plugins...')?.(),
    'generate:tone': () => menuByLabel.get('Tone...')?.(),
    'tools:manage-macros': () => menuByLabel.get('Manage macros...')?.(),
  };

  React.useEffect(() => {
    const api = (window as unknown as {
      electronMenu?: { onCommand: (cb: (cmd: string) => void) => () => void };
    }).electronMenu;
    if (!api) return;
    return api.onCommand((cmd) => {
      electronCommandsRef.current[cmd]?.();
    });
  }, []);

  // Tools toolbar — defined once so we can render it at the top or the
  // bottom of the layout based on `toolToolbarDock`. The gripper inside
  // calls `onDockChange` on drag-release.
  const transportToolbarElement = (
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
      onBpmChange={setBpm}
      beatsPerMeasure={beatsPerMeasure}
      noteValue={noteValue}
      onTimeSignatureChange={(sig) => {
        setBeatsPerMeasure(sig.numerator);
        setNoteValue(sig.denominator);
      }}
      envelopeMode={state.envelopeMode}
      spectrogramMode={state.spectrogramMode}
      splitMode={state.splitMode}
      onToggleEnvelope={handleToggleEnvelope}
      onToggleSpectrogram={handleToggleSpectrogram}
      onToggleSplit={() => dispatch({ type: 'SET_SPLIT_MODE', payload: !state.splitMode })}
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
      meterOrientation={meterOrientation}
      onMeterOrientationChange={setMeterOrientation}
      onGripperMouseDown={handleToolbarGripperMouseDown}
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
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {!IS_ELECTRON && (
        <ApplicationHeader
          os={preferences.operatingSystem}
          menuDefinitions={menuDefinitions}
        />
      )}
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
        centerActions={activeMenuItem !== 'export' ? [
          ...(showMixer ? [{
            icon: 'mixer' as const,
            label: 'Mixer',
            onClick: () => setMixerPanelOpen(prev => !prev),
          }] : []),
          {
            icon: 'cog' as const,
            label: 'Audio setup',
            onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setAudioSetupMenuAnchor({ x: rect.left, y: rect.bottom + 4 });
            },
          },
          {
            icon: 'cloud' as const,
            label: 'Share audio',
            onClick: () => setIsShareDialogOpen(true),
          },
          {
            icon: 'plugins' as const,
            label: 'Get effects',
            onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMarketplaceModal({ open: true, anchorRect: rect });
            },
          },
        ] : undefined}
        workspaceSelector={activeMenuItem !== 'export' ? {
          value: workspace,
          options: [
            { value: 'music', label: 'Music' },
            { value: 'classic', label: 'Classic' },
            { value: 'modern', label: 'Modern' },
            { value: 'spectral-editing', label: 'Spectral editing' },
          ],
          onChange: (next: string) => handleWorkspacePick(next as Workspace),
        } : undefined}
        historyActions={activeMenuItem !== 'export' ? {
          onUndo: () => dispatch({ type: 'UNDO' }),
          onRedo: () => dispatch({ type: 'REDO' }),
        } : undefined}
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
            onCreateAccount={() => {
              void adieuSignIn();
            }}
            onSignIn={() => {
              void adieuSignIn();
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
            onNewProject={async () => {
              // In Electron, "New Project" opens a fresh window instead of
              // replacing the current one — mirrors how desktop DAWs treat
              // each project as its own document window. The new window
              // boots into the home tab; the user can then create/open a
              // project there.
              if (IS_ELECTRON) {
                const api = (window as unknown as {
                  electronShell?: { openNewWindow: () => void };
                }).electronShell;
                if (api) {
                  api.openNewWindow();
                  return;
                }
              }
              await createNewProject();
              // Reload projects list
              const projects = await getProjects();
              setIndexedDBProjects(projects);
              setActiveMenuItem('project');
            }}
            onOpenProject={async (projectId) => {
              // Cloud projects come from moose-hub; locals from IndexedDB.
              // The lists are presented exclusively (no merged view) so this
              // dispatch is unambiguous.
              const isCloud = cloudProjectIds.has(projectId);
              if (isCloud) {
                cloudLoadCancelledRef.current = false;
                setCloudLoadProgress({ progress: 5, message: 'Connecting to audio.com…' });
              }
              const bailIfCancelled = () => isCloud && cloudLoadCancelledRef.current;
              try {
              if (isCloud) setCloudLoadProgress({ progress: 10, message: 'Downloading project…' });
              const project = isCloud
                ? await loadCloudProjectAsStored(projectId)
                : await getProject(projectId);
              if (bailIfCancelled()) return;
              if (project) {
                if (isCloud) setCloudLoadProgress({ progress: 60, message: 'Decoding audio…' });
                setCurrentProjectId(projectId);

                // Restore cloud project status (project-specific)
                setIsCloudProject(project.isCloudProject ?? false);

                // Restore tracks state from project data, or reset to empty if none
                if (project.data?.tracks) {
                  if (isCloud) setCloudLoadProgress({ progress: 75, message: 'Restoring tracks…' });
                  dispatch({ type: 'SET_TRACKS', payload: project.data.tracks });

                  // If the user is signed out of MuseHub, any effects in the
                  // project that aren't built-in Audacity effects are
                  // inaccessible — surface them in the Missing plugins modal.
                  if (!museHubSignedIn) {
                    const builtIn = new Set(
                      getAllEffects().map((e) => e.name.toLowerCase()),
                    );
                    const missing: string[] = [];
                    const seen = new Set<string>();
                    for (const track of project.data.tracks) {
                      for (const effect of track.effects ?? []) {
                        const name = effect.name;
                        if (!builtIn.has(name.toLowerCase()) && !seen.has(name)) {
                          seen.add(name);
                          missing.push(name);
                        }
                      }
                    }
                    if (missing.length > 0) {
                      showMissingPlugins(missing);
                    }
                  }
                } else {
                  dispatch({ type: 'SET_TRACKS', payload: [] });
                }

                // Restore master effects
                dispatch({
                  type: 'SET_MASTER_EFFECTS',
                  payload: Array.isArray(project.data?.masterEffects) ? project.data.masterEffects : [],
                });

                // Restore audio buffers from saved WAV data
                if (project.data?.audioBuffers) {
                  if (isCloud) {
                    const clipCount = Object.keys(project.data.audioBuffers).length;
                    setCloudLoadProgress({
                      progress: 88,
                      message: `Loading ${clipCount} audio clip${clipCount === 1 ? '' : 's'}…`,
                    });
                  }
                  const audioManager = audioManagerRef.current;
                  await audioManager.importBuffersFromWav(project.data.audioBuffers);
                  if (bailIfCancelled()) return;
                  // Reload clips for playback now that buffers are available
                  if (project.data.tracks) {
                    audioManager.loadClips(project.data.tracks, 0);
                  }
                }

                // Always start playhead at 0 on project open
                dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 0 });

                if (isCloud) setCloudLoadProgress({ progress: 100, message: 'Done' });
                setActiveMenuItem('project');
              } else {
              }
              } finally {
                if (isCloud) {
                  // Brief hold at 100% so the user sees the bar fill before it
                  // disappears; matches the save-toast dismiss delay.
                  setTimeout(() => setCloudLoadProgress(null), 250);
                }
              }
            }}
            onOpenOther={handleOpenFromComputer}
            onDeleteProject={async (projectId) => {
              // Delete from both layers so the project doesn't pop back in
              // via the merge after the next refetch. catch() so a missing
              // entry on either side doesn't abort the other delete.
              const isCloud =
                adieuSignedIn &&
                (adieuCloudProjects.some((p) => p.id === projectId) ||
                  indexedDBProjects.some((p) => p.id === projectId && p.isCloudProject));
              await Promise.allSettled([
                deleteProject(projectId),
                isCloud ? adieuDeleteProject(projectId) : Promise.resolve(),
              ]);
              const updated = await getProjects();
              setIndexedDBProjects(updated);
              if (isCloud) await adieuRefreshProjects();
            }}
            currentProjectId={currentProjectId}
            extraAccountsSections={<MuseHubHomeAccountCard />}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flex: '1 1 0', minHeight: 0 }}>
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
        tracks={state.tracks}
        masterEffects={state.masterEffects}
        dispatch={dispatch}
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
        plugins={allPlugins}
        setPlugins={setPluginsWithSync}
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
      <InstallerWizardDialog />
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
                  <MuseHubProvider>
                    <AdieuProvider>
                      <CanvasDemoContent />
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

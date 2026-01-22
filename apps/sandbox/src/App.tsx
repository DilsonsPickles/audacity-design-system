import React from 'react';
import { TracksProvider } from './contexts/TracksContext';
import { SpectralSelectionProvider } from './contexts/SpectralSelectionContext';
import { Canvas } from './components/Canvas';
import { CustomScrollbar } from './components/CustomScrollbar';
import { ApplicationHeader, ProjectToolbar, GhostButton, ToolbarGroup, Toolbar, ToolbarButtonGroup, ToolbarDivider, TransportButton, ToolButton, ToggleToolButton, TrackControlSidePanel, TrackControlPanel, TimelineRuler, PlayheadCursor, TimeCode, TimeCodeFormat, ToastContainer, toast, SelectionToolbar, Dialog, DialogFooter, SignInActionBar, LabeledInput, SocialSignInButton, LabeledFormDivider, TextLink, Button, LabeledCheckbox, ContextMenuItem, SaveProjectModal, HomeTab, PreferencesModal, AccessibilityProfileProvider, PreferencesProvider, useAccessibilityProfile, usePreferences, ClipContextMenu, TrackContextMenu, TimelineRulerContextMenu, TrackType, WelcomeDialog, useWelcomeDialog, ThemeProvider, useTheme, lightTheme, darkTheme, ExportModal, ExportSettings, LabelEditor, PluginManagerDialog, Plugin, PluginBrowserDialog, AlertDialog, VerticalRulerPanel } from '@audacity-ui/components';
// import { TimeSelectionContextMenu } from './components/TimeSelectionContextMenu';
import { useTracks } from './contexts/TracksContext';
import { useSpectralSelection } from './contexts/SpectralSelectionContext';
import { DebugPanel } from './components/DebugPanel';
import { getAudioPlaybackManager } from '@audacity-ui/audio';
import { TokenReview } from './pages/TokenReview';
import { SpectralRulerDemo } from './pages/SpectralRulerDemo';
import { RecordingManager } from './utils/RecordingManager';

// Generate noise waveform data with headroom
function generateWaveform(durationSeconds: number, sampleRate: number = 48000): number[] {
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const waveform: number[] = [];

  // Create speech-like or bird song pattern with varying amplitude bursts
  const burstDuration = 0.1; // 100ms bursts
  const gapDuration = 0.05; // 50ms gaps
  const burstSamples = Math.floor(burstDuration * sampleRate);
  const gapSamples = Math.floor(gapDuration * sampleRate);
  const cycleLength = burstSamples + gapSamples;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const cyclePos = i % cycleLength;
    const isInBurst = cyclePos < burstSamples;

    if (isInBurst) {
      // During burst: mix of frequencies with amplitude envelope
      const burstProgress = cyclePos / burstSamples;
      const envelope = Math.sin(burstProgress * Math.PI); // Attack-decay envelope

      // Mix fundamental and harmonics (simulating formants with more detail)
      const fundamental = Math.sin(2 * Math.PI * 200 * t); // 200 Hz base (fundamental)
      const harmonic2 = Math.sin(2 * Math.PI * 400 * t) * 0.4; // First harmonic
      const harmonic3 = Math.sin(2 * Math.PI * 800 * t) * 0.3; // Second harmonic
      const formant1 = Math.sin(2 * Math.PI * 1200 * t) * 0.5; // First formant
      const formant2 = Math.sin(2 * Math.PI * 2400 * t) * 0.4; // Second formant
      const formant3 = Math.sin(2 * Math.PI * 3600 * t) * 0.3; // Third formant
      const highFreq = Math.sin(2 * Math.PI * 5000 * t) * 0.2; // High frequency content
      const sibilant = Math.sin(2 * Math.PI * 8000 * t) * 0.15; // Sibilant-like
      const noise = (Math.random() * 2 - 1) * 0.15; // Broadband noise

      const sample = (fundamental + harmonic2 + harmonic3 + formant1 +
                     formant2 + formant3 + highFreq + sibilant + noise) * envelope * 0.35;
      waveform.push(sample);
    } else {
      // During gap: low amplitude noise (background)
      waveform.push((Math.random() * 2 - 1) * 0.03);
    }
  }

  return waveform;
}

// Generate RMS waveform data - smoother, lower amplitude than peak waveform
function generateRmsWaveform(peakWaveform: number[], windowSize: number = 2048): number[] {
  const rmsWaveform: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < peakWaveform.length; i++) {
    // Calculate RMS over a window centered at current sample
    let sumSquares = 0;
    let count = 0;

    const start = Math.max(0, i - halfWindow);
    const end = Math.min(peakWaveform.length, i + halfWindow);

    for (let j = start; j < end; j++) {
      sumSquares += peakWaveform[j] * peakWaveform[j];
      count++;
    }

    // RMS = sqrt(mean(squares))
    const rms = Math.sqrt(sumSquares / count);

    // Preserve sign from original sample (RMS is always positive, but we want signed for display)
    const sign = peakWaveform[i] >= 0 ? 1 : -1;
    rmsWaveform.push(rms * sign);
  }

  return rmsWaveform;
}

// Generate waveforms for clips (peak + RMS)
const clip1Waveform = generateWaveform(4.0);
const clip1RmsWaveform = generateRmsWaveform(clip1Waveform);

const clip2Waveform = generateWaveform(4.0);
const clip2RmsWaveform = generateRmsWaveform(clip2Waveform);

const clip3Waveform = generateWaveform(4.0);
const clip3RmsWaveform = generateRmsWaveform(clip3Waveform);

// Sample track data
const sampleTracks = [
  {
    id: 1,
    name: 'Track 1',
    height: 114,
    viewMode: 'split' as const,
    channelSplitRatio: 0.5,
    clips: [
      {
        id: 1,
        name: 'Cyan Clip',
        start: 0.5,
        duration: 4.0,
        waveform: clip1Waveform,
        waveformRms: clip1RmsWaveform,
        envelopePoints: [],
        color: 'cyan' as const,
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
        id: 2,
        name: 'Blue Clip',
        start: 0.5,
        duration: 4.0,
        waveform: clip2Waveform,
        waveformRms: clip2RmsWaveform,
        envelopePoints: [],
        color: 'blue' as const,
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
        id: 3,
        name: 'Violet Clip',
        start: 0.5,
        duration: 4.0,
        waveform: clip3Waveform,
        waveformRms: clip3RmsWaveform,
        envelopePoints: [],
        color: 'violet' as const,
      },
    ],
  },
];

type Workspace = 'classic' | 'spectral-editing';

function CanvasDemoContent() {
  const { theme: baseTheme } = useTheme();
  const { state, dispatch } = useTracks();
  const { spectralSelection } = useSpectralSelection();
  const { activeProfile, profiles, setProfile } = useAccessibilityProfile();
  const { preferences, updatePreference } = usePreferences();
  const isFlatNavigation = activeProfile.config.tabNavigation === 'sequential';
  const [scrollX, setScrollX] = React.useState(0);
  const [scrollY, setScrollY] = React.useState(0);
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
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [initialExportType, setInitialExportType] = React.useState<string>('full-project');
  const [isLabelEditorOpen, setIsLabelEditorOpen] = React.useState(false);
  const [isPluginManagerOpen, setIsPluginManagerOpen] = React.useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = React.useState(false);
  const [alertDialogTitle, setAlertDialogTitle] = React.useState('');
  const [alertDialogMessage, setAlertDialogMessage] = React.useState('');

  // Select and focus track 0 on mount
  React.useEffect(() => {
    if (state.tracks.length > 0 && state.selectedTrackIndices.length === 0) {
      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [0] });
      dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
    }
  }, []); // Only run on mount

  // Sync keyboardFocusedTrack with state.focusedTrackIndex
  React.useEffect(() => {
    if (state.focusedTrackIndex !== null) {
      setKeyboardFocusedTrack(state.focusedTrackIndex);
    }
  }, [state.focusedTrackIndex]);

  // Mock plugin data
  const [plugins, setPlugins] = React.useState<Plugin[]>([
    { id: '1', name: 'Reverb', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/reverb.ny', enabled: true },
    { id: '2', name: 'Delay', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/delay.ny', enabled: true },
    { id: '3', name: 'Compressor', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/compressor', enabled: true },
    { id: '4', name: 'Noise Gate', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/noisegate', enabled: false },
    { id: '5', name: 'AUGraphicEQ', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUGraphicEQ.component', enabled: true },
    { id: '6', name: 'AUDelay', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUDelay.component', enabled: true },
    { id: '7', name: 'Normalize', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/normalize', enabled: true },
    { id: '8', name: 'Bass Boost', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/bassboost.ny', enabled: false },
    { id: '9', name: 'Echo', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/echo.ny', enabled: true },
    { id: '10', name: 'Chorus', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/chorus.ny', enabled: true },
    { id: '11', name: 'Phaser', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/phaser.ny', enabled: true },
    { id: '12', name: 'Flanger', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/flanger.ny', enabled: false },
    { id: '13', name: 'Tremolo', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/tremolo.ny', enabled: true },
    { id: '14', name: 'Wahwah', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/wahwah.ny', enabled: true },
    { id: '15', name: 'EQ', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/eq', enabled: true },
    { id: '16', name: 'Filter Curve', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/filtercurve', enabled: true },
    { id: '17', name: 'Graphic EQ', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/graphiceq', enabled: false },
    { id: '18', name: 'High Pass Filter', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/highpass', enabled: true },
    { id: '19', name: 'Low Pass Filter', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/lowpass', enabled: true },
    { id: '20', name: 'Notch Filter', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/notch', enabled: true },
    { id: '21', name: 'AUReverb', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUReverb.component', enabled: true },
    { id: '22', name: 'AUDistortion', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUDistortion.component', enabled: true },
    { id: '23', name: 'AUDynamicsProcessor', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUDynamicsProcessor.component', enabled: false },
    { id: '24', name: 'AUPeakLimiter', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUPeakLimiter.component', enabled: true },
    { id: '25', name: 'AUMatrixReverb', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUMatrixReverb.component', enabled: true },
    { id: '26', name: 'AUFilter', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUFilter.component', enabled: true },
    { id: '27', name: 'AUParametricEQ', type: 'Audio unit', category: 'Effect', path: '/System/Library/Components/AUParametricEQ.component', enabled: true },
    { id: '28', name: 'Pitch Shift', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/pitchshift.ny', enabled: true },
    { id: '29', name: 'Change Tempo', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/changetempo', enabled: true },
    { id: '30', name: 'Change Speed', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/changespeed', enabled: false },
    { id: '31', name: 'Fade In', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/fadein', enabled: true },
    { id: '32', name: 'Fade Out', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/fadeout', enabled: true },
    { id: '33', name: 'Crossfade Clips', type: 'Internal effect', category: 'Tool', path: '/Applications/Audacity.app/Contents/PlugIns/crossfade', enabled: true },
    { id: '34', name: 'Studio Fade Out', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/studiofadeout.ny', enabled: true },
    { id: '35', name: 'Adjustable Fade', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/adjustablefade.ny', enabled: true },
    { id: '36', name: 'Crossfade Tracks', type: 'Nyquist', category: 'Tool', path: '/Library/Audio/Plug-Ins/Nyquist/crossfadetracks.ny', enabled: false },
    { id: '37', name: 'Invert', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/invert', enabled: true },
    { id: '38', name: 'Reverse', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/reverse', enabled: true },
    { id: '39', name: 'Silence', type: 'Internal effect', category: 'Generator', path: '/Applications/Audacity.app/Contents/PlugIns/silence', enabled: true },
    { id: '40', name: 'Truncate Silence', type: 'Internal effect', category: 'Tool', path: '/Applications/Audacity.app/Contents/PlugIns/truncatesilence', enabled: true },
    { id: '41', name: 'Click Removal', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/clickremoval.ny', enabled: true },
    { id: '42', name: 'Noise Reduction', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/noisereduction', enabled: false },
    { id: '43', name: 'Repair', type: 'Internal effect', category: 'Tool', path: '/Applications/Audacity.app/Contents/PlugIns/repair', enabled: true },
    { id: '44', name: 'De-clicker', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/declicker.ny', enabled: true },
    { id: '45', name: 'De-esser', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/deesser.ny', enabled: true },
    { id: '46', name: 'Limiter', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/limiter.ny', enabled: true },
    { id: '47', name: 'Amplify', type: 'Internal effect', category: 'Effect', path: '/Applications/Audacity.app/Contents/PlugIns/amplify', enabled: true },
    { id: '48', name: 'Auto Duck', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/autoduck.ny', enabled: true },
    { id: '49', name: 'Loudness Normalization', type: 'Internal effect', category: 'Analyzer', path: '/Applications/Audacity.app/Contents/PlugIns/loudness', enabled: false },
    { id: '50', name: 'Vocoder', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/vocoder.ny', enabled: true },
    { id: '51', name: 'Vocal Reduction', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/vocalreduction.ny', enabled: true },
    { id: '52', name: 'Vocal Isolation', type: 'Nyquist', category: 'Effect', path: '/Library/Audio/Plug-Ins/Nyquist/vocalisolation.ny', enabled: true },
    { id: '53', name: 'Spectral Edit Shelves', type: 'Nyquist', category: 'Analyzer', path: '/Library/Audio/Plug-Ins/Nyquist/spectralshelves.ny', enabled: true },
    { id: '54', name: 'Spectral Edit Multi Tool', type: 'Nyquist', category: 'Analyzer', path: '/Library/Audio/Plug-Ins/Nyquist/spectralmulti.ny', enabled: false },
    { id: '55', name: 'Spectral Edit Parametric EQ', type: 'Nyquist', category: 'Analyzer', path: '/Library/Audio/Plug-Ins/Nyquist/spectralparaeq.ny', enabled: true },
    { id: '56', name: 'Tone Generator', type: 'Internal effect', category: 'Generator', path: '/Applications/Audacity.app/Contents/PlugIns/tonegen', enabled: true },
    { id: '57', name: 'FabFilter Pro-Q 3', type: 'VST3', category: 'Effect', path: '/Library/Audio/Plug-Ins/VST3/FabFilter Pro-Q 3.vst3', enabled: true },
    { id: '58', name: 'Valhalla VintageVerb', type: 'VST', category: 'Effect', path: '/Library/Audio/Plug-Ins/VST/ValhallaVintageVerb.vst', enabled: true },
    { id: '59', name: 'Calf Reverb', type: 'LV2', category: 'Effect', path: '/usr/lib/lv2/calf.lv2/reverb.so', enabled: false },
    { id: '60', name: 'TAP Equalizer', type: 'LADSPA', category: 'Effect', path: '/usr/lib/ladspa/tap_eq.so', enabled: true },
    { id: '61', name: 'Waves SSL G-Master', type: 'VST3', category: 'Effect', path: '/Library/Audio/Plug-Ins/VST3/Waves/SSLComp.vst3', enabled: true },
    { id: '62', name: 'iZotope Ozone Imager', type: 'VST', category: 'Effect', path: '/Library/Audio/Plug-Ins/VST/iZotope/OzoneImager.vst', enabled: false },
  ]);

  // Debug panel state
  const [isDebugPanelOpen, setIsDebugPanelOpen] = React.useState(false);
  const [isCloudUploading, setIsCloudUploading] = React.useState(false);
  const [showDuration, setShowDuration] = React.useState(false);
  const [showProjectRate, setShowProjectRate] = React.useState(false);
  const [debugTrackCount, setDebugTrackCount] = React.useState(4);
  const [showFocusDebug, setShowFocusDebug] = React.useState(false);
  const [focusedElement, setFocusedElement] = React.useState<string>('None');
  const [envelopeColor, setEnvelopeColor] = React.useState<'yellow-green' | 'bright-cyan' | 'hot-pink'>('yellow-green');
  const [controlPointStyle, setControlPointStyle] = React.useState<'musescore' | 'au4'>('musescore');
  const [showMixer, setShowMixer] = React.useState(false);
  const [isPluginBrowserOpen, setIsPluginBrowserOpen] = React.useState(false);
  const [audioSetupMenuAnchor, setAudioSetupMenuAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const [selectedRecordingDevice, setSelectedRecordingDevice] = React.useState('MacBook Pro Microphone');
  const [selectedPlaybackDevice, setSelectedPlaybackDevice] = React.useState('Built-in Speakers');
  const [availableAudioInputs, setAvailableAudioInputs] = React.useState<MediaDeviceInfo[]>([]);
  const [availableAudioOutputs, setAvailableAudioOutputs] = React.useState<MediaDeviceInfo[]>([]);

  // Zoom state
  const [pixelsPerSecond, setPixelsPerSecond] = React.useState(100);

  // Calculate project length (end of last clip across all tracks)
  const projectLength = React.useMemo(() => {
    let maxEndTime = 0;
    state.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipEndTime = clip.start + clip.duration;
        if (clipEndTime > maxEndTime) {
          maxEndTime = clipEndTime;
        }
      });
    });
    return maxEndTime;
  }, [state.tracks]);

  // Calculate timeline width based on project content
  const LEFT_PADDING = 12; // pixels
  const MIN_VIEWPORT_WIDTH = 5000; // Minimum starting width
  const MAX_CANVAS_WIDTH = 32000; // Browser canvas limit safety

  // Timeline duration: project length + 50% buffer, with minimum
  const timelineDuration = Math.max(10, projectLength * 1.5);

  // Calculate width in pixels
  const calculatedWidth = Math.ceil(timelineDuration * pixelsPerSecond) + LEFT_PADDING;

  // Apply constraints: min viewport width, max canvas width
  const timelineWidth = Math.max(
    MIN_VIEWPORT_WIDTH,
    Math.min(calculatedWidth, MAX_CANVAS_WIDTH)
  );

  // Calculate max pixels per second to stay under canvas limit
  const maxPixelsPerSecond = Math.floor((MAX_CANVAS_WIDTH - LEFT_PADDING) / timelineDuration);

  // Zoom functions
  const zoomIn = () => {
    setPixelsPerSecond(prev => Math.min(prev * 1.5, maxPixelsPerSecond));
  };

  const zoomOut = () => {
    setPixelsPerSecond(prev => Math.max(prev / 1.5, 10)); // Min zoom: 10 pixels/second
  };

  // Convert zoom level name to pixels per second
  const zoomLevelToPixelsPerSecond = (level: string): number => {
    switch (level) {
      case 'fit-to-width':
        // Calculate pixels per second to fit entire timeline in viewport
        // This would need the container width - using a reasonable default
        return 50; // Placeholder - should calculate based on container width
      case 'zoom-to-selection':
        // Would need selection info - fallback to current zoom
        return pixelsPerSecond;
      case 'zoom-default':
        return 100; // Default zoom level
      case 'minutes':
        return 20; // ~3 seconds per 60 pixels
      case 'seconds':
        return 100; // 1 second = 100 pixels
      case '5ths-of-seconds':
        return 200; // 0.2 seconds = 40 pixels
      case '10ths-of-seconds':
        return 300; // 0.1 seconds = 30 pixels
      case '20ths-of-seconds':
        return 400; // 0.05 seconds = 20 pixels
      case '50ths-of-seconds':
        return 600; // 0.02 seconds = 12 pixels
      case '100ths-of-seconds':
        return 1000; // 0.01 seconds = 10 pixels
      case '500ths-of-seconds':
        return 2000; // 0.002 seconds = 4 pixels
      case 'milliseconds':
        return 3000; // Very zoomed in
      case 'samples':
        return 4000; // Sample-level view
      case '4-pixels-per-sample':
        return 8000; // 4 pixels per sample (at 44.1kHz)
      case 'max-zoom':
        return maxPixelsPerSecond; // Maximum zoom
      default:
        return 100; // Fallback to default
    }
  };

  const zoomToggle = () => {
    // Toggle between the two predefined zoom levels
    // Convert level names to pixel values
    const level1Pixels = zoomLevelToPixelsPerSecond(zoomToggleLevel1);
    const level2Pixels = zoomLevelToPixelsPerSecond(zoomToggleLevel2);

    // If both levels are the same, do nothing
    if (level1Pixels === level2Pixels) {
      return;
    }

    // If current zoom is closer to level 1, switch to level 2, otherwise switch to level 1
    const distanceToLevel1 = Math.abs(pixelsPerSecond - level1Pixels);
    const distanceToLevel2 = Math.abs(pixelsPerSecond - level2Pixels);

    if (distanceToLevel1 < distanceToLevel2) {
      setPixelsPerSecond(level2Pixels);
    } else {
      setPixelsPerSecond(level1Pixels);
    }
  };

  const zoomToSelection = () => {
    if (!state.timeSelection) {
      toast.warning('No Selection', 'Please select a time range first');
      return;
    }

    const selectionDuration = state.timeSelection.endTime - state.timeSelection.startTime;

    // Calculate pixels per second to fit the selection in the viewport (100% width)
    const viewportWidth = scrollContainerRef.current?.clientWidth || 800;
    const newPixelsPerSecond = Math.floor(viewportWidth / selectionDuration);

    // Apply zoom level constraints
    const constrainedZoom = Math.max(10, Math.min(newPixelsPerSecond, maxPixelsPerSecond));
    setPixelsPerSecond(constrainedZoom);

    // Scroll to show the selection at the left edge
    const scrollPosition = state.timeSelection.startTime * constrainedZoom;

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  };

  const zoomToFitProject = () => {
    // Find the earliest start time and latest end time across all clips
    let projectStart = Infinity;
    let projectEnd = 0;

    state.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipStart = clip.start;
        const clipEnd = clip.start + clip.duration;
        projectStart = Math.min(projectStart, clipStart);
        projectEnd = Math.max(projectEnd, clipEnd);
      });
    });

    // If no clips found, show a message
    if (projectStart === Infinity || projectEnd === 0) {
      toast.warning('No Audio', 'Project has no audio clips to display');
      return;
    }

    const projectDuration = projectEnd - projectStart;

    console.log('Zoom to Fit:', {
      projectStart,
      projectEnd,
      projectDuration,
      viewportWidth: scrollContainerRef.current?.clientWidth,
    });

    // Calculate pixels per second to fit the entire project in the viewport
    // Use full viewport width
    const viewportWidth = scrollContainerRef.current?.clientWidth || 800;
    const newPixelsPerSecond = viewportWidth / projectDuration;

    console.log('Calculated zoom:', {
      newPixelsPerSecond,
      min: 10,
      max: maxPixelsPerSecond,
    });

    // Apply zoom level constraints
    const constrainedZoom = Math.max(10, Math.min(newPixelsPerSecond, maxPixelsPerSecond));
    setPixelsPerSecond(constrainedZoom);

    // Scroll to the start of the project
    const scrollPosition = projectStart * constrainedZoom;

    console.log('Scroll position:', scrollPosition);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollPosition;
    }
  };

  // Create a modified theme with the selected envelope color
  const theme = React.useMemo(() => {
    const envelopeColors = {
      'yellow-green': {
        line: '#b8ff00',
        lineHover: '#d4ff33',
        point: '#b8ff00',
        hitZone: '#b8ff0026',
      },
      'bright-cyan': {
        line: '#00e5ff',
        lineHover: '#33eeff',
        point: '#00e5ff',
        hitZone: '#00e5ff26',
      },
      'hot-pink': {
        line: '#ff007f',
        lineHover: '#ff33a3',
        point: '#ff007f',
        hitZone: '#ff007f26',
      },
    };

    return {
      ...baseTheme,
      audio: {
        ...baseTheme.audio,
        envelope: {
          ...baseTheme.audio.envelope,
          ...envelopeColors[envelopeColor],
        },
      },
    };
  }, [baseTheme, envelopeColor]);

  // View options
  const [showRmsInWaveform, setShowRmsInWaveform] = React.useState(true);
  const [showVerticalRulers, setShowVerticalRulers] = React.useState(true);

  // Timeline ruler format options
  const [timelineFormat, setTimelineFormat] = React.useState<'minutes-seconds' | 'beats-measures'>('minutes-seconds');
  const [bpm] = React.useState(120);
  const [beatsPerMeasure] = React.useState(4);

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

  // Timeline ruler context menu state
  const [timelineRulerContextMenu, setTimelineRulerContextMenu] = React.useState<{
    isOpen: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Time selection context menu state
  const [timeSelectionContextMenu, setTimeSelectionContextMenu] = React.useState<{
    isOpen: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Ref to prevent menu from re-opening immediately after closing
  const contextMenuClosedTimeRef = React.useRef<number>(0);

  // Ref to track the menu element so we can exclude it from click-outside detection
  const timeSelectionMenuRef = React.useRef<HTMLDivElement>(null);

  // Close time selection context menu when clicking anywhere (except right-click or on the menu itself)
  const handleGlobalMouseDown = React.useCallback((e: MouseEvent) => {
    // Close menu on left-click (button 0) or middle-click (button 1)
    // Don't close on right-click (button 2) as that might open the menu
    // Don't close if clicking on the menu itself (let the menu handle its own clicks)
    if (e.button !== 2 && timeSelectionContextMenu) {
      const target = e.target as Node;
      const menuElement = timeSelectionMenuRef.current;

      // If clicking outside the menu, close it
      if (menuElement && !menuElement.contains(target)) {
        contextMenuClosedTimeRef.current = Date.now();
        setTimeSelectionContextMenu(null);
      }
    }
  }, [timeSelectionContextMenu]);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown);
  }, [handleGlobalMouseDown]);

  // Update display while playing - master toggle for auto-scroll
  const [updateDisplayWhilePlaying, setUpdateDisplayWhilePlaying] = React.useState(true);

  // Pinned playhead mode - playhead stays at center, canvas scrolls (only when updateDisplayWhilePlaying is true)
  const [pinnedPlayHead, setPinnedPlayHead] = React.useState(false);

  // Click ruler to start playback - clicking timeline ruler starts playback from that position
  const [clickRulerToStartPlayback, setClickRulerToStartPlayback] = React.useState(false);

  // Zoom toggle levels - two predefined zoom levels to toggle between
  const [zoomToggleLevel1, setZoomToggleLevel1] = React.useState('zoom-default');
  const [zoomToggleLevel2, setZoomToggleLevel2] = React.useState('5ths-of-seconds');

  // Loop region state - defines looping boundaries for playback
  const [loopRegionEnabled, setLoopRegionEnabled] = React.useState(false);
  const [loopRegionStart, setLoopRegionStart] = React.useState<number | null>(null);
  const [loopRegionEnd, setLoopRegionEnd] = React.useState<number | null>(null);
  const [loopRegionInteracting, setLoopRegionInteracting] = React.useState(false);
  const [loopRegionHovering, setLoopRegionHovering] = React.useState(false);

  // Sync loop region with AudioPlaybackManager
  React.useEffect(() => {
    const audioManager = audioManagerRef.current;
    audioManager.setLoopEnabled(loopRegionEnabled);
    audioManager.setLoopRegion(loopRegionStart, loopRegionEnd);
  }, [loopRegionEnabled, loopRegionStart, loopRegionEnd]);

  // Track keyboard focus state - only one track can have keyboard focus at a time
  const [keyboardFocusedTrack, setKeyboardFocusedTrack] = React.useState<number | null>(0);

  // Track whether the control panel specifically has focus (for the inset outline)
  const [controlPanelHasFocus, setControlPanelHasFocus] = React.useState<number | null>(null);

  // Track canvas height for playhead stalk
  const [canvasHeight, setCanvasHeight] = React.useState(1000);

  // Track mouse cursor position in timeline (in seconds)
  const [mouseCursorPosition, setMouseCursorPosition] = React.useState<number | undefined>(undefined);

  // Track mouse cursor Y position for vertical ruler (in pixels, relative to tracks container)
  const [mouseCursorY, setMouseCursorY] = React.useState<number | undefined>(undefined);

  // Track whether mouse is over a track (not gap between tracks)
  const [isOverTrack, setIsOverTrack] = React.useState(false);

  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const timelineRulerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const trackHeaderScrollRef = React.useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = React.useRef(false);
  const isProgrammaticScrollRef = React.useRef(false);

  // Audio playback state
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioManagerRef = React.useRef(getAudioPlaybackManager());

  // Track meter levels during playback (trackIndex -> level 0-100)
  const [trackMeterLevels, setTrackMeterLevels] = React.useState<Map<number, number>>(new Map());

  // Recording state
  const recordingManagerRef = React.useRef<RecordingManager | null>(null);
  const [isMicMonitoring, setIsMicMonitoring] = React.useState(false);
  const [micWaveformData, setMicWaveformData] = React.useState<number[]>([]);

  // Track the anchor point for time selection (the fixed end while extending)
  const selectionAnchorRef = React.useRef<number | null>(null);

  // Track the current selection edges for rapid arrow key updates
  const selectionEdgesRef = React.useRef<{ startTime: number; endTime: number } | null>(null);

  // Clipboard for copy/cut/paste
  const [clipboard, setClipboard] = React.useState<{
    clips: any[]; // Array of clips with trackIndex
    operation: 'copy' | 'cut';
  } | null>(null);

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

    // Set up meter update callback to display playback levels
    audioManager.setMeterUpdateCallback((trackIndex, level) => {
      setTrackMeterLevels(prev => {
        const next = new Map(prev);
        next.set(trackIndex, level);
        return next;
      });
    });

    // Cleanup on unmount
    return () => {
      audioManager.cleanup();
    };
  }, [dispatch]);

  // Reload clips for playback whenever tracks change (but not during playback/recording)
  React.useEffect(() => {
    if (!isPlaying && !state.isRecording) {
      const audioManager = audioManagerRef.current;
      audioManager.loadClips(state.tracks, state.playheadPosition);
    }
  }, [state.tracks, isPlaying, state.isRecording, state.playheadPosition]);

  // Handle play/pause transport controls
  const handlePlay = async () => {
    const audioManager = audioManagerRef.current;

    // Use audio manager's state as source of truth, not React state
    if (audioManager.getIsPlaying()) {
      audioManager.pause();
      setIsPlaying(false);
    } else {
      // Check if resuming from pause
      const isPaused = audioManager.getIsPaused();

      if (!isPaused) {
        // Load clips for:
        // - First play
        // - Resume after stop
        audioManager.loadClips(state.tracks, state.playheadPosition);
        // Start playback from current playhead position
        await audioManager.play(state.playheadPosition);
      } else {
        // Resuming from pause - use the actual paused position from audio manager
        const resumePosition = audioManager.getPausedPosition() ?? state.playheadPosition;
        audioManager.loadClips(state.tracks, resumePosition);
        await audioManager.play(resumePosition);
      }

      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    const audioManager = audioManagerRef.current;
    audioManager.stop();
    setIsPlaying(false);
    setTrackMeterLevels(new Map()); // Reset all meter levels to 0
  };

  // Start mic monitoring automatically when component mounts
  React.useEffect(() => {
    const startAutoMonitoring = async () => {
      try {
        // Create recording manager for monitoring
        recordingManagerRef.current = new RecordingManager({
          onMeterUpdate: (level, peak) => {
            // Only update if we have a focused track
            if (state.focusedTrackIndex !== null) {
              dispatch({
                type: 'UPDATE_RECORDING_METERS',
                payload: { level, peak }
              });
            }
          },
          onPlayheadUpdate: () => {}, // Not used during monitoring
          onRecordingComplete: () => {}, // Not used during monitoring
          onWaveformUpdate: (waveformData) => {
            setMicWaveformData(waveformData);
          },
        });

        await recordingManagerRef.current.startMonitoring();
        setIsMicMonitoring(true);
      } catch (error) {
        // Mic access denied or not available - silently fail
        console.log('Microphone monitoring not available:', error);
      }
    };

    startAutoMonitoring();
  }, []); // Run once on mount

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

  // Handle recording
  const handleRecord = async () => {
    if (state.isRecording) {
      // Stop recording (but keep monitoring active)
      if (recordingManagerRef.current) {
        await recordingManagerRef.current.stopRecording();
      }
      dispatch({ type: 'STOP_RECORDING' });
    } else {
      // Start recording - find a track to record into
      let trackIndex = state.focusedTrackIndex;

      // If no track is focused, use the first non-label track
      if (trackIndex === null) {
        trackIndex = state.tracks.findIndex(t =>
          !t.name.toLowerCase().includes('label')
        );
      }

      // If still no track found, we need at least one audio track
      if (trackIndex === -1) {
        toast.error('Please add an audio track before recording');
        return;
      }

      // Start recording
      dispatch({ type: 'START_RECORDING', payload: { trackIndex } });

      // Capture trackIndex and playhead position for callback closure
      const recordingTrackIndex = trackIndex;
      const recordingStartPosition = state.playheadPosition;

      // If not already monitoring, create recording manager
      if (!recordingManagerRef.current) {
        recordingManagerRef.current = new RecordingManager({
          onMeterUpdate: (level, peak) => {
            dispatch({
              type: 'UPDATE_RECORDING_METERS',
              payload: { level, peak }
            });
          },
          onPlayheadUpdate: (position) => {
            dispatch({
              type: 'SET_PLAYHEAD_POSITION',
              payload: position
            });
          },
          onRecordingComplete: (audioBuffer) => {
          // Generate waveform from audio buffer
          const channelData = audioBuffer.getChannelData(0);
          const waveform = Array.from(channelData);
          const waveformRms = generateRmsWaveform(waveform);

          // Create new clip at recording start position
          const clipDuration = audioBuffer.duration;
          const clipId = Date.now();

          // Add audio buffer to playback manager
          const audioManager = audioManagerRef.current;
          audioManager.addClipBuffer(clipId, audioBuffer);

          dispatch({
            type: 'ADD_CLIP',
            payload: {
              trackIndex: recordingTrackIndex,
              clip: {
                id: clipId,
                name: 'Recording',
                start: recordingStartPosition,
                duration: clipDuration,
                waveform,
                waveformRms,
                envelopePoints: [],
                color: 'cyan' as const,
              },
            },
          });
        },
        onWaveformUpdate: (waveformData) => {
          setMicWaveformData(waveformData);
        },
      });
      }

      await recordingManagerRef.current.startRecording(recordingStartPosition);
    }
  };

  // Cleanup recording manager on unmount
  React.useEffect(() => {
    return () => {
      if (recordingManagerRef.current) {
        recordingManagerRef.current.dispose();
      }
    };
  }, []);

  // Auto-scroll to keep playhead in view during playback
  React.useEffect(() => {
    // Only auto-scroll if playing and "Update display while playing" is enabled
    if (!isPlaying || !updateDisplayWhilePlaying || !scrollContainerRef.current) return;

    const playheadPixelPosition = state.playheadPosition * pixelsPerSecond;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const currentScrollX = scrollContainerRef.current.scrollLeft;

    if (pinnedPlayHead) {
      // Pinned playhead mode: keep playhead at center, scroll canvas continuously
      const centerPosition = containerWidth / 2;
      const targetScrollX = Math.max(0, playheadPixelPosition - centerPosition);

      // Only scroll if playhead has moved past center and scroll position needs updating
      if (playheadPixelPosition > centerPosition && Math.abs(currentScrollX - targetScrollX) > 1) {
        isProgrammaticScrollRef.current = true;
        scrollContainerRef.current.scrollLeft = targetScrollX;
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
    } else {
      // Page turn mode: playhead moves across screen, jumps when off screen
      // Check if playhead is off screen to the right
      if (playheadPixelPosition > currentScrollX + containerWidth) {
        // Page turn: scroll forward by one viewport width
        const newScrollX = currentScrollX + containerWidth;
        isProgrammaticScrollRef.current = true;
        scrollContainerRef.current.scrollLeft = newScrollX;
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
      // Check if playhead is off screen to the left
      else if (playheadPixelPosition < currentScrollX) {
        // Scroll to position playhead at 1/4 from the left edge
        const newScrollX = Math.max(0, playheadPixelPosition - containerWidth / 4);
        isProgrammaticScrollRef.current = true;
        scrollContainerRef.current.scrollLeft = newScrollX;
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
    }
  }, [state.playheadPosition, isPlaying, pixelsPerSecond, updateDisplayWhilePlaying, pinnedPlayHead]);

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

      // Copy selected clips (Cmd+C / Ctrl+C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
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
          setClipboard({ clips: selectedClips, operation: 'copy' });
          toast.success(`Copied ${selectedClips.length} clip${selectedClips.length > 1 ? 's' : ''}`);
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
        const targetTrackIndex = keyboardFocusedTrack ?? 0;
        if (targetTrackIndex < 0 || targetTrackIndex >= state.tracks.length) {
          toast.error('No valid track to paste to');
          return;
        }

        const pasteTime = state.playheadPosition;

        // Calculate time offset based on the earliest clip start time
        const earliestClipStart = Math.min(...clipboard.clips.map(c => c.start));
        const timeOffset = pasteTime - earliestClipStart;

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
        const newClipsWithTracks = clipboard.clips
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
        // Check if a clip has keyboard focus
        let focusedClipInfo: { clipId: string | number; trackIndex: number } | null = null;
        const activeElement = document.activeElement;
        if (activeElement) {
          const clipIdStr = activeElement.getAttribute('data-clip-id');
          const trackIndexStr = activeElement.getAttribute('data-track-index');
          if (clipIdStr !== null && trackIndexStr !== null) {
            // Try to parse as number, fallback to string
            const clipId = !isNaN(Number(clipIdStr)) ? Number(clipIdStr) : clipIdStr;
            focusedClipInfo = {
              clipId: clipId,
              trackIndex: parseInt(trackIndexStr, 10),
            };
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
          let focusClipIndex = 0;

          if (focusedClipInfo) {
            // Find the current clip index in its track
            const track = state.tracks[focusedClipInfo.trackIndex];
            const clipIndex = track.clips.findIndex(c => c.id === focusedClipInfo.clipId);

            if (clipIndex !== -1) {
              shouldMoveFocus = true;
              focusTrackIndex = focusedClipInfo.trackIndex;

              // Try to focus next clip, or previous if last, or do nothing if only clip
              const remainingClips = track.clips.filter(
                c => !clipsToDelete.some(item => item.clipId === c.id && item.trackIndex === focusedClipInfo.trackIndex)
              );

              if (remainingClips.length > 0) {
                // Find next clip that won't be deleted
                let nextClipIndex = clipIndex;
                for (let i = clipIndex + 1; i < track.clips.length; i++) {
                  const clip = track.clips[i];
                  const willBeDeleted = clipsToDelete.some(
                    item => item.clipId === clip.id && item.trackIndex === focusedClipInfo.trackIndex
                  );
                  if (!willBeDeleted) {
                    nextClipIndex = i;
                    break;
                  }
                }

                // If no next clip found, try previous
                if (nextClipIndex === clipIndex) {
                  for (let i = clipIndex - 1; i >= 0; i--) {
                    const clip = track.clips[i];
                    const willBeDeleted = clipsToDelete.some(
                      item => item.clipId === clip.id && item.trackIndex === focusedClipInfo.trackIndex
                    );
                    if (!willBeDeleted) {
                      nextClipIndex = i;
                      break;
                    }
                  }
                }

                focusClipIndex = Math.max(0, nextClipIndex - clipsToDelete.filter(
                  item => item.trackIndex === focusedClipInfo.trackIndex
                ).length);
              } else {
                shouldMoveFocus = false; // No clips left in track
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

          // Move focus to next clip after deletion completes
          if (shouldMoveFocus) {
            setTimeout(() => {
              const trackElements = document.querySelectorAll('[data-track-index]');
              const targetTrack = Array.from(trackElements).find(
                el => el.getAttribute('data-track-index') === String(focusTrackIndex)
              );
              if (targetTrack) {
                const clipElements = targetTrack.parentElement?.querySelectorAll('[role="button"]');
                if (clipElements && clipElements[focusClipIndex]) {
                  (clipElements[focusClipIndex] as HTMLElement).focus();
                }
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
    keyboardFocusedTrack,
    controlPanelHasFocus,
    dispatch,
    isFlatNavigation
  ]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const scrollTop = e.currentTarget.scrollTop;

    // Always update scrollX state to keep timeline ruler in sync
    setScrollX(scrollLeft);
    setScrollY(scrollTop);

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
      label: 'Edit Labels...',
      shortcut: 'Ctrl+B',
      onClick: () => {
        setIsLabelEditorOpen(true);
      }
    },
    {
      label: 'Preferences',
      shortcut: 'Ctrl+,',
      onClick: () => {
        setIsPreferencesModalOpen(true);
      }
    },
  ];

  // Define menu items for View menu
  const viewMenuItems: MenuItem[] = [
    {
      label: 'Show RMS in waveform',
      checked: showRmsInWaveform,
      onClick: () => {
        setShowRmsInWaveform(!showRmsInWaveform);
      }
    },
    {
      label: 'Show vertical rulers',
      checked: showVerticalRulers,
      onClick: () => {
        setShowVerticalRulers(!showVerticalRulers);
      }
    },
  ];

  // Define menu items for Effect menu
  const effectMenuItems: MenuItem[] = [
    {
      label: 'Manage Plugins...',
      onClick: () => {
        setIsPluginManagerOpen(true);
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

          // Check if track is stereo (has channelSplitRatio defined)
          const track = state.tracks[trackIndex];
          const isStereo = track.channelSplitRatio !== undefined;

          // Generate actual audio using Tone.js
          const { buffer, waveformData } = await audioManager.generateTone(duration, 8000, 'sawtooth', isStereo);

          // Store the audio buffer for playback
          audioManager.addClipBuffer(newClipId, buffer);

          const newClip = isStereo && typeof waveformData === 'object' && 'left' in waveformData ? {
            id: newClipId,
            name: 'Tone',
            start: startTime,
            duration: duration,
            waveformLeft: waveformData.left,
            waveformRight: waveformData.right,
            envelopePoints: [],
          } : {
            id: newClipId,
            name: 'Tone',
            start: startTime,
            duration: duration,
            waveform: Array.isArray(waveformData) ? waveformData : [],
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
    View: viewMenuItems,
    Effect: effectMenuItems,
    Generate: generateMenuItems,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <ApplicationHeader
        os={preferences.operatingSystem}
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
          activeMenuItem !== 'export' ? (
            <ToolbarGroup ariaLabel="Toolbar options" startTabIndex={3}>
              {showMixer && <GhostButton icon="mixer" label="Mixer" />}
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
          ) : null
        }
      />
      {activeMenuItem !== 'home' && (
        <Toolbar startTabIndex={5}>
          {/* Transport controls */}
          {activeMenuItem === 'export' ? (
            // Export tab: Play, stop, loop + export buttons
            <>
              <ToolbarButtonGroup gap={2}>
                <TransportButton icon={isPlaying ? "pause" : "play"} onClick={handlePlay} />
                <TransportButton icon="stop" onClick={handleStop} />
                <TransportButton
                  icon="loop"
                  active={loopRegionEnabled}
                  onClick={() => {
                    if (!loopRegionEnabled) {
                      // Enabling loop
                      if (loopRegionStart === null || loopRegionEnd === null) {
                        // No existing loop region - create one
                        if (state.timeSelection) {
                          // Use time selection if available
                          setLoopRegionStart(state.timeSelection.startTime);
                          setLoopRegionEnd(state.timeSelection.endTime);
                        } else {
                          // Create default 4-measure loop region
                          const secondsPerBeat = 60 / bpm;
                          const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
                          const loopDuration = secondsPerMeasure * 4; // 4 measures
                          setLoopRegionStart(0);
                          setLoopRegionEnd(loopDuration);
                        }
                      }
                      // If loop region already exists, just enable it without changing start/end
                    }
                    // Toggle enabled state (doesn't clear the loop region)
                    setLoopRegionEnabled(!loopRegionEnabled);
                  }}
                />
              </ToolbarButtonGroup>

              <ToolbarDivider />

              <ToolbarButtonGroup gap={8}>
                <Button
                  variant="secondary"
                  size="default"
                  icon={'\uEF25'}
                  onClick={() => setIsShareDialogOpen(true)}
                >
                  Share on audio.com
                </Button>
              </ToolbarButtonGroup>

              <ToolbarDivider />

              <ToolbarButtonGroup gap={8}>
                <Button
                  variant="secondary"
                  size="default"
                  icon={'\uEF24'}
                  onClick={() => {
                    setInitialExportType('full-project');
                    setIsExportModalOpen(true);
                  }}
                >
                  Export audio
                </Button>
                <Button
                  variant="secondary"
                  size="default"
                  icon={'\uEF1F'}
                  onClick={() => {
                    // Validate loop region exists before opening export modal
                    if (!loopRegionEnabled || loopRegionStart === null || loopRegionEnd === null) {
                      setAlertDialogTitle('No loop region');
                      setAlertDialogMessage('Export audio in loop region requires an active loop in the project. Please go back, create a loop and try again.');
                      setAlertDialogOpen(true);
                      return;
                    }
                    setInitialExportType('loop-region');
                    setIsExportModalOpen(true);
                  }}
                >
                  Export loop region
                </Button>
              </ToolbarButtonGroup>
            </>
          ) : (
            // Project tab: Show all transport controls
            <>
              <ToolbarButtonGroup gap={2}>
                <TransportButton icon={isPlaying ? "pause" : "play"} onClick={handlePlay} />
                <TransportButton icon="stop" onClick={handleStop} />
                <TransportButton
                  icon="record"
                  active={state.isRecording}
                  disabled={isPlaying}
                  onClick={handleRecord}
                />
                <TransportButton icon="skip-back" disabled={isPlaying} />
                <TransportButton icon="skip-forward" disabled={isPlaying} />
                <TransportButton
                  icon="loop"
                  active={loopRegionEnabled}
                  onClick={() => {
                    if (!loopRegionEnabled) {
                      // Enabling loop
                      if (loopRegionStart === null || loopRegionEnd === null) {
                        // No existing loop region - create one
                        if (state.timeSelection) {
                          // Use time selection if available
                          setLoopRegionStart(state.timeSelection.startTime);
                          setLoopRegionEnd(state.timeSelection.endTime);
                        } else {
                          // Create default 4-measure loop region
                          const secondsPerBeat = 60 / bpm;
                          const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
                          const loopDuration = secondsPerMeasure * 4; // 4 measures
                          setLoopRegionStart(0);
                          setLoopRegionEnd(loopDuration);
                        }
                      }
                      // If loop region already exists, just enable it without changing start/end
                    }
                    setLoopRegionEnabled(!loopRegionEnabled);
                  }}
                />
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
                    <ToolButton icon="zoom-in" onClick={zoomIn} />
                    <ToolButton icon="zoom-out" onClick={zoomOut} />
                    <ToolButton icon="zoom-to-selection" onClick={zoomToSelection} />
                    <ToolButton icon="zoom-to-fit" onClick={zoomToFitProject} />
                    <ToolButton icon="zoom-toggle" onClick={zoomToggle} />
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
                    <ToolButton icon="zoom-in" onClick={zoomIn} />
                    <ToolButton icon="zoom-out" onClick={zoomOut} />
                    <ToolButton icon="zoom-toggle" onClick={zoomToggle} />
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
            </>
          )}
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
          {/* Track Control Side Panel - Hidden on export tab */}
          {activeMenuItem !== 'export' && (
            <TrackControlSidePanel
              trackHeights={state.tracks.map(t => t.height || 114)}
              trackViewModes={state.tracks.map(t => t.viewMode)}
              focusedTrackIndex={keyboardFocusedTrack}
              scrollRef={trackHeaderScrollRef}
              onScroll={handleTrackHeaderScroll}
              bufferSpace={(scrollContainerRef.current?.clientHeight || 0) * 0.5}
              onTrackResize={(trackIndex, height) => {
                dispatch({ type: 'UPDATE_TRACK_HEIGHT', payload: { index: trackIndex, height } });
              }}
              onAddTrackType={(type: TrackType) => {
                let trackName = `Track ${state.tracks.length + 1}`;
                if (type === 'label') {
                  trackName = `Label ${state.tracks.length + 1}`;
                } else if (type === 'stereo') {
                  trackName = `Stereo ${state.tracks.length + 1}`;
                } else if (type === 'mono') {
                  trackName = `Mono ${state.tracks.length + 1}`;
                }

                const newTrack = {
                  id: state.tracks.length + 1,
                  name: trackName,
                  type: (type === 'label' ? 'label' : 'audio') as 'audio' | 'label',
                  height: type === 'label' ? 76 : 114,
                  ...(type === 'stereo' ? { channelSplitRatio: 0.5 } : {}),
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
              let trackType: 'mono' | 'stereo' | 'label' = 'mono';
              if (track.name.toLowerCase().includes('label')) {
                trackType = 'label';
              } else if (track.name.toLowerCase().includes('stereo')) {
                trackType = 'stereo';
              }

              // Determine height state based on track height
              const trackHeight = track.height || 114;
              let heightState: 'default' | 'truncated' | 'collapsed';
              if (trackHeight <= 44) {
                heightState = 'collapsed';
              } else if (trackHeight <= 82) {
                heightState = 'truncated';
              } else {
                heightState = 'default';
              }

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
                  // Meter props - show recording levels if recording, monitoring levels if focused and monitoring, playback levels if playing
                  meterLevel={
                    state.isRecording && state.recordingTrackIndex === index
                      ? state.recordingMeterLevel
                      : isMicMonitoring && state.focusedTrackIndex === index
                        ? state.recordingMeterLevel
                        : isPlaying
                          ? trackMeterLevels.get(index) || 0
                          : 0
                  }
                  meterLevelLeft={
                    state.isRecording && state.recordingTrackIndex === index
                      ? state.recordingMeterLevel
                      : isMicMonitoring && state.focusedTrackIndex === index
                        ? state.recordingMeterLevel
                        : isPlaying
                          ? trackMeterLevels.get(index) || 0
                          : 0
                  }
                  meterLevelRight={
                    state.isRecording && state.recordingTrackIndex === index
                      ? state.recordingMeterLevel
                      : isMicMonitoring && state.focusedTrackIndex === index
                        ? state.recordingMeterLevel
                        : isPlaying
                          ? trackMeterLevels.get(index) || 0
                          : 0
                  }
                  meterClipped={state.recordingPeakLevel > 100}
                  meterStyle="default"
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
                      trackIndex: index,
                      text: '',
                      startTime: state.timeSelection?.startTime ?? state.playheadPosition,
                      endTime: state.timeSelection?.endTime ?? state.playheadPosition,
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
                  height={heightState}
                  trackHeight={trackHeight}
                  onClick={() => {
                    dispatch({ type: 'SELECT_TRACK', payload: index });
                    setKeyboardFocusedTrack(index);
                  }}
                  onToggleSelection={() => {
                    // Cmd/Ctrl+Click: Toggle track selection
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
                  onRangeSelection={() => {
                    // Shift+Click: Select range from last selected track to this track
                    if (state.selectedTrackIndices.length === 0) {
                      // No existing selection, just select this track
                      dispatch({ type: 'SET_SELECTED_TRACKS', payload: [index] });
                      return;
                    }

                    // Find the last selected track (highest index in current selection)
                    const lastSelected = Math.max(...state.selectedTrackIndices);
                    const start = Math.min(lastSelected, index);
                    const end = Math.max(lastSelected, index);

                    // Create array of all indices between start and end (inclusive)
                    const rangeSelection = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                    dispatch({ type: 'SET_SELECTED_TRACKS', payload: rangeSelection });
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
          )}

          {/* Timeline Ruler + Canvas Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Timeline Ruler Row (with fixed vertical ruler header) */}
            <div style={{ display: 'flex', flexDirection: 'row', flexShrink: 0 }}>
              {/* Timeline Ruler - Fixed at top */}
              <div
                ref={canvasContainerRef}
                style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
              >
              <div
                ref={timelineRulerRef}
                style={{ width: '100%', position: 'relative' }}
                onMouseMove={(e) => {
                  if (timelineRulerRef.current) {
                    const rect = timelineRulerRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left + scrollX; // Add scrollX to convert viewport to canvas space
                    const CLIP_CONTENT_OFFSET = 12; // Match the constant from components
                    const timePosition = (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;
                    setMouseCursorPosition(timePosition >= 0 ? timePosition : undefined);
                  }
                }}
                onMouseLeave={() => {
                  setMouseCursorPosition(undefined);
                }}
                onClick={async (e) => {
                  // Only handle click if "Click ruler to start playback" is enabled
                  if (!clickRulerToStartPlayback || !timelineRulerRef.current) return;

                  const rect = timelineRulerRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left + scrollX; // Add scrollX since click is in viewport space
                  const CLIP_CONTENT_OFFSET = 12;
                  const clickedTime = (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;

                  // Only proceed if clicked in valid time range
                  if (clickedTime >= 0) {
                    // Set playhead position to clicked time
                    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: clickedTime });

                    // Start playback from this position
                    const audioManager = audioManagerRef.current;

                    // Stop if currently playing
                    if (audioManager.getIsPlaying()) {
                      audioManager.stop();
                      setIsPlaying(false);
                    }

                    // Load clips and start playback from clicked position
                    audioManager.loadClips(state.tracks, clickedTime);
                    await audioManager.play(clickedTime);
                    setIsPlaying(true);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setTimelineRulerContextMenu({
                    isOpen: true,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
              >
                <TimelineRuler
                  pixelsPerSecond={pixelsPerSecond}
                  scrollX={scrollX}
                  totalDuration={timelineDuration}
                  width={timelineWidth}
                  height={40}
                  timeSelection={rulerTimeSelection}
                  spectralSelection={spectralSelection}
                  selectionColor="rgba(112, 181, 255, 0.5)"
                  cursorPosition={mouseCursorPosition}
                  timeFormat={timelineFormat}
                  bpm={bpm}
                  beatsPerMeasure={beatsPerMeasure}
                  loopRegionEnabled={loopRegionEnabled}
                  loopRegionStart={loopRegionStart}
                  loopRegionEnd={loopRegionEnd}
                  onLoopRegionChange={(start, end) => {
                    setLoopRegionStart(start);
                    setLoopRegionEnd(end);
                  }}
                  onLoopRegionInteracting={setLoopRegionInteracting}
                  onLoopRegionEnabledToggle={() => setLoopRegionEnabled(!loopRegionEnabled)}
                  onLoopRegionHoverChange={setLoopRegionHovering}
                />
                {/* Loop region stalks in ruler (visible on hover or during interaction, only when enabled) */}
                {loopRegionStart !== null && loopRegionEnd !== null && (loopRegionInteracting || loopRegionHovering) && loopRegionEnabled && (
                  <>
                    {/* Start stalk */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${12 + loopRegionStart * pixelsPerSecond}px`,
                        top: 0,
                        width: '2px',
                        height: '40px',
                        backgroundColor: loopRegionEnabled
                          ? theme.audio.timeline.loopRegionBorder
                          : theme.audio.timeline.loopRegionBorderInactive,
                        pointerEvents: 'none',
                        zIndex: 100,
                      }}
                    />
                    {/* End stalk */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${12 + loopRegionEnd * pixelsPerSecond}px`,
                        top: 0,
                        width: '2px',
                        height: '40px',
                        backgroundColor: loopRegionEnabled
                          ? theme.audio.timeline.loopRegionBorder
                          : theme.audio.timeline.loopRegionBorderInactive,
                        pointerEvents: 'none',
                        zIndex: 100,
                      }}
                    />
                  </>
                )}
                {/* Playhead icon only in ruler */}
                <PlayheadCursor
                  position={state.playheadPosition}
                  pixelsPerSecond={pixelsPerSecond}
                  height={0}
                  showTopIcon={true}
                  iconTopOffset={24}
                  scrollX={scrollX}
                  onPositionChange={(newPosition) => {
                    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: newPosition });
                    // Also update Transport position if paused (so resume continues from new position)
                    const audioManager = audioManagerRef.current;
                    if (audioManager.getIsPaused()) {
                      audioManager.seek(newPosition);
                    }
                  }}
                  minPosition={0} // Allow playhead stalk to touch the 12px gap area
                />
              </div>
            </div>

            {/* Fixed Vertical Ruler Header (next to timeline ruler) */}
              {showVerticalRulers && (
                <div style={{
                  width: '64px',
                  height: '40px', // Match timeline ruler height
                  flexShrink: 0,
                  backgroundColor: baseTheme.background.surface.elevated,
                  borderLeft: `1px solid ${baseTheme.border.default}`,
                  borderBottom: `1px solid ${baseTheme.border.default}`,
                }} />
              )}
            </div>

            {/* Canvas + Scrollable Vertical Rulers Row */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
              {/* Canvas wrapper for custom scrollbars */}
              <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                {/* Scrollable Canvas area */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="canvas-scroll-container"
                  style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'scroll',
                    backgroundColor: theme.background.canvas.default,
                    cursor: 'text',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  } as React.CSSProperties}
              onMouseMove={(e) => {
                if (scrollContainerRef.current) {
                  const rect = scrollContainerRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left + scrollX;
                  const y = e.clientY - rect.top + scrollY;
                  const CLIP_CONTENT_OFFSET = 12;
                  const timePosition = (x - CLIP_CONTENT_OFFSET) / 100;
                  setMouseCursorPosition(timePosition >= 0 ? timePosition : undefined);
                  setMouseCursorY(y >= 0 ? y : undefined);

                  // Check if mouse is over a track (not a gap or spacer)
                  const TRACK_GAP = 2;
                  const CLIP_HEADER_HEIGHT = 20;
                  let overTrack = false;
                  let currentY = 0;

                  for (const track of state.tracks) {
                    const trackHeight = track.height || 114;
                    // Check if within track bounds, but not in the 20px spacer
                    if (y >= currentY + CLIP_HEADER_HEIGHT && y < currentY + trackHeight) {
                      overTrack = true;
                      break;
                    }
                    currentY += trackHeight + TRACK_GAP;
                  }

                  setIsOverTrack(overTrack);
                }
              }}
              onMouseLeave={() => {
                setMouseCursorPosition(undefined);
                setMouseCursorY(undefined);
                setIsOverTrack(false);
              }}
            >
              <div style={{ minWidth: `${timelineWidth}px`, minHeight: `${canvasHeight}px`, position: 'relative', cursor: 'text' }}>
                <ThemeProvider theme={theme}>
                  <Canvas
                    pixelsPerSecond={pixelsPerSecond}
                    width={timelineWidth}
                    leftPadding={12}
                    keyboardFocusedTrack={keyboardFocusedTrack}
                    showRmsInWaveform={showRmsInWaveform}
                    controlPointStyle={controlPointStyle}
                    viewportHeight={scrollContainerRef.current?.clientHeight || 0}
                    onClipMenuClick={(clipId, trackIndex, x, y, openedViaKeyboard) => {
                      setClipContextMenu({ isOpen: true, x, y, clipId, trackIndex, openedViaKeyboard });
                    }}
                    onTimeSelectionMenuClick={(x, y) => {
                      // Prevent menu from opening within 300ms of being closed
                      const timeSinceClosed = Date.now() - contextMenuClosedTimeRef.current;
                      if (timeSinceClosed > 300) {
                        setTimeSelectionContextMenu({ isOpen: true, x, y });
                      }
                    }}
                    onTrackFocusChange={(trackIndex, hasFocus) => {
                      if (hasFocus) {
                        dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
                      }
                      setControlPanelHasFocus(null);
                    }}
                    onHeightChange={setCanvasHeight}
                  />
                </ThemeProvider>
                {/* Playhead stalk only (no icon) - extends to fill scrollable area */}
                <PlayheadCursor
                  position={state.playheadPosition}
                  pixelsPerSecond={pixelsPerSecond}
                  height={Math.max(canvasHeight, scrollContainerRef.current?.clientHeight || 1000)}
                  showTopIcon={false}
                />
                {/* Loop region stalks - extend down through all tracks (visible on hover or during interaction, only when enabled) */}
                {loopRegionStart !== null && loopRegionEnd !== null && (loopRegionInteracting || loopRegionHovering) && loopRegionEnabled && (
                  <>
                    {/* Start stalk */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${12 + loopRegionStart * pixelsPerSecond}px`,
                        top: 0,
                        width: '2px',
                        height: `${Math.max(canvasHeight, scrollContainerRef.current?.clientHeight || 1000)}px`,
                        backgroundColor: loopRegionEnabled
                          ? theme.audio.timeline.loopRegionBorder
                          : theme.audio.timeline.loopRegionBorderInactive,
                        pointerEvents: 'none',
                        zIndex: 100,
                      }}
                    />
                    {/* End stalk */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${12 + loopRegionEnd * pixelsPerSecond}px`,
                        top: 0,
                        width: '2px',
                        height: `${Math.max(canvasHeight, scrollContainerRef.current?.clientHeight || 1000)}px`,
                        backgroundColor: loopRegionEnabled
                          ? theme.audio.timeline.loopRegionBorder
                          : theme.audio.timeline.loopRegionBorderInactive,
                        pointerEvents: 'none',
                        zIndex: 100,
                      }}
                    />
                  </>
                )}
              </div>
            </div>

              {/* Custom Scrollbars */}
              <CustomScrollbar
                contentRef={scrollContainerRef}
                orientation="horizontal"
                height={20}
              />
              <CustomScrollbar
                contentRef={scrollContainerRef}
                orientation="vertical"
                width={20}
              />
            </div>

              {/* Vertical Amplitude Rulers */}
              {showVerticalRulers && (
                <VerticalRulerPanel
                  tracks={state.tracks.map((track, index) => ({
                    id: track.id.toString(),
                    height: track.height || 114,
                    selected: state.selectedTrackIndices.includes(index),
                    focused: state.focusedTrackIndex === index,
                    stereo: track.channelSplitRatio !== undefined,
                    viewMode: track.viewMode,
                    trackType: track.type,
                    channelSplitRatio: track.channelSplitRatio,
                  }))}
                  width={64}
                  headerHeight={0}
                  scrollY={scrollY}
                  cursorY={isOverTrack ? mouseCursorY : undefined}
                />
              )}
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
        os={preferences.operatingSystem}
        onClose={() => setIsShareDialogOpen(false)}
        width={400}
        minHeight={0}
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
        os={preferences.operatingSystem}
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
        os={preferences.operatingSystem}
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
        os={preferences.operatingSystem}
      />

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        os={preferences.operatingSystem}
        zoomToggleLevel1={zoomToggleLevel1}
        onZoomToggleLevel1Change={setZoomToggleLevel1}
        zoomToggleLevel2={zoomToggleLevel2}
        onZoomToggleLevel2Change={setZoomToggleLevel2}
      />

      {/* Plugin Browser Dialog */}
      <PluginBrowserDialog
        isOpen={isPluginBrowserOpen}
        onClose={() => setIsPluginBrowserOpen(false)}
        os={preferences.operatingSystem}
      />

      {/* Audio Setup Context Menu */}
      {audioSetupMenuAnchor && (
        <div
          style={{
            position: 'fixed',
            top: audioSetupMenuAnchor.y,
            left: audioSetupMenuAnchor.x,
            zIndex: 10000,
            minWidth: '220px',
          }}
          onMouseLeave={() => setAudioSetupMenuAnchor(null)}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              padding: '4px 0',
            }}
          >
            <ContextMenuItem
              label="Host"
              hasSubmenu
              onClick={() => {}}
            />
            <ContextMenuItem
              label={`Playback device: ${selectedPlaybackDevice}`}
              hasSubmenu
              onClick={() => {}}
            >
              {availableAudioOutputs.map((device) => (
                <ContextMenuItem
                  key={device.deviceId}
                  label={device.label || 'Unknown Device'}
                  icon={selectedPlaybackDevice === device.label ? <span style={{ marginRight: '8px' }}>✓</span> : undefined}
                  onClick={async () => {
                    setSelectedPlaybackDevice(device.label || 'Unknown Device');
                    setAudioSetupMenuAnchor(null);

                    // Actually route audio to the selected device
                    try {
                      const audioManager = audioManagerRef.current;
                      await audioManager.setAudioOutputDevice(device.deviceId);
                      toast.success(`Playback device: ${device.label || 'Unknown Device'}`);
                    } catch (error) {
                      toast.error('Failed to set playback device. Your browser may not support this feature.');
                    }
                  }}
                />
              ))}
            </ContextMenuItem>
            <ContextMenuItem
              label={`Recording device: ${selectedRecordingDevice}`}
              hasSubmenu
              onClick={() => {}}
            >
              {availableAudioInputs.map((device) => (
                <ContextMenuItem
                  key={device.deviceId}
                  label={device.label || 'Unknown Device'}
                  icon={selectedRecordingDevice === device.label ? <span style={{ marginRight: '8px' }}>✓</span> : undefined}
                  onClick={() => {
                    setSelectedRecordingDevice(device.label || 'Unknown Device');
                    setAudioSetupMenuAnchor(null);
                    toast.success(`Recording device: ${device.label || 'Unknown Device'}`);
                  }}
                />
              ))}
            </ContextMenuItem>
            <ContextMenuItem
              label="Recording channels"
              hasSubmenu
              onClick={() => {}}
            />
            <div style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }} />
            <ContextMenuItem
              label="Rescan audio devices"
              onClick={() => {
                toast.info('Rescanning audio devices...');
                setAudioSetupMenuAnchor(null);
              }}
            />
            <ContextMenuItem
              label="Audio settings"
              onClick={() => {
                setAudioSetupMenuAnchor(null);
                toast.info('Opening audio settings...');
              }}
            />
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={(settings: ExportSettings) => {
          console.log('Export settings:', settings);
          toast.success(settings.exportType === 'loop-region' ? 'Exporting loop region!' : 'Export started!');
        }}
        onEditMetadata={() => {
          toast.info('Edit metadata clicked');
        }}
        os={preferences.operatingSystem}
        initialExportType={initialExportType}
        hasLoopRegion={loopRegionEnabled && loopRegionStart !== null && loopRegionEnd !== null}
        onValidationError={(title, message) => {
          setAlertDialogTitle(title);
          setAlertDialogMessage(message);
          setAlertDialogOpen(true);
        }}
      />

      {/* Label Editor */}
      <LabelEditor
        isOpen={isLabelEditorOpen}
        labels={state.tracks.flatMap((track) =>
          (track.labels || []).map(label => ({ ...label, id: String(label.id) }))
        )}
        tracks={[
          ...state.tracks
            .map((track, index) => ({ track, index }))
            .filter(({ track }) => track.clips.length === 0) // Only label tracks (no clips)
            .map(({ track, index }) => ({
              value: index.toString(),
              label: track.name,
            })),
          // Add "New Label Track..." option
          { value: '__NEW__', label: 'New Label Track...' },
        ]}
        playheadPosition={state.playheadPosition}
        onChange={(updatedLabels) => {
          // Group labels by track, converting string IDs back to numbers
          const labelsByTrack = new Map<number, typeof updatedLabels>();
          updatedLabels.forEach(label => {
            if (!labelsByTrack.has(label.trackIndex)) {
              labelsByTrack.set(label.trackIndex, []);
            }
            labelsByTrack.get(label.trackIndex)!.push(label);
          });

          // Update each existing track with its labels
          // Note: If a label points to a non-existent track (e.g., one being created),
          // it will be handled on the next render when that track exists
          state.tracks.forEach((_track, trackIndex) => {
            if (labelsByTrack.has(trackIndex)) {
              const newLabels = labelsByTrack.get(trackIndex)!.map(label => ({
                ...label,
                id: parseInt(label.id, 10),
              }));
              dispatch({
                type: 'UPDATE_TRACK',
                payload: {
                  index: trackIndex,
                  track: { labels: newLabels }
                }
              });
            }
          });
        }}
        onClose={() => setIsLabelEditorOpen(false)}
        onImport={() => toast.info('Import labels')}
        onExport={() => toast.info('Export labels')}
        onAddLabel={async () => {
          console.log('onAddLabel called');
          // Find first label track
          const labelTrackIndex = state.tracks.findIndex(t => t.clips.length === 0);
          console.log('labelTrackIndex:', labelTrackIndex);

          if (labelTrackIndex === -1) {
            // No label tracks exist - create one
            const trackName = window.prompt('Enter label track name:', 'Label Track');
            if (!trackName) return;

            const newTrackIndex = state.tracks.length;
            const maxId = Math.max(...state.tracks.map(t => t.id), 0);
            const newTrackId = maxId + 1;

            const newTrack = {
              id: newTrackId,
              name: trackName,
              type: 'label' as const,
              height: 76,
              clips: [],
              labels: [],
            };

            // Create track first
            dispatch({
              type: 'ADD_TRACK',
              payload: newTrack,
            });

            // Then add label to the new track
            const newLabel = {
              id: Date.now(),
              trackIndex: newTrackIndex,
              text: '',
              startTime: state.timeSelection?.startTime ?? state.playheadPosition,
              endTime: state.timeSelection?.endTime ?? state.playheadPosition,
            };

            dispatch({
              type: 'ADD_LABEL',
              payload: {
                trackIndex: newTrackIndex,
                label: newLabel,
              },
            });

            toast.success(`Created label track: ${trackName}`);
          } else {
            // Label track exists, add label to it
            const newLabel = {
              id: Date.now(),
              trackIndex: labelTrackIndex,
              text: '',
              startTime: state.timeSelection?.startTime ?? state.playheadPosition,
              endTime: state.timeSelection?.endTime ?? state.playheadPosition,
            };

            dispatch({
              type: 'ADD_LABEL',
              payload: {
                trackIndex: labelTrackIndex,
                label: newLabel,
              },
            });
          }
        }}
        onNewTrackRequest={async (labelId) => {
          // Prompt user for track name
          const trackName = window.prompt('Enter label track name:', 'Label Track');

          if (!trackName) {
            return null; // User cancelled
          }

          // Calculate the new track's index (where it will be added)
          const newTrackIndex = state.tracks.length;

          // Find next available track ID
          const maxId = Math.max(...state.tracks.map(t => t.id), 0);
          const newTrackId = maxId + 1;

          // If labelId is empty, we're just creating a new empty track
          if (!labelId) {
            const newTrack = {
              id: newTrackId,
              name: trackName,
              type: 'label' as const,
              height: 76,
              clips: [],
              labels: [],
            };

            dispatch({
              type: 'ADD_TRACK',
              payload: newTrack,
            });

            toast.success(`Created label track: ${trackName}`);
            return newTrackIndex;
          }

          // Find the label that needs to be moved
          let sourceTrackIndex = -1;
          let labelToMove: any = null;

          state.tracks.forEach((track, trackIndex) => {
            const label = track.labels?.find(l => l.id === parseInt(labelId, 10));
            if (label) {
              sourceTrackIndex = trackIndex;
              labelToMove = label;
            }
          });

          if (!labelToMove || sourceTrackIndex === -1) {
            toast.error('Label not found');
            return null;
          }

          // Create new label track WITH the label already in it
          const newTrack = {
            id: newTrackId,
            name: trackName,
            type: 'label' as const,
            height: 76,
            clips: [],
            labels: [{ ...labelToMove, trackIndex: newTrackIndex }],
          };

          // Remove label from source track
          const sourceTrack = state.tracks[sourceTrackIndex];
          const updatedSourceLabels = sourceTrack.labels?.filter(l => l.id !== labelToMove.id) || [];

          // Dispatch both operations
          dispatch({
            type: 'UPDATE_TRACK',
            payload: {
              index: sourceTrackIndex,
              track: { labels: updatedSourceLabels }
            }
          });

          dispatch({
            type: 'ADD_TRACK',
            payload: newTrack,
          });

          toast.success(`Created label track: ${trackName}`);

          // Return the new track's index
          return newTrackIndex;
        }}
        os={preferences.operatingSystem}
      />

      {/* Plugin Manager Dialog */}
      <PluginManagerDialog
        isOpen={isPluginManagerOpen}
        plugins={plugins}
        onChange={setPlugins}
        onClose={() => setIsPluginManagerOpen(false)}
        os={preferences.operatingSystem}
      />

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        title={alertDialogTitle}
        message={alertDialogMessage}
        os={preferences.operatingSystem}
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
        operatingSystem={preferences.operatingSystem}
        onOperatingSystemChange={(os) => updatePreference('operatingSystem', os)}
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
        envelopeColor={envelopeColor}
        onEnvelopeColorChange={setEnvelopeColor}
        controlPointStyle={controlPointStyle}
        onControlPointStyleChange={setControlPointStyle}
        showMixer={showMixer}
        onShowMixerChange={setShowMixer}
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
            if (clipContextMenu) {
              // Find the clip to cut
              const track = state.tracks[clipContextMenu.trackIndex];
              const clip = track?.clips.find(c => c.id === clipContextMenu.clipId);

              if (clip) {
                setClipboard({ clips: [{ ...clip, trackIndex: clipContextMenu.trackIndex }], operation: 'cut' });

                // Immediately remove the clip from the track
                dispatch({
                  type: 'DELETE_CLIP',
                  payload: {
                    trackIndex: clipContextMenu.trackIndex,
                    clipId: clipContextMenu.clipId,
                  },
                });

                toast.success('Cut clip');
              }
              setClipContextMenu(null);
            }
          }}
          onCopy={() => {
            if (clipContextMenu) {
              // Find the clip to copy
              const track = state.tracks[clipContextMenu.trackIndex];
              const clip = track?.clips.find(c => c.id === clipContextMenu.clipId);

              if (clip) {
                setClipboard({ clips: [{ ...clip, trackIndex: clipContextMenu.trackIndex }], operation: 'copy' });
                toast.success('Copied clip');
              }
              setClipContextMenu(null);
            }
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

      {/* Timeline Ruler Context Menu */}
      {timelineRulerContextMenu && (
        <TimelineRulerContextMenu
          isOpen={timelineRulerContextMenu.isOpen}
          x={timelineRulerContextMenu.x}
          y={timelineRulerContextMenu.y}
          onClose={() => setTimelineRulerContextMenu(null)}
          timeFormat={timelineFormat}
          onTimeFormatChange={(format) => {
            setTimelineFormat(format);
            toast.info(`Time format changed to: ${format}`);
            setTimelineRulerContextMenu(null);
          }}
          updateDisplayWhilePlaying={updateDisplayWhilePlaying}
          onToggleUpdateDisplay={() => {
            setUpdateDisplayWhilePlaying(!updateDisplayWhilePlaying);
            toast.info(`Update display while playing ${!updateDisplayWhilePlaying ? 'enabled' : 'disabled'}`);
            setTimelineRulerContextMenu(null);
          }}
          pinnedPlayHead={pinnedPlayHead}
          onTogglePinnedPlayHead={() => {
            setPinnedPlayHead(!pinnedPlayHead);
            toast.info(`Pinned play head ${!pinnedPlayHead ? 'enabled' : 'disabled'}`);
            setTimelineRulerContextMenu(null);
          }}
          clickRulerToStartPlayback={clickRulerToStartPlayback}
          onToggleClickRulerToStartPlayback={() => {
            setClickRulerToStartPlayback(!clickRulerToStartPlayback);
            toast.info(`Click ruler to start playback ${!clickRulerToStartPlayback ? 'enabled' : 'disabled'}`);
            setTimelineRulerContextMenu(null);
          }}
          loopRegionEnabled={loopRegionEnabled}
          onToggleLoopRegion={() => {
            if (!loopRegionEnabled) {
              // Enabling loop
              if (loopRegionStart === null || loopRegionEnd === null) {
                // No existing loop region - create one
                if (state.timeSelection) {
                  // Use time selection if available
                  setLoopRegionStart(state.timeSelection.startTime);
                  setLoopRegionEnd(state.timeSelection.endTime);
                } else {
                  // Create default 4-measure loop region
                  const secondsPerBeat = 60 / bpm;
                  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
                  const loopDuration = secondsPerMeasure * 4;
                  setLoopRegionStart(0);
                  setLoopRegionEnd(loopDuration);
                }
              }
            }
            setLoopRegionEnabled(!loopRegionEnabled);
            toast.info(`Loop region ${!loopRegionEnabled ? 'enabled' : 'disabled'}`);
            setTimelineRulerContextMenu(null);
          }}
          onClearLoopRegion={() => {
            setLoopRegionStart(null);
            setLoopRegionEnd(null);
            setLoopRegionEnabled(false);
            toast.info('Loop region cleared');
            setTimelineRulerContextMenu(null);
          }}
          onSetLoopRegionToSelection={() => {
            if (state.timeSelection) {
              setLoopRegionStart(state.timeSelection.startTime);
              setLoopRegionEnd(state.timeSelection.endTime);
              setLoopRegionEnabled(true);
              toast.info('Loop region set to selection');
            } else {
              toast.info('No time selection to set loop region from');
            }
            setTimelineRulerContextMenu(null);
          }}
          onSetSelectionToLoop={() => {
            if (loopRegionStart !== null && loopRegionEnd !== null) {
              dispatch({
                type: 'SET_TIME_SELECTION',
                payload: { startTime: loopRegionStart, endTime: loopRegionEnd },
              });
              toast.info('Selection set to loop region');
            } else {
              toast.info('No loop region to set selection from');
            }
            setTimelineRulerContextMenu(null);
          }}
          creatingLoopSelectsAudio={false}
          onToggleCreatingLoopSelectsAudio={() => {
            toast.info('Creating loop selects audio - toggled');
            setTimelineRulerContextMenu(null);
          }}
          showVerticalRulers={showVerticalRulers}
          onToggleVerticalRulers={() => {
            setShowVerticalRulers(!showVerticalRulers);
            setTimelineRulerContextMenu(null);
          }}
        />
      )}

      {/* Time Selection Context Menu - Temporarily disabled */}
    </div>
  );
}

// Wrapper component that applies the theme based on preferences
function ThemedApp() {
  const { preferences } = usePreferences();
  const currentTheme = preferences.theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <AccessibilityProfileProvider initialProfileId="wcag-flat">
        <TracksProvider initialTracks={[]}>
          <SpectralSelectionProvider>
            <CanvasDemoContent />
          </SpectralSelectionProvider>
        </TracksProvider>
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
    return <TokenReview />;
  }

  // Show spectral ruler demo if ?page=spectral-ruler
  if (page === 'spectral-ruler') {
    return (
      <PreferencesProvider>
        <ThemeProvider>
          <SpectralRulerDemo />
        </ThemeProvider>
      </PreferencesProvider>
    );
  }

  // Default: show main app with preferences provider outside theme provider
  return (
    <PreferencesProvider>
      <ThemedApp />
    </PreferencesProvider>
  );
}

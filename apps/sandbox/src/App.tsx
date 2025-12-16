import React from 'react';
import { TracksProvider } from './contexts/TracksContext';
import { Canvas } from './components/Canvas';
import { ApplicationHeader, OperatingSystem, ProjectToolbar, GhostButton, Toolbar, ToolbarButtonGroup, ToolbarDivider, TransportButton, ToolButton, ToggleToolButton, TrackControlSidePanel, TrackControlPanel, TimelineRuler, PlayheadCursor, TimeCode, TimeCodeFormat, ToastContainer, toast, SelectionToolbar, Dialog, DialogFooter, SignInActionBar, LabeledInput, SocialSignInButton, LabeledFormDivider, TextLink, Button, LabeledCheckbox, MenuItem, SaveProjectModal, HomeTab } from '@audacity-ui/components';
import { useTracks } from './contexts/TracksContext';
import { DebugPanel } from './components/DebugPanel';

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
];

type Workspace = 'classic' | 'spectral-editing';

function CanvasDemoContent() {
  const { state, dispatch } = useTracks();
  const [scrollX, setScrollX] = React.useState(0);
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

  // Debug panel state
  const [isDebugPanelOpen, setIsDebugPanelOpen] = React.useState(false);
  const [isCloudUploading, setIsCloudUploading] = React.useState(false);
  const [showDuration, setShowDuration] = React.useState(false);
  const [showProjectRate, setShowProjectRate] = React.useState(false);
  const [operatingSystem, setOperatingSystem] = React.useState<OperatingSystem>('windows');
  const [debugTrackCount, setDebugTrackCount] = React.useState(4);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Sync playhead position with TimeCode display
  const currentTime = state.playheadPosition;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    console.log('Scroll event:', scrollLeft);
    setScrollX(scrollLeft);
  };

  const handleToggleEnvelope = () => {
    dispatch({ type: 'SET_ENVELOPE_MODE', payload: !state.envelopeMode });
  };

  const handleToggleSpectrogram = () => {
    dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: !state.spectrogramMode });
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
                toast.success('Synced!', 'Your project has been saved to audio.com', undefined, 3000);
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

  const menuDefinitions = {
    File: fileMenuItems,
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
          <>
            <GhostButton icon="mixer" label="Mixer" />
            <GhostButton icon="cog" label="Audio setup" />
            <GhostButton
              icon="cloud"
              label="Share audio"
              onClick={() => setIsShareDialogOpen(true)}
            />
          </>
        }
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#3d3e42' }}>Workspace</span>
            <select
              style={{ fontSize: '13px', padding: '4px 8px', border: '1px solid #d4d5d9', borderRadius: '4px', backgroundColor: '#fff' }}
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value as Workspace)}
            >
              <option value="classic">Classic</option>
              <option value="spectral-editing">Spectral editing</option>
            </select>
            <GhostButton icon="undo" />
            <GhostButton icon="redo" />
          </div>
        }
      />
      {activeMenuItem !== 'home' && (
        <Toolbar>
          {/* Transport controls - shown in all workspaces */}
          <ToolbarButtonGroup gap={2}>
            <TransportButton icon="play" />
            <TransportButton icon="stop" />
            <TransportButton icon="record" />
            <TransportButton icon="skip-back" />
            <TransportButton icon="skip-forward" />
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
                  onClick={() => toast.info('Cut', 'Selected audio has been cut to clipboard', undefined, 10000)}
                />
                <ToolButton
                  icon="copy"
                  onClick={() => toast.info('Copy', 'Selected audio has been copied to clipboard', undefined, 10000)}
                />
                <ToolButton
                  icon="paste"
                  onClick={() => toast.info('Paste', 'Audio has been pasted from clipboard', undefined, 10000)}
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
          {/* Track Control Side Panel - Full Height */}
          <TrackControlSidePanel
            trackHeights={state.tracks.map(t => t.height || 114)}
            trackViewModes={state.tracks.map(t => t.viewMode)}
            focusedTrackIndex={state.focusedTrackIndex}
            onTrackResize={(trackIndex, height) => {
              dispatch({ type: 'UPDATE_TRACK_HEIGHT', payload: { index: trackIndex, height } });
            }}
            onDeleteTrack={(trackIndex) => {
              console.log('Delete track:', trackIndex);
              // TODO: Implement delete track
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
            {state.tracks.map((track, index) => (
              <TrackControlPanel
                key={track.id}
                trackName={track.name}
                trackType="mono"
                volume={75}
                pan={0}
                isMuted={false}
                isSolo={false}
                onMuteToggle={() => {}}
                onSoloToggle={() => {}}
                state={state.selectedTrackIndices.includes(index) ? 'active' : 'idle'}
                height="default"
                onClick={() => dispatch({ type: 'SELECT_TRACK', payload: index })}
              />
            ))}
          </TrackControlSidePanel>

          {/* Timeline Ruler + Canvas Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Timeline Ruler - Fixed at top */}
            <div ref={canvasContainerRef} style={{ position: 'relative', backgroundColor: '#1a1b26', flexShrink: 0, overflow: 'hidden' }}>
              <div style={{ transform: `translateX(-${scrollX}px)`, width: '5000px', position: 'relative' }}>
                <TimelineRuler
                  pixelsPerSecond={100}
                  scrollX={0}
                  totalDuration={50}
                  width={5000}
                  height={40}
                  timeSelection={rulerTimeSelection}
                  spectralSelection={state.spectralSelection}
                  selectionColor="rgba(112, 181, 255, 0.5)"
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

            {/* Canvas - Scrollable */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{ flex: 1, overflowX: 'scroll', overflowY: 'hidden', backgroundColor: '#212433' }}
            >
              <div style={{ minWidth: '5000px', height: '100%', position: 'relative' }}>
                <Canvas pixelsPerSecond={100} width={5000} leftPadding={12} />
                {/* Playhead stalk only (no icon) */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                  <PlayheadCursor
                    position={state.playheadPosition}
                    pixelsPerSecond={100}
                    height={1000}
                    showTopIcon={false}
                  />
                </div>
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
                toast.success('Sign in successful!');
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
                toast.success('Signed in with Google!');
                setIsCreateAccountOpen(false);
                setIsSignedIn(true);
                setEmail('');
                setPassword('');
              }}
            />
            <SocialSignInButton
              provider="facebook"
              onClick={() => {
                toast.success('Signed in with Facebook!');
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
      />
    </div>
  );
}

export default function App() {
  return (
    <TracksProvider initialTracks={sampleTracks}>
      <CanvasDemoContent />
    </TracksProvider>
  );
}

import React from 'react';
import { WelcomeDialog, EffectDialog, EffectHeader, EffectDialogContextMenu, AmplifyEffect, ReverbEffect, Dialog, DialogFooter, SignInActionBar, LabeledInput, SocialSignInButton, LabeledFormDivider, TextLink, Button, LabeledCheckbox, ContextMenuItem, SaveProjectModal, PreferencesModal, PluginBrowserDialog, MacroManager, ExportModal, ExportSettings, LabelEditor, PluginManagerDialog, Plugin, VSTEffectOptionsDialog, AlertDialog, toast } from '@audacity-ui/components';
import { EFFECT_REGISTRY } from '@audacity-ui/core';
import { DebugPanel } from './DebugPanel';
import { generateWaveform } from '../utils/waveformGenerator';
import { saveProject, getProject, getProjects } from '../utils/projectDatabase';
import { availableCommands } from '../data/commands';
import { useDialogs } from '../contexts/DialogContext';
import { useContextMenus } from '../contexts/ContextMenuContext';

export interface AppDialogsProps {
  // Welcome dialog
  welcomeDialog: { isOpen: boolean; onClose: () => void };

  // Audio engine
  audioEngine: any;

  // Track/clip state
  tracks: any[];
  masterEffects: any[];
  dispatch: React.Dispatch<any>;

  // Auth state
  isSignedIn: boolean;
  setIsSignedIn: React.Dispatch<React.SetStateAction<boolean>>;
  authMode: 'signin' | 'create';
  setAuthMode: React.Dispatch<React.SetStateAction<'signin' | 'create'>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  emailError: boolean;
  setEmailError: React.Dispatch<React.SetStateAction<boolean>>;
  passwordError: boolean;
  setPasswordError: React.Dispatch<React.SetStateAction<boolean>>;
  validationErrorMessage: string;
  setValidationErrorMessage: React.Dispatch<React.SetStateAction<string>>;

  // Cloud state
  isCloudProject: boolean;
  setIsCloudProject: React.Dispatch<React.SetStateAction<boolean>>;
  isCloudUploading: boolean;
  setIsCloudUploading: React.Dispatch<React.SetStateAction<boolean>>;
  cloudProjectName: string;
  setCloudProjectName: React.Dispatch<React.SetStateAction<string>>;
  currentProjectId: string | null;
  dontShowSyncAgain: boolean;
  setDontShowSyncAgain: React.Dispatch<React.SetStateAction<boolean>>;
  dontShowSaveModalAgain: boolean;
  setDontShowSaveModalAgain: React.Dispatch<React.SetStateAction<boolean>>;
  indexedDBProjects: any[];
  setIndexedDBProjects: React.Dispatch<React.SetStateAction<any[]>>;

  // Project state
  projectName: string;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;

  // Cloud audio files
  cloudAudioFiles: any[];
  setCloudAudioFiles: React.Dispatch<React.SetStateAction<any[]>>;

  // Vendor UI
  showVendorUI: boolean;
  setShowVendorUI: React.Dispatch<React.SetStateAction<boolean>>;

  // Audio setup
  audioSetupMenuAnchor: { x: number; y: number } | null;
  setAudioSetupMenuAnchor: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  selectedRecordingDevice: string;
  setSelectedRecordingDevice: React.Dispatch<React.SetStateAction<string>>;
  selectedPlaybackDevice: string;
  setSelectedPlaybackDevice: React.Dispatch<React.SetStateAction<string>>;
  availableAudioInputs: MediaDeviceInfo[];
  availableAudioOutputs: MediaDeviceInfo[];

  // Audio manager ref
  audioManagerRef: React.RefObject<any>;

  // Macros
  macros: Array<{ id: string; name: string; steps: Array<{ command: string; parameters: string }> }>;
  setMacros: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; steps: Array<{ command: string; parameters: string }> }>>>;
  selectedMacroId: string | undefined;
  setSelectedMacroId: React.Dispatch<React.SetStateAction<string | undefined>>;

  // Plugins
  plugins: Plugin[];
  setPlugins: React.Dispatch<React.SetStateAction<Plugin[]>>;

  // Export
  initialExportType: string;
  loopRegionEnabled: boolean;
  loopRegionStart: number | null;
  loopRegionEnd: number | null;
  alertDialogTitle: string;
  setAlertDialogTitle: React.Dispatch<React.SetStateAction<string>>;
  alertDialogMessage: string;
  setAlertDialogMessage: React.Dispatch<React.SetStateAction<string>>;

  // Preferences
  zoomToggleLevel1: string;
  setZoomToggleLevel1: React.Dispatch<React.SetStateAction<string>>;
  zoomToggleLevel2: string;
  setZoomToggleLevel2: React.Dispatch<React.SetStateAction<string>>;

  // Scroll container ref (for save-to-cloud thumbnail)
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;

  // Save to computer handler
  handleSaveToComputer: () => Promise<void>;

  // OS preference
  os: 'windows' | 'macos';
  updatePreference: (key: string, value: any) => void;

  // Debug panel
  debugTrackCount: number;
  setDebugTrackCount: React.Dispatch<React.SetStateAction<number>>;
  showFocusDebug: boolean;
  setShowFocusDebug: React.Dispatch<React.SetStateAction<boolean>>;
  activeProfile: any;
  profiles: any[];
  setProfile: (id: string) => void;
  useSplitRecordButton: boolean;
  setUseSplitRecordButton: React.Dispatch<React.SetStateAction<boolean>>;
  showMixer: boolean;
  setShowMixer: React.Dispatch<React.SetStateAction<boolean>>;
  // Active menu item (for debug panel close)
  setActiveMenuItem: React.Dispatch<React.SetStateAction<'home' | 'project' | 'export' | 'debug'>>;

  // State (for cutMode, timeSelection, playheadPosition)
  state: any;
}

export function AppDialogs(props: AppDialogsProps) {
  const dialogs = useDialogs();
  const { effectDialog, setEffectDialog, effectContextMenu, setEffectContextMenu } = useContextMenus();
  const {
    welcomeDialog, audioEngine,
    tracks, masterEffects, dispatch,
    isSignedIn, setIsSignedIn, authMode, setAuthMode,
    email, setEmail, password, setPassword,
    emailError, setEmailError, passwordError, setPasswordError,
    validationErrorMessage, setValidationErrorMessage,
    isCloudProject, setIsCloudProject, isCloudUploading, setIsCloudUploading,
    cloudProjectName, setCloudProjectName, currentProjectId,
    dontShowSyncAgain, setDontShowSyncAgain,
    dontShowSaveModalAgain, setDontShowSaveModalAgain,
    indexedDBProjects, setIndexedDBProjects,
    projectName, setProjectName,
    cloudAudioFiles: _cloudAudioFiles, setCloudAudioFiles,
    showVendorUI, setShowVendorUI,
    audioSetupMenuAnchor, setAudioSetupMenuAnchor,
    selectedRecordingDevice, setSelectedRecordingDevice,
    selectedPlaybackDevice, setSelectedPlaybackDevice,
    availableAudioInputs, availableAudioOutputs,
    audioManagerRef,
    macros, setMacros, selectedMacroId, setSelectedMacroId,
    plugins, setPlugins,
    initialExportType, loopRegionEnabled, loopRegionStart, loopRegionEnd,
    alertDialogTitle, setAlertDialogTitle, alertDialogMessage, setAlertDialogMessage,
    zoomToggleLevel1, setZoomToggleLevel1, zoomToggleLevel2, setZoomToggleLevel2,
    scrollContainerRef, handleSaveToComputer,
    os, updatePreference,
    debugTrackCount, setDebugTrackCount,
    showFocusDebug, setShowFocusDebug,
    activeProfile, profiles, setProfile,
    useSplitRecordButton, setUseSplitRecordButton,
    showMixer, setShowMixer,
    setActiveMenuItem,
    state,
  } = props;

  return (
    <>
      {/* Welcome Dialog */}
      <WelcomeDialog
        isOpen={welcomeDialog.isOpen}
        onClose={welcomeDialog.onClose}
      />

      {/* Effect Dialog */}
      {effectDialog && (() => {
        const effect = effectDialog.trackIndex !== undefined
          ? tracks[effectDialog.trackIndex]?.effects?.[effectDialog.effectIndex]
          : masterEffects[effectDialog.effectIndex];

        return (
          <EffectDialog
            effectName={effectDialog.effectName}
            isOpen={effectDialog.isOpen}
            onClose={() => {
              const trigger = effectDialog.triggerElement;
              setEffectDialog(null);
              if (trigger) {
                setTimeout(() => trigger.focus(), 0);
              }
            }}
            headerSlot={
              <EffectHeader
                automationEnabled={effect?.enabled ?? true}
                onToggleAutomation={(enabled) => {
                  if (effectDialog.trackIndex !== undefined) {
                    dispatch({
                      type: 'UPDATE_TRACK_EFFECT',
                      payload: {
                        trackIndex: effectDialog.trackIndex,
                        effectIndex: effectDialog.effectIndex,
                        updates: { enabled }
                      }
                    });
                  } else {
                    dispatch({
                      type: 'UPDATE_MASTER_EFFECT',
                      payload: {
                        effectIndex: effectDialog.effectIndex,
                        updates: { enabled }
                      }
                    });
                  }
                }}
                presetName="Default preset"
                onSavePreset={() => {}}
                onUndo={() => {}}
                onDeletePreset={() => {}}
                onMoreOptions={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setEffectContextMenu({
                    isOpen: true,
                    x: rect.right,
                    y: rect.bottom,
                  });
                }}
              />
            }
            onOk={() => {
            }}
            onPreview={() => {
            }}
            hideFooter={effectDialog.effectName === 'Reverb'}
          >
            {effectDialog.effectName === 'Reverb' && (() => {
              const effectId = effectDialog.trackIndex !== undefined
                ? `track-${effectDialog.trackIndex}-effect-${effectDialog.effectIndex}`
                : `master-effect-${effectDialog.effectIndex}`;

              return (
                <ReverbEffect
                  onChange={(params) => {
                    audioEngine.updateReverbParams(effectId, params);
                  }}
                />
              );
            })()}
            {effectDialog.effectName === 'Compressor' && <AmplifyEffect />}
            {effectDialog.effectName === 'Limiter' && <AmplifyEffect />}
          </EffectDialog>
        );
      })()}

      {/* Effect Dialog Context Menu */}
      {effectDialog && (() => {
        const allEffects = Object.values(EFFECT_REGISTRY).flat();
        const effectDef = allEffects.find(e => e.name === effectDialog.effectName);
        const isThirdParty = effectDef?.provider !== 'Audacity';

        console.log('Effect Dialog:', {
          effectName: effectDialog.effectName,
          effectDef,
          provider: effectDef?.provider,
          isThirdParty
        });

        return (
          <EffectDialogContextMenu
            isOpen={effectContextMenu.isOpen}
            x={effectContextMenu.x}
            y={effectContextMenu.y}
            onClose={() => setEffectContextMenu({ ...effectContextMenu, isOpen: false })}
            onSavePreset={() => {
              console.log('Save preset clicked');
            }}
            onDeletePreset={() => {
              console.log('Delete preset clicked');
            }}
            canDelete={false}
            factoryPresets={['Default', 'Heavy', 'Light', 'Room', 'Hall', 'Cathedral']}
            onSelectFactoryPreset={(preset) => {
              console.log('Factory preset selected:', preset);
            }}
            onImport={() => {
              console.log('Import clicked');
            }}
            onExport={() => {
              console.log('Export clicked');
            }}
            onShowVendorUI={() => {
              setShowVendorUI(!showVendorUI);
            }}
            showVendorUI={showVendorUI}
            onOptions={() => {
              dialogs.setIsVSTOptionsDialogOpen(true);
            }}
            isThirdParty={isThirdParty}
            aboutInfo={effectDef ? {
              type: effectDef.type ?? 'Built-in',
              name: effectDef.name,
              version: effectDef.version ?? '3.7.5',
              vendor: effectDef.provider,
              description: effectDef.description ?? '',
            } : undefined}
          />
        );
      })()}

      {/* Share Audio Dialog */}
      <Dialog
        isOpen={dialogs.isShareDialogOpen}
        title="Share audio to Cloud"
        os={os}
        onClose={() => dialogs.setIsShareDialogOpen(false)}
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
                const title = projectName.trim();
                dialogs.setIsShareDialogOpen(false);
                dialogs.setIsSyncingDialogOpen(true);

                const mixdownToastId = toast.progress('Mixing down audio...');

                (async () => {
                  try {
                    const { blob, duration, waveformData } = await audioManagerRef.current.mixdown(tracks);

                    toast.updateProgress(mixdownToastId, 50, 'Uploading to cloud...');

                    await new Promise(resolve => setTimeout(resolve, 1500));

                    toast.updateProgress(mixdownToastId, 100, 'Done');

                    const mins = Math.floor(duration / 60);
                    const secs = Math.floor(duration % 60);
                    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

                    const sizeKB = blob.size / 1024;
                    const sizeStr = sizeKB > 1024
                      ? `${(sizeKB / 1024).toFixed(1)} MB`
                      : `${Math.round(sizeKB)} KB`;

                    const blobUrl = URL.createObjectURL(blob);

                    setCloudAudioFiles(prev => [{
                      id: `audio-${Date.now()}`,
                      title,
                      dateText: 'TODAY',
                      duration: durationStr,
                      size: sizeStr,
                      blobUrl,
                      waveformData,
                    }, ...prev]);

                    setTimeout(() => {
                      toast.dismiss(mixdownToastId);
                      toast.success(
                        'Audio shared to cloud!',
                        'Your mixdown is available in Cloud audio files.',
                        [{ label: 'View on audio.com', onClick: () => console.log('View on audio.com') }],
                        0
                      );
                    }, 200);
                  } catch (err) {
                    toast.dismiss(mixdownToastId);
                    toast.error(`Mixdown failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  }
                })();
              } else if (projectName.trim()) {
                dialogs.setIsCreateAccountOpen(true);
              } else {
                toast.error('Please enter a track title');
              }
            }}
            onSecondaryClick={() => {
              dialogs.setIsShareDialogOpen(false);
              setProjectName('');
            }}
            primaryDisabled={!projectName.trim()}
          />
        }
      >
        <LabeledInput
          label="Track title"
          value={projectName}
          onChange={setProjectName}
          placeholder="Enter track title"
          width="100%"
        />
      </Dialog>

      {/* Save Project to Cloud Dialog */}
      <Dialog
        isOpen={dialogs.isSaveToCloudDialogOpen}
        title="Save project to Cloud"
        os={os}
        onClose={() => dialogs.setIsSaveToCloudDialogOpen(false)}
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
                dialogs.setIsSaveToCloudDialogOpen(false);
                dialogs.setIsSyncingDialogOpen(true);
                setIsCloudUploading(true);

                if (currentProjectId) {
                  (async () => {
                    let thumbnailUrl: string | undefined;
                    if (scrollContainerRef.current) {
                      try {
                        const domtoimage = (await import('dom-to-image-more')).default;
                        thumbnailUrl = await domtoimage.toJpeg(scrollContainerRef.current, {
                          quality: 0.8,
                          bgcolor: '#F5F5F7',
                          width: 448,
                          height: 252,
                          style: { transform: 'scale(1)', transformOrigin: 'top left' },
                        });
                      } catch {
                        // Continue without thumbnail
                      }
                    }
                    const proj = await getProject(currentProjectId);
                    const projectData = { tracks, playheadPosition: 0 };
                    if (proj) {
                      await saveProject({ ...proj, title: cloudProjectName.trim() || proj.title, isUploading: true, thumbnailUrl: thumbnailUrl ?? proj.thumbnailUrl, data: projectData });
                    } else {
                      await saveProject({
                        id: currentProjectId,
                        title: cloudProjectName.trim() || 'Untitled Project',
                        dateCreated: Date.now(),
                        dateModified: Date.now(),
                        isCloudProject: false,
                        isUploading: true,
                        thumbnailUrl,
                        data: projectData,
                      });
                    }
                    const updated = await getProjects();
                    setIndexedDBProjects(updated);
                  })();
                }

                const uploadToastId = toast.progress('Uploading audio to cloud...');

                const totalDuration = 10000;
                const updateInterval = 100;
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
                    setTimeout(async () => {
                      toast.dismiss(uploadToastId);
                      setIsCloudUploading(false);
                      setIsCloudProject(true);
                      if (currentProjectId) {
                        const proj = await getProject(currentProjectId);
                        if (proj) {
                          await saveProject({ ...proj, isCloudProject: true, isUploading: false, data: proj.data ?? { tracks, playheadPosition: 0 } });
                          const updated = await getProjects();
                          setIndexedDBProjects(updated);
                        }
                      }
                      toast.success(
                        'Project saved to cloud!',
                        'All saved changes will now sync to the cloud. You can access your project from any device.',
                        [
                          { label: 'View on audio.com', onClick: () => console.log('View on audio.com') }
                        ],
                        0
                      );
                    }, 200);
                  }
                }, updateInterval);
              } else if (cloudProjectName.trim()) {
                dialogs.setIsCreateAccountOpen(true);
              } else {
                toast.error('Please enter a project name');
              }
            }}
            onSecondaryClick={() => {
              dialogs.setIsSaveToCloudDialogOpen(false);
              setCloudProjectName('');
            }}
            primaryDisabled={!cloudProjectName.trim()}
          />
        }
      >
        <LabeledInput
          label="Project name"
          value={cloudProjectName}
          onChange={setCloudProjectName}
          placeholder="Enter project name"
          width="100%"
        />
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog
        isOpen={dialogs.isCreateAccountOpen}
        title={authMode === 'signin' ? 'Sign in to cloud' : 'Create cloud account'}
        os={os}
        onClose={() => dialogs.setIsCreateAccountOpen(false)}
        width={420}
        footer={
          <DialogFooter
            primaryText="Continue"
            secondaryText="Cancel"
            onPrimaryClick={() => {
              const hasEmailError = !email.trim();
              const hasPasswordError = !password.trim();

              setEmailError(hasEmailError);
              setPasswordError(hasPasswordError);

              if (hasEmailError || hasPasswordError) {
                return;
              }

              if (email === 'admin' && password === 'password') {
                dialogs.setIsCreateAccountOpen(false);
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
              dialogs.setIsCreateAccountOpen(false);
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
            {authMode === 'signin'
              ? 'Sign in to save to the cloud'
              : 'Create a free cloud storage account to access your projects and audio from any device'
            }
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <SocialSignInButton
              provider="google"
              onClick={() => {
                dialogs.setIsCreateAccountOpen(false);
                setIsSignedIn(true);
                setEmail('');
                setPassword('');
              }}
            />
            <SocialSignInButton
              provider="facebook"
              onClick={() => {
                dialogs.setIsCreateAccountOpen(false);
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

          {authMode === 'signin' && (
            <div style={{ marginTop: '-8px' }}>
              <TextLink onClick={() => {}}>
                Forgot your password?
              </TextLink>
            </div>
          )}

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
            <span>{authMode === 'signin' ? 'Need an account?' : 'Already have an account?'}</span>
            <TextLink onClick={() => setAuthMode(authMode === 'signin' ? 'create' : 'signin')}>
              {authMode === 'signin' ? 'Create cloud account' : 'Sign in here'}
            </TextLink>
          </div>
        </div>
      </Dialog>

      {/* Syncing Your Project Dialog */}
      <Dialog
        isOpen={dialogs.isSyncingDialogOpen}
        os={os}
        onClose={() => {
          dialogs.setIsSyncingDialogOpen(false);
          dialogs.setIsShareDialogOpen(false);
          setProjectName('');
        }}
        title="Share audio to Cloud"
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

            <Button
              variant="primary"
              size="default"
              onClick={() => {
                dialogs.setIsSyncingDialogOpen(false);
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
            Uploading audio to cloud
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'var(--font-size-body, 12px)',
            fontWeight: 400,
            lineHeight: '16px',
            color: 'var(--text-txt-primary, #14151a)'
          }}>
            Your audio is being mixed down and uploaded to the cloud. You can check the upload status in the bottom right corner of Audacity at any time.
          </div>
        </div>
      </Dialog>

      {/* Save Project Modal */}
      <SaveProjectModal
        isOpen={dialogs.isSaveProjectModalOpen}
        onClose={() => dialogs.setIsSaveProjectModalOpen(false)}
        onSaveToCloud={() => {
          dialogs.setIsSaveProjectModalOpen(false);
          const currentTitle = indexedDBProjects.find(p => p.id === currentProjectId)?.title ?? '';
          setCloudProjectName(currentTitle);
          dialogs.setIsSaveToCloudDialogOpen(true);
        }}
        onSaveToComputer={async () => {
          dialogs.setIsSaveProjectModalOpen(false);
          await handleSaveToComputer();
        }}
        dontShowAgain={dontShowSaveModalAgain}
        onDontShowAgainChange={setDontShowSaveModalAgain}
        cloudImageUrl="/saveToCloud.png"
        computerImageUrl="/saveToComputer.png"
        os={os}
      />

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={dialogs.isPreferencesModalOpen}
        onClose={() => dialogs.setIsPreferencesModalOpen(false)}
        os={os}
        zoomToggleLevel1={zoomToggleLevel1}
        onZoomToggleLevel1Change={setZoomToggleLevel1}
        zoomToggleLevel2={zoomToggleLevel2}
        onZoomToggleLevel2Change={setZoomToggleLevel2}
        onResetWarnings={() => {
          setDontShowSaveModalAgain(false);
        }}
      />

      {/* Plugin Browser Dialog */}
      <PluginBrowserDialog
        isOpen={dialogs.isPluginBrowserOpen}
        onClose={() => dialogs.setIsPluginBrowserOpen(false)}
        os={os}
      />

      {/* Macro Manager Dialog */}
      <MacroManager
        isOpen={dialogs.isMacroManagerOpen}
        macros={macros}
        selectedMacroId={selectedMacroId}
        onClose={() => dialogs.setIsMacroManagerOpen(false)}
        onSelectMacro={(macroId) => setSelectedMacroId(macroId)}
        onAddMacro={(name) => {
          const newMacro = {
            id: `macro-${Date.now()}`,
            name,
            steps: [
              { command: 'END', parameters: '' },
            ]
          };
          setMacros([...macros, newMacro]);
          setSelectedMacroId(newMacro.id);
        }}
        onRenameMacro={(macroId, newName) => {
          setMacros(macros.map(m => m.id === macroId ? { ...m, name: newName } : m));
        }}
        onDeleteMacro={(macroId) => {
          setMacros(macros.filter(m => m.id !== macroId));
          if (selectedMacroId === macroId) {
            setSelectedMacroId(undefined);
          }
        }}
        onAddCommand={(macroId, command) => {
          setMacros(macros.map(m => {
            if (m.id === macroId) {
              return {
                ...m,
                steps: [...m.steps, { command: command.name, parameters: '' }]
              };
            }
            return m;
          }));
        }}
        availableCommands={availableCommands}
        os={os}
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

                    try {
                      const audioManager = audioManagerRef.current;
                      await audioManager.setAudioOutputDevice(device.deviceId);
                    } catch (error) {
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
                setAudioSetupMenuAnchor(null);
              }}
            />
            <ContextMenuItem
              label="Audio settings"
              onClick={() => {
                setAudioSetupMenuAnchor(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={dialogs.isExportModalOpen}
        onClose={() => dialogs.setIsExportModalOpen(false)}
        onExport={(settings: ExportSettings) => {
          console.log('Export settings:', settings);
        }}
        onEditMetadata={() => {
        }}
        os={os}
        initialExportType={initialExportType}
        hasLoopRegion={loopRegionEnabled && loopRegionStart !== null && loopRegionEnd !== null}
        tracks={tracks.map(track => ({ id: track.id, name: track.name }))}
        onValidationError={(title, message) => {
          setAlertDialogTitle(title);
          setAlertDialogMessage(message);
          dialogs.setAlertDialogOpen(true);
        }}
      />

      {/* Label Editor */}
      <LabelEditor
        isOpen={dialogs.isLabelEditorOpen}
        labels={tracks.flatMap((track: any) =>
          (track.labels || []).map((label: any) => ({ ...label, id: String(label.id) }))
        )}
        tracks={[
          ...tracks
            .map((track: any, index: number) => ({ track, index }))
            .filter(({ track }: any) => track.clips.length === 0)
            .map(({ track, index }: any) => ({
              value: index.toString(),
              label: track.name,
            })),
          { value: '__NEW__', label: 'New Label Track...' },
        ]}
        playheadPosition={state.playheadPosition}
        onChange={(updatedLabels) => {
          const labelsByTrack = new Map<number, typeof updatedLabels>();
          updatedLabels.forEach(label => {
            if (!labelsByTrack.has(label.trackIndex)) {
              labelsByTrack.set(label.trackIndex, []);
            }
            labelsByTrack.get(label.trackIndex)!.push(label);
          });

          tracks.forEach((_track: any, trackIndex: number) => {
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
        onClose={() => dialogs.setIsLabelEditorOpen(false)}
        onImport={() => {}}
        onExport={() => {}}
        onAddLabel={async () => {
          console.log('onAddLabel called');
          const labelTrackIndex = tracks.findIndex((t: any) => t.clips.length === 0);
          console.log('labelTrackIndex:', labelTrackIndex);

          if (labelTrackIndex === -1) {
            const trackName = window.prompt('Enter label track name:', 'Label Track');
            if (!trackName) return;

            const newTrackIndex = tracks.length;
            const maxId = Math.max(...tracks.map((t: any) => t.id), 0);
            const newTrackId = maxId + 1;

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

          } else {
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
          const trackName = window.prompt('Enter label track name:', 'Label Track');

          if (!trackName) {
            return null;
          }

          const newTrackIndex = tracks.length;

          const maxId = Math.max(...tracks.map((t: any) => t.id), 0);
          const newTrackId = maxId + 1;

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

            return newTrackIndex;
          }

          let sourceTrackIndex = -1;
          let labelToMove: any = null;

          tracks.forEach((track: any, trackIndex: number) => {
            const label = track.labels?.find((l: any) => l.id === parseInt(labelId, 10));
            if (label) {
              sourceTrackIndex = trackIndex;
              labelToMove = label;
            }
          });

          if (!labelToMove || sourceTrackIndex === -1) {
            return null;
          }

          const newTrack = {
            id: newTrackId,
            name: trackName,
            type: 'label' as const,
            height: 76,
            clips: [],
            labels: [{ ...labelToMove, trackIndex: newTrackIndex }],
          };

          const sourceTrack = tracks[sourceTrackIndex];
          const updatedSourceLabels = sourceTrack.labels?.filter((l: any) => l.id !== labelToMove.id) || [];

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

          return newTrackIndex;
        }}
        os={os}
      />

      {/* Plugin Manager Dialog */}
      <PluginManagerDialog
        isOpen={dialogs.isPluginManagerOpen}
        plugins={plugins}
        onChange={setPlugins}
        onClose={() => dialogs.setIsPluginManagerOpen(false)}
        os={os}
      />

      {/* VST Effect Options Dialog */}
      <VSTEffectOptionsDialog
        isOpen={dialogs.isVSTOptionsDialogOpen}
        onClose={() => dialogs.setIsVSTOptionsDialogOpen(false)}
        onConfirm={(bufferSize, latencyCompensation) => {
          console.log('VST Options confirmed:', { bufferSize, latencyCompensation });
        }}
      />

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={dialogs.alertDialogOpen}
        onClose={() => dialogs.setAlertDialogOpen(false)}
        title={alertDialogTitle}
        message={alertDialogMessage}
        os={os}
      />

      {/* Debug Panel */}
      <DebugPanel
        isOpen={dialogs.isDebugPanelOpen}
        onClose={() => {
          dialogs.setIsDebugPanelOpen(false);
          setActiveMenuItem('project');
        }}
        isSignedIn={isSignedIn}
        onSignedInChange={setIsSignedIn}
        isCloudProject={isCloudProject}
        onCloudProjectChange={setIsCloudProject}
        isCloudUploading={isCloudUploading}
        onCloudUploadingChange={setIsCloudUploading}
        operatingSystem={os}
        onOperatingSystemChange={(osVal) => updatePreference('operatingSystem', osVal)}
        trackCount={debugTrackCount}
        onTrackCountChange={setDebugTrackCount}
        onGenerateTracks={() => {
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
            effects: i === 0 ? [
              { id: 't0-1', name: 'Reverb', enabled: true },
              { id: 't0-2', name: 'Compressor', enabled: true },
            ] : i === 1 ? [
              { id: 't1-1', name: 'EQ', enabled: true },
              { id: 't1-2', name: 'Delay', enabled: false },
            ] : i === 2 ? [
              { id: 't2-1', name: 'Chorus', enabled: true },
            ] : [],
            effectsEnabled: true,
          }));
          dispatch({ type: 'SET_TRACKS', payload: newTracks });

          dispatch({ type: 'ADD_MASTER_EFFECT', payload: { id: 'm1', name: 'Limiter', enabled: true } });
          dispatch({ type: 'ADD_MASTER_EFFECT', payload: { id: 'm2', name: 'Mastering EQ', enabled: true } });

        }}
        onClearAllTracks={() => {
          dispatch({ type: 'SET_TRACKS', payload: [] });
        }}
        onLoadColorTest={() => {
          const colors = ['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'] as const;
          const colorTracks = colors.map((color, i) => ({
            id: i + 1,
            name: color.charAt(0).toUpperCase() + color.slice(1),
            height: 114,
            clips: [
              {
                id: i * 10 + 1,
                name: color.charAt(0).toUpperCase() + color.slice(1),
                start: 0.5,
                duration: 5.0,
                waveform: generateWaveform(5.0),
                envelopePoints: [
                  { time: 0.5, db: -3 },
                  { time: 2.0, db: -12 },
                  { time: 3.5, db: -1 },
                  { time: 4.5, db: -6 },
                ],
                color,
              },
            ],
          }));
          dispatch({ type: 'SET_TRACKS', payload: colorTracks });
        }}
        showFocusDebug={showFocusDebug}
        onShowFocusDebugChange={setShowFocusDebug}
        accessibilityProfileId={activeProfile.id}
        accessibilityProfiles={profiles.map((p: any) => ({ id: p.id, name: p.name, description: p.description }))}
        onAccessibilityProfileChange={setProfile}
        cutMode={state.cutMode}
        onCutModeChange={(mode) => dispatch({ type: 'SET_CUT_MODE', payload: mode })}
        useSplitRecordButton={useSplitRecordButton}
        onUseSplitRecordButtonChange={setUseSplitRecordButton}
        showMixer={showMixer}
        onShowMixerChange={setShowMixer}
      />
    </>
  );
}

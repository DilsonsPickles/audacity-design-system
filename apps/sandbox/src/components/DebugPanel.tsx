/**
 * DebugPanel - Developer tools for testing UI states
 *
 * Provides controls for:
 * - User authentication state
 * - Cloud project state
 * - Operating system, cut mode, accessibility
 * - Track/clip generation
 */

import { Dialog, DialogFooter, LabeledCheckbox, Button } from '@dilsonspickles/components';

export interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;

  // Auth state
  isSignedIn: boolean;
  onSignedInChange: (value: boolean) => void;

  // Cloud state
  isCloudProject: boolean;
  onCloudProjectChange: (value: boolean) => void;

  isCloudUploading: boolean;
  onCloudUploadingChange: (value: boolean) => void;

  // OS
  operatingSystem: 'windows' | 'macos';
  onOperatingSystemChange: (value: 'windows' | 'macos') => void;

  // Track/clip controls
  trackCount: number;
  onTrackCountChange: (value: number) => void;

  onGenerateTracks: () => void;
  onClearAllTracks: () => void;
  onLoadColorTest: () => void;
  onTestMissingPlugins: () => void;

  // Focus tracking
  showFocusDebug: boolean;
  onShowFocusDebugChange: (value: boolean) => void;

  // Accessibility profile
  accessibilityProfileId: string;
  accessibilityProfiles: Array<{ id: string; name: string; description: string }>;
  onAccessibilityProfileChange: (profileId: string) => void;

  // Cut mode
  cutMode: 'split' | 'ripple';
  onCutModeChange: (value: 'split' | 'ripple') => void;

  // Split record button
  useSplitRecordButton: boolean;
  onUseSplitRecordButtonChange: (value: boolean) => void;

  // Mixer
  showMixer: boolean;
  onShowMixerChange: (value: boolean) => void;

  // Track selection model (classic vs follows-focus)
  trackSelectionMode: 'classic' | 'follows-focus';
  onTrackSelectionModeChange: (value: 'classic' | 'follows-focus') => void;
}

export function DebugPanel({
  isOpen,
  onClose,
  isSignedIn,
  onSignedInChange,
  isCloudProject,
  onCloudProjectChange,
  isCloudUploading,
  onCloudUploadingChange,
  operatingSystem,
  onOperatingSystemChange,
  trackCount,
  onTrackCountChange,
  onGenerateTracks,
  onClearAllTracks,
  onLoadColorTest,
  onTestMissingPlugins,
  showFocusDebug,
  onShowFocusDebugChange,
  accessibilityProfileId,
  accessibilityProfiles,
  onAccessibilityProfileChange,
  cutMode,
  onCutModeChange,
  useSplitRecordButton,
  onUseSplitRecordButtonChange,
  showMixer,
  onShowMixerChange,
  trackSelectionMode,
  onTrackSelectionModeChange,
}: DebugPanelProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Developer Tools"
      width={500}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* User State Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            User State
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <LabeledCheckbox
              label="User is signed in"
              checked={isSignedIn}
              onChange={onSignedInChange}
            />
            <LabeledCheckbox
              label="Project is synced to cloud"
              checked={isCloudProject}
              onChange={onCloudProjectChange}
              disabled={!isSignedIn}
            />
            <LabeledCheckbox
              label="Cloud project is uploading"
              checked={isCloudUploading}
              onChange={onCloudUploadingChange}
              disabled={!isCloudProject}
            />
          </div>
        </div>

        {/* Operating System Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            Operating System
          </h3>
          <div style={{
            display: 'flex',
            gap: '12px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}>
              <input
                type="radio"
                value="windows"
                checked={operatingSystem === 'windows'}
                onChange={(e) => onOperatingSystemChange(e.target.value as 'windows' | 'macos')}
                style={{ cursor: 'pointer' }}
              />
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                lineHeight: '16px',
                color: '#14151a',
              }}>
                Windows
              </span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}>
              <input
                type="radio"
                value="macos"
                checked={operatingSystem === 'macos'}
                onChange={(e) => onOperatingSystemChange(e.target.value as 'windows' | 'macos')}
                style={{ cursor: 'pointer' }}
              />
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                lineHeight: '16px',
                color: '#14151a',
              }}>
                macOS
              </span>
            </label>
          </div>
        </div>

        {/* Cut Mode Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            Cut Mode
          </h3>
          <div style={{
            display: 'flex',
            gap: '12px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}>
              <input
                type="radio"
                value="split"
                checked={cutMode === 'split'}
                onChange={(e) => onCutModeChange(e.target.value as 'split' | 'ripple')}
                style={{ cursor: 'pointer' }}
              />
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                lineHeight: '16px',
                color: '#14151a',
              }}>
                Split (leaves gaps)
              </span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}>
              <input
                type="radio"
                value="ripple"
                checked={cutMode === 'ripple'}
                onChange={(e) => onCutModeChange(e.target.value as 'split' | 'ripple')}
                style={{ cursor: 'pointer' }}
              />
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                lineHeight: '16px',
                color: '#14151a',
              }}>
                Ripple (shifts timeline)
              </span>
            </label>
          </div>
        </div>

        {/* Record Button Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            Record Button
          </h3>
          <LabeledCheckbox
            label="Use split record button"
            checked={useSplitRecordButton}
            onChange={onUseSplitRecordButtonChange}
          />
        </div>

        {/* Accessibility Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            Accessibility
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <label style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                lineHeight: '16px',
                color: '#14151a',
              }}>
                Keyboard Navigation Profile
              </label>
              <select
                value={accessibilityProfileId}
                onChange={(e) => onAccessibilityProfileChange(e.target.value)}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  padding: '6px 8px',
                  border: '1px solid #d4d5d9',
                  borderRadius: '2px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                {accessibilityProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                fontStyle: 'italic',
                lineHeight: '14px',
                color: '#14151a',
                opacity: 0.7,
              }}>
                {accessibilityProfiles.find(p => p.id === accessibilityProfileId)?.description}
              </span>
            </div>
            <LabeledCheckbox
              label="Show focused element in selection toolbar"
              checked={showFocusDebug}
              onChange={onShowFocusDebugChange}
            />
          </div>
        </div>

        {/* Mixer Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            Mixer
          </h3>
          <LabeledCheckbox
            label="Show mixer"
            checked={showMixer}
            onChange={onShowMixerChange}
          />
        </div>

        {/* Track & Clip Controls Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            Track & Clip Controls
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <label style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                lineHeight: '16px',
                color: '#14151a',
                minWidth: '100px',
              }}>
                Number of tracks:
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={trackCount}
                onChange={(e) => onTrackCountChange(parseInt(e.target.value) || 1)}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  padding: '6px 8px',
                  border: '1px solid #d4d5d9',
                  borderRadius: '2px',
                  width: '80px',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              <Button
                variant="secondary"
                size="default"
                onClick={onGenerateTracks}
              >
                Generate Tracks
              </Button>
              <Button
                variant="secondary"
                size="default"
                onClick={onClearAllTracks}
              >
                Clear All
              </Button>
              <Button
                variant="secondary"
                size="default"
                onClick={onLoadColorTest}
              >
                All Colors
              </Button>
              <Button
                variant="secondary"
                size="default"
                onClick={onTestMissingPlugins}
              >
                Missing Plugins Modal
              </Button>
            </div>
          </div>
        </div>

        {/* Track Selection Model Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            Track Selection Model
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="classic"
                checked={trackSelectionMode === 'classic'}
                onChange={(e) => onTrackSelectionModeChange(e.target.value as 'classic' | 'follows-focus')}
                style={{ cursor: 'pointer', marginTop: '2px' }}
              />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', lineHeight: '16px', color: '#14151a' }}>
                <strong>Classic</strong> — focus and selection are independent. Arrow keys move focus only; Shift+Click / Cmd+Click change selection. Option+Arrow reorders tracks.
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="follows-focus"
                checked={trackSelectionMode === 'follows-focus'}
                onChange={(e) => onTrackSelectionModeChange(e.target.value as 'classic' | 'follows-focus')}
                style={{ cursor: 'pointer', marginTop: '2px' }}
              />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', lineHeight: '16px', color: '#14151a' }}>
                <strong>Selection follows focus</strong> — plain clicks and arrow keys move focus AND replace selection. Hold <em>Cmd</em> on Arrow / Enter to decouple: peek without changing selection (Cmd+Arrow), or toggle non-contiguously (Cmd+Enter, Cmd+Click on a side-panel header). Shift extends a contiguous range. Option+Arrow reorders tracks.
              </span>
            </label>
          </div>
        </div>

        {/* Info Section */}
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(103, 124, 228, 0.1)',
          borderRadius: '4px',
          border: '1px solid rgba(103, 124, 228, 0.3)',
        }}>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            lineHeight: '16px',
            color: '#14151a',
            margin: 0,
          }}>
            💡 <strong>Tip:</strong> Use these controls to test different UI states without going through the full flow. Changes take effect immediately.
          </p>
        </div>
      </div>

      <DialogFooter
        primaryText="Close"
        onPrimaryClick={onClose}
      />
    </Dialog>
  );
}

export default DebugPanel;

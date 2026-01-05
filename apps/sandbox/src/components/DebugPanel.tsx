/**
 * DebugPanel - Developer tools for testing UI states
 *
 * Provides controls for:
 * - User authentication state
 * - Cloud project state
 * - Selection toolbar configuration
 * - Track/clip generation
 */

import { Dialog, DialogFooter, LabeledCheckbox, Button } from '@audacity-ui/components';

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

  // Selection toolbar
  showDuration: boolean;
  onShowDurationChange: (value: boolean) => void;

  showProjectRate: boolean;
  onShowProjectRateChange: (value: boolean) => void;

  // OS
  operatingSystem: 'windows' | 'macos';
  onOperatingSystemChange: (value: 'windows' | 'macos') => void;

  // Track/clip controls
  trackCount: number;
  onTrackCountChange: (value: number) => void;

  onGenerateTracks: () => void;
  onClearAllTracks: () => void;

  // Focus tracking
  showFocusDebug: boolean;
  onShowFocusDebugChange: (value: boolean) => void;

  // Accessibility profile
  accessibilityProfileId: string;
  accessibilityProfiles: Array<{ id: string; name: string; description: string }>;
  onAccessibilityProfileChange: (profileId: string) => void;
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
  showDuration,
  onShowDurationChange,
  showProjectRate,
  onShowProjectRateChange,
  operatingSystem,
  onOperatingSystemChange,
  trackCount,
  onTrackCountChange,
  onGenerateTracks,
  onClearAllTracks,
  showFocusDebug,
  onShowFocusDebugChange,
  accessibilityProfileId,
  accessibilityProfiles,
  onAccessibilityProfileChange,
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

        {/* Selection Toolbar Section */}
        <div>
          <h3 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '20px',
            color: '#14151a',
            margin: '0 0 12px 0',
          }}>
            Selection Toolbar
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <LabeledCheckbox
              label="Show duration"
              checked={showDuration}
              onChange={onShowDurationChange}
            />
            <LabeledCheckbox
              label="Show project rate"
              checked={showProjectRate}
              onChange={onShowProjectRateChange}
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
            </div>
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

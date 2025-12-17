import React, { useState } from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { Dropdown, DropdownOption } from '../Dropdown';
import { LabeledCheckbox } from '../LabeledCheckbox';
import { LabeledInput } from '../LabeledInput';
import { Separator } from '../Separator';
import { Icon } from '../Icon';
import './PreferencesModal.css';

export type PreferencesPage =
  | 'general'
  | 'appearance'
  | 'audio-settings'
  | 'playback-recording'
  | 'spectral-display'
  | 'editing'
  | 'plugins'
  | 'music'
  | 'cloud'
  | 'advanced-options'
  | 'shortcuts';

export interface PreferencesMenuItem {
  id: PreferencesPage;
  label: string;
  icon: string;
}

export interface PreferencesModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Close handler
   */
  onClose: () => void;
  /**
   * Current page
   */
  currentPage?: PreferencesPage;
  /**
   * Page change handler
   */
  onPageChange?: (page: PreferencesPage) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const menuItems: PreferencesMenuItem[] = [
  { id: 'general', label: 'General', icon: '\uEF55' }, // cog
  { id: 'appearance', label: 'Appearance', icon: '\uF444' }, // brush
  { id: 'audio-settings', label: 'Audio settings', icon: '\uEF4E' }, // volume
  { id: 'playback-recording', label: 'Playback/Recording', icon: '\uF446' }, // play
  { id: 'editing', label: 'Audio editing', icon: '\uF43C' }, // waveform
  { id: 'spectral-display', label: 'Spectral display', icon: '\uF442' }, // spectrogram
  { id: 'plugins', label: 'Plugins', icon: '\uF440' }, // plug
  { id: 'music', label: 'Music', icon: '\uF441' }, // book
  { id: 'cloud', label: 'Cloud', icon: '\uF435' }, // cloud
  { id: 'shortcuts', label: 'Shortcuts', icon: '\uF441' }, // keyboard
  { id: 'advanced-options', label: 'Advanced options', icon: '\uEF55' }, // cog
];

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  currentPage = 'general',
  onPageChange,
  className = '',
}) => {
  const [selectedPage, setSelectedPage] = useState<PreferencesPage>(currentPage);

  const handlePageChange = (page: PreferencesPage) => {
    setSelectedPage(page);
    onPageChange?.(page);
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Preferences"
      className={`preferences-modal ${className}`}
      width="880px"
    >
      <div className="preferences-modal__content">
        {/* Sidebar Menu */}
        <div className="preferences-modal__sidebar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`preferences-modal__menu-item ${
                selectedPage === item.id ? 'preferences-modal__menu-item--selected' : ''
              }`}
              onClick={() => handlePageChange(item.id)}
            >
              <span className="preferences-modal__menu-icon musescore-icon">
                {item.icon}
              </span>
              <span className="preferences-modal__menu-label">{item.label}</span>
              {selectedPage === item.id && (
                <div className="preferences-modal__menu-indicator" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="preferences-modal__body">
          <div className="preferences-modal__scroll-container">
            {selectedPage === 'general' && <GeneralPage />}
            {selectedPage === 'appearance' && <PlaceholderPage title="Appearance" />}
            {selectedPage === 'audio-settings' && <AudioSettingsPage />}
            {/* Add other pages as needed */}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="preferences-modal__footer">
        <Button variant="secondary" onClick={() => {/* Reset */}}>
          Reset preferences
        </Button>
        <div className="preferences-modal__footer-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

// General Page Content
function GeneralPage() {
  const languageOptions: DropdownOption[] = [
    { value: 'en', label: 'System (English)' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
  ];

  return (
    <div className="preferences-page">
      <div className="preferences-page__field">
        <label className="preferences-page__label">Language</label>
        <Dropdown
          options={languageOptions}
          value="en"
          width="290px"
        />
      </div>

      <div className="preferences-page__field">
        <label className="preferences-page__label">Number format</label>
        <Dropdown
          options={languageOptions}
          value="en"
          width="290px"
        />
        <span className="preferences-page__hint">Example: 1,000,000.99</span>
      </div>

      <Separator />

      <div className="preferences-page__field">
        <label className="preferences-page__label">Temporary files location</label>
        <div className="preferences-page__input-group">
          <LabeledInput
            label=""
            value="C:\Users\mc\AppData\Local\audacity"
            width="100%"
          />
          <Button variant="secondary">
            Browse
          </Button>
        </div>
        <span className="preferences-page__hint">
          Folder in which unsaved projects and other data are kept
        </span>
      </div>

      <div className="preferences-page__field">
        <label className="preferences-page__label">Free space</label>
        <div className="preferences-page__value">547.2 GB</div>
      </div>

      <Separator />

      <div className="preferences-page__checkboxes">
        <LabeledCheckbox
          label="Show what's new on launch"
          checked={true}
        />
        <LabeledCheckbox
          label="Check to see if a new version of Audacity is available"
          checked={true}
        />
      </div>

      <div className="preferences-page__info-box">
        Update checking requires network access. In order to protect your privacy,
        Audacity does not store any personal information. See our{' '}
        <a href="#" className="preferences-page__link">Privacy Policy</a> for more info.
      </div>
    </div>
  );
}

// Audio Settings Page Content
function AudioSettingsPage() {
  const hostOptions: DropdownOption[] = [
    { value: 'mme', label: 'MME' },
    { value: 'wasapi', label: 'Windows WASAPI' },
    { value: 'directsound', label: 'Windows DirectSound' },
  ];

  const deviceOptions: DropdownOption[] = [
    { value: 'scarlett', label: 'Scarlett Solo USB' },
    { value: 'realtek', label: 'Realtek High Definition Audio' },
    { value: 'default', label: 'Default Device' },
  ];

  const channelOptions: DropdownOption[] = [
    { value: 'mono', label: '1 (mono)' },
    { value: 'stereo', label: '2 (stereo)' },
  ];

  const sampleRateOptions: DropdownOption[] = [
    { value: '44100', label: '44100 Hz' },
    { value: '48000', label: '48000 Hz' },
    { value: '96000', label: '96000 Hz' },
  ];

  const sampleFormatOptions: DropdownOption[] = [
    { value: '16bit', label: '16-bit PCM' },
    { value: '24bit', label: '24-bit PCM' },
    { value: '32bit', label: '32-bit float' },
  ];

  return (
    <div className="preferences-page">
      {/* Section 1: Inputs and outputs */}
      <div className="preferences-page__section">
        <h3 className="preferences-page__section-title">Inputs and outputs</h3>

        <div className="preferences-page__field">
          <label className="preferences-page__label">Host</label>
          <Dropdown
            options={hostOptions}
            value="mme"
            width="290px"
          />
        </div>

        <div className="preferences-page__field">
          <label className="preferences-page__label">Playback device</label>
          <Dropdown
            options={deviceOptions}
            value="scarlett"
            width="290px"
          />
        </div>

        <div className="preferences-page__field">
          <label className="preferences-page__label">Recording device</label>
          <Dropdown
            options={deviceOptions}
            value="scarlett"
            width="290px"
          />
        </div>

        <div className="preferences-page__field">
          <label className="preferences-page__label">Recording channels</label>
          <Dropdown
            options={channelOptions}
            value="stereo"
            width="188px"
          />
        </div>
      </div>

      <Separator />

      {/* Section 2: Buffer settings */}
      <div className="preferences-page__section">
        <h3 className="preferences-page__section-title">Inputs and outputs</h3>

        <div className="preferences-page__field" style={{ width: '85px' }}>
          <label className="preferences-page__label">Buffer length</label>
          <LabeledInput
            label=""
            value="50 ms"
            width="85px"
          />
        </div>

        <div className="preferences-page__field" style={{ width: '85px' }}>
          <label className="preferences-page__label">Latency compensation</label>
          <LabeledInput
            label=""
            value="50 ms"
            width="85px"
          />
        </div>
      </div>

      <Separator />

      {/* Section 3: Sample rate */}
      <div className="preferences-page__section">
        <h3 className="preferences-page__section-title">Sample rate</h3>

        <div className="preferences-page__field">
          <label className="preferences-page__label">Default sample rate</label>
          <Dropdown
            options={sampleRateOptions}
            value="44100"
            width="188px"
          />
        </div>

        <div className="preferences-page__field">
          <label className="preferences-page__label">Default sample format</label>
          <Dropdown
            options={sampleFormatOptions}
            value="32bit"
            width="188px"
          />
        </div>
      </div>
    </div>
  );
}

// Placeholder for other pages
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="preferences-page">
      <h3>{title}</h3>
      <p>This page is under construction.</p>
    </div>
  );
}

export default PreferencesModal;

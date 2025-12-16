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
            {selectedPage === 'audio-settings' && <PlaceholderPage title="Audio Settings" />}
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

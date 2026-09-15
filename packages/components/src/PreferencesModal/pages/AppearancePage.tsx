import { LabeledRadio } from '../../LabeledRadio';
import { Dropdown, DropdownOption } from '../../Dropdown';
import { usePreferences } from '../../contexts/PreferencesContext';

// Type-ramp presets, in points.
const LABEL_TEXT_SIZE_OPTIONS: DropdownOption[] = [
  { value: '9', label: '9 pt' },
  { value: '10', label: '10 pt (default)' },
  { value: '12', label: '12 pt' },
  { value: '14', label: '14 pt' },
  { value: '18', label: '18 pt' },
  { value: '24', label: '24 pt' },
  { value: '36', label: '36 pt' },
  { value: '48', label: '48 pt' },
];

// Appearance Page Content
export function AppearancePage() {
  const { preferences, updatePreference } = usePreferences();

  return (
    <div className="preferences-page">
      <div className="preferences-page__section">
        <h3 className="preferences-page__section-title">Theme</h3>

        <div className="preferences-page__radio-group">
          <LabeledRadio
            label="Light"
            checked={preferences.theme === 'light'}
            onChange={() => updatePreference('theme', 'light')}
            name="theme"
            value="light"
          />

          <LabeledRadio
            label="Dark"
            checked={preferences.theme === 'dark'}
            onChange={() => updatePreference('theme', 'dark')}
            name="theme"
            value="dark"
          />
        </div>
      </div>

      <div className="preferences-page__section">
        <h3 className="preferences-page__section-title">Clip style</h3>

        <div className="preferences-page__radio-group">
          <LabeledRadio
            label="Colourful"
            checked={preferences.clipStyle === 'colourful'}
            onChange={() => updatePreference('clipStyle', 'colourful')}
            name="clipStyle"
            value="colourful"
          />

          <LabeledRadio
            label="Classic"
            checked={preferences.clipStyle === 'classic'}
            onChange={() => updatePreference('clipStyle', 'classic')}
            name="clipStyle"
            value="classic"
          />
        </div>
      </div>

      <div className="preferences-page__section">
        <h3 className="preferences-page__section-title">Label text size</h3>
        <Dropdown
          options={LABEL_TEXT_SIZE_OPTIONS}
          value={String(preferences.labelTextSizePt)}
          onChange={(value) => updatePreference('labelTextSizePt', Number(value))}
        />
      </div>
    </div>
  );
}

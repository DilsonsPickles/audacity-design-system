import React from 'react';
import { Dialog } from '../Dialog';
import { Footer } from '../Footer/Footer';
import { TextInput } from '../TextInput';
import { Dropdown, type DropdownOption } from '../Dropdown';
import { Button } from '../Button';
import { Separator } from '../Separator';
import { useTheme } from '../ThemeProvider';
import { parseMacroParameters, serializeMacroParameters } from '../CommandParametersDialog/macroParams';
import { resolveExportTemplate } from './exportTemplate';
import '../ExportModal/ExportModal.css';

/**
 * THE MACRO'S EXPORT STEP (2026-11-24, "this export is for the macro
 * manager. So it's a macro command called 'Export'"): the step's settings
 * in the export dialog's own layout — File (a name TEMPLATE with what it
 * resolves to under it, the folder), Format, Audio options — instead of
 * the generic parameters window's checkbox rows. Serialized as the step's
 * parameters string, keys in EXPORT_STEP_KEYS order.
 */

/** The command name a macro step carries for this dialog */
export const EXPORT_STEP_COMMAND = 'Export';

export const EXPORT_STEP_DEFAULTS = {
  FileName: '{ProjectName}',
  Folder: '~/Documents/Audacity',
  Format: 'WAV',
  Encoding: 'Signed16-bitPCM',
  Channels: 'Auto',
  SampleRate: 'Projectrate',
} as const;

export type ExportStepKey = keyof typeof EXPORT_STEP_DEFAULTS;
export const EXPORT_STEP_KEYS = Object.keys(EXPORT_STEP_DEFAULTS) as ExportStepKey[];

// Serialized values are the labels with spaces stripped, as the other
// macro enums are (commandParameters.ts `choice`)
const opts = (labels: string[]): DropdownOption[] =>
  labels.map((label) => ({ value: label.replace(/\s+/g, ''), label }));

const EXPORT_STEP_DEFAULTS_ENCODING = 'Signed16-bitPCM';
const FORMAT_OPTIONS = opts(['WAV', 'AIFF', 'MP3', 'FLAC', 'Ogg Vorbis']);
const EXTENSIONS: Record<string, string> = { WAV: 'wav', AIFF: 'aiff', MP3: 'mp3', FLAC: 'flac', OggVorbis: 'ogg' };
const ENCODING_OPTIONS = opts(['Signed 16-bit PCM', 'Signed 24-bit PCM', 'Signed 32-bit PCM', '32-bit float']);
const QUALITY_OPTIONS = opts(['Standard, 170-210 kbps', 'Medium, 145-185 kbps', 'Extreme, 220-260 kbps', 'Insane, 320 kbps']);
const BIT_DEPTH_OPTIONS = opts(['16-bit', '24-bit']);
const OGG_QUALITY_OPTIONS = opts(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

/**
 * EVERY FILE TYPE HAS ONE SETTING, so the row is always there (2026-11-25,
 * "I really don't like modals changing height"): its label and choices
 * follow the type, the row never comes or goes
 */
const TYPE_SETTING: Record<string, { label: string; options: DropdownOption[]; fallback: string }> = {
  WAV: { label: 'Encoding', options: ENCODING_OPTIONS, fallback: EXPORT_STEP_DEFAULTS_ENCODING },
  AIFF: { label: 'Encoding', options: ENCODING_OPTIONS, fallback: EXPORT_STEP_DEFAULTS_ENCODING },
  MP3: { label: 'Quality', options: QUALITY_OPTIONS, fallback: QUALITY_OPTIONS[0].value },
  FLAC: { label: 'Bit depth', options: BIT_DEPTH_OPTIONS, fallback: BIT_DEPTH_OPTIONS[0].value },
  OggVorbis: { label: 'Quality', options: OGG_QUALITY_OPTIONS, fallback: '5' },
};
const CHANNEL_OPTIONS = opts(['Auto', 'Mono', 'Stereo']);
const SAMPLE_RATE_OPTIONS = opts(['Project rate', '44100 Hz', '48000 Hz', '96000 Hz']);

export interface ExportStepDialogProps {
  isOpen: boolean;
  /** The step's current serialized parameters */
  initialParameters?: string;
  /** The project name the template's {ProjectName} previews with */
  projectName?: string;
  /** "Now" for the preview's {Date} / {Time}; defaults to the clock */
  now?: Date;
  onSubmit?: (parameters: string) => void;
  onClose?: () => void;
  os?: 'macos' | 'windows';
}

export function ExportStepDialog({
  isOpen,
  initialParameters,
  projectName = 'Untitled',
  now,
  onSubmit,
  onClose,
  os = 'macos',
}: ExportStepDialogProps) {
  const { theme } = useTheme();
  const [values, setValues] = React.useState<Record<ExportStepKey, string>>({ ...EXPORT_STEP_DEFAULTS });
  // CHECKED ON OK, NOT AS YOU TYPE (2026-11-25, "no need for realtime
  // validation… if the field is empty and we press OK that's when we
  // should see the error"): the error appears when OK finds it and goes
  // as soon as the name is edited
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const parsed = parseMacroParameters(initialParameters);
    const next = { ...EXPORT_STEP_DEFAULTS } as Record<ExportStepKey, string>;
    for (const key of EXPORT_STEP_KEYS) if (parsed[key] !== undefined) next[key] = parsed[key];
    setValues(next);
    setSubmitError(null);
  }, [isOpen, initialParameters]);

  const set = (key: ExportStepKey) => (value: string) => {
    if (key === 'FileName') setSubmitError(null);
    setValues((prev) => ({ ...prev, [key]: value }));
  };
  // Encoding is the file type's own setting (PCM for WAV / AIFF, quality
  // for MP3, none for the rest): a new type starts at its default
  const setFormat = (format: string) => setValues((prev) => ({
    ...prev,
    Format: format,
    Encoding: (TYPE_SETTING[format] ?? TYPE_SETTING.WAV).fallback,
  }));

  const resolved = resolveExportTemplate(values.FileName, { projectName, now: now ?? new Date(), run: 1 });
  const extension = EXTENSIONS[values.Format] ?? 'wav';
  const typeSetting = TYPE_SETTING[values.Format] ?? TYPE_SETTING.WAV;
  const folder = values.Folder.replace(/\/+$/, '');
  // A macro run on several files writes each with this name; a fixed one
  // overwrites itself. {ProjectName} or {N} keeps them apart. A note, not
  // an error: run on the open project the step is fine (the real build's
  // red "Add {ProjectName}…" read as blocking and blocked nothing)
  const batchSafe = /\{(ProjectName|N)\}/.test(values.FileName);
  // ONE LINE under the name, always drawn: the error, the batch note, or
  // nothing — so the dialog never grows or shrinks as you type
  const nameMessage = submitError ?? (resolved.ok && !batchSafe ? 'Several files? Add {ProjectName} so each gets its own name' : '');

  const handleOk = () => {
    if (!resolved.ok) {
      setSubmitError(resolved.error);
      return;
    }
    onSubmit?.(serializeMacroParameters(EXPORT_STEP_KEYS.map((key) => [key, values[key]])));
    onClose?.();
  };

  const style = {
    '--txt-primary': theme.foreground.text.primary,
    '--txt-secondary': theme.foreground.text.secondary,
  } as React.CSSProperties;

  const field = (label: string, control: React.ReactNode, key: string) => (
    <div className="export-modal__field" data-export-step-field={key}>
      <label className="export-modal__label">{label}</label>
      {control}
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      title="Export audio"
      onClose={onClose}
      os={os}
      width={560}
      minHeight={0}
      footer={
        <Footer
          primaryText="OK"
          secondaryText="Cancel"
          onPrimaryClick={handleOk}
          onSecondaryClick={onClose}
        />
      }
    >
      <div className="export-form" style={style} data-export-step-dialog>
        <section className="export-modal__section">
          <h3 className="export-modal__section-title">File</h3>
          {field('File name', <TextInput value={values.FileName} onChange={set('FileName')} error={submitError !== null} />, 'FileName')}
          {field('Folder', (
            <div className="export-modal__input-wrapper">
              <TextInput value={values.Folder} onChange={set('Folder')} />
              <Button variant="secondary" onClick={() => {}}>Browse…</Button>
            </div>
          ), 'Folder')}
          {/* THE PREVIEW IS A ROW OF ITS OWN (2026-11-25): it is the folder
              and the name together, so it answers for both fields. One
              line; a long path loses its START, so the file name stays */}
          {field('Preview', (
            <div className="export-modal__value" data-export-file-preview>
              <span dir="ltr">{resolved.ok ? `${folder}/${resolved.name}.${extension}` : '—'}</span>
            </div>
          ), 'Preview')}
          {/* The message line closes the section, under Preview: always drawn,
              so nothing moves, and empty it reads as the section's foot,
              not a gap under the field (2026-11-25) */}
          <div
            className="export-modal__hint export-modal__hint--slot"
            data-export-name-message
            data-error={submitError === null ? undefined : ''}
            role={submitError === null ? undefined : 'alert'}
            style={submitError === null ? undefined : { color: theme.foreground.text.error }}
          >
            {nameMessage}
          </div>
        </section>

        <Separator />

        <section className="export-modal__section">
          <h3 className="export-modal__section-title">Format</h3>
          {field('File type', <Dropdown options={FORMAT_OPTIONS} value={values.Format} onChange={setFormat} />, 'Format')}
          {field(typeSetting.label, <Dropdown options={typeSetting.options} value={values.Encoding} onChange={set('Encoding')} />, 'Encoding')}
        </section>

        <Separator />

        <section className="export-modal__section">
          <h3 className="export-modal__section-title">Audio options</h3>
          {field('Channels', <Dropdown options={CHANNEL_OPTIONS} value={values.Channels} onChange={set('Channels')} />, 'Channels')}
          {field('Sample rate', <Dropdown options={SAMPLE_RATE_OPTIONS} value={values.SampleRate} onChange={set('SampleRate')} />, 'SampleRate')}
        </section>
      </div>
    </Dialog>
  );
}

export default ExportStepDialog;

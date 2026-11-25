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

const FORMAT_OPTIONS = opts(['WAV', 'AIFF', 'MP3', 'FLAC', 'Ogg Vorbis']);
const EXTENSIONS: Record<string, string> = { WAV: 'wav', AIFF: 'aiff', MP3: 'mp3', FLAC: 'flac', OggVorbis: 'ogg' };
const ENCODING_OPTIONS = opts(['Signed 16-bit PCM', 'Signed 24-bit PCM', 'Signed 32-bit PCM', '32-bit float']);
const QUALITY_OPTIONS = opts(['Standard, 170-210 kbps', 'Medium, 145-185 kbps', 'Extreme, 220-260 kbps', 'Insane, 320 kbps']);
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

  React.useEffect(() => {
    if (!isOpen) return;
    const parsed = parseMacroParameters(initialParameters);
    const next = { ...EXPORT_STEP_DEFAULTS } as Record<ExportStepKey, string>;
    for (const key of EXPORT_STEP_KEYS) if (parsed[key] !== undefined) next[key] = parsed[key];
    setValues(next);
  }, [isOpen, initialParameters]);

  const set = (key: ExportStepKey) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  // Encoding is the file type's own setting (PCM for WAV / AIFF, quality
  // for MP3, none for the rest): a new type starts at its default
  const setFormat = (format: string) => setValues((prev) => ({
    ...prev,
    Format: format,
    Encoding: format === 'MP3' ? QUALITY_OPTIONS[0].value : EXPORT_STEP_DEFAULTS.Encoding,
  }));

  const resolved = resolveExportTemplate(values.FileName, { projectName, now: now ?? new Date(), run: 1 });
  const extension = EXTENSIONS[values.Format] ?? 'wav';
  const pcm = values.Format === 'WAV' || values.Format === 'AIFF';
  // A macro run on several files writes each with this name; a fixed one
  // overwrites itself. {ProjectName} or {N} keeps them apart. A note, not
  // an error: run on the open project the step is fine (the real build's
  // red "Add {ProjectName}…" read as blocking and blocked nothing)
  const batchSafe = /\{(ProjectName|N)\}/.test(values.FileName);

  const handleOk = () => {
    if (!resolved.ok) return;
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
          primaryDisabled={!resolved.ok}
        />
      }
    >
      <div className="export-form" style={style} data-export-step-dialog>
        <section className="export-modal__section">
          <h3 className="export-modal__section-title">File</h3>
          {field('File name', <TextInput value={values.FileName} onChange={set('FileName')} error={!resolved.ok} />, 'FileName')}
          <div
            className="export-modal__hint"
            data-export-file-preview
            data-error={resolved.ok ? undefined : ''}
            role={resolved.ok ? undefined : 'alert'}
            style={resolved.ok ? undefined : { color: theme.foreground.text.error }}
          >
            {resolved.ok ? `${resolved.name}.${extension}` : resolved.error}
            {resolved.ok && !batchSafe && (
              <span data-export-batch-note> · Running on several files? Add {'{ProjectName}'} so each gets its own name</span>
            )}
          </div>
          {field('Folder', (
            <div className="export-modal__input-wrapper">
              <TextInput value={values.Folder} onChange={set('Folder')} />
              <Button variant="secondary" onClick={() => {}}>Browse…</Button>
            </div>
          ), 'Folder')}
        </section>

        <Separator />

        <section className="export-modal__section">
          <h3 className="export-modal__section-title">Format</h3>
          {field('File type', <Dropdown options={FORMAT_OPTIONS} value={values.Format} onChange={setFormat} />, 'Format')}
          {pcm
            ? field('Encoding', <Dropdown options={ENCODING_OPTIONS} value={values.Encoding} onChange={set('Encoding')} />, 'Encoding')
            : values.Format === 'MP3'
              ? field('Quality', <Dropdown options={QUALITY_OPTIONS} value={values.Encoding} onChange={set('Encoding')} />, 'Encoding')
              : null}
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

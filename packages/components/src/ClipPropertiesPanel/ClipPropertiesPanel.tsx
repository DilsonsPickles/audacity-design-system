/**
 * ClipPropertiesPanel — the dockable "Clip properties" panel (user
 * request 2026-10-02, built the way the Macro manager was: a controlled
 * presentational panel here, the placement model — docked left / right /
 * bottom, or an OS window — and the data wiring in the host).
 *
 * Shows ONE clip: its name and colour, where it sits (start, length,
 * end, source length), its quick fades (length and shape, each side),
 * its pitch and its speed. Every field is a small controlled form: the
 * host passes the clip and gets a callback per edit. Numeric fields are
 * STEPPERS (user request, the same day) in seconds, semitones or
 * percent: the arrows commit at once (a deliberate edit); a typed value
 * commits on Enter or blur — Escape puts the old value back — so a
 * half-typed number never reaches the reducer.
 */
import React from 'react';
import { TextInput } from '../TextInput';
import { NumberStepper } from '../NumberStepper';
import { Dropdown, type DropdownOption } from '../Dropdown';
import './ClipPropertiesPanel.css';

export interface ClipPropertiesClip {
  id: number | string;
  name: string;
  /** The colour's id in `colors` (undefined = the track's) */
  color?: string;
  trackName: string;
  /** Seconds, in project time */
  start: number;
  duration: number;
  /** Where in the source the clip begins (seconds of source) */
  trimStart: number;
  /** The whole source's length (seconds of source) */
  fullDuration: number;
  /** 1 = as recorded; the visible length is source × this */
  stretchFactor: number;
  /** Pitch shift in semitones (0 = none) */
  pitchSemitones: number;
  fadeIn: number;
  fadeOut: number;
  /** The fade shape's id in `fadeShapes`, or undefined for a shape that
   *  is none of them (dragged somewhere between) */
  fadeInShapeId?: string;
  fadeOutShapeId?: string;
  groupId?: string;
}

export interface ClipPropertiesOption {
  id: string;
  label: string;
}

export interface ClipPropertiesPanelProps {
  /** The clip shown, or null for the empty state */
  clip: ClipPropertiesClip | null;
  /** The colours a clip can wear */
  colors: ReadonlyArray<ClipPropertiesOption>;
  /** The fade shape presets */
  fadeShapes: ReadonlyArray<ClipPropertiesOption>;
  onRename?: (name: string) => void;
  onColorChange?: (colorId: string) => void;
  /** New start, seconds of project time (the host clamps) */
  onStartChange?: (seconds: number) => void;
  /** New visible length, seconds (the host clamps to the source) */
  onDurationChange?: (seconds: number) => void;
  onFadeChange?: (side: 'in' | 'out', seconds: number) => void;
  onFadeShapeChange?: (side: 'in' | 'out', shapeId: string) => void;
  /** New pitch shift, semitones */
  onPitchChange?: (semitones: number) => void;
  /** New speed, percent (100 = as recorded) */
  onSpeedChange?: (percent: number) => void;
  /** Where the panel sits in the app's reading order (docked left =
   *  before the tracks, right or bottom = after) */
  placement?: 'start' | 'end';
  /** `stack` (a side dock: one column of groups) or `columns` (the
   *  bottom drawer: wide and short, the groups side by side in three
   *  columns — user decision 2026-10-02) */
  layout?: 'stack' | 'columns';
}

/** Pitch limits, semitones: two octaves either way */
export const PITCH_LIMIT_SEMITONES = 24;

const fmt = (n: number, digits = 3) => (Math.round(n * 10 ** digits) / 10 ** digits).toString();
const clamp = (n: number, min?: number, max?: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

/** A number in a stepper: shows the value; the arrows commit at once;
 *  typing holds a draft that commits on Enter or blur when it parses,
 *  and Escape reverts. The field itself never holds a bad number. */
function NumberField({ value, onCommit, disabled, step = 1, min, max, digits = 3, testId }: {
  value: number;
  onCommit?: (n: number) => void;
  disabled?: boolean;
  step?: number;
  min?: number;
  max?: number;
  digits?: number;
  testId: string;
}) {
  const [draft, setDraftState] = React.useState<string | null>(null);
  // Mirrored in a ref: Enter and Escape call blur(), and the blur
  // handler runs BEFORE React re-renders — reading the state there
  // would commit a draft Escape had just thrown away (or commit Enter's
  // twice)
  const draftRef = React.useRef<string | null>(null);
  const setDraft = (d: string | null) => { draftRef.current = d; setDraftState(d); };
  const inputRef = React.useRef<HTMLInputElement>(null);
  const shown = draft ?? fmt(value, digits);
  const commitText = (text: string) => {
    const n = Number(text.trim());
    if (text.trim() === '' || !Number.isFinite(n)) return;
    const next = clamp(n, min, max);
    if (next !== value) onCommit?.(next);
  };
  const commitDraft = () => {
    const d = draftRef.current;
    if (d === null) return;
    setDraft(null);
    commitText(d);
  };
  return (
    <div
      className="clip-properties__number"
      data-clip-properties-field={testId}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { commitDraft(); inputRef.current?.blur(); }
        if (e.key === 'Escape') { setDraft(null); inputRef.current?.blur(); e.stopPropagation(); }
      }}
      onBlur={(e) => { if (e.target === inputRef.current) commitDraft(); }}
    >
      <NumberStepper
        ref={inputRef}
        value={shown}
        step={step}
        min={min}
        max={max}
        disabled={disabled || !onCommit}
        width="100%"
        onChange={(v) => {
          // The arrows change the value with the input UNFOCUSED: a
          // deliberate edit, committed at once. Typing is a draft.
          if (document.activeElement !== inputRef.current) { setDraft(null); commitText(v); }
          else setDraft(v);
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="clip-properties__field">
      <span className="clip-properties__label">{label}</span>
      <span className="clip-properties__control">{children}</span>
    </label>
  );
}

function ReadOnly({ children }: { children: React.ReactNode }) {
  return <span className="clip-properties__readonly">{children}</span>;
}

export function ClipPropertiesPanel({
  clip,
  colors,
  fadeShapes,
  onRename,
  onColorChange,
  onStartChange,
  onDurationChange,
  onFadeChange,
  onFadeShapeChange,
  onPitchChange,
  onSpeedChange,
  placement = 'start',
  layout = 'stack',
}: ClipPropertiesPanelProps) {
  // The name commits on Enter or blur too, so typing never renames
  // letter by letter (every keystroke would be an undo step)
  const [nameDraft, setNameDraft] = React.useState<string | null>(null);
  React.useEffect(() => { setNameDraft(null); }, [clip?.id]);
  const commitName = () => {
    if (nameDraft === null || !clip) return;
    const next = nameDraft.trim();
    setNameDraft(null);
    if (next && next !== clip.name) onRename?.(next);
  };

  const colorOptions: DropdownOption[] = colors.map((c) => ({ value: c.id, label: c.label }));
  const shapeOptions = (current: string | undefined): DropdownOption[] => [
    ...fadeShapes.map((s) => ({ value: s.id, label: s.label })),
    ...(current === undefined ? [{ value: 'custom', label: 'Custom', disabled: true }] : []),
  ];

  return (
    <section className="clip-properties" data-clip-properties-panel data-placement={placement} data-layout={layout} aria-label="Clip properties">
      <header className="clip-properties__header">
        <h2 className="clip-properties__title">Clip properties</h2>
        {clip && <span className="clip-properties__subtitle" title={clip.trackName}>{clip.trackName}</span>}
      </header>

      {!clip ? (
        <p className="clip-properties__empty" data-clip-properties-empty>
          No clip selected. Select a clip, or right-click one and choose Clip properties.
        </p>
      ) : (
        <div className="clip-properties__body" data-clip-properties-clip={clip.id}>
          <div className="clip-properties__group" data-group="clip">
          <h3 className="clip-properties__section">Clip</h3>
          <Field label="Name">
            <div
              className="clip-properties__number"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { commitName(); (e.target as HTMLElement).blur(); }
                if (e.key === 'Escape') { setNameDraft(null); (e.target as HTMLElement).blur(); e.stopPropagation(); }
              }}
            >
              <TextInput
                value={nameDraft ?? clip.name}
                onChange={setNameDraft}
                onBlur={commitName}
                disabled={!onRename}
                className="clip-properties__input"
                tabIndex={0}
              />
            </div>
          </Field>
          <Field label="Color">
            <Dropdown
              options={colorOptions}
              value={clip.color ?? ''}
              placeholder="Track color"
              onChange={(v) => onColorChange?.(v)}
              disabled={!onColorChange}
              width="100%"
            />
          </Field>
          {clip.groupId && (
            <Field label="Group"><ReadOnly>{clip.groupId}</ReadOnly></Field>
          )}
          </div>

          <div className="clip-properties__group" data-group="position">
          <h3 className="clip-properties__section">Position</h3>
          <Field label="Start (s)">
            <NumberField testId="start" value={clip.start} onCommit={onStartChange} step={0.1} min={0} />
          </Field>
          <Field label="Length (s)">
            <NumberField testId="length" value={clip.duration} onCommit={onDurationChange} step={0.1} min={0.02} />
          </Field>
          <Field label="End"><ReadOnly>{fmt(clip.start + clip.duration)} s</ReadOnly></Field>
          <Field label="Source">
            <ReadOnly>
              {fmt(clip.fullDuration)} s{clip.trimStart > 0 ? `, from ${fmt(clip.trimStart)} s` : ''}
            </ReadOnly>
          </Field>
          </div>

          <div className="clip-properties__group" data-group="fades">
          <h3 className="clip-properties__section">Fades</h3>
          <Field label="Fade in (s)">
            <NumberField testId="fade-in" value={clip.fadeIn} onCommit={onFadeChange && ((n) => onFadeChange('in', n))} step={0.1} min={0} />
          </Field>
          <Field label="In shape">
            <Dropdown
              options={shapeOptions(clip.fadeInShapeId)}
              value={clip.fadeInShapeId ?? 'custom'}
              onChange={(v) => onFadeShapeChange?.('in', v)}
              disabled={!onFadeShapeChange || clip.fadeIn <= 0}
              width="100%"
            />
          </Field>
          <Field label="Fade out (s)">
            <NumberField testId="fade-out" value={clip.fadeOut} onCommit={onFadeChange && ((n) => onFadeChange('out', n))} step={0.1} min={0} />
          </Field>
          <Field label="Out shape">
            <Dropdown
              options={shapeOptions(clip.fadeOutShapeId)}
              value={clip.fadeOutShapeId ?? 'custom'}
              onChange={(v) => onFadeShapeChange?.('out', v)}
              disabled={!onFadeShapeChange || clip.fadeOut <= 0}
              width="100%"
            />
          </Field>
          </div>

          <div className="clip-properties__group" data-group="speed">
          <h3 className="clip-properties__section">Pitch &amp; speed</h3>
          <Field label="Pitch (st)">
            <NumberField
              testId="pitch"
              value={clip.pitchSemitones}
              onCommit={onPitchChange}
              step={1}
              min={-PITCH_LIMIT_SEMITONES}
              max={PITCH_LIMIT_SEMITONES}
              digits={2}
            />
          </Field>
          <Field label="Speed (%)">
            <NumberField
              testId="speed"
              value={Math.round(100 / clip.stretchFactor * 100) / 100}
              onCommit={onSpeedChange}
              step={5}
              min={1}
              digits={2}
            />
          </Field>
          </div>
        </div>
      )}
    </section>
  );
}

export default ClipPropertiesPanel;

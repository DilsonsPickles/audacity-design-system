/**
 * ClipPropertiesPanel — the dockable "Clip properties" panel (user
 * request 2026-10-02, built the way the Macro manager was: a controlled
 * presentational panel here, the placement model — docked left / right /
 * bottom, or an OS window — and the data wiring in the host).
 *
 * Shows ONE clip: its name and colour, where it sits (start, length,
 * end, source length), its quick fades (length and shape, each side) and
 * its speed. Every field is a small controlled form: the host passes the
 * clip and gets a callback per edit. Numeric fields are typed in seconds
 * (or percent) and COMMIT on Enter or blur — Escape puts the old value
 * back — so a half-typed number never reaches the reducer.
 */
import React from 'react';
import { TextInput } from '../TextInput';
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
  /** New speed, percent (100 = as recorded) */
  onSpeedChange?: (percent: number) => void;
  /** Where the panel sits in the app's reading order (docked left =
   *  before the tracks, right or bottom = after) */
  placement?: 'start' | 'end';
}

const fmt = (seconds: number, digits = 3) => (Math.round(seconds * 10 ** digits) / 10 ** digits).toString();

/** A number typed in a text field: shows the value, holds a draft while
 *  focused, commits on Enter or blur when the draft parses, reverts on
 *  Escape. The field itself never holds a bad number. */
function NumberField({ id, value, onCommit, disabled, suffix }: {
  id: string;
  value: number;
  onCommit?: (n: number) => void;
  disabled?: boolean;
  suffix?: string;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = draft ?? fmt(value);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.trim());
    setDraft(null);
    if (draft.trim() !== '' && Number.isFinite(n) && n !== value) onCommit?.(n);
  };
  return (
    <div
      className="clip-properties__number"
      onKeyDown={(e) => {
        if (e.key === 'Enter') { commit(); (e.target as HTMLElement).blur(); }
        if (e.key === 'Escape') { setDraft(null); (e.target as HTMLElement).blur(); e.stopPropagation(); }
      }}
    >
      <TextInput
        value={shown}
        disabled={disabled || !onCommit}
        onChange={setDraft}
        onBlur={commit}
        className={`clip-properties__input${suffix ? ' clip-properties__input--suffixed' : ''}`}
        tabIndex={0}
        // The id goes on the wrapper's label; TextInput takes none
      />
      {suffix && <span className="clip-properties__suffix" aria-hidden="true">{suffix}</span>}
      <span id={id} hidden />
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
  onSpeedChange,
  placement = 'start',
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
    <section className="clip-properties" data-clip-properties-panel data-placement={placement} aria-label="Clip properties">
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

          <h3 className="clip-properties__section">Position</h3>
          <Field label="Start">
            <NumberField id={`clip-properties-start-${clip.id}`} value={clip.start} onCommit={onStartChange} suffix="s" />
          </Field>
          <Field label="Length">
            <NumberField id={`clip-properties-length-${clip.id}`} value={clip.duration} onCommit={onDurationChange} suffix="s" />
          </Field>
          <Field label="End"><ReadOnly>{fmt(clip.start + clip.duration)} s</ReadOnly></Field>
          <Field label="Source">
            <ReadOnly>
              {fmt(clip.fullDuration)} s{clip.trimStart > 0 ? `, from ${fmt(clip.trimStart)} s` : ''}
            </ReadOnly>
          </Field>

          <h3 className="clip-properties__section">Fades</h3>
          <Field label="Fade in">
            <NumberField id={`clip-properties-fade-in-${clip.id}`} value={clip.fadeIn} onCommit={onFadeChange && ((n) => onFadeChange('in', n))} suffix="s" />
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
          <Field label="Fade out">
            <NumberField id={`clip-properties-fade-out-${clip.id}`} value={clip.fadeOut} onCommit={onFadeChange && ((n) => onFadeChange('out', n))} suffix="s" />
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

          <h3 className="clip-properties__section">Speed</h3>
          <Field label="Speed">
            <NumberField
              id={`clip-properties-speed-${clip.id}`}
              value={Math.round(100 / clip.stretchFactor * 100) / 100}
              onCommit={onSpeedChange}
              suffix="%"
            />
          </Field>
        </div>
      )}
    </section>
  );
}

export default ClipPropertiesPanel;

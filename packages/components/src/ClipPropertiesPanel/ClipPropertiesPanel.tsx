/**
 * ClipPropertiesPanel — the dockable "Clip properties" panel (user
 * request 2026-10-02, built the way the Macro manager was: a controlled
 * presentational panel here, the placement model — docked left / right /
 * bottom, or an OS window — and the data wiring in the host).
 *
 * The LOOK is Figma's properties panel (user request 2026-10-06): two
 * fields to a row, each with a GLYPH where a label would be — ⇤ start,
 * ⇥ end, ↔ length, ♪ pitch, speed — so the eye reads the glyph and the
 * number at once; and the fades draw THEMSELVES: each fade field's glyph
 * is a live thumbnail of the clip's own curve (`fadeCurvePath`, the
 * same geometry the canvas draws), and the shape picker is a dropdown
 * of the presets with the current one's curve as its glyph (a row of
 * tiny curve glyphs was tried first the same day — "can be a dropdown
 * rather than showing all of them at once"). Glyphs carry the field's name as its
 * accessible label and tooltip.
 *
 * Shows ONE clip, or a SELECTION of several (`selection`): the count
 * and tracks in the header, the selection's earliest start / latest
 * end / span, and every per-clip field MERGED — the value when all
 * agree, "Mixed" when not; an edit then applies to every selected clip.
 *
 * Numeric fields are STEPPERS: the arrows commit at once; a typed value
 * commits on Enter or blur — Escape puts the old value back — so a
 * half-typed number never reaches the reducer.
 *
 * Two actions join the fields (user request 2026-10-06): RESET on the
 * Pitch & speed section (its header's right-hand action, Figma's "+"
 * place; live only while something is to reset), and an EXPORT section
 * in the manner of Figma's export-selection block — a format and a
 * sample rate side by side, a wide "Export clip" button under them —
 * which hands `{ format, sampleRate }` to the host.
 *
 * EVERY control has a TOOLTIP on hover (user request 2026-10-06): the
 * design system's Tooltip, not the browser's title — one `data-tooltip`
 * per control, read by a single hover handler on the panel's root,
 * shown above the control's middle after `TOOLTIP_DELAY_MS`, hidden on
 * leave, press or wheel. The text is the control's NAME and nothing
 * more — "Fade in", "Pitch", "Reset pitch and speed" (user decision,
 * the same day: no explanatory sentences).
 */
import React from 'react';
import { TextInput } from '../TextInput';
import { NumberStepper } from '../NumberStepper';
import { Dropdown, type DropdownOption } from '../Dropdown';
import { Button } from '../Button';
import { Tooltip } from '../Tooltip';
import { fadeCurvePath, type FadeShape } from '../utils/clipCrossfades';
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
  /** The fades' actual curves, for the live thumbnails (absent = the
   *  quick fade's default S-curve) */
  fadeInShape?: FadeShape;
  fadeOutShape?: FadeShape;
  groupId?: string;
}

/** A field whose selected clips disagree */
export const MIXED = 'mixed' as const;
export type Mixed = typeof MIXED;

/** Several selected clips, merged: a field is its shared value, or MIXED */
export interface ClipPropertiesSelection {
  /** How many clips (≥ 2) */
  count: number;
  /** The distinct tracks they are on, in track order */
  trackNames: string[];
  /** The earliest start and the latest end, seconds of project time */
  start: number;
  end: number;
  color?: string | Mixed;
  stretchFactor: number | Mixed;
  pitchSemitones: number | Mixed;
  fadeIn: number | Mixed;
  fadeOut: number | Mixed;
  fadeInShapeId?: string | Mixed;
  fadeOutShapeId?: string | Mixed;
}

export interface ClipPropertiesOption {
  id: string;
  label: string;
}

/** A fade shape preset: its id and label, and the curve to draw for it */
export interface ClipPropertiesShapeOption extends ClipPropertiesOption {
  shape: FadeShape;
}

export interface ClipPropertiesPanelProps {
  /** The clip shown, or null for the empty state */
  clip: ClipPropertiesClip | null;
  /** Several selected clips: takes the place of `clip` when set */
  selection?: ClipPropertiesSelection | null;
  /** The colours a clip can wear */
  colors: ReadonlyArray<ClipPropertiesOption>;
  /** The fade shape presets, with their curves */
  fadeShapes: ReadonlyArray<ClipPropertiesShapeOption>;
  onRename?: (name: string) => void;
  onColorChange?: (colorId: string) => void;
  /** New start, seconds of project time (the host clamps) */
  onStartChange?: (seconds: number) => void;
  /** New visible length, seconds (the host clamps to the source) */
  onDurationChange?: (seconds: number) => void;
  /** Trim the LEFT edge: how much of the source to hide at the head,
   *  seconds of source; the clip's content stays where it is (user
   *  request 2026-10-06 — until then only the right edge trimmed here) */
  onTrimStartChange?: (seconds: number) => void;
  /** Trim the RIGHT edge: how much of the source to hide at the tail,
   *  seconds of source */
  onTrimEndChange?: (seconds: number) => void;
  onFadeChange?: (side: 'in' | 'out', seconds: number) => void;
  onFadeShapeChange?: (side: 'in' | 'out', shapeId: string) => void;
  /** New pitch shift, semitones */
  onPitchChange?: (semitones: number) => void;
  /** New speed, percent (100 = as recorded) */
  onSpeedChange?: (percent: number) => void;
  /** Pitch back to 0 and speed back to 100 — the section's Reset */
  onResetPitchSpeed?: () => void;
  /** The export block's formats; none = no Export section */
  exportFormats?: ReadonlyArray<ClipPropertiesOption>;
  /** The export block's sample rates, Hz (ids are the numbers) */
  exportSampleRates?: ReadonlyArray<ClipPropertiesOption>;
  /** Export the clip (or every selected clip) with the chosen settings */
  onExport?: (settings: ClipPropertiesExportSettings) => void;
  /** An export is under way — the button waits */
  exporting?: boolean;
  /** Where the panel sits in the app's reading order (docked left =
   *  before the tracks, right or bottom = after) */
  placement?: 'start' | 'end';
  /** `stack` (a side dock: one column of groups) or `columns` (the
   *  bottom drawer: wide and short, the groups side by side in three
   *  columns — user decision 2026-10-02) */
  layout?: 'stack' | 'columns';
}

/** What the Export block asks for */
export interface ClipPropertiesExportSettings {
  /** The format's id in `exportFormats` */
  format: string;
  /** Hz */
  sampleRate: number;
}

/** How long the pointer rests on a control before its tooltip shows */
export const TOOLTIP_DELAY_MS = 350;

/** Pitch limits, semitones: two octaves either way */
export const PITCH_LIMIT_SEMITONES = 24;

const fmt = (n: number, digits = 3) => (Math.round(n * 10 ** digits) / 10 ** digits).toString();
const clamp = (n: number, min?: number, max?: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
const speedOf = (stretchFactor: number) => Math.round(100 / stretchFactor * 100) / 100;

// ── Glyphs ────────────────────────────────────────────────────────────
// 16×16, drawn in currentColor; the glyph's name is its data-glyph (the
// field's tooltip and visually-hidden label carry the words — an svg
// <title> would add the browser's own tooltip on top)

const Glyph = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <svg className="clip-properties__glyph" viewBox="0 0 16 16" width={16} height={16} aria-hidden="true" data-glyph={title}>
    {children}
  </svg>
);

const StartGlyph = () => (
  <Glyph title="Start"><path d="M3 2v12M13 8H6M9 5 6 8l3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></Glyph>
);
const EndGlyph = () => (
  <Glyph title="End"><path d="M13 2v12M3 8h7M7 5l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></Glyph>
);
const LengthGlyph = () => (
  <Glyph title="Length"><path d="M2 8h12M5 5 2 8l3 3M11 5l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></Glyph>
);
const TrimStartGlyph = () => (
  <Glyph title="Trim start"><path d="M3 2v12M13 2v12M3 8h5M6 5.5 8.5 8 6 10.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 2h2M3 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></Glyph>
);
const TrimEndGlyph = () => (
  <Glyph title="Trim end"><path d="M3 2v12M13 2v12M13 8H8M10 5.5 7.5 8l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M11 2h2M11 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></Glyph>
);
const SourceGlyph = () => (
  <Glyph title="Source"><path d="M2 3h12v10H2zM5 3v10M11 3v10M2 6h3M2 10h3M11 6h3M11 10h3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></Glyph>
);
const SpanGlyph = () => (
  <Glyph title="Span"><path d="M2 3v10M14 3v10M2 8h12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></Glyph>
);
const PitchGlyph = () => (
  <Glyph title="Pitch"><path d="M9.5 2.5v8.2a2.3 2.3 0 1 1-1.5-2.2V4l4-1v2.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></Glyph>
);
const SpeedGlyph = () => (
  <Glyph title="Speed"><circle cx="8" cy="9" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 6.5V9l2 1.5M6 2h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></Glyph>
);
const ExportGlyph = () => (
  <Glyph title="Format"><path d="M8 2v8M5 7l3 3 3-3M3 11v3h10v-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></Glyph>
);
const SampleRateGlyph = () => (
  <Glyph title="Sample rate"><path d="M2 8h2l1.5-4 2 8 2-6 1.5 2H14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></Glyph>
);
const CountGlyph = () => (
  <Glyph title="Selected clips"><path d="M2 5h8v8H2zM5 2h9v9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></Glyph>
);

/** A fade's curve, drawn small — the thumbnail by its field and the
 *  picker's preset glyphs. The curve path is the canvas's own. */
function FadeGlyph({ side, shape, title, dim }: { side: 'in' | 'out'; shape: FadeShape | undefined; title: string; dim?: boolean }) {
  const resolved: FadeShape = shape ?? 2; // the quick fade's default S-curve
  return (
    <svg className="clip-properties__glyph clip-properties__glyph--fade" viewBox="0 0 100 100" preserveAspectRatio="none" width={22} height={14} aria-hidden="true" data-glyph={title} data-side={side}>
      <path d={`${fadeCurvePath(side, 32, resolved)} L ${side === 'in' ? '100,100' : '0,100'} Z`} fill="currentColor" opacity={dim ? 0.12 : 0.22} stroke="none" />
      <path d={fadeCurvePath(side, 32, resolved)} fill="none" stroke="currentColor" strokeWidth={10} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.5 }} />
    </svg>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────

/** One tooltip for the whole panel: the root's hover handlers find the
 *  nearest `data-tooltip` ancestor of whatever the pointer is over, arm
 *  a timer for it (re-crossing its own children does not re-arm), and
 *  show the design system's Tooltip above its middle; leaving it,
 *  pressing, or scrolling hides it. */
function usePanelTooltip() {
  const [tip, setTip] = React.useState<{ text: string; x: number; y: number } | null>(null);
  const timer = React.useRef<number | null>(null);
  const armed = React.useRef<HTMLElement | null>(null);
  const clear = () => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
  };
  const hide = () => { clear(); armed.current = null; setTip(null); };
  React.useEffect(() => clear, []);
  const onMouseOver = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');
    const text = el?.dataset.tooltip;
    if (!el || !text) { hide(); return; }
    if (el === armed.current) return;
    clear();
    armed.current = el;
    setTip(null);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const r = el.getBoundingClientRect();
      setTip({ text, x: r.left + r.width / 2, y: r.top });
    }, TOOLTIP_DELAY_MS);
  };
  const onMouseOut = (e: React.MouseEvent) => {
    const from = (e.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');
    const to = e.relatedTarget instanceof Node ? e.relatedTarget : null;
    if (from && to && from.contains(to)) return; // still inside the same control
    hide();
  };
  return { tip, handlers: { onMouseOver, onMouseOut, onMouseDown: hide, onWheel: hide } };
}

// ── Fields ────────────────────────────────────────────────────────────

/** A glyph beside a stepper, in one bordered field. The arrows commit
 *  at once; typing holds a draft that commits on Enter or blur when it
 *  parses, and Escape reverts — the field never holds a bad number. A
 *  MIXED value shows blank with "Mixed" and no arrows. */
function NumberField({ value, onCommit, disabled, step = 1, min, max, digits = 3, testId, label, glyph }: {
  value: number | Mixed;
  onCommit?: (n: number) => void;
  disabled?: boolean;
  step?: number;
  min?: number;
  max?: number;
  digits?: number;
  testId: string;
  label: string;
  glyph: React.ReactNode;
}) {
  const [draft, setDraftState] = React.useState<string | null>(null);
  // Mirrored in a ref: Enter and Escape call blur(), and the blur
  // handler runs BEFORE React re-renders — reading the state there
  // would commit a draft Escape had just thrown away (or commit Enter's
  // twice)
  const draftRef = React.useRef<string | null>(null);
  const setDraft = (d: string | null) => { draftRef.current = d; setDraftState(d); };
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mixed = value === MIXED;
  const shown = draft ?? (mixed ? '' : fmt(value, digits));
  const commitText = (text: string) => {
    const n = Number(text.trim());
    if (text.trim() === '' || !Number.isFinite(n)) return;
    const next = clamp(n, min, max);
    if (mixed || next !== value) onCommit?.(next);
  };
  const commitDraft = () => {
    const d = draftRef.current;
    if (d === null) return;
    setDraft(null);
    commitText(d);
  };
  return (
    <div
      className="clip-properties__field clip-properties__field--number"
      data-clip-properties-field={testId}
      data-mixed={mixed ? 'true' : undefined}
      data-tooltip={label}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { commitDraft(); inputRef.current?.blur(); }
        if (e.key === 'Escape') { setDraft(null); inputRef.current?.blur(); e.stopPropagation(); }
      }}
      onBlur={(e) => { if (e.target === inputRef.current) commitDraft(); }}
    >
      <span className="clip-properties__glyph-cell">{glyph}</span>
      <NumberStepper
        ref={inputRef}
        value={shown}
        placeholder={mixed ? 'Mixed' : undefined}
        step={step}
        min={min}
        max={max}
        disabled={disabled || !onCommit}
        onChange={(v) => {
          // The arrows change the value with the input UNFOCUSED: a
          // deliberate edit, committed at once. Typing is a draft.
          if (document.activeElement !== inputRef.current) { setDraft(null); commitText(v); }
          else setDraft(v);
        }}
      />
      <span className="clip-properties__sr" >{label}</span>
    </div>
  );
}

/** A glyph beside a value that cannot be edited, in the same field look */
function ReadField({ testId, label, glyph, children }: { testId: string; label: string; glyph: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="clip-properties__field clip-properties__field--read" data-clip-properties-field={testId} data-tooltip={label}>
      <span className="clip-properties__glyph-cell">{glyph}</span>
      <span className="clip-properties__value">{children}</span>
      <span className="clip-properties__sr">{label}</span>
    </div>
  );
}

/** The shape picker: a dropdown of the presets by name (user decision
 *  2026-10-06, replacing the segmented row of curves), the current
 *  preset's curve as the field's glyph. A shape between presets reads
 *  "Custom" with the clip's own curve; a mixed selection reads "Mixed". */
function ShapePicker({ side, shapes, current, own, onPick, disabled }: {
  side: 'in' | 'out';
  shapes: ReadonlyArray<ClipPropertiesShapeOption>;
  current: string | Mixed | undefined;
  /** The clip's own curve, drawn when no preset matches */
  own: FadeShape | undefined;
  onPick?: (id: string) => void;
  disabled?: boolean;
}) {
  const label = side === 'in' ? 'Fade in shape' : 'Fade out shape';
  const preset = current === MIXED ? undefined : shapes.find((s) => s.id === current);
  const options: DropdownOption[] = shapes.map((s) => ({ value: s.id, label: s.label }));
  return (
    <div
      className="clip-properties__field clip-properties__field--select clip-properties__field--shape"
      data-clip-properties-field={`shape-${side}`}
      data-shape={preset?.id}
      data-mixed={current === MIXED ? 'true' : undefined}
      data-tooltip={label}
    >
      <span className="clip-properties__glyph-cell">
        <FadeGlyph side={side} shape={preset ? preset.shape : own} title={preset?.label ?? (current === MIXED ? 'Mixed' : 'Custom')} dim={!preset} />
      </span>
      <Dropdown
        options={options}
        value={preset?.id ?? ''}
        placeholder={current === MIXED ? 'Mixed' : 'Custom'}
        onChange={(v) => onPick?.(v)}
        disabled={disabled || !onPick}
        width="100%"
      />
      <span className="clip-properties__sr">{label}</span>
    </div>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => <div className="clip-properties__row">{children}</div>;

/** A section's heading, with Figma's right-hand action slot: a small
 *  text button (Reset), shown whenever the section has one */
function SectionHeader({ children, action, actionId, actionTip, onAction, actionDisabled }: {
  children: React.ReactNode;
  action?: string;
  actionId?: string;
  actionTip?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <h3 className="clip-properties__section">
      <span>{children}</span>
      {action && (
        <button
          type="button"
          className="clip-properties__section-action"
          data-clip-properties-action={actionId}
          data-tooltip={actionTip}
          onClick={onAction}
          disabled={actionDisabled || !onAction}
        >
          {action}
        </button>
      )}
    </h3>
  );
}

/** A glyph beside a dropdown, in the field look */
function SelectField({ testId, label, glyph, options, value, onChange, disabled }: {
  testId: string;
  label: string;
  glyph: React.ReactNode;
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="clip-properties__field clip-properties__field--select" data-clip-properties-field={testId} data-tooltip={label}>
      <span className="clip-properties__glyph-cell">{glyph}</span>
      <Dropdown options={options} value={value} onChange={onChange} disabled={disabled} width="100%" />
      <span className="clip-properties__sr">{label}</span>
    </div>
  );
}

export function ClipPropertiesPanel({
  clip,
  selection = null,
  colors,
  fadeShapes,
  onRename,
  onColorChange,
  onStartChange,
  onDurationChange,
  onTrimStartChange,
  onTrimEndChange,
  onFadeChange,
  onFadeShapeChange,
  onPitchChange,
  onSpeedChange,
  onResetPitchSpeed,
  exportFormats = [],
  exportSampleRates = [],
  onExport,
  exporting = false,
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

  // The Export block's choices live here (as Figma's do): the first
  // format and sample rate until picked
  const formatOptions: DropdownOption[] = exportFormats.map((f) => ({ value: f.id, label: f.label }));
  const rateOptions: DropdownOption[] = exportSampleRates.map((r) => ({ value: r.id, label: r.label }));
  const [formatPick, setFormatPick] = React.useState<string | null>(null);
  const [ratePick, setRatePick] = React.useState<string | null>(null);
  const format = formatPick ?? exportFormats[0]?.id ?? '';
  const sampleRate = ratePick ?? exportSampleRates[0]?.id ?? '';

  // What the fields show: the one clip, or the selection's merge
  const multi = selection && selection.count >= 2 ? selection : null;
  const subject = multi ?? clip;
  const color = multi ? multi.color : clip?.color;
  const fadeIn = multi ? multi.fadeIn : clip?.fadeIn ?? 0;
  const fadeOut = multi ? multi.fadeOut : clip?.fadeOut ?? 0;
  const fadeInShapeId = multi ? multi.fadeInShapeId : clip?.fadeInShapeId;
  const fadeOutShapeId = multi ? multi.fadeOutShapeId : clip?.fadeOutShapeId;
  // The live thumbnails draw the clip's own curve; a selection draws
  // the shared preset's, or the default when mixed
  const shapeOf = (id: string | Mixed | undefined, own: FadeShape | undefined): FadeShape | undefined =>
    multi ? (id === MIXED || id === undefined ? undefined : fadeShapes.find((s) => s.id === id)?.shape) : own;
  const inCurve = shapeOf(fadeInShapeId, clip?.fadeInShape);
  const outCurve = shapeOf(fadeOutShapeId, clip?.fadeOutShape);
  const pitch = multi ? multi.pitchSemitones : clip?.pitchSemitones ?? 0;
  const speed: number | Mixed = multi
    ? (multi.stretchFactor === MIXED ? MIXED : speedOf(multi.stretchFactor))
    : speedOf(clip?.stretchFactor ?? 1);
  const subtitle = multi
    ? `${multi.count} clips · ${multi.trackNames.join(', ')}`
    : clip?.trackName;
  const swatch = color && color !== MIXED && color !== 'track' ? color : undefined;
  const { tip, handlers: tooltipHandlers } = usePanelTooltip();

  return (
    <section
      className="clip-properties"
      data-clip-properties-panel
      data-placement={placement}
      data-layout={layout}
      data-selection={multi ? multi.count : undefined}
      aria-label="Clip properties"
      {...tooltipHandlers}
    >
      {tip && <Tooltip content={tip.text} x={tip.x} y={tip.y} />}
      <header className="clip-properties__header">
        <h2 className="clip-properties__title">Clip properties</h2>
        {subject && <span className="clip-properties__subtitle">{subtitle}</span>}
      </header>

      {!subject ? (
        <p className="clip-properties__empty" data-clip-properties-empty>
          No clip selected. Select a clip, or right-click one and choose Clip properties.
        </p>
      ) : (
        <div className="clip-properties__body" data-clip-properties-clip={multi ? undefined : clip?.id}>
          <div className="clip-properties__group" data-group="clip">
          <h3 className="clip-properties__section">{multi ? 'Clips' : 'Clip'}</h3>
          {multi ? (
            <Row>
              <ReadField testId="count" label="Selected clips" glyph={<CountGlyph />}>{multi.count} clips</ReadField>
            </Row>
          ) : clip && (
            <Row>
              <div
                className="clip-properties__field clip-properties__field--text clip-properties__field--wide"
                data-clip-properties-field="name"
                data-tooltip="Clip name"
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
                <span className="clip-properties__sr">Clip name</span>
              </div>
            </Row>
          )}
          <Row>
            <div className="clip-properties__field clip-properties__field--select clip-properties__field--wide" data-clip-properties-field="color" data-tooltip="Clip color">
              <span className="clip-properties__glyph-cell">
                <span className="clip-properties__swatch" data-swatch={swatch ?? (color === MIXED ? 'mixed' : 'track')} aria-hidden="true" />
              </span>
              <Dropdown
                options={colorOptions}
                value={color === MIXED ? '' : color ?? ''}
                placeholder={color === MIXED ? 'Mixed' : 'Track color'}
                onChange={(v) => onColorChange?.(v)}
                disabled={!onColorChange}
                width="100%"
              />
              <span className="clip-properties__sr">Clip color</span>
            </div>
          </Row>
          {!multi && clip?.groupId && (
            <Row>
              <ReadField testId="group" label="Group" glyph={<CountGlyph />}>{clip.groupId}</ReadField>
            </Row>
          )}
          </div>

          <div className="clip-properties__group" data-group="position">
          <h3 className="clip-properties__section">Position</h3>
          {multi ? (
            <>
              <Row>
                <ReadField testId="first-start" label="First start" glyph={<StartGlyph />}>{fmt(multi.start)} s</ReadField>
                <ReadField testId="last-end" label="Last end" glyph={<EndGlyph />}>{fmt(multi.end)} s</ReadField>
              </Row>
              <Row>
                <ReadField testId="span" label="Span" glyph={<SpanGlyph />}>{fmt(multi.end - multi.start)} s</ReadField>
              </Row>
            </>
          ) : clip && (
            <>
              <Row>
                <NumberField testId="start" label="Start" glyph={<StartGlyph />} value={clip.start} onCommit={onStartChange} step={0.1} min={0} />
                <ReadField testId="end" label="End" glyph={<EndGlyph />}>{fmt(clip.start + clip.duration)} s</ReadField>
              </Row>
              <Row>
                <NumberField testId="trim-start" label="Trim start" glyph={<TrimStartGlyph />} value={clip.trimStart} onCommit={onTrimStartChange} step={0.1} min={0} />
                <NumberField testId="trim-end" label="Trim end" glyph={<TrimEndGlyph />}
                  value={Math.max(0, clip.fullDuration - clip.trimStart - clip.duration / clip.stretchFactor)} onCommit={onTrimEndChange} step={0.1} min={0} />
              </Row>
              <Row>
                <NumberField testId="length" label="Length" glyph={<LengthGlyph />} value={clip.duration} onCommit={onDurationChange} step={0.1} min={0.02} />
                <ReadField testId="source" label="Source" glyph={<SourceGlyph />}>
                  {fmt(clip.fullDuration)} s{clip.trimStart > 0 ? ` from ${fmt(clip.trimStart)}` : ''}
                </ReadField>
              </Row>
            </>
          )}
          </div>

          <div className="clip-properties__group" data-group="fades">
          <h3 className="clip-properties__section">Fades</h3>
          <Row>
            <NumberField testId="fade-in" label="Fade in" glyph={<FadeGlyph side="in" shape={inCurve} title="Fade in" />}
              value={fadeIn} onCommit={onFadeChange && ((n) => onFadeChange('in', n))} step={0.1} min={0} />
            <NumberField testId="fade-out" label="Fade out" glyph={<FadeGlyph side="out" shape={outCurve} title="Fade out" />}
              value={fadeOut} onCommit={onFadeChange && ((n) => onFadeChange('out', n))} step={0.1} min={0} />
          </Row>
          <Row>
            <ShapePicker side="in" shapes={fadeShapes} current={fadeInShapeId} own={clip?.fadeInShape} onPick={onFadeShapeChange && ((id) => onFadeShapeChange('in', id))} disabled={fadeIn === 0} />
            <ShapePicker side="out" shapes={fadeShapes} current={fadeOutShapeId} own={clip?.fadeOutShape} onPick={onFadeShapeChange && ((id) => onFadeShapeChange('out', id))} disabled={fadeOut === 0} />
          </Row>
          </div>

          <div className="clip-properties__group" data-group="speed">
          <SectionHeader
            action="Reset"
            actionId="reset-pitch-speed"
            actionTip="Reset pitch and speed"
            onAction={onResetPitchSpeed}
            actionDisabled={pitch === 0 && speed === 100}
          >
            Pitch &amp; speed
          </SectionHeader>
          <Row>
            <NumberField testId="pitch" label="Pitch" glyph={<PitchGlyph />} value={pitch} onCommit={onPitchChange}
              step={1} min={-PITCH_LIMIT_SEMITONES} max={PITCH_LIMIT_SEMITONES} digits={2} />
            <NumberField testId="speed" label="Speed" glyph={<SpeedGlyph />} value={speed} onCommit={onSpeedChange} step={5} min={1} digits={2} />
          </Row>
          </div>

          {exportFormats.length > 0 && (
            <div className="clip-properties__group" data-group="export">
            <SectionHeader>Export</SectionHeader>
            <Row>
              <SelectField testId="export-format" label="Format" glyph={<ExportGlyph />} options={formatOptions} value={format} onChange={setFormatPick} disabled={exporting} />
              <SelectField testId="export-rate" label="Sample rate" glyph={<SampleRateGlyph />} options={rateOptions} value={sampleRate} onChange={setRatePick} disabled={exporting} />
            </Row>
            <Row>
              <div
                className="clip-properties__field--wide clip-properties__export"
                data-clip-properties-action="export"
                data-tooltip={multi ? 'Export clips' : 'Export clip'}
              >
                <Button
                  variant="secondary"
                  size="default"
                  className="clip-properties__export-button"
                  disabled={!onExport || exporting}
                  onClick={() => onExport?.({ format, sampleRate: Number(sampleRate) || 0 })}
                >
                  {exporting ? 'Exporting…' : multi ? `Export ${multi.count} clips` : 'Export clip'}
                </Button>
              </div>
            </Row>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ClipPropertiesPanel;

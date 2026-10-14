import React from 'react';
import { Dialog, DialogFooter, Dropdown, NumberStepper } from '@audacity-ui/components';

/** A field whose targets disagree */
export const FADE_MIXED = 'mixed';
export type FadeMixed = typeof FADE_MIXED;

export interface FadeDialogSideValues {
  /** The fade's length — or mixed across the targets */
  seconds: number | FadeMixed;
  /** The preset the fade's shape is — undefined for a shape between presets ("Custom"), or mixed */
  shape: string | undefined | FadeMixed;
}

export interface FadeDialogValues {
  in: FadeDialogSideValues;
  out: FadeDialogSideValues;
}

/** What the user CHANGED — a field left alone is not in it, so a mixed
 *  selection keeps its differences where nothing was typed */
export interface FadeDialogEdits {
  fadeIn?: number;
  fadeOut?: number;
  fadeInShape?: string;
  fadeOutShape?: string;
}

export interface FadeDialogProps {
  isOpen: boolean;
  /** How many clips the edits apply to (the title says so when > 1) */
  targetCount: number;
  /** Prefill: the targets' current fades, merged */
  values: FadeDialogValues;
  /** The longest fade any target can take — the shortest target's duration */
  maxSeconds: number;
  /** The shape presets, in the fade menu's order */
  presets: ReadonlyArray<{ id: string; label: string }>;
  /** Which length field takes the focus on open: the side the user came from */
  focusSide: 'in' | 'out';
  onApply: (edits: FadeDialogEdits) => void;
  /** LIVE PREVIEW (2026-10-14, "can we make it so that the Edit fades
   *  dialog makes live updates to the fade handles?"): called with the
   *  edits so far on every valid change of a field — the host applies
   *  them at once, inside an undo gesture it began when the dialog
   *  opened, so the clip's fade follows the typing; Apply keeps them
   *  (one undo step), Cancel / Escape puts them back. */
  onPreview?: (edits: FadeDialogEdits) => void;
  onClose: () => void;
  os?: 'macos' | 'windows';
}

/**
 * The FADES dialog (user decision 2026-10-13): fade-in and fade-out
 * length and shape in one place — the typed form of the handles, for
 * when the corner handle is too coarse, for several clips that want
 * exactly the same fade, and for the keyboard (⌥F on a focused clip or
 * fade handle; useFadeDialogHotkey). It replaced the one-side
 * FadeDurationDialog behind the menus' "Fade-in length…" / "Fade-out
 * length…" items, so there is one fade dialog everywhere. Enter applies,
 * Escape cancels; only the fields the user CHANGED are applied, each
 * length clamped to the shortest target's length on apply. The words
 * (2026-10-07): "Fade-in" / "Fade-out", hyphenated, are the nouns.
 */
export function FadeDialog({ isOpen, targetCount, values, maxSeconds, presets, focusSide, onApply, onPreview, onClose, os = 'macos' }: FadeDialogProps) {
  const textOf = (seconds: number | FadeMixed) => (seconds === FADE_MIXED ? '' : String(+seconds.toFixed(3)));
  const shapeOf = (shape: string | undefined | FadeMixed) => (typeof shape === 'string' && shape !== FADE_MIXED ? shape : '');
  const [inText, setInText] = React.useState('');
  const [outText, setOutText] = React.useState('');
  const [inShape, setInShape] = React.useState('');
  const [outShape, setOutShape] = React.useState('');
  // What the fields opened with, so "changed" is a comparison, not a flag
  const initial = React.useRef({ inText: '', outText: '', inShape: '', outShape: '' });
  const inRef = React.useRef<HTMLInputElement>(null);
  const outRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    const start = { inText: textOf(values.in.seconds), outText: textOf(values.out.seconds), inShape: shapeOf(values.in.shape), outShape: shapeOf(values.out.shape) };
    initial.current = start;
    setInText(start.inText);
    setOutText(start.outText);
    setInShape(start.inShape);
    setOutShape(start.outShape);
    // Into the side the user came from, once the dialog is up
    const id = requestAnimationFrame(() => {
      const el = (focusSide === 'out' ? outRef : inRef).current;
      el?.focus();
      el?.select();
    });
    return () => cancelAnimationFrame(id);
    // The values are read at OPEN; a store change while it is open does
    // not reset half-typed fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, focusSide]);

  const parse = (text: string) => Number(text.trim().replace(',', '.'));
  // A length field is valid untouched (blank on a mixed selection is
  // "leave them"), or with a finite non-negative number
  const lengthValid = (text: string, start: string) => text === start || (text.trim() !== '' && Number.isFinite(parse(text)) && parse(text) >= 0);
  const valid = lengthValid(inText, initial.current.inText) && lengthValid(outText, initial.current.outText);
  const changed = inText !== initial.current.inText || outText !== initial.current.outText
    || inShape !== initial.current.inShape || outShape !== initial.current.outShape;

  const buildEdits = (): FadeDialogEdits => {
    const edits: FadeDialogEdits = {};
    if (inText !== initial.current.inText) edits.fadeIn = Math.min(parse(inText), maxSeconds);
    if (outText !== initial.current.outText) edits.fadeOut = Math.min(parse(outText), maxSeconds);
    if (inShape !== initial.current.inShape && inShape) edits.fadeInShape = inShape;
    if (outShape !== initial.current.outShape && outShape) edits.fadeOutShape = outShape;
    return edits;
  };
  // The live preview: every valid change goes out as the edits so far
  // (the host applies them inside its undo gesture). A field typed back
  // to what it opened with sends an empty edit — the host then restores
  // that side from its own snapshot. Not on open: nothing has changed.
  const previewRef = React.useRef(onPreview);
  React.useEffect(() => { previewRef.current = onPreview; }, [onPreview]);
  React.useEffect(() => {
    if (!isOpen || !changed || !valid) return;
    previewRef.current?.(buildEdits());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inText, outText, inShape, outShape]);

  const apply = () => {
    if (!valid) return;
    onApply(buildEdits());
    onClose();
  };
  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); apply(); }
    else if (e.key === 'Escape') onClose();
  };
  const title = targetCount > 1 ? `Fades — ${targetCount} clips` : 'Fades';
  const options = presets.map((p) => ({ value: p.id, label: p.label }));
  const placeholderFor = (shape: string | undefined | FadeMixed) => (shape === FADE_MIXED ? 'Mixed' : 'Custom');

  const side = (
    label: string,
    key: 'in' | 'out',
    text: string,
    setText: (t: string) => void,
    shape: string,
    setShape: (s: string) => void,
    ref: React.RefObject<HTMLInputElement | null>,
    v: FadeDialogSideValues,
  ) => (
    <fieldset data-fade-dialog-side={key} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <legend style={{ fontSize: '12px', fontWeight: 600, padding: 0, marginBottom: '2px' }}>{label}</legend>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 400 }}>
          Length (seconds)
          {/* The design system's stepper (user request 2026-10-13, "in the
              clip fade dialog, can we use our steppers please?"), as the
              Clip properties panel's fields: a tenth per arrow, held to
              0..the shortest target. The wrapper carries the test hook;
              Enter still applies (the stepper's own Enter toggles its
              edit mode and lets the key bubble), Escape still cancels. */}
          <div data-fade-dialog-length={key} onKeyDown={onInputKeyDown} style={{ minWidth: 0 }}>
            <NumberStepper
              ref={ref}
              value={text}
              placeholder={v.seconds === FADE_MIXED ? 'Mixed' : undefined}
              onChange={setText}
              min={0}
              max={maxSeconds}
              step={0.1}
              width="100%"
            />
          </div>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 400 }} data-fade-dialog-shape={key} data-shape={shape || undefined}>
          Shape
          <Dropdown
            options={options}
            value={shape}
            placeholder={placeholderFor(v.shape)}
            onChange={setShape}
            width="100%"
          />
        </div>
      </div>
    </fieldset>
  );

  return (
    <Dialog
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      os={os}
      // The design-system Dialog floors at 480px (Dialog.css); this is a
      // two-row entry and wants 360 — index.css lifts the floor for
      // exactly this class.
      className="fade-dialog"
      width={360}
      minHeight={0}
      footer={
        <DialogFooter
          primaryText="Apply"
          secondaryText="Cancel"
          primaryDisabled={!valid || !changed}
          onPrimaryClick={apply}
          onSecondaryClick={onClose}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {side('Fade-in', 'in', inText, setInText, inShape, setInShape, inRef, values.in)}
        {side('Fade-out', 'out', outText, setOutText, outShape, setOutShape, outRef, values.out)}
      </div>
    </Dialog>
  );
}

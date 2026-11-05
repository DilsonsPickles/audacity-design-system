import { formatPaletteShortcut } from '@audacity-ui/components';

/**
 * THE STATUS BAR'S INFO LINE — what the pointer is over (2026-11-05, the
 * Figma "Status/Info bar" spec, 41 - Bottom toolbar 6431:26297, which is
 * Audacity 3's status bar: "did you even implement what was in here?").
 * The spec gives a line for nearly every control: a button's NAME and
 * its SHORTCUT ("Undo (⌘Z)"), an INSTRUCTION for a surface ("Click and
 * drag to resize the track."), and a slider's VALUE ("Volume: +0.0 dB").
 *
 * One table, resolved from the DOM: each rule is a selector and its
 * line. The rule whose element is NEAREST the pointer's target wins (a
 * button names itself, not the panel it sits in); `over` rules win
 * outright (a state the pointer is in, whatever is under it).
 *
 * EVERY LINE IS TRUE OF THE PROTOTYPE, not of the spec's drawing: a
 * shortcut is shown only when the prototype binds it (the spec's F2,
 * ⇧Z, ⌘T, ⌘L, ⇧M, ⇧R and "Play once" are not bound here; its Split tool
 * is S, ours C), values are in the prototype's units (volume and pan
 * are percentages), and a gesture is described as it behaves here (an
 * envelope point is deleted by a click, a ruler opens its menu on a
 * right-click). The clip handles keep their own richer lines
 * (`utils/handleHints.ts`), which the host shows ahead of these.
 */
export interface StatusInfoContext {
  os: 'macos' | 'windows';
}

type Line = string | ((el: Element, ctx: StatusInfoContext) => string | null);

export interface StatusInfoRule {
  selector: string;
  line: Line;
  /** Wins whatever else matches nearer the target */
  over?: boolean;
}

const keys = (ctx: StatusInfoContext, chord: string) => formatPaletteShortcut(chord, ctx.os);
const named = (name: string, chord?: string): Line =>
  (_el, ctx) => (chord ? `${name} (${keys(ctx, chord)})` : name);
const label = (el: Element) => el.getAttribute('aria-label')?.trim() || null;
const numberOf = (value: string | null | undefined): number | null => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** A toolbar button by its accessible name: the spec's line for it */
const TOOLBAR_LINES: Record<string, Line> = {
  // Project toolbar
  Mixer: named('Mixer', 'M'),
  'Audio setup': 'Audio setup',
  'Share audio': 'Share audio',
  'Get effects': 'Get effects',
  Workspace: 'Workspace',
  Undo: named('Undo', 'Ctrl+Z'),
  Redo: named('Redo', 'Ctrl+Shift+Z'),
  // Transport
  Play: named('Play', 'Space'),
  Pause: named('Pause', 'Space'),
  Stop: 'Stop',
  Record: named('Record', 'R'),
  'Skip to start': (_el, ctx) => `Skip to start (${keys(ctx, 'Home')}) / Select to start (${keys(ctx, 'Shift+Home')})`,
  'Skip to end': (_el, ctx) => `Skip to end (${keys(ctx, 'End')}) / Select to end (${keys(ctx, 'Shift+End')})`,
  Loop: (el, ctx) => `${el.getAttribute('aria-pressed') === 'true' ? 'Disable' : 'Enable'} looping (${keys(ctx, 'L')})`,
  // Tools
  'Clip envelope': 'Envelope tool',
  'Cut / Split': named('Split tool', 'C'),
  'Spectral view': 'Toggle spectral view',
  'Zoom in': named('Zoom in', 'Ctrl+='),
  'Zoom out': named('Zoom out', 'Ctrl+-'),
  'Fit selection': 'Zoom to selection',
  'Fit project': 'Zoom to fit project',
  'Zoom toggle': 'Zoom toggle',
  Cut: named('Cut', 'Ctrl+X'),
  Copy: named('Copy', 'Ctrl+C'),
  Paste: named('Paste', 'Ctrl+V'),
  Trim: 'Trim audio outside selection',
  Silence: 'Silence audio selection',
  'Snap to grid': (el) => `Click to ${el.getAttribute('aria-checked') === 'true' ? 'disable' : 'enable'} snapping`,
  'Snap subdivision': 'Select snapping amount',
  'Microphone level': 'Set record level',
  'Playback volume settings': 'Playback meter',
  'Customise toolbar': 'Show/hide toolbar buttons',
  'Choose time signature': 'Time signature',
};

const toolbarLine: Line = (el, ctx) => {
  const name = label(el);
  if (!name) return null;
  const line = TOOLBAR_LINES[name];
  if (line === undefined) return name;
  return typeof line === 'string' ? line : line(el, ctx);
};

const panLine: Line = (el) => {
  const value = numberOf(el.querySelector('[role="slider"]')?.getAttribute('aria-valuenow'));
  if (value === null) return 'Pan';
  if (Math.abs(value) < 0.5) return 'Pan: Centre';
  return `Pan: ${Math.round(Math.abs(value))}% ${value < 0 ? 'left' : 'right'}`;
};

const volumeLine: Line = (el) => {
  const value = numberOf(el.querySelector<HTMLInputElement>('input')?.value);
  return value === null ? 'Volume' : `Volume: ${Math.round(value)}%`;
};

const levelLine = (name: string): Line => (el) => {
  const value = numberOf(el.getAttribute('aria-valuenow'));
  return value === null ? name : `${name} (${Math.round(value)}%)`;
};

export const STATUS_INFO_RULES: ReadonlyArray<StatusInfoRule> = [
  // --- States the pointer is in ---
  { selector: '.resizable-panel__content--resize-cursor', line: 'Click and drag to resize the track.', over: true },
  { selector: '[data-envelope-hover="point"]', line: 'Click and drag to move point, click to delete.', over: true },
  { selector: '[data-envelope-hover="curve"]', line: 'Click to create new envelope point.', over: true },

  // --- Toolbars ---
  { selector: '.project-toolbar .tab', line: (el) => el.textContent?.trim() || null },
  // The speed's VALUE is the cue's ("Playing at 110%"): said once, so
  // the control reads its name and keys, as a button does
  { selector: '[data-varispeed]', line: 'Playback speed (− / =)' },
  { selector: '.bpm-stepper', line: (el) => {
    const bpm = el.querySelector('.bpm-stepper__digits')?.textContent?.trim();
    return bpm ? `Tempo: ${bpm} bpm` : 'Tempo';
  } },
  { selector: '.time-signature-selector', line: 'Time signature' },
  { selector: '.transport-toolbar .timecode', line: 'Playhead position: click a digit to edit' },
  { selector: '.selection-toolbar .timecode[aria-label]', line: (el) => `${label(el)}: click a digit to edit` },
  { selector: '[role="slider"][aria-label="Master volume"]', line: levelLine('Playback level') },
  { selector: '[role="slider"][aria-label="Microphone level"]', line: levelLine('Recording level') },
  { selector: '.master-meter', line: 'Playback meter' },
  {
    selector: '.transport-toolbar button[aria-label], .project-toolbar button[aria-label], .transport-toolbar [role="checkbox"][aria-label]',
    line: toolbarLine,
  },

  // --- Track panel ---
  { selector: '.track-control-side-panel__add-group button', line: 'Add new track' },
  { selector: '.track-control-panel [aria-label="Track menu"]', line: 'Track menu' },
  { selector: '.track-control-panel [aria-label="Mute"]', line: named('Mute', 'Shift+U') },
  { selector: '.track-control-panel [aria-label="Solo"]', line: named('Solo', 'Shift+S') },
  { selector: '.track-control-panel button.button', line: (el, ctx) => (
    el.textContent?.trim() === 'Effects' ? `Effects (${keys(ctx, 'E')})` : null
  ) },
  { selector: '[data-tcp-slot="pan"]', line: panLine },
  { selector: '[data-tcp-slot="volume"]', line: volumeLine },
  { selector: '.track-control-panel', line: (_el, ctx) => (
    `${ctx.os === 'macos' ? 'Command' : 'Ctrl'} + Click to select or deselect track.`
  ) },

  // --- Clips ---
  { selector: '.clip-header__menu-button', line: 'Click to open clip context menu.' },
  { selector: '.clip-header', line: (_el, ctx) => (
    `Drag clips to reposition them - hold ${ctx.os === 'macos' ? 'Option' : 'Alt'} and drag to duplicate.`
  ) },

  // --- Canvas and rulers ---
  { selector: '[data-canvas-pointer][data-selection-edge="start"]', line: 'Click and drag to move left selection boundary' },
  { selector: '[data-canvas-pointer][data-selection-edge="end"]', line: 'Click and drag to move right selection boundary' },
  { selector: '[aria-label="Timeline ruler"]', line: 'Right-click for timeline options.' },
  { selector: '.vertical-ruler-panel__track', line: 'Right-click for menu.' },

  // --- Effects panel ---
  { selector: '[aria-label="Close effects panel"]', line: 'Close effects panel' },
  { selector: '[aria-label$="master effects"]', line: 'Click to toggle master effects on/off.' },
  { selector: '[aria-label$="track effects"]', line: 'Click to toggle track effects on/off.' },
  { selector: '.effect-slot__drag-handle', line: 'Click and drag to reorder effects.' },
  { selector: '.effect-slot [aria-label="Disable effect"], .effect-slot [aria-label="Enable effect"]', line: 'Click to toggle effect on/off.' },
  { selector: '.effect-slot__name-field', line: 'Click to open effect window.' },
  { selector: '.effect-slot__settings-button', line: 'Click to open context menu.' },
  { selector: '[aria-label="Effects panel"] button', line: (el) => (
    el.textContent?.trim() === 'Add effect' ? 'Add effect' : null
  ) },
];

const lineOf = (rule: StatusInfoRule, el: Element, ctx: StatusInfoContext): string | null =>
  (typeof rule.line === 'string' ? rule.line : rule.line(el, ctx));

/** How many steps up from `target` to `ancestor` (0 = the target itself) */
function distance(target: Element, ancestor: Element): number {
  let steps = 0;
  for (let el: Element | null = target; el && el !== ancestor; el = el.parentElement) steps++;
  return steps;
}

/** The info line for whatever is under `target`, or null (the bar's own
 *  default, "Click and drag to select audio") */
export function resolveStatusInfo(
  target: Element | null,
  ctx: StatusInfoContext,
  rules: ReadonlyArray<StatusInfoRule> = STATUS_INFO_RULES,
): string | null {
  if (!target) return null;
  let best: { line: string; steps: number } | null = null;
  for (const rule of rules) {
    const el = target.closest(rule.selector);
    if (!el) continue;
    const line = lineOf(rule, el, ctx);
    if (line === null) continue;
    if (rule.over) return line;
    const steps = distance(target, el);
    if (!best || steps < best.steps) best = { line, steps };
  }
  return best?.line ?? null;
}

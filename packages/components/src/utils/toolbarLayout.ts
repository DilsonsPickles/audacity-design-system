/**
 * THE TOOLBAR LAYOUT MODEL (2026-11-09, the custom toolbars design —
 * docs/superpowers/specs/2026-11-09-custom-toolbars-design.md): "which
 * tool lives on which bar" is DATA, not code. A layout is four DOCKS
 * (top, bottom, left, right), each an ordered list of TOOLBARS, each an
 * ordered list of TOOL IDS. A horizontal dock lays its bars left to right
 * and WRAPS a full row (Audacity 3's dock); a vertical dock stacks them.
 * Every bar has a persistent GRIP, so a whole bar moves between docks and
 * along a row at any time (`moveBar`). A workspace is a saved layout; the
 * built-in workspaces are seed layouts (`defaultToolbarLayout`).
 *
 * The bottom dock IS the status bar (author: "I want the bottom toolbar
 * items to also be customisable"): its cue, info line, selection timecodes
 * and duration are tools like any other, seeded as two bars.
 */
export type ToolbarRegion = 'top' | 'bottom' | 'left' | 'right';

export const TOOLBAR_REGIONS: ReadonlyArray<ToolbarRegion> = ['top', 'bottom', 'left', 'right'];

export interface ToolbarBar {
  /** Stable id — a seed's name ("transport") or "bar-<n>" for one the user made */
  id: string;
  /** Tool ids, in order (the Customise toolbar ids, plus the status bar's) */
  tools: string[];
}

export type ToolbarLayout = Record<ToolbarRegion, ToolbarBar[]>;

export type ToolbarWorkspace = 'classic' | 'spectral-editing' | 'modern' | 'music';

/** The orientation a dock renders its tools in */
export type ToolbarOrientation = 'horizontal' | 'vertical';

export const isVerticalRegion = (region: ToolbarRegion): boolean => region === 'left' || region === 'right';

/** The status bar's seed: the Figma Status/Info bar's two slots, then the
 *  selection timecodes and the duration */
const STATUS_BARS: ToolbarBar[] = [
  { id: 'status', tools: ['status-cue', 'status-info'] },
  { id: 'selection', tools: ['selection-timecodes', 'selection-duration'] },
];

const bar = (id: string, tools: string[]): ToolbarBar => ({ id, tools });

/** The built-in workspaces as seed layouts — the bars TransportToolbar
 *  drew for each, in its order (the hidden-tools list still gates each
 *  tool; a bar whose every tool is hidden draws nothing) */
export function defaultToolbarLayout(workspace: ToolbarWorkspace): ToolbarLayout {
  const transport = bar('transport', ['play', 'stop', 'record', 'step-back', 'step-forward', 'loop']);
  const readouts: ToolbarBar[] = [
    bar('speed', ['varispeed']),
    bar('time', ['timecode', 'bpm', 'time-signature']),
    bar('snap', ['snapping']),
    bar('meters', ['microphone-levels', 'playback-meter']),
  ];
  const trackHeight = bar('track-height', ['collapse-tracks', 'expand-tracks', 'fit-tracks-height']);
  let top: ToolbarBar[];
  switch (workspace) {
    case 'classic':
      top = [
        transport,
        bar('tools', ['automation', 'split', 'spectral-editing']),
        bar('zoom', ['zoom-in', 'zoom-out', 'fit-selection', 'fit-project', 'zoom-toggle']),
        trackHeight,
        bar('edit', ['cut', 'copy', 'paste']),
        bar('edit-audio', ['trim', 'silence']),
        ...readouts,
      ];
      break;
    case 'spectral-editing':
      top = [
        transport,
        bar('zoom', ['zoom-in', 'zoom-out', 'zoom-toggle']),
        trackHeight,
        bar('view', ['waveform-view']),
        ...readouts,
      ];
      break;
    case 'modern':
      top = [
        transport,
        bar('tools', ['automation', 'split', 'spectral-editing']),
        bar('zoom', ['zoom-in', 'zoom-out', 'zoom-toggle']),
        trackHeight,
        bar('edit-audio', ['trim', 'silence']),
        ...readouts,
      ];
      break;
    case 'music':
    default:
      top = [
        transport,
        bar('tools', ['automation', 'split']),
        bar('zoom', ['zoom-in', 'zoom-out', 'zoom-toggle']),
        trackHeight,
        bar('edit-audio', ['trim', 'silence']),
        ...readouts,
      ];
      break;
  }
  return { top, bottom: STATUS_BARS.map((b) => ({ ...b, tools: [...b.tools] })), left: [], right: [] };
}

/** The Export tab's toolbar (its own bars, not customisable) */
export const EXPORT_TOOLBAR_LAYOUT: ToolbarLayout = {
  top: [
    bar('export-transport', ['play', 'stop', 'loop']),
    bar('export-share', ['export-share']),
    bar('export-actions', ['export-audio', 'export-loop-region']),
  ],
  bottom: STATUS_BARS,
  left: [],
  right: [],
};

export function findBar(layout: ToolbarLayout, barId: string): { region: ToolbarRegion; index: number; bar: ToolbarBar } | null {
  for (const region of TOOLBAR_REGIONS) {
    const index = layout[region].findIndex((b) => b.id === barId);
    if (index >= 0) return { region, index, bar: layout[region][index] };
  }
  return null;
}

/**
 * Move a whole bar to `region` at `index` (the slot among that dock's bars,
 * counted BEFORE the bar is taken out — so a bar dropped after itself
 * lands where the pointer said). Returns the same layout when the bar is
 * not found or nothing would change.
 */
export function moveBar(layout: ToolbarLayout, barId: string, region: ToolbarRegion, index: number): ToolbarLayout {
  const found = findBar(layout, barId);
  if (!found) return layout;
  const next: ToolbarLayout = { ...layout };
  for (const r of TOOLBAR_REGIONS) next[r] = [...layout[r]];
  next[found.region].splice(found.index, 1);
  let at = Math.max(0, Math.min(index, next[region].length));
  if (found.region === region && index > found.index) at = Math.max(0, Math.min(index - 1, next[region].length));
  if (found.region === region && at === found.index) return layout;
  next[region].splice(at, 0, found.bar);
  return next;
}

/** Bars with no tools are dropped; empty docks stay */
export function normaliseLayout(layout: ToolbarLayout): ToolbarLayout {
  const next: ToolbarLayout = { ...layout };
  for (const r of TOOLBAR_REGIONS) next[r] = layout[r].filter((b) => b.tools.length > 0);
  return next;
}

/** Is this a layout — the shape a stored preference must have to be used */
export function isToolbarLayout(value: unknown): value is ToolbarLayout {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return TOOLBAR_REGIONS.every((r) => Array.isArray(v[r]) && (v[r] as unknown[]).every(
    (b) => !!b && typeof b === 'object' && typeof (b as ToolbarBar).id === 'string' && Array.isArray((b as ToolbarBar).tools),
  ));
}

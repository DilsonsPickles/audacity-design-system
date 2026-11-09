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

const cloneLayout = (layout: ToolbarLayout): ToolbarLayout => {
  const next = {} as ToolbarLayout;
  for (const r of TOOLBAR_REGIONS) next[r] = layout[r].map((b) => ({ ...b, tools: [...b.tools] }));
  return next;
};

const sameLayout = (a: ToolbarLayout, b: ToolbarLayout): boolean => TOOLBAR_REGIONS.every((r) =>
  a[r].length === b[r].length && a[r].every((bar, i) =>
    bar.id === b[r][i].id && bar.tools.length === b[r][i].tools.length && bar.tools.every((t, j) => t === b[r][i].tools[j])));

/** The bar holding a tool, or null */
export function findTool(layout: ToolbarLayout, toolId: string): { region: ToolbarRegion; bar: ToolbarBar; index: number } | null {
  for (const region of TOOLBAR_REGIONS) {
    for (const b of layout[region]) {
      const index = b.tools.indexOf(toolId);
      if (index >= 0) return { region, bar: b, index };
    }
  }
  return null;
}

/** A bar id no bar has yet: "bar-1", "bar-2", … */
export function nextBarId(layout: ToolbarLayout): string {
  const taken = new Set(TOOLBAR_REGIONS.flatMap((r) => layout[r].map((b) => b.id)));
  let n = 1;
  while (taken.has(`bar-${n}`)) n++;
  return `bar-${n}`;
}

/**
 * Move ONE TOOL into a bar, before `beforeToolId` (null = the bar's end).
 * The bar it leaves is dropped when that was its last tool. Addressed by
 * ids, so a bar vanishing never shifts the target. The same layout comes
 * back when nothing would change.
 */
export function moveTool(layout: ToolbarLayout, toolId: string, barId: string, beforeToolId: string | null): ToolbarLayout {
  if (!findTool(layout, toolId) || !findBar(layout, barId) || beforeToolId === toolId) return layout;
  const next = cloneLayout(layout);
  for (const r of TOOLBAR_REGIONS) for (const b of next[r]) b.tools = b.tools.filter((t) => t !== toolId);
  const target = findBar(next, barId)!.bar;
  const at = beforeToolId === null ? -1 : target.tools.indexOf(beforeToolId);
  if (at < 0) target.tools.push(toolId);
  else target.tools.splice(at, 0, toolId);
  const result = normaliseLayout(next);
  return sameLayout(result, layout) ? layout : result;
}

/**
 * Pull ONE TOOL out into a NEW BAR of its own, in `region` before the bar
 * `beforeBarId` (null = the dock's end) — "create a whole new toolbar
 * container just to put one tool in it" (2026-11-10). A tool that is
 * already alone in its bar, dropped beside that bar, changes nothing.
 */
export function moveToolToNewBar(layout: ToolbarLayout, toolId: string, region: ToolbarRegion, beforeBarId: string | null): ToolbarLayout {
  const from = findTool(layout, toolId);
  if (!from) return layout;
  // A tool ALONE in its bar is that bar: the bar itself moves, keeping its
  // id (beside itself, nothing changes)
  if (from.bar.tools.length === 1) {
    const bars = layout[region];
    const index = beforeBarId === null ? -1 : bars.findIndex((b) => b.id === beforeBarId);
    return moveBar(layout, from.bar.id, region, index < 0 ? bars.length : index);
  }
  const next = cloneLayout(layout);
  findBar(next, from.bar.id)!.bar.tools.splice(from.index, 1);
  const bars = next[region];
  const at = beforeBarId === null ? -1 : bars.findIndex((b) => b.id === beforeBarId);
  const fresh: ToolbarBar = { id: nextBarId(layout), tools: [toolId] };
  if (at < 0) bars.push(fresh);
  else bars.splice(at, 0, fresh);
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

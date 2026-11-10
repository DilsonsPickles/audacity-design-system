/**
 * THE TOOLBAR LAYOUT MODEL (2026-11-09, the custom toolbars design —
 * docs/superpowers/specs/2026-11-09-custom-toolbars-design.md): "which
 * tool lives on which bar" is DATA, not code. A layout is four DOCKS
 * (top, bottom, left, right); a dock is an ordered list of ROWS; a row is
 * an ordered list of TOOLBARS; a toolbar is an ordered list of TOOL IDS.
 *
 * ROWS ARE THE USER'S (2026-11-10, "I wanted the ability to create new
 * rows. As long as there is a tool in each row, it can exist"): a row is
 * made by dropping a bar or a tool on the line between rows, and it lives
 * for as long as it holds a tool — a row that loses its last bar is
 * dropped, as a bar that loses its last tool is. A row too wide for the
 * window still WRAPS on screen (Audacity 3's dock); that is the dock's
 * drawing, not the model. A side dock stacks every bar in one column.
 *
 * Every bar has a persistent GRIP, so a whole bar moves at any time
 * (`moveBar`); in the edit mode a single tool moves (`moveTool`,
 * `moveToolToNewBar`). A workspace is a saved layout; the built-in
 * workspaces are seed layouts (`defaultToolbarLayout`).
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

export type ToolbarRow = ToolbarBar[];

export type ToolbarLayout = Record<ToolbarRegion, ToolbarRow[]>;

export type ToolbarWorkspace = 'classic' | 'spectral-editing' | 'modern' | 'music';

/** The orientation a dock renders its tools in */
export type ToolbarOrientation = 'horizontal' | 'vertical';

export const isVerticalRegion = (region: ToolbarRegion): boolean => region === 'left' || region === 'right';

/**
 * Where a bar goes: INTO an existing row, before a bar of it (null = the
 * row's end; a row index past the dock's last makes a row), or into a NEW
 * ROW of its own, before row `newRowAt` (the dock's row count = last).
 */
export type BarPlacement =
  | { region: ToolbarRegion; row: number; beforeBarId: string | null }
  | { region: ToolbarRegion; newRowAt: number };

/** The status bar's seed: the Figma Status/Info bar's two slots, then the
 *  selection timecodes and the duration */
const statusBars = (): ToolbarBar[] => [
  { id: 'status', tools: ['status-cue', 'status-info'] },
  { id: 'selection', tools: ['selection-timecodes', 'selection-duration'] },
];

const bar = (id: string, tools: string[]): ToolbarBar => ({ id, tools });

/** The built-in workspaces as seed layouts — the bars TransportToolbar
 *  drew for each, in its order, in ONE row that wraps with the window
 *  (the hidden-tools list still gates each tool; a bar whose every tool
 *  is hidden draws nothing) */
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
  return { top: [top], bottom: [statusBars()], left: [], right: [] };
}

/** The Export tab's toolbar (its own bars, not customisable) */
export const EXPORT_TOOLBAR_LAYOUT: ToolbarLayout = {
  top: [[
    bar('export-transport', ['play', 'stop', 'loop']),
    bar('export-share', ['export-share']),
    bar('export-actions', ['export-audio', 'export-loop-region']),
  ]],
  bottom: [statusBars()],
  left: [],
  right: [],
};

/** Every bar of a dock, in order, whatever row it is in */
export function dockBars(layout: ToolbarLayout, region: ToolbarRegion): ToolbarBar[] {
  return layout[region].flat();
}

export function findBar(layout: ToolbarLayout, barId: string): { region: ToolbarRegion; row: number; index: number; bar: ToolbarBar } | null {
  for (const region of TOOLBAR_REGIONS) {
    for (let row = 0; row < layout[region].length; row++) {
      const index = layout[region][row].findIndex((b) => b.id === barId);
      if (index >= 0) return { region, row, index, bar: layout[region][row][index] };
    }
  }
  return null;
}

/** The bar holding a tool, or null */
export function findTool(layout: ToolbarLayout, toolId: string): { region: ToolbarRegion; row: number; bar: ToolbarBar; index: number } | null {
  for (const region of TOOLBAR_REGIONS) {
    for (let row = 0; row < layout[region].length; row++) {
      for (const b of layout[region][row]) {
        const index = b.tools.indexOf(toolId);
        if (index >= 0) return { region, row, bar: b, index };
      }
    }
  }
  return null;
}

/** A bar id no bar has yet: "bar-1", "bar-2", … */
export function nextBarId(layout: ToolbarLayout): string {
  const taken = new Set(TOOLBAR_REGIONS.flatMap((r) => dockBars(layout, r).map((b) => b.id)));
  let n = 1;
  while (taken.has(`bar-${n}`)) n++;
  return `bar-${n}`;
}

const cloneLayout = (layout: ToolbarLayout): ToolbarLayout => {
  const next = {} as ToolbarLayout;
  for (const r of TOOLBAR_REGIONS) next[r] = layout[r].map((row) => row.map((b) => ({ ...b, tools: [...b.tools] })));
  return next;
};

const sameLayout = (a: ToolbarLayout, b: ToolbarLayout): boolean => TOOLBAR_REGIONS.every((r) =>
  a[r].length === b[r].length && a[r].every((row, i) =>
    row.length === b[r][i].length && row.every((x, j) => {
      const y = b[r][i][j];
      return x.id === y.id && x.tools.length === y.tools.length && x.tools.every((t, k) => t === y.tools[k]);
    })));

/** Bars with no tools are dropped, then rows with no bars; empty docks stay */
export function normaliseLayout(layout: ToolbarLayout): ToolbarLayout {
  const next = {} as ToolbarLayout;
  for (const r of TOOLBAR_REGIONS) {
    next[r] = layout[r].map((row) => row.filter((b) => b.tools.length > 0)).filter((row) => row.length > 0);
  }
  return next;
}

/** Put `item` where the placement says, in a layout whose emptied bars and
 *  rows are STILL IN PLACE (so row indices mean what the caller saw) */
function place(next: ToolbarLayout, item: ToolbarBar, placement: BarPlacement): void {
  const rows = next[placement.region];
  if ('newRowAt' in placement) {
    rows.splice(Math.max(0, Math.min(placement.newRowAt, rows.length)), 0, [item]);
    return;
  }
  const row = rows[placement.row];
  if (!row) { rows.push([item]); return; }
  const at = placement.beforeBarId === null ? -1 : row.findIndex((b) => b.id === placement.beforeBarId);
  if (at < 0) row.push(item);
  else row.splice(at, 0, item);
}

/**
 * Move a whole bar to a placement. A bar dropped before itself stays put;
 * the row it leaves is dropped when that was its last bar. Returns the
 * same layout when the bar is not found or nothing would change.
 */
export function moveBar(layout: ToolbarLayout, barId: string, placement: BarPlacement): ToolbarLayout {
  const found = findBar(layout, barId);
  if (!found) return layout;
  // "Before itself" means before whatever follows it
  let target = placement;
  if (!('newRowAt' in placement) && placement.beforeBarId === barId) {
    target = { ...placement, beforeBarId: layout[found.region][found.row][found.index + 1]?.id ?? null };
  }
  const next = cloneLayout(layout);
  const [moved] = next[found.region][found.row].splice(found.index, 1);
  place(next, moved, target);
  const result = normaliseLayout(next);
  return sameLayout(result, layout) ? layout : result;
}

/**
 * Move ONE TOOL into a bar, before `beforeToolId` (null = the bar's end).
 * The bar it leaves is dropped when that was its last tool, and the row
 * with it. Addressed by ids, so a bar vanishing never shifts the target.
 * The same layout comes back when nothing would change.
 */
export function moveTool(layout: ToolbarLayout, toolId: string, barId: string, beforeToolId: string | null): ToolbarLayout {
  if (!findTool(layout, toolId) || !findBar(layout, barId) || beforeToolId === toolId) return layout;
  const next = cloneLayout(layout);
  for (const r of TOOLBAR_REGIONS) for (const row of next[r]) for (const b of row) b.tools = b.tools.filter((t) => t !== toolId);
  const target = findBar(next, barId)!.bar;
  const at = beforeToolId === null ? -1 : target.tools.indexOf(beforeToolId);
  if (at < 0) target.tools.push(toolId);
  else target.tools.splice(at, 0, toolId);
  const result = normaliseLayout(next);
  return sameLayout(result, layout) ? layout : result;
}

/**
 * Pull ONE TOOL out into a NEW BAR of its own at a placement — "create a
 * whole new toolbar container just to put one tool in it" (2026-11-10).
 * A tool already ALONE in its bar is that bar: the bar itself moves,
 * keeping its id (beside itself, nothing changes).
 */
export function moveToolToNewBar(layout: ToolbarLayout, toolId: string, placement: BarPlacement): ToolbarLayout {
  const from = findTool(layout, toolId);
  if (!from) return layout;
  if (from.bar.tools.length === 1) return moveBar(layout, from.bar.id, placement);
  const next = cloneLayout(layout);
  findBar(next, from.bar.id)!.bar.tools.splice(from.index, 1);
  place(next, { id: nextBarId(layout), tools: [toolId] }, placement);
  return normaliseLayout(next);
}

const isBar = (b: unknown): b is ToolbarBar =>
  !!b && typeof b === 'object' && typeof (b as ToolbarBar).id === 'string' && Array.isArray((b as ToolbarBar).tools);

/** Is this a layout — the shape a stored preference must have to be used */
export function isToolbarLayout(value: unknown): value is ToolbarLayout {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return TOOLBAR_REGIONS.every((r) => Array.isArray(v[r]) && (v[r] as unknown[]).every(
    (row) => Array.isArray(row) && row.every(isBar),
  ));
}

/**
 * A stored layout, made current: the first cut (2026-11-09) kept each dock
 * as a FLAT list of bars — that becomes one row. Null for anything else.
 */
export function coerceToolbarLayout(value: unknown): ToolbarLayout | null {
  if (isToolbarLayout(value)) return value;
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const next = {} as ToolbarLayout;
  for (const r of TOOLBAR_REGIONS) {
    const dock = v[r];
    if (!Array.isArray(dock)) return null;
    if (dock.every(isBar)) next[r] = dock.length ? [dock as ToolbarBar[]] : [];
    else if (dock.every((row) => Array.isArray(row) && row.every(isBar))) next[r] = dock as ToolbarRow[];
    else return null;
  }
  return next;
}

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
/** The window's four edges, plus — since 2026-11-10, "I should be able to
 *  put the vertical meters on the left of a panel if I so choose" — a
 *  dock on each PANEL dock's INNER edge, between it and the canvas:
 *  'left-inner' (right of the left panels), 'right-inner' (left of the
 *  right panels). Nesting from the window's edge inward is then: outer
 *  toolbar dock, panel dock, inner toolbar dock, canvas. */
export type ToolbarRegion = 'top' | 'bottom' | 'left' | 'right' | 'left-inner' | 'right-inner';

export const TOOLBAR_REGIONS: ReadonlyArray<ToolbarRegion> = ['top', 'bottom', 'left', 'right', 'left-inner', 'right-inner'];

/** The two inner docks — optional in a layout (one saved before them has
 *  neither; read as empty) */
export type InnerToolbarRegion = 'left-inner' | 'right-inner';

/** The edge a region's dock faces from: an inner dock is a left / right
 *  dock for its orientation, flyouts and drops */
export const regionSide = (region: ToolbarRegion): 'top' | 'bottom' | 'left' | 'right' =>
  region === 'left-inner' ? 'left' : region === 'right-inner' ? 'right' : region;

export interface ToolbarBar {
  /** Stable id — a seed's name ("transport") or "bar-<n>" for one the user made */
  id: string;
  /** Tool ids, in order (the Customise toolbar ids, plus the status bar's) */
  tools: string[];
  /** The user's WIDTH for this bar in a horizontal dock, px, its gutter
   *  included (2026-11-10, "adjust the width of the toolbars when docked
   *  horizontally and height when docked vertically"); absent = natural */
  width?: number;
  /** The user's HEIGHT for this bar in a vertical dock, px; absent = natural */
  height?: number;
  /** The user's NAME for the toolbar (the builder's Rename, 2026-11-11);
   *  absent = `barDisplayName`'s default for its id */
  name?: string;
}

/**
 * TOOLBARS AND GROUPS (2026-11-11, "we're kinda dancing around toolgroups and
 * toolbars", then MuseScore's "Add separator line" — "I don't mind having
 * toolbars as things that can be moved around with the grip. But if you want
 * to change what's inside, you gotta go via the tool we're building"): a BAR
 * is a TOOLBAR — the unit moved by its grip, which may be EMPTY and may be
 * NAMED; a SEPARATOR item in its tools splits it into GROUPS (a thin line, no
 * grip, not movable on its own). Separators are tool ids with this prefix,
 * unique per layout (`separator-1`, …), so every id-addressed edit works on
 * them unchanged.
 */
export const TOOL_SEPARATOR_PREFIX = 'separator-';
export const isToolSeparator = (id: string): boolean => id.startsWith(TOOL_SEPARATOR_PREFIX);

/** The default toolbars' names, by seed id */
const SEED_BAR_NAMES: Record<string, string> = {
  'project-tabs': 'Tabs', 'project-actions': 'Project', workspace: 'Workspace', share: 'Share', history: 'History',
  transport: 'Transport', tools: 'Tools', edit: 'Edit', view: 'View', time: 'Time', meters: 'Meters',
  customise: 'Customise', status: 'Status bar', selection: 'Selection', main: 'Main toolbar',
};
/** What a toolbar is called: its own name, else its seed's, else "Toolbar" */
export const barDisplayName = (bar: ToolbarBar): string => bar.name ?? SEED_BAR_NAMES[bar.id] ?? 'Toolbar';

/** Which of a bar's sizes a dock uses */
export type ToolbarBarAxis = 'width' | 'height';

export type ToolbarRow = ToolbarBar[];

export type ToolbarLayout = Record<Exclude<ToolbarRegion, InnerToolbarRegion>, ToolbarRow[]> & Partial<Record<InnerToolbarRegion, ToolbarRow[]>>;

/** A dock's rows (an inner dock a layout lacks is empty) */
export const rowsOf = (layout: ToolbarLayout, region: ToolbarRegion): ToolbarRow[] => layout[region] ?? [];

export type ToolbarWorkspace = 'classic' | 'spectral-editing' | 'modern' | 'music';

/** The orientation a dock renders its tools in */
export type ToolbarOrientation = 'horizontal' | 'vertical';

export const isVerticalRegion = (region: ToolbarRegion): boolean => regionSide(region) === 'left' || regionSide(region) === 'right';

/**
 * Where a bar goes: INTO an existing row, before a bar of it (null = the
 * row's end; a row index past the dock's last makes a row), or into a NEW
 * ROW of its own, before row `newRowAt` (the dock's row count = last).
 */
export type BarPlacement =
  | { region: ToolbarRegion; row: number; beforeBarId: string | null }
  | { region: ToolbarRegion; newRowAt: number };

/** THE COG IS A TOOL (2026-11-10, "I think the cog button should probably
 *  be its own toolbar, or at least moveable"): the Customise toolbar cog,
 *  seeded as a toolbar of its own at the end of the top row, moved by its
 *  grip like any bar and able to join another. It cannot be hidden (it is
 *  not in the Customise list), and a layout without it gets it back at the
 *  top dock's end (`withCustomiseTool`), so it can never be lost. */
export const CUSTOMISE_TOOL_ID = 'customise';

/** THE PROJECT TOOLBAR IS TOOLS (2026-11-10, user feedback on the "wasted
 *  space" of the project toolbar → "I want to bring those into the toolbar
 *  layout chaos"): the Home / Project / Export / Debug tabs, the Mixer /
 *  Audio setup / Share audio / Get effects buttons, the workspace picker
 *  and undo / redo are tools like the rest, seeded as a FIRST ROW of the
 *  top dock that looks like the old bar — move them into the other rows to
 *  win its 40px back. The tabs can never be lost (`withProjectTools`). */
export const PROJECT_TAB_TOOL_ID = 'project-tabs';
/** THE FIRST ROW, SINCE 2026-11-11 ("now we need to work out what we can
 *  do with the 'Mixer' 'Audio Setup' 'Share audio' and 'Get effects'
 *  buttons…" → "build it"): each button went where its job is — AUDIO
 *  SETUP starts the METERS bar (it is about the devices the meters read),
 *  UNDO / REDO start the EDIT bar, SHARE AUDIO is a bar of its own after
 *  the workspace picker, and MIXER / GET EFFECTS stay here but HIDDEN by
 *  default (M / View › Mixer, the Effect menu and the effects panel reach
 *  them; Customise toolbar brings the buttons back). In the desktop app the
 *  tabs, the workspace picker and Share live in the title bar, so this row
 *  draws nothing and is gone. */
const projectBars = (): ToolbarBar[] => [
  { id: 'project-tabs', tools: [PROJECT_TAB_TOOL_ID] },
  { id: 'project-actions', tools: ['mixer-button', 'get-effects'] },
  { id: 'workspace', tools: ['workspace'] },
  { id: 'share', tools: ['share-audio'] },
];
/** The first row as it was seeded from 2026-11-10 — where a layout that
 *  lacks a project tool gets it back (`withProjectTools`) */
const legacyProjectBars = (): ToolbarBar[] => [
  { id: 'project-tabs', tools: [PROJECT_TAB_TOOL_ID] },
  { id: 'project-actions', tools: ['mixer-button', 'audio-setup', 'share-audio', 'get-effects'] },
  { id: 'workspace', tools: ['workspace'] },
  // (two tools since 2026-11-10, "undo and redo can be two separate buttons")
  { id: 'history', tools: ['undo', 'redo'] },
];
/** Every project tool id */
export const PROJECT_TOOL_IDS: ReadonlyArray<string> = legacyProjectBars().flatMap((b) => b.tools);
/** The project tools hidden by default (Customise toolbar brings them back) */
export const PROJECT_TOOLS_HIDDEN_BY_DEFAULT: ReadonlyArray<string> = ['mixer-button', 'get-effects'];

/** The status bar's seed: the Figma Status/Info bar's two slots, then the
 *  selection timecodes and the duration */
const statusBars = (): ToolbarBar[] => [
  { id: 'status', tools: ['status-cue', 'status-info'] },
  { id: 'selection', tools: ['selection-timecodes', 'selection-duration'] },
];

const bar = (id: string, tools: string[]): ToolbarBar => ({ id, tools });

/** ONE toolbar from GROUPS: the groups' tools in order with a separator
 *  between each (`separator-1`, … unique within the seed) */
const groupedBar = (id: string, groups: string[][], counter: { n: number }): ToolbarBar => ({
  id,
  tools: groups.filter((g) => g.length > 0).flatMap((g, i) => (i === 0 ? g : [`${TOOL_SEPARATOR_PREFIX}${++counter.n}`, ...g])),
});

/** The built-in workspaces as seed layouts.
 *
 *  ONE TOOLBAR AT THE TOP AND ONE AT THE BOTTOM, THE TOOLS SEPARATED
 *  (2026-11-11, "our default layout should be one toolbar at the top, and
 *  one at the bottom. Tools are then separated. That's how we start" — once
 *  a toolbar could hold GROUPS split by separators, MuseScore's model): a
 *  toolbar is the thing its grip moves, a group is a run of tools between
 *  separators, and the user makes more toolbars when they want them. The
 *  groups are the Audacity 3-sized ones of 2026-11-10: the project tools
 *  (each drawing nothing where the desktop title bar has them), transport,
 *  the tools (modes), edit, view (zoom and track height), time (speed,
 *  timecode, tempo, signature, snap), meters, then the cog. A separator
 *  next to a group that draws nothing is not drawn. (2026-11-10 to -11 the
 *  groups were toolbars of their own, ten before that, in two rows.) */
export function defaultToolbarLayout(workspace: ToolbarWorkspace): ToolbarLayout {
  const transport = ['play', 'stop', 'record', 'step-back', 'step-forward', 'loop'];
  const trackHeight = ['collapse-tracks', 'expand-tracks', 'fit-tracks-height'];
  const time = ['varispeed', 'timecode', 'bpm', 'time-signature', 'snapping'];
  const meters = ['audio-setup', 'microphone-levels', 'playback-meter'];
  let groups: string[][];
  switch (workspace) {
    case 'classic':
      groups = [
        transport,
        ['automation', 'split', 'spectral-editing'],
        ['undo', 'redo', 'cut', 'copy', 'paste', 'trim', 'silence'],
        ['zoom-in', 'zoom-out', 'fit-selection', 'fit-project', 'zoom-toggle', ...trackHeight],
        time,
        meters,
      ];
      break;
    case 'spectral-editing':
      groups = [
        transport,
        ['undo', 'redo'],
        ['zoom-in', 'zoom-out', 'zoom-toggle', ...trackHeight, 'waveform-view'],
        time,
        meters,
      ];
      break;
    case 'modern':
      groups = [
        transport,
        ['automation', 'split', 'spectral-editing'],
        ['undo', 'redo', 'trim', 'silence'],
        ['zoom-in', 'zoom-out', 'zoom-toggle', ...trackHeight],
        time,
        meters,
      ];
      break;
    case 'music':
    default:
      groups = [
        transport,
        ['automation', 'split'],
        ['undo', 'redo', 'trim', 'silence'],
        ['zoom-in', 'zoom-out', 'zoom-toggle', ...trackHeight],
        time,
        meters,
      ];
      break;
  }
  const counter = { n: 0 };
  const project = projectBars().map((b) => b.tools);
  const top = groupedBar('main', [...project, ...groups, [CUSTOMISE_TOOL_ID]], counter);
  const bottom = groupedBar('status', statusBars().map((b) => b.tools), counter);
  return { top: [[top]], bottom: [[bottom]], left: [], right: [] };
}

/** The Export tab's toolbar (its own bars, not customisable) */
export const EXPORT_TOOLBAR_LAYOUT: ToolbarLayout = {
  // (the project tabs first — the Export tab is still a place to leave)
  top: [[bar('project-tabs', [PROJECT_TAB_TOOL_ID])], [
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
  return rowsOf(layout, region).flat();
}

export function findBar(layout: ToolbarLayout, barId: string): { region: ToolbarRegion; row: number; index: number; bar: ToolbarBar } | null {
  for (const region of TOOLBAR_REGIONS) {
    const rows = rowsOf(layout, region);
    for (let row = 0; row < rows.length; row++) {
      const index = rows[row].findIndex((b) => b.id === barId);
      if (index >= 0) return { region, row, index, bar: rows[row][index] };
    }
  }
  return null;
}

/** The bar holding a tool, or null */
export function findTool(layout: ToolbarLayout, toolId: string): { region: ToolbarRegion; row: number; bar: ToolbarBar; index: number } | null {
  for (const region of TOOLBAR_REGIONS) {
    const rows = rowsOf(layout, region);
    for (let row = 0; row < rows.length; row++) {
      for (const b of rows[row]) {
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
  for (const r of TOOLBAR_REGIONS) next[r] = rowsOf(layout, r).map((row) => row.map((b) => ({ ...b, tools: [...b.tools] })));
  return next;
};

const sameLayout = (a: ToolbarLayout, b: ToolbarLayout): boolean => TOOLBAR_REGIONS.every((r) => {
  const ra = rowsOf(a, r);
  const rb = rowsOf(b, r);
  return ra.length === rb.length && ra.every((row, i) =>
    row.length === rb[i].length && row.every((x, j) => {
      const y = rb[i][j];
      return x.id === y.id && x.width === y.width && x.height === y.height
        && x.tools.length === y.tools.length && x.tools.every((t, k) => t === y.tools[k]);
    }));
});

/** Bars with no tools are dropped, then rows with no bars; empty docks stay */
export function normaliseLayout(layout: ToolbarLayout): ToolbarLayout {
  const next = {} as ToolbarLayout;
  for (const r of TOOLBAR_REGIONS) {
    // An EMPTY TOOLBAR STAYS (2026-11-11 — a toolbar is a container the
    // user can make and fill); a row with no toolbar in it goes
    next[r] = rowsOf(layout, r).map((row) => [...row]).filter((row) => row.length > 0);
  }
  return next;
}

/** Put `item` where the placement says, in a layout whose emptied bars and
 *  rows are STILL IN PLACE (so row indices mean what the caller saw) */
function place(next: ToolbarLayout, item: ToolbarBar, placement: BarPlacement): void {
  const rows = next[placement.region] ?? (next[placement.region] = []);
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
    target = { ...placement, beforeBarId: rowsOf(layout, found.region)[found.row][found.index + 1]?.id ?? null };
  }
  const next = cloneLayout(layout);
  const [moved] = rowsOf(next, found.region)[found.row].splice(found.index, 1);
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
  for (const r of TOOLBAR_REGIONS) for (const row of rowsOf(next, r)) for (const b of row) b.tools = b.tools.filter((t) => t !== toolId);
  const target = findBar(next, barId)!.bar;
  const at = beforeToolId === null ? -1 : target.tools.indexOf(beforeToolId);
  if (at < 0) target.tools.push(toolId);
  else target.tools.splice(at, 0, toolId);
  const result = normaliseLayout(next);
  return sameLayout(result, layout) ? layout : result;
}

/**
 * ADD a tool to a bar, before `beforeToolId` (null = the bar's end) — the
 * toolbar builder's Add (2026-11-11): a tool already on a toolbar MOVES
 * there (`moveTool`); one on no toolbar is put there.
 */
export function insertTool(layout: ToolbarLayout, toolId: string, barId: string, beforeToolId: string | null): ToolbarLayout {
  if (findTool(layout, toolId)) return moveTool(layout, toolId, barId, beforeToolId);
  if (!findBar(layout, barId)) return layout;
  const next = cloneLayout(layout);
  const target = findBar(next, barId)!.bar;
  const at = beforeToolId === null ? -1 : target.tools.indexOf(beforeToolId);
  if (at < 0) target.tools.push(toolId);
  else target.tools.splice(at, 0, toolId);
  return normaliseLayout(next);
}

/**
 * A tool into a NEW BAR of its own at a placement, whether or not it is on a
 * toolbar now — the toolbar builder's Add onto a row or a dock (2026-11-11);
 * `moveToolToNewBar` keeps its rule that a tool it cannot find moves nothing.
 */
export function addToolToNewBar(layout: ToolbarLayout, toolId: string, placement: BarPlacement): ToolbarLayout {
  if (findTool(layout, toolId)) return moveToolToNewBar(layout, toolId, placement);
  const next = cloneLayout(layout);
  place(next, { id: nextBarId(layout), tools: [toolId] }, placement);
  return normaliseLayout(next);
}

/** A fresh separator id for this layout */
export function nextSeparatorId(layout: ToolbarLayout): string {
  const taken = new Set(TOOLBAR_REGIONS.flatMap((r) => dockBars(layout, r).flatMap((b) => b.tools)));
  let n = 1;
  while (taken.has(`${TOOL_SEPARATOR_PREFIX}${n}`)) n++;
  return `${TOOL_SEPARATOR_PREFIX}${n}`;
}

/** A SEPARATOR into a toolbar, before `beforeToolId` (null = its end) */
export function insertSeparator(layout: ToolbarLayout, barId: string, beforeToolId: string | null): ToolbarLayout {
  if (!findBar(layout, barId)) return layout;
  return insertTool(layout, nextSeparatorId(layout), barId, beforeToolId);
}

/** A NEW EMPTY TOOLBAR at a placement (the builder's New toolbar / New row) */
export function addEmptyBar(layout: ToolbarLayout, placement: BarPlacement, name?: string): ToolbarLayout {
  const next = cloneLayout(layout);
  place(next, { id: nextBarId(layout), tools: [], ...(name ? { name } : {}) }, placement);
  return normaliseLayout(next);
}

/** DELETE a toolbar; its tools go onto no toolbar, and its row with it when
 *  it was the row's last */
export function removeBar(layout: ToolbarLayout, barId: string): ToolbarLayout {
  if (!findBar(layout, barId)) return layout;
  const next = cloneLayout(layout);
  for (const r of TOOLBAR_REGIONS) next[r] = rowsOf(next, r).map((row) => row.filter((b) => b.id !== barId));
  return normaliseLayout(next);
}

/** NAME a toolbar (null or blank = back to its default name) */
export function renameBar(layout: ToolbarLayout, barId: string, name: string | null): ToolbarLayout {
  const found = findBar(layout, barId);
  const clean = name?.trim() || undefined;
  if (!found || found.bar.name === clean) return layout;
  const next = cloneLayout(layout);
  const bar = findBar(next, barId)!.bar;
  if (clean) bar.name = clean; else delete bar.name;
  return next;
}

/**
 * REMOVE a tool from the layout — onto no toolbar (the toolbar builder's
 * Remove, 2026-11-11). Its bar STAYS, empty, when it was the last tool
 * (empty toolbars are the user's to delete). A tool the layout's guards put back (the cog, the project tools)
 * should be HIDDEN instead; this does not stop a caller.
 */
export function removeTool(layout: ToolbarLayout, toolId: string): ToolbarLayout {
  if (!findTool(layout, toolId)) return layout;
  const next = cloneLayout(layout);
  for (const r of TOOLBAR_REGIONS) for (const row of rowsOf(next, r)) for (const b of row) b.tools = b.tools.filter((t) => t !== toolId);
  return normaliseLayout(next);
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

/**
 * Set a bar's WIDTH (used in a horizontal dock) or HEIGHT (a vertical
 * one); null clears it, back to the bar's natural size. A bar keeps both,
 * so moving it between a top and a side dock keeps each. The same layout
 * comes back when nothing would change.
 */
export function setBarSize(layout: ToolbarLayout, barId: string, axis: ToolbarBarAxis, size: number | null): ToolbarLayout {
  if (!findBar(layout, barId)) return layout;
  const next = cloneLayout(layout);
  const target = findBar(next, barId)!.bar;
  if (size === null) delete target[axis];
  else target[axis] = Math.max(0, Math.round(size));
  return sameLayout(next, layout) ? layout : next;
}

/**
 * A layout that has the Customise cog somewhere: the same layout, or —
 * a layout saved before the cog was a tool, or one that lost it — a copy
 * with the cog as a toolbar of its own at the end of the top dock's last
 * row (its own row when the top dock is empty).
 */
export function withCustomiseTool(layout: ToolbarLayout): ToolbarLayout {
  if (findTool(layout, CUSTOMISE_TOOL_ID)) return layout;
  const next = cloneLayout(layout);
  const id = findBar(layout, CUSTOMISE_TOOL_ID) ? nextBarId(layout) : CUSTOMISE_TOOL_ID;
  const item: ToolbarBar = { id, tools: [CUSTOMISE_TOOL_ID] };
  if (next.top.length === 0) next.top.push([item]);
  else next.top[next.top.length - 1].push(item);
  return next;
}

/**
 * A layout with every PROJECT tool somewhere: the same layout, or — one
 * saved before they were tools — a copy with the missing ones as a new
 * FIRST ROW of the top dock, in the old project toolbar's order.
 */
export function withProjectTools(input: ToolbarLayout): ToolbarLayout {
  // The combined 'undo-redo' tool of the first cut becomes the pair, in place
  let layout = input;
  if (findTool(layout, 'undo-redo')) {
    layout = cloneLayout(layout);
    for (const r of TOOLBAR_REGIONS) for (const row of rowsOf(layout, r)) for (const b of row) {
      b.tools = b.tools.flatMap((t) => (t === 'undo-redo' ? ['undo', 'redo'] : [t]));
    }
  }
  const missing = PROJECT_TOOL_IDS.filter((id) => !findTool(layout, id));
  if (missing.length === 0) return layout;
  const taken = new Set(TOOLBAR_REGIONS.flatMap((r) => dockBars(layout, r).map((b) => b.id)));
  const row = legacyProjectBars()
    .map((b) => ({ id: taken.has(b.id) ? `${b.id}-1` : b.id, tools: b.tools.filter((t) => missing.includes(t)) }))
    .filter((b) => b.tools.length > 0);
  const next = cloneLayout(layout);
  next.top.unshift(row);
  return next;
}

/**
 * THE FIRST ROW'S BUTTONS MOVE OUT (2026-11-11) — for a layout saved with
 * the 2026-11-10 first row: when Audio setup and Share audio still share a
 * bar (the old actions bar), Audio setup moves to the front of the bar
 * holding a meter and Share audio to a bar of its own after the workspace
 * picker's; when Undo / Redo are still a bar of their own and an edit bar
 * exists, they move to its front. Shape-based, so a layout the user has
 * rearranged otherwise is left as it is, and running it twice changes
 * nothing.
 */
export function withProjectRowMoves(input: ToolbarLayout): ToolbarLayout {
  let layout = input;
  const audio = findTool(layout, 'audio-setup');
  // (the old first row's bar — never a toolbar that also holds the transport, as the 2026-11-11 seed does)
  if (audio && audio.bar.tools.includes('share-audio') && !audio.bar.tools.includes('play')) {
    const meterBar = TOOLBAR_REGIONS.flatMap((r) => dockBars(layout, r))
      .find((b) => b.tools.includes('playback-meter') || b.tools.includes('microphone-levels'));
    if (meterBar) layout = moveTool(layout, 'audio-setup', meterBar.id, meterBar.tools[0] ?? null);
    const ws = findTool(layout, 'workspace');
    const share = findTool(layout, 'share-audio');
    if (share && share.bar.tools.length > 1) {
      const anchorBar = ws ?? share;
      const row = rowsOf(layout, anchorBar.region)[anchorBar.row];
      const at = row.findIndex((b) => b.id === anchorBar.bar.id);
      const after = row[at + 1]?.id ?? null;
      layout = moveToolToNewBar(layout, 'share-audio', { region: anchorBar.region, row: anchorBar.row, beforeBarId: after });
    }
  }
  const undo = findTool(layout, 'undo');
  if (undo && undo.bar.tools.length === 2 && undo.bar.tools.includes('redo')) {
    const editBar = TOOLBAR_REGIONS.flatMap((r) => dockBars(layout, r))
      .find((b) => b !== undo.bar && (b.tools.includes('cut') || b.tools.includes('trim') || b.tools.includes('silence')));
    if (editBar) {
      const first = editBar.tools[0] ?? null;
      const historyId = undo.bar.id;
      layout = moveTool(layout, 'redo', editBar.id, first);
      layout = moveTool(layout, 'undo', editBar.id, 'redo');
      // (empty toolbars stay since 2026-11-11: the emptied history bar is dropped here)
      if (findBar(layout, historyId)?.bar.tools.length === 0) layout = removeBar(layout, historyId);
    }
  }
  return layout;
}

const isBar = (b: unknown): b is ToolbarBar =>
  !!b && typeof b === 'object' && typeof (b as ToolbarBar).id === 'string' && Array.isArray((b as ToolbarBar).tools);

/** Is this a layout — the shape a stored preference must have to be used */
export function isToolbarLayout(value: unknown): value is ToolbarLayout {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return TOOLBAR_REGIONS.every((r) => (v[r] === undefined && (r === 'left-inner' || r === 'right-inner'))
    || (Array.isArray(v[r]) && (v[r] as unknown[]).every((row) => Array.isArray(row) && row.every(isBar))));
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
    // (an inner dock a layout lacks stays absent: read as empty)
    if (v[r] === undefined && (r === 'left-inner' || r === 'right-inner')) continue;
    const dock = v[r];
    if (!Array.isArray(dock)) return null;
    if (dock.every(isBar)) next[r] = dock.length ? [dock as ToolbarBar[]] : [];
    else if (dock.every((row) => Array.isArray(row) && row.every(isBar))) next[r] = dock as ToolbarRow[];
    else return null;
  }
  return next;
}

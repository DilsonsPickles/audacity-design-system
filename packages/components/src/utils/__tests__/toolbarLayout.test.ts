import { describe, it, expect } from 'vitest';
import {
  coerceToolbarLayout, defaultToolbarLayout, dockBars, findBar, findTool, moveBar, moveTool, moveToolToNewBar, nextBarId, insertSeparator, isToolSeparator, addEmptyBar, removeBar, renameBar, barDisplayName,
  normaliseLayout, isToolbarLayout, setBarSize, withCustomiseTool, withProjectTools, withProjectRowMoves, insertTool, removeTool, addToolToNewBar, PROJECT_TOOL_IDS, type ToolbarLayout, type ToolbarRegion,
} from '../toolbarLayout';

/** A seed WITHOUT the project row (2026-11-10, the project toolbar's
 *  tools seeded as the top dock's first row): the move tests below were
 *  written against the transport row being row 0 */
/** (Since 2026-11-11 the seed is ONE toolbar a dock, its groups split by
 *  separators; this fixture splits it back into the 2026-11-10 shape — a
 *  toolbar per group, the project ones left out, the status bar two — so
 *  the move and size tests keep their named bars.) */
const GROUP_IDS: Array<[string, string]> = [
  ['play', 'transport'], ['automation', 'tools'], ['undo', 'edit'], ['zoom-in', 'view'],
  ['timecode', 'time'], ['playback-meter', 'meters'], ['customise', 'customise'],
  ['status-cue', 'status'], ['selection-timecodes', 'selection'],
];
const groupsOf = (tools: string[]): string[][] => tools.reduce<string[][]>((acc, t) => {
  if (isToolSeparator(t)) acc.push([]); else acc[acc.length - 1].push(t);
  return acc;
}, [[]]);
const asBars = (tools: string[]) => groupsOf(tools).flatMap((g) => {
  const id = GROUP_IDS.find(([t]) => g.includes(t))?.[1];
  return id ? [{ id, tools: g }] : [];
});
const seedWithoutProjectRow = (ws: Parameters<typeof defaultToolbarLayout>[0]): ToolbarLayout => {
  const l = defaultToolbarLayout(ws);
  return { top: [asBars(l.top[1][0].tools)], bottom: [asBars(l.bottom[0][0].tools)], left: [], right: [] };
};

/** A dock's rows as lists of bar ids */
const rows = (l: ToolbarLayout, r: ToolbarRegion) => (l[r] ?? []).map((row) => row.map((b) => b.id));

describe('toolbarLayout — the custom toolbars model (2026-11-09; rows 2026-11-10)', () => {
  it('every workspace seeds ONE TOOLBAR AT THE TOP AND ONE AT THE BOTTOM, the groups split by separators (2026-11-11)', () => {
    for (const ws of ['classic', 'spectral-editing', 'modern', 'music'] as const) {
      const layout = defaultToolbarLayout(ws);
      // THE TITLE BAR a toolbar of its own, first; then the main toolbar
      expect(rows(layout, 'top')).toEqual([['title'], ['main']]);
      expect(layout.top[0][0].tools).toEqual(['project-tabs', 'audio-setup', 'workspace', 'share-audio']);
      expect(barDisplayName(layout.top[0][0])).toBe('Title bar');
      expect(rows(layout, 'bottom')).toEqual([['status']]);
      expect(layout.left).toEqual([]);
      expect(layout.right).toEqual([]);
      expect(isToolbarLayout(layout)).toBe(true);
      const groups = groupsOf(layout.top[1][0].tools);
      // Mixer and Get effects first (hidden by default), the cog last
      expect(groups[0]).toEqual(['mixer-button', 'get-effects']);
      expect(groups[1]).toEqual(['play', 'stop', 'record', 'step-back', 'step-forward', 'loop']);
      expect(groups[groups.length - 1]).toEqual(['customise']);
      expect(groups[groups.length - 2]).toEqual(['microphone-levels', 'playback-meter']);
      expect(groupsOf(layout.bottom[0][0].tools)).toEqual([['status-cue', 'status-info'], ['selection-timecodes', 'selection-duration']]);
      // separator ids are unique across the layout
      const seps = [...layout.top[1][0].tools, ...layout.bottom[0][0].tools].filter(isToolSeparator);
      expect(new Set(seps).size).toBe(seps.length);
      // the guards leave the seed as it is
      expect(withProjectTools(layout)).toBe(layout);
      expect(withCustomiseTool(layout)).toBe(layout);
      expect(withProjectRowMoves(layout)).toBe(layout);
    }
    const classic = seedWithoutProjectRow('classic');
    expect(dockBars(classic, 'top').map((b) => b.id)).toEqual(['transport', 'tools', 'edit', 'view', 'time', 'meters', 'customise']);
    expect(findBar(classic, 'edit')?.bar.tools).toEqual(['undo', 'redo', 'cut', 'copy', 'paste', 'trim', 'silence']);
    expect(findBar(classic, 'time')?.bar.tools).toEqual(['varispeed', 'timecode', 'bpm', 'time-signature', 'snapping']);
    // music has no spectral view
    expect(findBar(seedWithoutProjectRow('music'), 'tools')?.bar.tools).toEqual(['automation', 'split']);
  });

  it('THE PROJECT TOOLS (2026-11-10): a layout saved without them gets the missing ones as a new first row of the top dock; one that has them moved elsewhere keeps them there', () => {
    const full = defaultToolbarLayout('classic');
    expect(withProjectTools(full)).toBe(full);
    const old = seedWithoutProjectRow('classic');
    const fixed = withProjectTools(old);
    // (the seed's other rows already hold Audio setup and Undo / Redo since 2026-11-11)
    expect(rows(fixed, 'top')[0]).toEqual(['project-tabs', 'project-actions', 'workspace']);
    expect(rows(fixed, 'top').slice(1)).toEqual(rows(old, 'top'));
    expect(PROJECT_TOOL_IDS.every((id) => findTool(fixed, id))).toBe(true);
    // the tabs moved into the transport row: only the rest come back, and the tabs stay put
    const moved = moveBar(fixed, 'project-tabs', { region: 'top', row: 1, beforeBarId: 'transport' });
    expect(withProjectTools(moved)).toBe(moved);
    const partial = moveTool(moved, 'undo', 'transport', null);
    expect(withProjectTools(partial)).toBe(partial);
    // the first cut's combined 'undo-redo' becomes the pair, in place
    const combined: ToolbarLayout = { top: [[{ id: 'h', tools: ['play', 'undo-redo'] }]], bottom: [], left: [], right: [] };
    const split = withProjectTools(combined);
    expect(findBar(split, 'h')!.bar.tools).toEqual(['play', 'undo', 'redo']);
    expect(findTool(split, 'undo-redo')).toBeNull();
  });

  it('moveBar moves a bar within its row, between docks, and before itself is no change', () => {
    const layout = seedWithoutProjectRow('classic');
    // to the left dock (no rows yet: a row is made)
    const left = moveBar(layout, 'view', { region: 'left', row: 0, beforeBarId: null });
    expect(rows(left, 'left')).toEqual([['view']]);
    expect(dockBars(left, 'top').map((b) => b.id)).not.toContain('view');
    expect(findBar(left, 'view')).toMatchObject({ region: 'left', row: 0, index: 0 });
    // along the top row: before the transport bar puts it first
    expect(rows(moveBar(layout, 'view', { region: 'top', row: 0, beforeBarId: 'transport' }), 'top')[0][0]).toBe('view');
    // to the row's end
    expect(rows(moveBar(layout, 'transport', { region: 'top', row: 0, beforeBarId: null }), 'top')[0].slice(-1)).toEqual(['transport']);
    // nothing to do: before itself, before the bar that already follows it, an unknown bar
    expect(moveBar(layout, 'view', { region: 'top', row: 0, beforeBarId: 'view' })).toBe(layout);
    expect(moveBar(layout, 'view', { region: 'top', row: 0, beforeBarId: 'time' })).toBe(layout);
    expect(moveBar(layout, 'nope', { region: 'top', row: 0, beforeBarId: null })).toBe(layout);
    // the input is never mutated
    expect(layout.left).toEqual([]);
  });

  it('A NEW ROW: a bar dropped on the line between rows gets a row of its own, and a row lives while it holds a bar', () => {
    const layout = seedWithoutProjectRow('classic');
    // a new row at the top dock's end
    const a = moveBar(layout, 'view', { region: 'top', newRowAt: 1 });
    expect(rows(a, 'top')).toHaveLength(2);
    expect(rows(a, 'top')[1]).toEqual(['view']);
    expect(rows(a, 'top')[0]).not.toContain('view');
    // another above everything
    const b = moveBar(a, 'edit', { region: 'top', newRowAt: 0 });
    expect(rows(b, 'top').map((r) => r[0])).toEqual(['edit', 'transport', 'view']);
    // a second bar joins the zoom row
    const c = moveBar(b, 'tools', { region: 'top', row: 2, beforeBarId: null });
    expect(rows(c, 'top')[2]).toEqual(['view', 'tools']);
    // the edit row loses its only bar: the row goes with it
    const d = moveBar(c, 'edit', { region: 'top', row: 1, beforeBarId: null });
    expect(rows(d, 'top')).toHaveLength(2);
    expect(rows(d, 'top')[0].slice(-1)).toEqual(['edit']);
    // a bar alone in its row, dropped on the line above or below that row: no change
    expect(moveBar(a, 'view', { region: 'top', newRowAt: 1 })).toBe(a);
    expect(moveBar(a, 'view', { region: 'top', newRowAt: 2 })).toBe(a);
    // a new row in the bottom dock, above the status bar
    expect(rows(moveBar(layout, 'view', { region: 'bottom', newRowAt: 0 }), 'bottom')).toEqual([['view'], ['status', 'selection']]);
  });

  it('moveTool moves one tool into a bar before another tool or at its end, and KEEPS a bar it empties (empty toolbars stay, 2026-11-11)', () => {
    const layout = seedWithoutProjectRow('classic');
    // zoom-in into the transport bar, before Stop
    const a = moveTool(layout, 'zoom-in', 'transport', 'stop');
    expect(findBar(a, 'transport')!.bar.tools).toEqual(['play', 'zoom-in', 'stop', 'record', 'step-back', 'step-forward', 'loop']);
    expect(findBar(a, 'view')!.bar.tools).not.toContain('zoom-in');
    // …at the end
    expect(findBar(moveTool(layout, 'zoom-in', 'transport', null), 'transport')!.bar.tools.slice(-1)).toEqual(['zoom-in']);
    // within its own bar: reorder
    expect(findBar(moveTool(layout, 'loop', 'transport', 'play'), 'transport')!.bar.tools[0]).toBe('loop');
    // moving every tool out leaves the bar, empty (2026-11-11)
    const lone = moveTool(layout, 'microphone-levels', 'time', null);
    expect(findBar(lone, 'meters')!.bar.tools).toEqual(['playback-meter']);
    const b = moveTool(lone, 'playback-meter', 'time', null);
    expect(findBar(b, 'meters')?.bar.tools).toEqual([]);
    expect(findBar(b, 'time')!.bar.tools.slice(-2)).toEqual(['microphone-levels', 'playback-meter']);
    // across docks: the status bar takes a tool
    expect(findTool(moveTool(layout, 'zoom-in', 'status', null), 'zoom-in')!.region).toBe('bottom');
    // nothing to do: before itself, where it already is, an unknown tool or bar
    expect(moveTool(layout, 'play', 'transport', 'play')).toBe(layout);
    expect(moveTool(layout, 'play', 'transport', 'stop')).toBe(layout);
    expect(moveTool(layout, 'nope', 'transport', null)).toBe(layout);
    expect(moveTool(layout, 'play', 'nope', null)).toBe(layout);
    // the input is never mutated
    expect(findBar(layout, 'view')!.bar.tools).toContain('zoom-in');
  });

  it('moveToolToNewBar pulls one tool into a new bar of its own — beside a bar, or on a NEW ROW', () => {
    const layout = seedWithoutProjectRow('classic');
    expect(nextBarId(layout)).toBe('bar-1');
    // Record into its own bar, before the tools bar
    const a = moveToolToNewBar(layout, 'record', { region: 'top', row: 0, beforeBarId: 'tools' });
    expect(rows(a, 'top')[0].slice(0, 3)).toEqual(['transport', 'bar-1', 'tools']);
    expect(findBar(a, 'bar-1')!.bar.tools).toEqual(['record']);
    expect(findBar(a, 'transport')!.bar.tools).not.toContain('record');
    // a second one, on a row of its own under the first
    const b = moveToolToNewBar(a, 'loop', { region: 'top', newRowAt: 1 });
    expect(rows(b, 'top')[1]).toEqual(['bar-2']);
    expect(findBar(b, 'bar-2')!.bar.tools).toEqual(['loop']);
    // into an empty side dock
    const c = moveToolToNewBar(layout, 'zoom-in', { region: 'left', row: 0, beforeBarId: null });
    expect(c.left).toEqual([[{ id: 'bar-1', tools: ['zoom-in'] }]]);
    // a tool already alone keeps its bar: beside itself is no change, elsewhere it is a move of that bar
    expect(moveToolToNewBar(a, 'record', { region: 'top', row: 0, beforeBarId: 'bar-1' })).toBe(a);
    expect(moveToolToNewBar(a, 'record', { region: 'top', row: 0, beforeBarId: 'tools' })).toBe(a);
    expect(rows(moveToolToNewBar(a, 'record', { region: 'top', row: 0, beforeBarId: 'transport' }), 'top')[0][0]).toBe('bar-1');
    expect(rows(moveToolToNewBar(a, 'record', { region: 'top', newRowAt: 1 }), 'top')[1]).toEqual(['bar-1']);
    expect(moveToolToNewBar(layout, 'nope', { region: 'top', row: 0, beforeBarId: null })).toBe(layout);
  });

  it('normaliseLayout keeps EMPTY toolbars (2026-11-11) and drops rows with no bars; a flat stored layout becomes one row; the wrong shape is refused', () => {
    const layout = seedWithoutProjectRow('classic');
    layout.top[0].push({ id: 'empty', tools: [] });
    layout.top.push([]);
    layout.top.push([{ id: 'empty-2', tools: [] }]);
    const clean = normaliseLayout(layout);
    expect(findBar(clean, 'empty')?.bar.tools).toEqual([]);
    expect(clean.top).toHaveLength(2);
    // the first cut stored each dock as a flat list of bars
    const flat = { top: [{ id: 'a', tools: ['play'] }, { id: 'b', tools: ['stop'] }], bottom: [], left: [], right: [{ id: 'c', tools: ['loop'] }] };
    expect(isToolbarLayout(flat)).toBe(false);
    expect(coerceToolbarLayout(flat)).toEqual({ top: [[{ id: 'a', tools: ['play'] }, { id: 'b', tools: ['stop'] }]], bottom: [], left: [], right: [[{ id: 'c', tools: ['loop'] }]] });
    expect(coerceToolbarLayout(clean)).toBe(clean);
    expect(coerceToolbarLayout({ top: [], bottom: [] })).toBeNull();
    expect(coerceToolbarLayout({ top: [{ id: 1 }], bottom: [], left: [], right: [] })).toBeNull();
    expect(coerceToolbarLayout(null)).toBeNull();
  });

  it('setBarSize keeps a width for horizontal docks and a height for vertical ones; null clears; a move keeps both (2026-11-10)', () => {
    const layout = seedWithoutProjectRow('classic');
    const a = setBarSize(layout, 'edit', 'width', 120.4);
    expect(findBar(a, 'edit')!.bar.width).toBe(120);
    const b = setBarSize(a, 'edit', 'height', 90);
    expect(findBar(b, 'edit')!.bar).toMatchObject({ width: 120, height: 90 });
    // moving it keeps both
    const moved = moveBar(b, 'edit', { region: 'left', row: 0, beforeBarId: null });
    expect(findBar(moved, 'edit')!.bar).toMatchObject({ width: 120, height: 90 });
    // null clears that axis alone
    expect(findBar(setBarSize(b, 'edit', 'width', null), 'edit')!.bar).toEqual({ id: 'edit', tools: ['undo', 'redo', 'cut', 'copy', 'paste', 'trim', 'silence'], height: 90 });
    // nothing to do: the same size, clearing what is not set, an unknown bar
    expect(setBarSize(a, 'edit', 'width', 120)).toBe(a);
    expect(setBarSize(layout, 'edit', 'width', null)).toBe(layout);
    expect(setBarSize(layout, 'nope', 'width', 50)).toBe(layout);
    expect(findBar(layout, 'edit')!.bar.width).toBeUndefined();
  });

  it('THE FIRST ROW\'S BUTTONS MOVE OUT of a layout saved with the 2026-11-10 row; a rearranged one is left alone (2026-11-11)', () => {
    // The 2026-11-10 classic seed
    const old: ToolbarLayout = {
      top: [
        [{ id: 'project-tabs', tools: ['project-tabs'] }, { id: 'project-actions', tools: ['mixer-button', 'audio-setup', 'share-audio', 'get-effects'] }, { id: 'workspace', tools: ['workspace'] }, { id: 'history', tools: ['undo', 'redo'] }],
        [{ id: 'transport', tools: ['play'] }, { id: 'edit', tools: ['cut', 'copy'] }, { id: 'meters', tools: ['microphone-levels', 'playback-meter'] }],
      ],
      bottom: [], left: [], right: [],
    };
    const moved = withProjectRowMoves(old);
    expect(findBar(moved, 'meters')!.bar.tools).toEqual(['audio-setup', 'microphone-levels', 'playback-meter']);
    expect(findBar(moved, 'edit')!.bar.tools).toEqual(['undo', 'redo', 'cut', 'copy']);
    expect(findBar(moved, 'history')).toBeNull();
    expect(findBar(moved, 'project-actions')!.bar.tools).toEqual(['mixer-button', 'get-effects']);
    // Share: a bar of its own straight after the workspace picker's
    const row0 = moved.top[0].map((b) => b.tools);
    expect(row0).toEqual([['project-tabs'], ['mixer-button', 'get-effects'], ['workspace'], ['share-audio']]);
    // Idempotent, and the new seed is already there
    expect(withProjectRowMoves(moved)).toBe(moved);
    const seed = defaultToolbarLayout('classic');
    expect(withProjectRowMoves(seed)).toBe(seed);
    // A rearranged layout (Undo moved by the user) is left alone there
    const custom = moveTool(old, 'undo', 'transport', null);
    expect(findTool(withProjectRowMoves(custom), 'undo')!.bar.id).toBe('transport');
  });

  it('THE TOOLBAR BUILDER\'S EDITS (2026-11-11): insertTool adds or moves, removeTool takes a tool off every toolbar, a new bar takes a tool on none', () => {
    const layout = seedWithoutProjectRow('classic');
    // remove: off its bar; the bar goes when it was the last tool
    const off = removeTool(layout, 'zoom-in');
    expect(findTool(off, 'zoom-in')).toBeNull();
    expect(findBar(off, 'view')!.bar.tools).not.toContain('zoom-in');
    expect(removeTool(off, 'zoom-in')).toBe(off);
    // insert a tool on no toolbar: into a bar, before a tool or at its end
    const back = insertTool(off, 'zoom-in', 'transport', 'stop');
    expect(findBar(back, 'transport')!.bar.tools.slice(0, 3)).toEqual(['play', 'zoom-in', 'stop']);
    expect(findBar(insertTool(off, 'zoom-in', 'transport', null), 'transport')!.bar.tools.slice(-1)).toEqual(['zoom-in']);
    // insert a tool already placed: it moves (one copy only)
    const moved = insertTool(layout, 'zoom-in', 'transport', null);
    expect(findBar(moved, 'view')!.bar.tools).not.toContain('zoom-in');
    expect(findTool(moved, 'zoom-in')!.bar.id).toBe('transport');
    // a new bar for a tool on no toolbar
    const own = addToolToNewBar(off, 'zoom-in', { region: 'bottom', newRowAt: 0 });
    expect(own.bottom[0].map((b) => b.tools)).toEqual([['zoom-in']]);
    // an unknown bar changes nothing
    expect(insertTool(off, 'zoom-in', 'nope', null)).toBe(off);
  });

  it('THE COG IS A TOOL: every seed ends the top row with it as a toolbar of its own; a layout without it gets it back at the top dock\'s end (2026-11-10)', () => {
    for (const ws of ['classic', 'spectral-editing', 'modern', 'music'] as const) {
      expect(seedWithoutProjectRow(ws).top[0].slice(-1)).toEqual([{ id: 'customise', tools: ['customise'] }]);
    }
    const layout = seedWithoutProjectRow('classic');
    expect(withCustomiseTool(layout)).toBe(layout);
    // moved elsewhere, it stays where it is
    const moved = moveBar(layout, 'customise', { region: 'left', row: 0, beforeBarId: null });
    expect(withCustomiseTool(moved)).toBe(moved);
    // a layout saved before the cog was a tool: appended to the top dock's last row
    const old: ToolbarLayout = { top: [[{ id: 'a', tools: ['play'] }], [{ id: 'b', tools: ['stop'] }]], bottom: [], left: [], right: [] };
    expect(withCustomiseTool(old).top).toEqual([[{ id: 'a', tools: ['play'] }], [{ id: 'b', tools: ['stop'] }, { id: 'customise', tools: ['customise'] }]]);
    // an empty top dock: a row of its own; a bar already named 'customise' (without the tool): a fresh id
    expect(withCustomiseTool({ top: [], bottom: [], left: [], right: [] }).top).toEqual([[{ id: 'customise', tools: ['customise'] }]]);
    const clash: ToolbarLayout = { top: [[{ id: 'customise', tools: ['play'] }]], bottom: [], left: [], right: [] };
    expect(withCustomiseTool(clash).top[0][1]).toEqual({ id: 'bar-1', tools: ['customise'] });
    expect(old.top).toHaveLength(2);
    expect(old.top[1]).toHaveLength(1); // not mutated
  });

  it('THE INNER DOCKS (2026-11-10): optional — a layout saved without them is still a layout and reads them as empty; bars move into them like any dock', () => {
    const saved: ToolbarLayout = { top: [[{ id: 'a', tools: ['play'] }]], bottom: [], left: [], right: [] };
    expect(isToolbarLayout(saved)).toBe(true);
    expect(coerceToolbarLayout(saved)).toBe(saved);
    expect(dockBars(saved, 'right-inner')).toEqual([]);
    const moved = moveBar(saved, 'a', { region: 'right-inner', row: 0, beforeBarId: null });
    expect(moved['right-inner']).toEqual([[{ id: 'a', tools: ['play'] }]]);
    expect(findBar(moved, 'a')).toMatchObject({ region: 'right-inner', row: 0 });
    expect(isToolbarLayout(moved)).toBe(true);
    // a bad inner dock still fails
    expect(isToolbarLayout({ ...saved, 'left-inner': 'x' })).toBe(false);
  });

  it('TOOL GROUPS AND EMPTY TOOLBARS (2026-11-11): separators, an empty toolbar, rename, delete', () => {
    const base = seedWithoutProjectRow('classic');
    // a separator after the first transport tool, ids unique per layout
    const first = findBar(base, 'transport')!.bar.tools[0];
    const second = findBar(base, 'transport')!.bar.tools[1];
    const one = insertSeparator(base, 'transport', second);
    expect(findBar(one, 'transport')!.bar.tools.slice(0, 3)).toEqual([first, 'separator-1', second]);
    const two = insertSeparator(one, 'transport', null);
    const tTools = findBar(two, 'transport')!.bar.tools;
    expect(tTools[tTools.length - 1]).toBe('separator-2');
    expect(isToolSeparator('separator-2')).toBe(true);
    expect(isToolSeparator('play')).toBe(false);
    expect(insertSeparator(base, 'no-such-bar', null)).toBe(base);
    // an empty toolbar, named, on a new row
    const id = nextBarId(two);
    const withEmpty = addEmptyBar(two, { region: 'top', newRowAt: two.top.length }, 'Toolbar 1');
    expect(findBar(withEmpty, id)?.bar).toEqual({ id, tools: [], name: 'Toolbar 1' });
    expect(withEmpty.top).toHaveLength(two.top.length + 1);
    // names: the user's, the seed's, else "Toolbar"
    expect(barDisplayName(findBar(withEmpty, id)!.bar)).toBe('Toolbar 1');
    expect(barDisplayName(findBar(withEmpty, 'transport')!.bar)).toBe('Transport');
    expect(barDisplayName({ id: 'bar-9', tools: [] })).toBe('Toolbar');
    const renamed = renameBar(withEmpty, 'transport', 'Play');
    expect(barDisplayName(findBar(renamed, 'transport')!.bar)).toBe('Play');
    expect(findBar(renameBar(renamed, 'transport', '  '), 'transport')!.bar.name).toBeUndefined();
    expect(renameBar(withEmpty, 'transport', null)).toBe(withEmpty);
    // a tool moves into the empty toolbar; deleting a toolbar puts its tools on none
    const filled = moveTool(withEmpty, 'loop', id, null);
    expect(findBar(filled, id)!.bar.tools).toEqual(['loop']);
    const gone = removeBar(filled, id);
    expect(findBar(gone, id)).toBeNull();
    expect(findTool(gone, 'loop')).toBeNull();
    expect(gone.top).toHaveLength(two.top.length);
  });
});

import React from 'react';
import {
  Button, Checkbox, Dialog, DialogFooter, Icon, SearchField, useTheme, usePreferences,
  CUSTOMISE_TOOLBAR_ENTRIES, CUSTOMISE_TOOL_ID, PROJECT_TAB_TOOL_ID,
  TOOLBAR_REGIONS, TITLE_BAR_ID, addEmptyBar, findBar, addToolToNewBar, barDisplayName, findTool, insertSeparator, insertTool, isToolSeparator,
  moveBar, moveTool, nextBarId, removeBar, removeTool, renameBar, rowsOf,
  type BarPlacement, type ToolbarBar, type ToolbarLayout, type ToolbarRegion,
} from '@audacity-ui/components';

/**
 * THE TOOLBAR BUILDER (2026-11-11, "I think we need to build a toolbar
 * builder. Here's Word and REAPER's for example" → a dialog from the cog,
 * LIVE with Cancel reverting): Word's two panes over our layout model —
 * every TOOL on the left (searchable; a tool on no toolbar says so), the
 * LAYOUT on the right as a tree (dock → row → toolbar → tool, every tool with
 * its shown / hidden checkbox, the Customise list's eye), and between them
 * Add » / « Remove; beside the tree ▲ / ▼ (a tool within its toolbar, a
 * toolbar within its row; a tool at a toolbar's end steps into the next
 * one), New toolbar and New row (an EMPTY toolbar, named, to fill — since
 * 2026-11-11, "I don't mind the user creating empty toolbars"), Add
 * separator (a GROUP line inside a toolbar, MuseScore's "Add separator
 * line"), Rename and Delete toolbar. A toolbar is what its grip moves; what
 * is inside it changes HERE. Every edit is the layout model's own
 * (`insertTool`, `removeTool`, `moveTool`, `moveBar`, `addEmptyBar`, `insertSeparator`, `renameBar`, `removeBar`, `addToolToNewBar`),
 * the drag gestures' rules, applied AT ONCE so the toolbars behind change as
 * you go and STICK however the dialog is left — OK, the ×, Escape, all keep
 * them (2026-11-12, "how come our changes to the toolbar don't save
 * automatically now?" — dismissal reverted for a day, which read as the
 * edits not saving); the CANCEL BUTTON alone puts the stored layouts and
 * the hidden list back as they were when the dialog opened. The project tools, the
 * tabs and the cog are put back by the layout's guards when missing, so those
 * two cannot be removed or hidden; every other tool — the project tools
 * included (2026-11-12, "I should be able to remove 'Audio setup'") —
 * removes like any tool and waits in "Not on a toolbar".
 */

type Selection =
  | { kind: 'dock'; region: ToolbarRegion }
  | { kind: 'row'; region: ToolbarRegion; row: number }
  | { kind: 'bar'; barId: string }
  | { kind: 'tool'; toolId: string }
  | null;

const REGION_NAMES: Record<ToolbarRegion, string> = {
  top: 'Top', bottom: 'Bottom (status bar)', left: 'Left', right: 'Right',
  'left-inner': 'Left, inside the panel', 'right-inner': 'Right, inside the panel',
};

/** Names for the tools the Customise list does not carry */
const EXTRA_NAMES: Record<string, string> = {
  [PROJECT_TAB_TOOL_ID]: 'Project tabs',
  [CUSTOMISE_TOOL_ID]: 'Customise toolbar',
  split: 'Split mode',
  'waveform-view': 'Waveform view',
  'status-cue': 'Playback status',
  'status-info': 'Info line',
  'selection-timecodes': 'Selection',
  'selection-duration': 'Selection duration',
};

const ENTRY_BY_ID = new Map(
  CUSTOMISE_TOOLBAR_ENTRIES.flatMap((e) => (e.kind === 'tool' ? [[e.id, e] as const] : [])),
);
const toolName = (id: string) => ENTRY_BY_ID.get(id)?.label ?? EXTRA_NAMES[id] ?? id;

/** Every tool the builder offers: the Customise list (less the metronome,
 *  which has nothing behind it), then the ones it does not carry */
const ALL_TOOLS: ReadonlyArray<string> = [
  ...CUSTOMISE_TOOLBAR_ENTRIES.flatMap((e) => (e.kind === 'tool' && e.id !== 'metronome' ? [e.id] : [])),
  'split', 'waveform-view', 'status-cue', 'status-info', 'selection-timecodes', 'selection-duration',
];

/** Put back by the layout's guards when missing: hide, never remove */
// Only the LOAD-BEARING two (2026-11-12, "I should be able to remove
// 'Audio setup'" — every project tool was unremovable before): the tabs
// are the way back to Home and the cog the way into this dialog; the
// other project tools (Mixer, Audio setup, Share audio, Get effects,
// Workspace, Undo, Redo) remove like any tool and wait in "Not on a
// toolbar". The layout guard resurrects only the tabs to match.
const UNREMOVABLE = new Set<string>([PROJECT_TAB_TOOL_ID, CUSTOMISE_TOOL_ID]);
/** The way back to Home and the cog that opens this: never hidden */
const UNHIDEABLE = new Set<string>([PROJECT_TAB_TOOL_ID, CUSTOMISE_TOOL_ID]);

function ToolGlyph({ id }: { id: string }) {
  const entry = ENTRY_BY_ID.get(id);
  if (entry?.icon) return <Icon name={entry.icon} size={16} />;
  if (entry?.glyph) {
    return <span className="musescore-icon" aria-hidden="true" style={{ fontSize: 16, width: 16, display: 'inline-flex', justifyContent: 'center', color: entry.color }}>{entry.glyph}</span>;
  }
  return <span style={{ width: 16, display: 'inline-block' }} />;
}

export interface ToolbarBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  layout: ToolbarLayout;
  editLayout: (change: (base: ToolbarLayout) => ToolbarLayout) => void;
  onResetLayout: () => void;
  os?: 'macos' | 'windows';
}

export function ToolbarBuilderDialog({ isOpen, onClose, layout, editLayout, onResetLayout, os = 'macos' }: ToolbarBuilderDialogProps) {
  const { theme } = useTheme();
  const { preferences, updatePreference } = usePreferences();
  const hidden = React.useMemo(() => new Set(preferences.toolbarHiddenTools ?? []), [preferences.toolbarHiddenTools]);
  const [query, setQuery] = React.useState('');
  const [leftSel, setLeftSel] = React.useState<string | null>(null);
  const [sel, setSelRaw] = React.useState<Selection>(null);
  // MULTI-SELECTION (2026-11-11, "let me multi-select things in the right
  // hand panel"): the picked tree keys, the primary `sel` among them —
  // ⌘/Ctrl-click toggles, Shift-click and Shift+↑↓ take a range; Remove,
  // Delete toolbar, the checkboxes and Space act on every picked item, and
  // New toolbar gathers two or more picked tools into it
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(() => new Set());
  const keyOf = (x: Exclude<Selection, null>) =>
    x.kind === 'dock' ? `d:${x.region}` : x.kind === 'row' ? `r:${x.region}:${x.row}` : x.kind === 'bar' ? `b:${x.barId}` : `t:${x.toolId}`;
  /** Select ONE item (every plain gesture) */
  const setSel = (x: Selection) => { setSelRaw(x); setPicked(new Set(x ? [keyOf(x)] : [])); };
  const [renaming, setRenaming] = React.useState<{ barId: string; text: string } | null>(null);
  // COLLAPSED tree nodes (2026-11-11, "can we collapse the toolbars in the
  // customise toolbars modal?"): docks, rows and toolbars fold away; kept
  // across opens for the session
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(() => new Set());
  const toggleCollapsed = (key: string, to?: boolean) => setCollapsed((prev) => {
    const next = new Set(prev);
    const fold = to ?? !next.has(key);
    if (fold) next.add(key); else next.delete(key);
    return next;
  });

  // The snapshot Cancel restores, taken when the dialog opens
  const snapshotRef = React.useRef<{ layouts: typeof preferences.toolbarLayouts; hidden: string[] } | null>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    snapshotRef.current = { layouts: preferences.toolbarLayouts, hidden: [...(preferences.toolbarHiddenTools ?? [])] };
    setSel(null); setLeftSel(null); setQuery(''); setRenaming(null);
    // Only at open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const cancel = () => {
    const snap = snapshotRef.current;
    if (snap) {
      updatePreference('toolbarLayouts', snap.layouts);
      updatePreference('toolbarHiddenTools', snap.hidden);
    }
    onClose();
  };

  const toggleHidden = (id: string) => {
    if (UNHIDEABLE.has(id)) return;
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id); else next.add(id);
    updatePreference('toolbarHiddenTools', [...next]);
  };

  // ── The tree, flattened in reading order (every level expanded) ──
  type Row = { key: string; level: number; label: string; sel: Exclude<Selection, null>; toolId?: string; barId?: string; empty?: boolean; parents: string[]; hasChildren: boolean; fixed?: boolean };
  const regions = TOOLBAR_REGIONS.filter((r) => rowsOf(layout, r).length > 0 || r === 'top' || r === 'bottom' || r === 'left' || r === 'right');
  const treeRows: Row[] = [];
  // THE TITLE BAR, its own special toolbar, listed first and FIXED: its
  // tools can be shown or hidden, never moved, added to, renamed or deleted
  // (the desktop window's title bar draws them in a fixed place)
  const titleBar = findBar(layout, TITLE_BAR_ID)?.bar;
  if (titleBar) {
    const key = `b:${TITLE_BAR_ID}`;
    treeRows.push({ key, level: 1, label: 'Title bar', sel: { kind: 'bar', barId: TITLE_BAR_ID }, barId: TITLE_BAR_ID, parents: [], hasChildren: titleBar.tools.length > 0, fixed: true });
    titleBar.tools.forEach((t) => treeRows.push({ key: `t:${t}`, level: 2, label: toolName(t), sel: { kind: 'tool', toolId: t }, toolId: t, parents: [key], hasChildren: false, fixed: true }));
  }
  for (const region of regions) {
    const dKey = `d:${region}`;
    const dockRows = rowsOf(layout, region);
    const shownRowsOfDock = dockRows.filter((row) => row.some((b) => b.id !== TITLE_BAR_ID));
    treeRows.push({ key: dKey, level: 1, label: REGION_NAMES[region], sel: { kind: 'dock', region }, parents: [], hasChildren: shownRowsOfDock.length > 0 });
    let rowNumber = 0;
    dockRows.forEach((row, rowIndex) => {
      if (!row.some((b) => b.id !== TITLE_BAR_ID)) return;
      rowNumber += 1;
      const rKey = `r:${region}:${rowIndex}`;
      treeRows.push({ key: rKey, level: 2, label: region === 'left' || region === 'right' || region.endsWith('inner') ? `Column ${rowNumber}` : `Row ${rowNumber}`, sel: { kind: 'row', region, row: rowIndex }, parents: [dKey], hasChildren: row.length > 0 });
      row.forEach((bar) => {
        if (bar.id === TITLE_BAR_ID) return;
        const bKey = `b:${bar.id}`;
        treeRows.push({ key: bKey, level: 3, label: barDisplayName(bar), sel: { kind: 'bar', barId: bar.id }, barId: bar.id, empty: bar.tools.length === 0, parents: [dKey, rKey], hasChildren: bar.tools.length > 0 });
        bar.tools.forEach((t) => treeRows.push({ key: `t:${t}`, level: 4, label: isToolSeparator(t) ? 'Separator' : toolName(t), sel: { kind: 'tool', toolId: t }, toolId: t, parents: [dKey, rKey, bKey], hasChildren: false }));
      });
    });
  }
  /** The rows a collapsed ancestor does not hide */
  const shownRows = treeRows.filter((r) => !r.parents.some((p) => collapsed.has(p)));
  const selKey = sel === null ? null
    : sel.kind === 'dock' ? `d:${sel.region}` : sel.kind === 'row' ? `r:${sel.region}:${sel.row}`
    : sel.kind === 'bar' ? `b:${sel.barId}` : `t:${sel.toolId}`;
  // A selection inside a folded node (an Add into a collapsed toolbar, a
  // New toolbar in a collapsed row) unfolds its ancestors, so it is seen
  const selParents = treeRows.find((r) => r.key === selKey)?.parents.join('|') ?? '';
  React.useEffect(() => {
    if (!selParents) return;
    const ps = selParents.split('|');
    setCollapsed((prev) => (ps.some((p) => prev.has(p)) ? new Set([...prev].filter((k) => !ps.includes(k))) : prev));
  }, [selKey, selParents]);
  /** Shift: everything shown between the anchor (the primary) and this key */
  const pickRange = (key: string) => {
    const keys = shownRows.map((r) => r.key);
    const from = selKey ? keys.indexOf(selKey) : -1;
    const to = keys.indexOf(key);
    if (to < 0) return;
    if (from < 0) { setSel(treeRows.find((r) => r.key === key)!.sel); return; }
    const [a, b] = from <= to ? [from, to] : [to, from];
    setPicked(new Set(keys.slice(a, b + 1)));
  };
  /** ⌘ / Ctrl: this key in or out; it becomes the primary when added */
  const pickToggle = (key: string) => {
    const row = treeRows.find((r) => r.key === key);
    if (!row) return;
    const next = new Set(picked);
    if (next.has(key)) {
      next.delete(key);
      if (selKey === key) {
        const other = treeRows.find((r) => next.has(r.key));
        setSelRaw(other ? other.sel : null);
      }
    } else {
      next.add(key);
      setSelRaw(row.sel);
    }
    setPicked(next);
  };

  // ── What the buttons can do with the selection ──
  const selTool = sel?.kind === 'tool' ? findTool(layout, sel.toolId) : null;
  const selBar = sel?.kind === 'bar' ? (() => {
    for (const r of TOOLBAR_REGIONS) {
      const rows = rowsOf(layout, r);
      for (let i = 0; i < rows.length; i++) { const at = rows[i].findIndex((b) => b.id === sel.barId); if (at >= 0) return { region: r, row: i, index: at, bars: rows[i] }; }
    }
    return null;
  })() : null;

  const canAdd = leftSel !== null && sel !== null
    && !(sel.kind === 'bar' && sel.barId === TITLE_BAR_ID) && selTool?.bar.id !== TITLE_BAR_ID;
  const add = () => {
    if (!leftSel || !sel) return;
    const id = leftSel;
    editLayout((l) => {
      if (sel.kind === 'tool') {
        const at = findTool(l, sel.toolId);
        if (!at) return l;
        const next = at.bar.tools[at.index + 1] ?? null;
        return insertTool(l, id, at.bar.id, next === id ? at.bar.tools[at.index + 2] ?? null : next);
      }
      if (sel.kind === 'bar') return insertTool(l, id, sel.barId, null);
      if (sel.kind === 'row') return addToolToNewBar(l, id, { region: sel.region, row: sel.row, beforeBarId: null });
      return addToolToNewBar(l, id, { region: sel.region, newRowAt: rowsOf(l, sel.region).length });
    });
    setSel({ kind: 'tool', toolId: id });
  };
  const pickedTools = [...picked].filter((k) => k.startsWith('t:')).map((k) => k.slice(2));
  const pickedBars = [...picked].filter((k) => k.startsWith('b:')).map((k) => k.slice(2)).filter((id) => id !== TITLE_BAR_ID);
  const removableTools = pickedTools.filter((t) => !UNREMOVABLE.has(t));
  const canRemove = removableTools.length > 0;
  const remove = () => {
    if (!canRemove) return;
    const ids = removableTools;
    editLayout((l) => ids.reduce((acc, id) => removeTool(acc, id), l));
    const last = [...ids].reverse().find((id) => !isToolSeparator(id));
    if (last) setLeftSel(last);
    setSel(null);
  };
  /** The picked tools' shown / hidden state together: all shown unless every one already is */
  const toggleHiddenMany = (ids: string[]) => {
    const hideable = ids.filter((t) => !isToolSeparator(t) && !UNHIDEABLE.has(t));
    if (hideable.length === 0) return;
    const next = new Set(hidden);
    const hide = hideable.some((t) => !next.has(t));
    hideable.forEach((t) => (hide ? next.add(t) : next.delete(t)));
    updatePreference('toolbarHiddenTools', [...next]);
  };
  // Every toolbar in the tree's order, for a tool stepping between them
  // (never the Title bar: nothing steps into or out of it)
  const allBars: Array<{ region: ToolbarRegion; row: number; bar: ToolbarBar }> = TOOLBAR_REGIONS.flatMap((region) =>
    rowsOf(layout, region).flatMap((row, i) => row.map((bar) => ({ region, row: i, bar })))).filter((b) => b.bar.id !== TITLE_BAR_ID);
  const inTitle = (sel?.kind === 'bar' && sel.barId === TITLE_BAR_ID) || (selTool?.bar.id === TITLE_BAR_ID);
  const barAt = selTool ? allBars.findIndex((b) => b.bar.id === selTool.bar.id) : -1;
  const canUp = inTitle ? false : selTool ? selTool.index > 0 || barAt > 0 : selBar ? selBar.index > 0 : false;
  const canDown = inTitle ? false : selTool ? selTool.index < selTool.bar.tools.length - 1 || barAt < allBars.length - 1 : selBar ? selBar.index < selBar.bars.length - 1 : false;
  const move = (dir: -1 | 1) => {
    if (selTool && sel?.kind === 'tool') {
      const tools = selTool.bar.tools;
      const id = sel.toolId;
      const inside = dir < 0 ? selTool.index > 0 : selTool.index < tools.length - 1;
      if (inside) {
        const before = dir < 0 ? tools[selTool.index - 1] : tools[selTool.index + 2] ?? null;
        editLayout((l) => moveTool(l, id, selTool.bar.id, before));
      } else {
        // Past its toolbar's end: into the next toolbar, at its near end
        const target = allBars[barAt + dir];
        if (!target) return;
        editLayout((l) => moveTool(l, id, target.bar.id, dir < 0 ? null : target.bar.tools[0] ?? null));
      }
    } else if (selBar) {
      const before = dir < 0 ? selBar.bars[selBar.index - 1].id : selBar.bars[selBar.index + 2]?.id ?? null;
      const barId = selBar.bars[selBar.index].id;
      editLayout((l) => moveBar(l, barId, { region: selBar.region, row: selBar.row, beforeBarId: before }));
    }
  };

  /** The toolbar the selection is in or is */
  const selBarId = sel?.kind === 'bar' ? sel.barId : selTool ? selTool.bar.id : null;
  /** A fresh name, "Toolbar 1", "Toolbar 2", … not already in use */
  const freshName = () => {
    const names = new Set(allBars.map((b) => barDisplayName(b.bar)));
    let n = 1;
    while (names.has(`Toolbar ${n}`)) n++;
    return `Toolbar ${n}`;
  };
  const addBarAt = (placement: BarPlacement) => {
    const id = nextBarId(layout);
    editLayout((l) => addEmptyBar(l, placement, freshName()));
    setSel({ kind: 'bar', barId: id });
  };
  /** NEW TOOLBAR: an empty one after the selected toolbar (or the selected
   *  tool's), at the end of a selected row, on a new row of a selected dock,
   *  else at the end of the top dock */
  const newBar = () => {
    if (pickedTools.length >= 2 && selTool && selTool.bar.id !== TITLE_BAR_ID) {
      // Two or more tools picked: a new toolbar after the primary's, holding them in tree order
      const order = treeRows.filter((r) => r.toolId && !r.fixed && picked.has(r.key)).map((r) => r.toolId!);
      const row = rowsOf(layout, selTool.region)[selTool.row];
      const at = row.findIndex((b) => b.id === selTool.bar.id);
      const id = nextBarId(layout);
      const name = freshName();
      editLayout((l) => order.reduce(
        (acc, t) => insertTool(acc, t, id, null),
        addEmptyBar(l, { region: selTool.region, row: selTool.row, beforeBarId: row[at + 1]?.id ?? null }, name),
      ));
      setSel({ kind: 'bar', barId: id });
      return;
    }
    const located = selBarId ? allBars.find((b) => b.bar.id === selBarId) : null;
    if (located) {
      const row = rowsOf(layout, located.region)[located.row];
      const at = row.findIndex((b) => b.id === located.bar.id);
      addBarAt({ region: located.region, row: located.row, beforeBarId: row[at + 1]?.id ?? null });
    } else if (sel?.kind === 'row') addBarAt({ region: sel.region, row: sel.row, beforeBarId: null });
    else if (sel?.kind === 'dock') addBarAt({ region: sel.region, newRowAt: rowsOf(layout, sel.region).length });
    else {
      const rows = rowsOf(layout, 'top');
      addBarAt(rows.length ? { region: 'top', row: rows.length - 1, beforeBarId: null } : { region: 'top', newRowAt: 0 });
    }
  };
  /** NEW ROW: an empty toolbar on a row of its own, after the selection's row */
  const newRow = () => {
    const located = selBarId ? allBars.find((b) => b.bar.id === selBarId) : null;
    if (located) addBarAt({ region: located.region, newRowAt: located.row + 1 });
    else if (sel?.kind === 'row') addBarAt({ region: sel.region, newRowAt: sel.row + 1 });
    else if (sel?.kind === 'dock') addBarAt({ region: sel.region, newRowAt: rowsOf(layout, sel.region).length });
    else addBarAt({ region: 'top', newRowAt: rowsOf(layout, 'top').length });
  };
  /** ADD SEPARATOR: a group line after the selected tool, or at the end of
   *  the selected toolbar */
  const canSeparator = selBarId !== null && selBarId !== TITLE_BAR_ID;
  const addSeparator = () => {
    if (!selBarId) return;
    const before = selTool ? selTool.bar.tools[selTool.index + 1] ?? null : null;
    editLayout((l) => insertSeparator(l, selBarId, before));
  };
  /** DELETE TOOLBAR, ANY TOOLBAR (2026-11-11, "you should let me delete
   *  whatever toolbar I want to"): every picked toolbar goes, its tools onto
   *  none — the cog and the project tools come back by the layout's guards
   *  (the cog at the top dock's end), so nothing can be stranded */
  const canDeleteBar = pickedBars.length > 0;
  const deleteBar = () => {
    if (!canDeleteBar) return;
    const ids = pickedBars;
    editLayout((l) => ids.reduce((acc, id) => removeBar(acc, id), l));
    setSel(null);
  };
  const canRename = sel?.kind === 'bar' && sel.barId !== TITLE_BAR_ID;
  const startRename = () => {
    if (sel?.kind !== 'bar') return;
    const bar = allBars.find((b) => b.bar.id === sel.barId)?.bar;
    if (bar) setRenaming({ barId: bar.id, text: barDisplayName(bar) });
  };
  const commitRename = () => {
    if (!renaming) return;
    const { barId, text } = renaming;
    editLayout((l) => renameBar(l, barId, text));
    setRenaming(null);
  };

  // ── The left list ──
  const q = query.trim().toLowerCase();
  const tools = ALL_TOOLS.filter((id) => !q || toolName(id).toLowerCase().includes(q));

  // Arrow keys walk a list; Enter on the left list adds
  const walk = (e: React.KeyboardEvent, keys: string[], current: string | null, pick: (k: string) => void) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = current === null ? -1 : keys.indexOf(current);
    const next = keys[Math.max(0, Math.min(keys.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (next) pick(next);
  };

  const paneStyle: React.CSSProperties = {
    border: `1px solid ${theme.border.default}`,
    borderRadius: 4,
    background: theme.background.control.input.idle,
    overflow: 'auto',
    // RESPONSIVE (2026-11-11, "make the customise toolbars modal
    // responsive because you want to use it big"): the panes take the
    // window's height — drag its edges, or maximise it
    flex: '1 1 0',
    minHeight: 120,
    outline: 'none',
  };
  const rowStyle = (selected: boolean, level = 0): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, height: 28, padding: `0 8px 0 ${8 + level * 16}px`,
    cursor: 'default', whiteSpace: 'nowrap', fontSize: 12,
    color: theme.foreground.text.primary,
    background: selected ? `color-mix(in srgb, ${theme.accent.primary} 22%, transparent)` : 'transparent',
  });
  const muted = { color: theme.foreground.text.secondary } as const;

  return (
    <Dialog
      isOpen={isOpen}
      title="Customise toolbars"
      // DISMISSING KEEPS the changes (2026-11-12, "how come our changes
      // to the toolbar don't save automatically now?"): edits apply
      // live, so the × and Escape leave them standing — as leaving the
      // old in-place edit mode did. The CANCEL BUTTON is the one door
      // that puts the snapshot back.
      onClose={onClose}
      os={os}
      width={820}
      maximizable
      className="toolbar-builder-dialog"
      footer={
        <DialogFooter
          primaryText="OK"
          secondaryText="Cancel"
          onPrimaryClick={onClose}
          onSecondaryClick={cancel}
          leftContent={<Button variant="secondary" size="default" onClick={() => onResetLayout()}>Reset layout</Button>}
        />
      }
    >
      <div data-toolbar-builder style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto minmax(260px, 1.4fr) auto', gap: 12, alignItems: 'stretch', gridTemplateRows: 'minmax(0, 1fr)', height: '100%', boxSizing: 'border-box', color: theme.foreground.text.primary, fontSize: 12 }}>
        {/* Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, minHeight: 0 }}>
          <span>Tools</span>
          <SearchField value={query} onChange={setQuery} onClear={() => setQuery('')} placeholder="Search tools" />
          <div
            role="listbox"
            aria-label="Tools"
            tabIndex={0}
            style={paneStyle}
            onKeyDown={(e) => {
              walk(e, tools, leftSel, setLeftSel);
              if (e.key === 'Enter' && canAdd) { e.preventDefault(); add(); }
            }}
          >
            {tools.map((id) => {
              const placed = !!findTool(layout, id);
              return (
                <div
                  key={id}
                  role="option"
                  aria-selected={leftSel === id}
                  data-builder-tool={id}
                  style={rowStyle(leftSel === id)}
                  onClick={() => setLeftSel(id)}
                  onDoubleClick={() => { setLeftSel(id); if (sel) add(); }}
                >
                  <ToolGlyph id={id} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{toolName(id)}</span>
                  {!placed && <span style={muted}>Not on a toolbar</span>}
                  {placed && hidden.has(id) && <span style={muted}>Hidden</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add / Remove */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 160, alignSelf: 'start' }}>
          <Button variant="secondary" size="default" disabled={!canAdd} onClick={add}>Add »</Button>
          <Button variant="secondary" size="default" disabled={!canRemove} onClick={remove}>« Remove</Button>
        </div>

        {/* Toolbars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, minHeight: 0 }}>
          <span>Toolbars</span>
          <span style={{ ...muted, height: 28, display: 'flex', alignItems: 'center' }}>Tick a tool to show it, untick to hide it</span>
          <div
            role="tree"
            aria-multiselectable="true"
            aria-label="Toolbars"
            tabIndex={0}
            style={paneStyle}
            onKeyDown={(e) => {
              if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                // Shift+↑↓: grow the range from the anchor
                e.preventDefault();
                const keys = shownRows.map((r) => r.key);
                const i = selKey ? keys.indexOf(selKey) : -1;
                const next = keys[Math.max(0, Math.min(keys.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
                if (next) pickRange(next);
                return;
              }
              walk(e, shownRows.map((r) => r.key), selKey, (k) => setSel(treeRows.find((r) => r.key === k)!.sel));
              // ← folds the selected node, or steps to its parent; → unfolds it, or steps to its first child
              const current = shownRows.find((r) => r.key === selKey);
              if (current && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                const open = current.hasChildren && !collapsed.has(current.key);
                if (e.key === 'ArrowLeft') {
                  if (open) toggleCollapsed(current.key, true);
                  else if (current.parents.length) setSel(treeRows.find((r) => r.key === current.parents[current.parents.length - 1])!.sel);
                } else if (current.hasChildren) {
                  if (!open) toggleCollapsed(current.key, false);
                  else { const child = shownRows[shownRows.indexOf(current) + 1]; if (child) setSel(child.sel); }
                }
              }
              if (e.key === ' ' && pickedTools.length > 0) { e.preventDefault(); toggleHiddenMany(pickedTools); }
              if ((e.key === 'a' || e.key === 'A') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPicked(new Set(shownRows.map((r) => r.key))); }
              if (e.key === 'F2' && canRename) { e.preventDefault(); startRename(); }
              if ((e.key === 'Delete' || e.key === 'Backspace') && (canRemove || canDeleteBar)) {
                e.preventDefault();
                // one edit, so the second change does not start from the old layout
                const tools = removableTools;
                const bars = pickedBars;
                editLayout((l) => bars.reduce((acc, id) => removeBar(acc, id), tools.reduce((acc, id) => removeTool(acc, id), l)));
                setSel(null);
              }
            }}
          >
            {shownRows.map((r) => (
              <div
                key={r.key}
                role="treeitem"
                aria-level={r.level}
                aria-expanded={r.hasChildren ? !collapsed.has(r.key) : undefined}
                aria-selected={picked.has(r.key)}
                data-builder-node={r.key}
                style={{ ...rowStyle(selKey === r.key, r.level - 1), fontWeight: r.level === 1 ? 600 : 400 }}
                onClick={(e) => {
                  if (e.shiftKey) pickRange(r.key);
                  else if (e.metaKey || e.ctrlKey) pickToggle(r.key);
                  else setSel(r.sel);
                }}
              >
                {r.level < 4 && (
                  <span
                    data-builder-twisty={r.key}
                    aria-hidden="true"
                    onClick={(e) => { e.stopPropagation(); if (r.hasChildren) toggleCollapsed(r.key); }}
                    style={{ display: 'inline-flex', width: 16, justifyContent: 'center', flexShrink: 0, marginLeft: -4, cursor: r.hasChildren ? 'pointer' : 'default', visibility: r.hasChildren ? 'visible' : 'hidden', color: theme.foreground.icon.secondary ?? theme.foreground.text.secondary }}
                  >
                    <span style={{ display: 'inline-flex', transform: collapsed.has(r.key) ? undefined : 'rotate(90deg)', transition: 'transform 0.06s ease' }}>
                      <Icon name="chevron-right" size={12} />
                    </span>
                  </span>
                )}
                {r.toolId && isToolSeparator(r.toolId) ? (
                  <span data-builder-separator style={{ ...muted, display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ flex: '0 0 24px', height: 1, background: theme.border.divider }} />
                    Separator
                    <span style={{ flex: 1, height: 1, background: theme.border.divider }} />
                  </span>
                ) : r.toolId ? (
                  <>
                    <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                      <Checkbox
                        checked={!hidden.has(r.toolId)}
                        disabled={UNHIDEABLE.has(r.toolId)}
                        onChange={() => (picked.has(r.key) && pickedTools.length > 1 ? toggleHiddenMany(pickedTools) : toggleHidden(r.toolId!))}
                        tabIndex={-1}
                      />
                    </span>
                    <ToolGlyph id={r.toolId} />
                    <span style={hidden.has(r.toolId) ? muted : undefined}>{r.label}</span>
                  </>
                ) : r.barId && renaming?.barId === r.barId ? (
                  <input
                    autoFocus
                    aria-label="Toolbar name"
                    data-builder-rename
                    value={renaming.text}
                    onChange={(e) => setRenaming({ barId: renaming.barId, text: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                      if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); }
                    }}
                    onBlur={commitRename}
                    style={{ font: 'inherit', height: 22, padding: '0 4px', flex: 1, color: theme.foreground.text.primary, background: theme.background.control.input.idle, border: `1px solid ${theme.border.focus}`, borderRadius: 2 }}
                  />
                ) : (
                  <span
                    style={r.level === 1 || r.level === 3 ? undefined : muted}
                    onDoubleClick={r.barId && !r.fixed ? (e) => { e.stopPropagation(); setSel(r.sel); setRenaming({ barId: r.barId!, text: r.label }); } : undefined}
                  >
                    {r.label}
                    {r.empty && <span style={muted}> (empty)</span>}
                    {r.fixed && r.level === 1 && <span style={{ ...muted, fontWeight: 400 }}> · fixed, show or hide only</span>}
                    {r.barId && collapsed.has(r.key) && (() => {
                      const n = allBars.find((b) => b.bar.id === r.barId)?.bar.tools.filter((t) => !isToolSeparator(t)).length ?? 0;
                      return n > 0 ? <span style={muted}>{` · ${n} ${n === 1 ? 'tool' : 'tools'}`}</span> : null;
                    })()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order and containers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 72, alignSelf: 'start' }}>
          <Button variant="secondary" size="default" disabled={!canUp} onClick={() => move(-1)}>▲ Up</Button>
          <Button variant="secondary" size="default" disabled={!canDown} onClick={() => move(1)}>▼ Down</Button>
          <span style={{ height: 8 }} />
          <Button variant="secondary" size="default" onClick={newBar}>New toolbar</Button>
          <Button variant="secondary" size="default" onClick={newRow}>New row</Button>
          <Button variant="secondary" size="default" disabled={!canSeparator} onClick={addSeparator}>Add separator</Button>
          <span style={{ height: 8 }} />
          <Button variant="secondary" size="default" disabled={!canRename} onClick={startRename}>Rename…</Button>
          <Button variant="secondary" size="default" disabled={!canDeleteBar} onClick={deleteBar}>Delete toolbar</Button>
        </div>
      </div>
    </Dialog>
  );
}

import React from 'react';
import {
  Button, Checkbox, Dialog, DialogFooter, Icon, SearchField, useTheme, usePreferences,
  CUSTOMISE_TOOLBAR_ENTRIES, CUSTOMISE_TOOL_ID, PROJECT_TOOL_IDS, PROJECT_TAB_TOOL_ID,
  TOOLBAR_REGIONS, addEmptyBar, addToolToNewBar, barDisplayName, findTool, insertSeparator, insertTool, isToolSeparator,
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
 * you go; CANCEL (and Escape) put the stored layouts and the hidden list back
 * as they were when the dialog opened; OK keeps them. The project tools, the
 * tabs and the cog are put back by the layout's guards when missing, so they
 * cannot be removed — only hidden (the tabs and the cog not even that).
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
const UNREMOVABLE = new Set<string>([...PROJECT_TOOL_IDS, CUSTOMISE_TOOL_ID]);
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
  const [sel, setSel] = React.useState<Selection>(null);
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
  type Row = { key: string; level: number; label: string; sel: Exclude<Selection, null>; toolId?: string; barId?: string; empty?: boolean; parents: string[]; hasChildren: boolean };
  const regions = TOOLBAR_REGIONS.filter((r) => rowsOf(layout, r).length > 0 || r === 'top' || r === 'bottom' || r === 'left' || r === 'right');
  const treeRows: Row[] = [];
  for (const region of regions) {
    const dKey = `d:${region}`;
    const dockRows = rowsOf(layout, region);
    treeRows.push({ key: dKey, level: 1, label: REGION_NAMES[region], sel: { kind: 'dock', region }, parents: [], hasChildren: dockRows.length > 0 });
    dockRows.forEach((row, rowIndex) => {
      const rKey = `r:${region}:${rowIndex}`;
      treeRows.push({ key: rKey, level: 2, label: region === 'left' || region === 'right' || region.endsWith('inner') ? `Column ${rowIndex + 1}` : `Row ${rowIndex + 1}`, sel: { kind: 'row', region, row: rowIndex }, parents: [dKey], hasChildren: row.length > 0 });
      row.forEach((bar) => {
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

  // ── What the buttons can do with the selection ──
  const selTool = sel?.kind === 'tool' ? findTool(layout, sel.toolId) : null;
  const selBar = sel?.kind === 'bar' ? (() => {
    for (const r of TOOLBAR_REGIONS) {
      const rows = rowsOf(layout, r);
      for (let i = 0; i < rows.length; i++) { const at = rows[i].findIndex((b) => b.id === sel.barId); if (at >= 0) return { region: r, row: i, index: at, bars: rows[i] }; }
    }
    return null;
  })() : null;

  const canAdd = leftSel !== null && sel !== null;
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
  const canRemove = sel?.kind === 'tool' && !UNREMOVABLE.has(sel.toolId);
  const remove = () => {
    if (sel?.kind !== 'tool' || UNREMOVABLE.has(sel.toolId)) return;
    const id = sel.toolId;
    editLayout((l) => removeTool(l, id));
    if (!isToolSeparator(id)) setLeftSel(id);
    setSel(null);
  };
  // Every toolbar in the tree's order, for a tool stepping between them
  const allBars: Array<{ region: ToolbarRegion; row: number; bar: ToolbarBar }> = TOOLBAR_REGIONS.flatMap((region) =>
    rowsOf(layout, region).flatMap((row, i) => row.map((bar) => ({ region, row: i, bar }))));
  const barAt = selTool ? allBars.findIndex((b) => b.bar.id === selTool.bar.id) : -1;
  const canUp = selTool ? selTool.index > 0 || barAt > 0 : selBar ? selBar.index > 0 : false;
  const canDown = selTool ? selTool.index < selTool.bar.tools.length - 1 || barAt < allBars.length - 1 : selBar ? selBar.index < selBar.bars.length - 1 : false;
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
  const canSeparator = selBarId !== null;
  const addSeparator = () => {
    if (!selBarId) return;
    const before = selTool ? selTool.bar.tools[selTool.index + 1] ?? null : null;
    editLayout((l) => insertSeparator(l, selBarId, before));
  };
  /** DELETE TOOLBAR: its tools go onto no toolbar; a toolbar holding a tool
   *  that cannot be removed cannot go either */
  const canDeleteBar = sel?.kind === 'bar' && !!selBar && !selBar.bars[selBar.index].tools.some((t) => UNREMOVABLE.has(t));
  const deleteBar = () => {
    if (!canDeleteBar || sel?.kind !== 'bar') return;
    const id = sel.barId;
    editLayout((l) => removeBar(l, id));
    setSel(null);
  };
  const canRename = sel?.kind === 'bar';
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
      onClose={cancel}
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
            aria-label="Toolbars"
            tabIndex={0}
            style={paneStyle}
            onKeyDown={(e) => {
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
              if (e.key === ' ' && sel?.kind === 'tool' && !isToolSeparator(sel.toolId)) { e.preventDefault(); toggleHidden(sel.toolId); }
              if (e.key === 'F2' && canRename) { e.preventDefault(); startRename(); }
              if ((e.key === 'Delete' || e.key === 'Backspace') && canRemove) { e.preventDefault(); remove(); }
              else if ((e.key === 'Delete' || e.key === 'Backspace') && canDeleteBar) { e.preventDefault(); deleteBar(); }
            }}
          >
            {shownRows.map((r) => (
              <div
                key={r.key}
                role="treeitem"
                aria-level={r.level}
                aria-expanded={r.hasChildren ? !collapsed.has(r.key) : undefined}
                aria-selected={selKey === r.key}
                data-builder-node={r.key}
                style={{ ...rowStyle(selKey === r.key, r.level - 1), fontWeight: r.level === 1 ? 600 : 400 }}
                onClick={() => setSel(r.sel)}
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
                        onChange={() => toggleHidden(r.toolId!)}
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
                    onDoubleClick={r.barId ? (e) => { e.stopPropagation(); setSel(r.sel); setRenaming({ barId: r.barId!, text: r.label }); } : undefined}
                  >
                    {r.label}
                    {r.empty && <span style={muted}> (empty)</span>}
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

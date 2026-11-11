import React from 'react';
import {
  Button, Checkbox, Dialog, DialogFooter, Icon, SearchField, useTheme, usePreferences,
  CUSTOMISE_TOOLBAR_ENTRIES, CUSTOMISE_TOOL_ID, PROJECT_TOOL_IDS, PROJECT_TAB_TOOL_ID,
  TOOLBAR_REGIONS, addToolToNewBar, findTool, insertTool, moveBar, moveTool, moveToolToNewBar, removeTool, rowsOf,
  type ToolbarLayout, type ToolbarRegion,
} from '@audacity-ui/components';

/**
 * THE TOOLBAR BUILDER (2026-11-11, "I think we need to build a toolbar
 * builder. Here's Word and REAPER's for example" → a dialog from the cog,
 * LIVE with Cancel reverting): Word's two panes over our layout model —
 * every TOOL on the left (searchable; a tool on no toolbar says so), the
 * LAYOUT on the right as a tree (dock → row → toolbar → tool, every tool with
 * its shown / hidden checkbox, the Customise list's eye), and between them
 * Add » / « Remove; beside the tree ▲ / ▼ (a tool within its toolbar, a
 * toolbar within its row), New toolbar and New row (the selected tool into a
 * container of its own — a container lives while it holds a tool, so there
 * is no empty one to make). Every edit is the layout model's own
 * (`insertTool`, `removeTool`, `moveTool`, `moveBar`, `moveToolToNewBar`, `addToolToNewBar`),
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

  // The snapshot Cancel restores, taken when the dialog opens
  const snapshotRef = React.useRef<{ layouts: typeof preferences.toolbarLayouts; hidden: string[] } | null>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    snapshotRef.current = { layouts: preferences.toolbarLayouts, hidden: [...(preferences.toolbarHiddenTools ?? [])] };
    setSel(null); setLeftSel(null); setQuery('');
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
  type Row = { key: string; level: number; label: string; sel: Exclude<Selection, null>; toolId?: string };
  const regions = TOOLBAR_REGIONS.filter((r) => rowsOf(layout, r).length > 0 || r === 'top' || r === 'bottom' || r === 'left' || r === 'right');
  const treeRows: Row[] = [];
  for (const region of regions) {
    treeRows.push({ key: `d:${region}`, level: 1, label: REGION_NAMES[region], sel: { kind: 'dock', region } });
    rowsOf(layout, region).forEach((row, rowIndex) => {
      treeRows.push({ key: `r:${region}:${rowIndex}`, level: 2, label: region === 'left' || region === 'right' || region.endsWith('inner') ? `Column ${rowIndex + 1}` : `Row ${rowIndex + 1}`, sel: { kind: 'row', region, row: rowIndex } });
      row.forEach((bar, barIndex) => {
        treeRows.push({ key: `b:${bar.id}`, level: 3, label: `Toolbar ${barIndex + 1}`, sel: { kind: 'bar', barId: bar.id } });
        bar.tools.forEach((t) => treeRows.push({ key: `t:${t}`, level: 4, label: toolName(t), sel: { kind: 'tool', toolId: t }, toolId: t }));
      });
    });
  }
  const selKey = sel === null ? null
    : sel.kind === 'dock' ? `d:${sel.region}` : sel.kind === 'row' ? `r:${sel.region}:${sel.row}`
    : sel.kind === 'bar' ? `b:${sel.barId}` : `t:${sel.toolId}`;

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
    setLeftSel(id); setSel(null);
  };
  const canUp = selTool ? selTool.index > 0 : selBar ? selBar.index > 0 : false;
  const canDown = selTool ? selTool.index < selTool.bar.tools.length - 1 : selBar ? selBar.index < selBar.bars.length - 1 : false;
  const move = (dir: -1 | 1) => {
    if (selTool) {
      const tools = selTool.bar.tools;
      const before = dir < 0 ? tools[selTool.index - 1] : tools[selTool.index + 2] ?? null;
      const id = (sel as { toolId: string }).toolId;
      editLayout((l) => moveTool(l, id, selTool.bar.id, before));
    } else if (selBar) {
      const before = dir < 0 ? selBar.bars[selBar.index - 1].id : selBar.bars[selBar.index + 2]?.id ?? null;
      const barId = selBar.bars[selBar.index].id;
      editLayout((l) => moveBar(l, barId, { region: selBar.region, row: selBar.row, beforeBarId: before }));
    }
  };
  const canNewBar = !!selTool && selTool.bar.tools.length > 1;
  const newBar = () => {
    if (!selTool || sel?.kind !== 'tool') return;
    const rows = rowsOf(layout, selTool.region)[selTool.row];
    const at = rows.findIndex((b) => b.id === selTool.bar.id);
    const id = sel.toolId;
    editLayout((l) => moveToolToNewBar(l, id, { region: selTool.region, row: selTool.row, beforeBarId: rows[at + 1]?.id ?? null }));
  };
  const canNewRow = !!selTool;
  const newRow = () => {
    if (!selTool || sel?.kind !== 'tool') return;
    const id = sel.toolId;
    editLayout((l) => moveToolToNewBar(l, id, { region: selTool.region, newRowAt: selTool.row + 1 }));
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
    height: 360,
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
      <div data-toolbar-builder style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 12, alignItems: 'start', color: theme.foreground.text.primary, fontSize: 12 }}>
        {/* Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 160 }}>
          <Button variant="secondary" size="default" disabled={!canAdd} onClick={add}>Add »</Button>
          <Button variant="secondary" size="default" disabled={!canRemove} onClick={remove}>« Remove</Button>
        </div>

        {/* Toolbars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <span>Toolbars</span>
          <span style={{ ...muted, height: 28, display: 'flex', alignItems: 'center' }}>Tick a tool to show it, untick to hide it</span>
          <div
            role="tree"
            aria-label="Toolbars"
            tabIndex={0}
            style={paneStyle}
            onKeyDown={(e) => {
              walk(e, treeRows.map((r) => r.key), selKey, (k) => setSel(treeRows.find((r) => r.key === k)!.sel));
              if (e.key === ' ' && sel?.kind === 'tool') { e.preventDefault(); toggleHidden(sel.toolId); }
              if ((e.key === 'Delete' || e.key === 'Backspace') && canRemove) { e.preventDefault(); remove(); }
            }}
          >
            {treeRows.map((r) => (
              <div
                key={r.key}
                role="treeitem"
                aria-level={r.level}
                aria-selected={selKey === r.key}
                data-builder-node={r.key}
                style={{ ...rowStyle(selKey === r.key, r.level - 1), fontWeight: r.level === 1 ? 600 : 400 }}
                onClick={() => setSel(r.sel)}
              >
                {r.toolId ? (
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
                ) : (
                  <span style={r.level === 1 ? undefined : muted}>{r.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order and containers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 72 }}>
          <Button variant="secondary" size="default" disabled={!canUp} onClick={() => move(-1)}>▲ Up</Button>
          <Button variant="secondary" size="default" disabled={!canDown} onClick={() => move(1)}>▼ Down</Button>
          <Button variant="secondary" size="default" disabled={!canNewBar} onClick={newBar}>New toolbar</Button>
          <Button variant="secondary" size="default" disabled={!canNewRow} onClick={newRow}>New row</Button>
        </div>
      </div>
    </Dialog>
  );
}

/**
 * ToolbarBarMenu — the TOOLBAR'S OWN MENU, on its grip (2026-11-16, "a right
 * click context menu on the gripper icon to remove the toolbar? Or dock
 * elsewhere?" → "build it"): a right-click on a grip, or Shift+F10 / the Menu
 * key / Enter / Space on a grip reached by the arrow keys. The menu form of
 * what the grip's drag, the resize edge and the builder do:
 *
 *   Rename… · Move to ▸ Top / Bottom / Left / Right | after <toolbar> · Add tool ▸ · Add separator ·
 *   Reset width (only when sized) | Edit toolbars… | Remove toolbar
 *
 * Move to puts the toolbar on a NEW ROW (a column, at a side) at the end of
 * that dock; a side it cannot take (a tool with no vertical form) is dimmed;
 * the dock it is in is checked and dimmed. Remove toolbar takes it off the
 * layout — its tools go to "Not on a toolbar" in Edit toolbars — SILENTLY
 * (2026-11-18, "I hate the 'Toolbar removed' toast"; it had one with Undo).
 * The fixed
 * Title bar toolbar's menu holds Edit toolbars… alone.
 */
import React from 'react';
import { useHiddenTools } from '../hooks/useHiddenTools';
import { ALL_TOOLS, ToolGlyph, toolName } from './toolCatalogue';
import {
  ContextMenu, ContextMenuItem, Dialog, DialogFooter, SearchField, TextInput, useTheme,
  TITLE_BAR_ID, TITLE_BAR_ALLOWED, TITLE_BAR_ONLY, PROJECT_TAB_TOOL_ID, TOOLBAR_REGIONS, addEmptyBar, barDisplayName, dockBars, findBar, findTool, insertSeparator, insertSpacer, isLayoutItem, isToolSpacer, insertTool, isVerticalRegion, moveBar, removeBar, removeTool, renameBar, rowsOf, setBarSize,
  type ToolbarLayout, type ToolbarRegion,
} from '@audacity-ui/components';

export interface ToolbarBarMenuState {
  /** The toolbar; null = the dock's empty space, whose menu is the docks' own */
  barId: string | null;
  x: number;
  y: number;
  /** The dock the menu was opened in — the empty-space New toolbar's target */
  region?: ToolbarRegion;
  /** The ADD TOOL list alone — an empty toolbar's + (2026-11-17) */
  addOnly?: boolean;
  /** The tool (or flexible space) the right-click landed on (2026-11-18) */
  toolId?: string;
  /** The gap nearest the pointer: the tool it comes before, null = the end */
  beforeToolId?: string | null;
}

/** The builder's fresh name: "Toolbar 1", "Toolbar 2", … not already in use */
function freshName(base: ToolbarLayout): string {
  const names = new Set(TOOLBAR_REGIONS.flatMap((r) => dockBars(base, r)).map(barDisplayName));
  let n = 1;
  while (names.has(`Toolbar ${n}`)) n++;
  return `Toolbar ${n}`;
}

export interface ToolbarBarMenuProps {
  menu: ToolbarBarMenuState | null;
  onClose: () => void;
  layout: ToolbarLayout;
  editLayout: (change: (base: ToolbarLayout) => ToolbarLayout) => void;
  /** Whether every tool on the toolbar has a vertical form (a side dock takes it) */
  fitsVertical: (barId: string) => boolean;
  /** Opens the toolbar builder with this toolbar selected (none for null) */
  onEditToolbars: (barId: string | null) => void;
  /** Whether a tool has a vertical form — a side dock's Add tool dims the rest */
  toolFitsVertical?: (toolId: string) => boolean;
  os?: 'macos' | 'windows';
}

/** The corner's items by name (2026-11-16) */
const CORNER_NAMES: Record<string, string> = {
  debug: 'Debug',
  'audio-setup': 'Audio setup',
  workspace: 'Workspace',
  'share-audio': 'Share audio',
  'get-effects': 'Get effects',
  'mixer-button': 'Mixer',
};

const MOVE_TARGETS: ReadonlyArray<{ region: ToolbarRegion; label: string }> = [
  { region: 'top', label: 'Top' },
  { region: 'bottom', label: 'Bottom' },
  { region: 'left', label: 'Left' },
  { region: 'right', label: 'Right' },
];

/** A read-only heading inside a menu — not an item, so the arrows skip it */
function MenuHeading({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div role="presentation" data-menu-heading style={{ padding: '6px 8px 4px', fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap', userSelect: 'none' }}>
      {children}
    </div>
  );
}

export function ToolbarBarMenu({ menu, onClose, layout, editLayout, fitsVertical, onEditToolbars, toolFitsVertical, os = 'macos' }: ToolbarBarMenuProps) {
  const { theme } = useTheme();
  const { hidden: hiddenList, setHidden } = useHiddenTools();
  const hidden = new Set(hiddenList);
  const [renaming, setRenaming] = React.useState<{ barId: string; draft: string } | null>(null);
  const renameRef = React.useRef<HTMLDivElement>(null);
  // The field takes the focus with its text selected, and its name (the
  // TextInput takes neither a ref nor an aria-label)
  const renameOpen = renaming !== null;
  React.useEffect(() => {
    if (!renameOpen) return;
    const t = window.setTimeout(() => {
      const input = renameRef.current?.querySelector('input');
      if (!input) return;
      input.setAttribute('aria-label', 'Toolbar name');
      input.focus();
      input.select();
    }, 60);
    return () => window.clearTimeout(t);
  }, [renameOpen]);
  const found = menu?.barId ? findBar(layout, menu.barId) : null;
  const bar = found?.bar ?? null;
  const region = found?.region ?? null;
  const axis = region && isVerticalRegion(region) ? 'height' : 'width';
  const fixed = menu?.barId === TITLE_BAR_ID;
  // A right-click on a dock's empty space, outside any toolbar (2026-11-16,
  // "I hate having to rely on the cog"): the way into the builder
  const docksMenu = !!menu && menu.barId === null;
  const hasTools = (bar?.tools.length ?? 0) > 0;
  // (only a tool on THIS toolbar places a flexible space)
  const clickedTool = menu?.toolId && bar?.tools.includes(menu.toolId) ? menu.toolId : undefined;
  // WHERE A FLEXIBLE SPACE GOES: the gap nearest the pointer (the dock says
  // which), else before the tool clicked; a gap at the toolbar's END goes to
  // its START instead — at the end it could push nothing
  const gap = menu?.beforeToolId !== undefined
    ? (menu.beforeToolId === null || bar?.tools.includes(menu.beforeToolId) ? menu.beforeToolId : undefined)
    : clickedTool;
  const spaceBefore = gap ?? bar?.tools[0] ?? null;
  const spaceAtStart = !gap || gap === bar?.tools[0];
  const spaceLabel = spaceAtStart ? 'Add flexible space at the start'
    : !isLayoutItem(spaceBefore ?? '') ? `Add flexible space before ${toolName(spaceBefore ?? '')}`
    : 'Add flexible space here';
  const portal = typeof document === 'undefined' ? null : document.body;

  // ADD TOOL (2026-11-17, the flyout to add tools straight onto a toolbar):
  // the tools NOT ON A TOOLBAR, then the HIDDEN ones (wherever they sit) —
  // a pick puts the tool at this toolbar's end, shown (a hidden one moves
  // here from its toolbar). A dock toolbar never takes a title-bar-only
  // item; a side dock dims a tool with no vertical form.
  // A SEARCH FIELD heads the list (2026-11-17, "a little search box in the
  // context menu to be able to search for tools?"): it filters both groups
  // by name as you type, Enter adds the first match, ↓ goes into the list;
  // it takes the focus when the list opens on its own (the + on an empty
  // toolbar), and empties whenever the menu opens again
  const [toolQuery, setToolQuery] = React.useState('');
  React.useEffect(() => { setToolQuery(''); }, [menu]);
  const searchRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!menu?.addOnly) return;
    const t = window.setTimeout(() => searchRef.current?.querySelector('input')?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [menu]);
  const q = toolQuery.trim().toLowerCase();
  const matches = (id: string) => !q || toolName(id).toLowerCase().includes(q);
  const addable = (bar && !fixed ? ALL_TOOLS.filter((id) => id !== PROJECT_TAB_TOOL_ID && !TITLE_BAR_ONLY.includes(id)) : []);
  const offToolbarsAll = addable.filter((id) => !findTool(layout, id));
  const hiddenToolsAll = addable.filter((id) => findTool(layout, id) && hidden.has(id));
  const offToolbars = offToolbarsAll.filter(matches);
  const hiddenTools = hiddenToolsAll.filter(matches);
  const sideDock = !!region && isVerticalRegion(region);
  // Move to's other toolbars, in reading order (never the Title bar)
  const besideTargets = (() => {
    if (!bar || fixed) return [];
    const all: { id: string; label: string; region: ToolbarRegion; already: boolean }[] = [];
    for (const r of TOOLBAR_REGIONS) {
      rowsOf(layout, r).forEach((row) => row.forEach((b, i) => {
        if (b.id === bar.id || b.id === TITLE_BAR_ID) return;
        all.push({ id: b.id, label: barDisplayName(b), region: r, already: row[i + 1]?.id === bar.id });
      }));
    }
    const count = new Map<string, number>();
    all.forEach((t) => count.set(t.label, (count.get(t.label) ?? 0) + 1));
    const dock = (r: ToolbarRegion) => MOVE_TARGETS.find((m) => m.region === r)?.label ?? (r.startsWith('left') ? 'Left' : 'Right');
    return all.map((t) => ((count.get(t.label) ?? 0) > 1 ? { ...t, label: `${t.label} (${dock(t.region)})` } : t));
  })();
  const addTool = (id: string) => {
    if (!bar) return;
    if (hidden.has(id)) setHidden([...hidden].filter((t) => t !== id));
    editLayout((base) => insertTool(base, id, bar.id, null));
  };
  const addToolItems = (closeAfter: boolean) => {
    if (offToolbarsAll.length + hiddenToolsAll.length === 0) {
      return <ContextMenuItem label="Every tool is on a toolbar" disabled onClick={() => {}} />;
    }
    const fits = (id: string) => !(sideDock && toolFitsVertical && !toolFitsVertical(id));
    const search = (
      <div
        ref={searchRef}
        data-add-tool-search
        style={{ padding: '4px 8px 6px' }}
        // The menu's own keys stay out of the field: a parent item takes
        // ← → Enter for its submenu, so only ↓ ↑ Escape Tab go on
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const first = [...offToolbars, ...hiddenTools].find(fits);
            if (first) { onClose(); addTool(first); }
            return;
          }
          if (!['ArrowDown', 'ArrowUp', 'Escape', 'Tab'].includes(e.key)) e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <SearchField
          value={toolQuery}
          onChange={setToolQuery}
          onClear={() => setToolQuery('')}
          placeholder="Search tools"
          fullWidth
          inputProps={{ 'aria-label': 'Search tools' }}
        />
      </div>
    );
    if (offToolbars.length + hiddenTools.length === 0) {
      return (
        <>
          {search}
          <ContextMenuItem label="No tools match" disabled onClick={() => {}} />
        </>
      );
    }
    const item = (id: string) => (
      <ContextMenuItem
        key={id}
        label={toolName(id)}
        icon={<ToolGlyph id={id} />}
        disabled={!fits(id)}
        onClick={() => { if (closeAfter) onClose(); addTool(id); }}
        onClose={onClose}
      />
    );
    return (
      <>
        {search}
        {offToolbars.length > 0 && <MenuHeading color={theme.foreground.text.secondary}>Not on a toolbar</MenuHeading>}
        {offToolbars.map(item)}
        {offToolbars.length > 0 && hiddenTools.length > 0 && <ContextMenuItem isDivider />}
        {hiddenTools.length > 0 && <MenuHeading color={theme.foreground.text.secondary}>Hidden</MenuHeading>}
        {hiddenTools.map(item)}
      </>
    );
  };

  const removeToolbar = (barId: string) => editLayout((base) => removeBar(base, barId));

  const commitRename = () => {
    if (!renaming) return;
    const { barId, draft } = renaming;
    setRenaming(null);
    editLayout((base) => renameBar(base, barId, draft));
  };

  return (
    <>
      <ContextMenu isOpen={!!menu && (!!bar || docksMenu)} onClose={onClose} x={menu?.x ?? 0} y={menu?.y ?? 0} portalTo={portal}>
        {docksMenu && (
          <>
            {/* NEW TOOLBAR from the dock's empty space (2026-11-17, "I'd
                like to add a 'New toolbar' action to the right click menu
                for toolbars"): an empty, named toolbar at the end of THIS
                dock's last row — the grip's drag and the builder fill it */}
            {menu.region && (
              <ContextMenuItem
                label="New toolbar"
                onClick={() => {
                  const region = menu.region!;
                  editLayout((base) => {
                    const rows = rowsOf(base, region);
                    return addEmptyBar(base, { region, row: Math.max(0, rows.length - 1), beforeBarId: null }, freshName(base));
                  });
                }}
                onClose={onClose}
              />
            )}
            <ContextMenuItem label="Edit toolbars…" onClick={() => onEditToolbars(null)} onClose={onClose} />
          </>
        )}
        {/* THE TOOLBAR'S NAME HEADS ITS MENU, read-only (2026-11-16, "can we
            put the toolbar name at the top in readonly text? The rename feels
            redundant if we can't see the name") — not a menu item, so the
            arrows and the first focus skip it */}
        {menu?.addOnly && bar && (
          <>
            {addToolItems(false)}
          </>
        )}
        {menu && !menu.addOnly && bar && (
          <div
            data-toolbar-menu-name
            role="presentation"
            style={{
              padding: '6px 8px 4px',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.foreground.text.secondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '240px',
              userSelect: 'none',
            }}
          >
            {barDisplayName(bar)}
          </div>
        )}
        {menu && !menu.addOnly && bar && <ContextMenuItem isDivider />}
        {menu && !menu.addOnly && bar && region && (fixed ? (
          // THE CORNER'S CHECKLIST (2026-11-16): its app-level items, ticked
          // when shown there; a tick adds one at the end (moving it off a
          // toolbar, unhiding it), an untick takes it out of the corner — to
          // Not on a toolbar in Edit toolbars
          <>
            {TITLE_BAR_ALLOWED.map((id) => {
              const at = findTool(layout, id);
              const inCorner = at?.bar.id === TITLE_BAR_ID;
              const shown = inCorner && !hidden.has(id);
              return (
                <ContextMenuItem
                  key={id}
                  label={CORNER_NAMES[id] ?? id}
                  checked={shown}
                  onClick={() => {
                    if (shown) {
                      editLayout((base) => removeTool(base, id));
                      return;
                    }
                    if (hidden.has(id)) setHidden([...hidden].filter((t) => t !== id));
                    if (!inCorner) editLayout((base) => insertTool(base, id, TITLE_BAR_ID, null));
                  }}
                  onClose={onClose}
                />
              );
            })}
            <ContextMenuItem isDivider />
            <ContextMenuItem label="Edit toolbars…" onClick={() => onEditToolbars(menu.barId)} onClose={onClose} />
          </>
        ) : (
          <>
            <ContextMenuItem
              label="Rename…"
              onClick={() => setRenaming({ barId: bar.id, draft: bar.name ?? barDisplayName(bar) })}
              onClose={onClose}
            />
            <ContextMenuItem label="Move to" hasSubmenu onClick={() => {}}>
              {MOVE_TARGETS.map((t) => {
                const here = t.region === region;
                const refused = (t.region === 'left' || t.region === 'right') && !fitsVertical(bar.id);
                return (
                  <ContextMenuItem
                    key={t.region}
                    label={t.label}
                    checked={here}
                    disabled={here || refused}
                    // (a submenu's items do not close the menu themselves)
                    onClick={() => { onClose(); editLayout((base) => moveBar(base, bar.id, { region: t.region, newRowAt: rowsOf(base, t.region).length })); }}
                    onClose={onClose}
                  />
                );
              })}
              {/* BESIDE ANOTHER TOOLBAR (2026-11-17, "that 'Move to' should
                  include custom named toolbars right?"): every other
                  toolbar by name — the pick puts this one right AFTER it, in
                  its row (a side dock's column); the one it already follows
                  is checked and dimmed, a side dock's dimmed when this
                  toolbar has no vertical form; a name two toolbars share
                  says its dock */}
              {besideTargets.length > 0 && (
                <>
                  <ContextMenuItem isDivider />
                  <MenuHeading color={theme.foreground.text.secondary}>After toolbar</MenuHeading>
                  {besideTargets.map((t) => (
                    <ContextMenuItem
                      key={t.id}
                      label={t.label}
                      checked={t.already}
                      disabled={t.already || (isVerticalRegion(t.region) && !fitsVertical(bar.id))}
                      onClick={() => {
                        onClose();
                        editLayout((base) => {
                          const at = findBar(base, t.id);
                          if (!at) return base;
                          const after = rowsOf(base, at.region)[at.row][at.index + 1]?.id ?? null;
                          return moveBar(base, bar.id, { region: at.region, row: at.row, beforeBarId: after });
                        });
                      }}
                      onClose={onClose}
                    />
                  ))}
                </>
              )}
            </ContextMenuItem>
            <ContextMenuItem label="Add tool" hasSubmenu onClick={() => {}}>
              {addToolItems(true)}
            </ContextMenuItem>
            <ContextMenuItem
              label="Add separator"
              disabled={!hasTools}
              onClick={() => editLayout((base) => insertSeparator(base, bar.id, null))}
              onClose={onClose}
            />
            {/* A FLEXIBLE SPACE (2026-11-18): placed by the right-click —
                at the gap nearest the pointer ("I thought I'd be able to
                add the flexible space anywhere"), a gap at the end going
                to the START, which pushes all its tools to the far end (at
                the end it could push nothing: "doesn't work on vertical
                toolbars"); on a space, the way to take it out */}
            {clickedTool && isToolSpacer(clickedTool) ? (
              <ContextMenuItem
                label="Remove flexible space"
                onClick={() => editLayout((base) => removeTool(base, clickedTool))}
                onClose={onClose}
              />
            ) : (
              <ContextMenuItem
                label={spaceLabel}
                disabled={!hasTools}
                onClick={() => editLayout((base) => insertSpacer(base, bar.id, spaceBefore))}
                onClose={onClose}
              />
            )}
            {bar[axis] !== undefined && (
              <ContextMenuItem
                label={axis === 'height' ? 'Reset height' : 'Reset width'}
                onClick={() => editLayout((base) => setBarSize(base, bar.id, axis, null))}
                onClose={onClose}
              />
            )}
            <ContextMenuItem isDivider />
            {/* NEW TOOLBAR beside this one (2026-11-17): an empty, named
                toolbar right after the clicked toolbar in its row */}
            <ContextMenuItem
              label="New toolbar"
              onClick={() => {
                editLayout((base) => {
                  const at = findBar(base, bar.id);
                  if (!at) return base;
                  const row = rowsOf(base, at.region)[at.row] ?? [];
                  const after = row[at.index + 1]?.id ?? null;
                  return addEmptyBar(base, { region: at.region, row: at.row, beforeBarId: after }, freshName(base));
                });
              }}
              onClose={onClose}
            />
            <ContextMenuItem label="Edit toolbars…" onClick={() => onEditToolbars(bar.id)} onClose={onClose} />
            <ContextMenuItem isDivider />
            <ContextMenuItem label="Remove toolbar" onClick={() => removeToolbar(bar.id)} onClose={onClose} />
          </>
        ))}
      </ContextMenu>

      <Dialog
        isOpen={renaming !== null}
        title="Rename toolbar"
        onClose={() => setRenaming(null)}
        closeOnClickOutside={false}
        os={os}
        width={360}
        minHeight={0}
        footer={(
          <DialogFooter
            primaryText="Rename"
            secondaryText="Cancel"
            onPrimaryClick={commitRename}
            onSecondaryClick={() => setRenaming(null)}
          />
        )}
      >
        <div
          ref={renameRef}
          data-toolbar-rename
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
          }}
        >
          <TextInput
            value={renaming?.draft ?? ''}
            onChange={(draft) => setRenaming((r) => (r ? { ...r, draft } : r))}
            width="100%"
          />
        </div>
      </Dialog>
    </>
  );
}

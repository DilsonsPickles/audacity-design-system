/**
 * ToolbarBarMenu — the TOOLBAR'S OWN MENU, on its grip (2026-11-16, "a right
 * click context menu on the gripper icon to remove the toolbar? Or dock
 * elsewhere?" → "build it"): a right-click on a grip, or Shift+F10 / the Menu
 * key / Enter / Space on a grip reached by the arrow keys. The menu form of
 * what the grip's drag, the resize edge and the builder do:
 *
 *   Rename… · Move to ▸ Top / Bottom / Left / Right · Add separator ·
 *   Reset width (only when sized) | Edit toolbars… | Remove toolbar
 *
 * Move to puts the toolbar on a NEW ROW (a column, at a side) at the end of
 * that dock; a side it cannot take (a tool with no vertical form) is dimmed;
 * the dock it is in is checked and dimmed. Remove toolbar takes it off the
 * layout — its tools go to "Not on a toolbar" in Edit toolbars — and says so
 * in a toast with UNDO, which puts the layout back as it was. The fixed
 * Title bar toolbar's menu holds Edit toolbars… alone.
 */
import React from 'react';
import {
  ContextMenu, ContextMenuItem, Dialog, DialogFooter, TextInput, toast, useTheme,
  TITLE_BAR_ID, TITLE_BAR_ALLOWED, TOOLBAR_REGIONS, addEmptyBar, barDisplayName, dockBars, findBar, findTool, insertSeparator, insertTool, isVerticalRegion, moveBar, removeBar, removeTool, renameBar, rowsOf, setBarSize, usePreferences,
  type ToolbarLayout, type ToolbarRegion,
} from '@audacity-ui/components';

export interface ToolbarBarMenuState {
  /** The toolbar; null = the dock's empty space, whose menu is the docks' own */
  barId: string | null;
  x: number;
  y: number;
  /** The dock the menu was opened in — the empty-space New toolbar's target */
  region?: ToolbarRegion;
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

export function ToolbarBarMenu({ menu, onClose, layout, editLayout, fitsVertical, onEditToolbars, os = 'macos' }: ToolbarBarMenuProps) {
  const { theme } = useTheme();
  const { preferences, updatePreference } = usePreferences();
  const hidden = new Set(preferences.toolbarHiddenTools ?? []);
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
  const portal = typeof document === 'undefined' ? null : document.body;

  const removeToolbar = (barId: string) => {
    const before = layout;
    const name = barDisplayName(findBar(layout, barId)?.bar ?? { id: barId, tools: [] });
    editLayout((base) => removeBar(base, barId));
    // The name only when it is one (an unnamed toolbar is just "Toolbar")
    const where = 'Its tools are under Not on a toolbar in Edit toolbars';
    toast.info('Toolbar removed', name === 'Toolbar' ? where : `"${name}". ${where}`, [
      { label: 'Undo', onClick: () => editLayout(() => before) },
    ]);
  };

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
        {menu && bar && (
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
        {menu && bar && <ContextMenuItem isDivider />}
        {menu && bar && region && (fixed ? (
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
                    if (hidden.has(id)) updatePreference('toolbarHiddenTools', [...hidden].filter((t) => t !== id));
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
            </ContextMenuItem>
            <ContextMenuItem
              label="Add separator"
              disabled={!hasTools}
              onClick={() => editLayout((base) => insertSeparator(base, bar.id, null))}
              onClose={onClose}
            />
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

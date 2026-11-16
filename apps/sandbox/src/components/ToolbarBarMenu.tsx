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
  TITLE_BAR_ID, barDisplayName, findBar, insertSeparator, isVerticalRegion, moveBar, removeBar, renameBar, rowsOf, setBarSize,
  type ToolbarLayout, type ToolbarRegion,
} from '@audacity-ui/components';

export interface ToolbarBarMenuState {
  barId: string;
  x: number;
  y: number;
}

export interface ToolbarBarMenuProps {
  menu: ToolbarBarMenuState | null;
  onClose: () => void;
  layout: ToolbarLayout;
  editLayout: (change: (base: ToolbarLayout) => ToolbarLayout) => void;
  /** Whether every tool on the toolbar has a vertical form (a side dock takes it) */
  fitsVertical: (barId: string) => boolean;
  /** Opens the toolbar builder with this toolbar selected */
  onEditToolbars: (barId: string) => void;
  os?: 'macos' | 'windows';
}

const MOVE_TARGETS: ReadonlyArray<{ region: ToolbarRegion; label: string }> = [
  { region: 'top', label: 'Top' },
  { region: 'bottom', label: 'Bottom' },
  { region: 'left', label: 'Left' },
  { region: 'right', label: 'Right' },
];

export function ToolbarBarMenu({ menu, onClose, layout, editLayout, fitsVertical, onEditToolbars, os = 'macos' }: ToolbarBarMenuProps) {
  const { theme } = useTheme();
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
  const found = menu ? findBar(layout, menu.barId) : null;
  const bar = found?.bar ?? null;
  const region = found?.region ?? null;
  const axis = region && isVerticalRegion(region) ? 'height' : 'width';
  const fixed = menu?.barId === TITLE_BAR_ID;
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
      <ContextMenu isOpen={!!menu && !!bar} onClose={onClose} x={menu?.x ?? 0} y={menu?.y ?? 0} portalTo={portal}>
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
          <ContextMenuItem label="Edit toolbars…" onClick={() => onEditToolbars(menu.barId)} onClose={onClose} />
        ) : (
          <>
            <ContextMenuItem
              label="Rename…"
              onClick={() => setRenaming({ barId: menu.barId, draft: bar.name ?? barDisplayName(bar) })}
              onClose={onClose}
            />
            <ContextMenuItem label="Move to" hasSubmenu onClick={() => {}}>
              {MOVE_TARGETS.map((t) => {
                const here = t.region === region;
                const refused = (t.region === 'left' || t.region === 'right') && !fitsVertical(menu.barId);
                return (
                  <ContextMenuItem
                    key={t.region}
                    label={t.label}
                    checked={here}
                    disabled={here || refused}
                    // (a submenu's items do not close the menu themselves)
                    onClick={() => { onClose(); editLayout((base) => moveBar(base, menu.barId, { region: t.region, newRowAt: rowsOf(base, t.region).length })); }}
                    onClose={onClose}
                  />
                );
              })}
            </ContextMenuItem>
            <ContextMenuItem
              label="Add separator"
              disabled={!hasTools}
              onClick={() => editLayout((base) => insertSeparator(base, menu.barId, null))}
              onClose={onClose}
            />
            {bar[axis] !== undefined && (
              <ContextMenuItem
                label={axis === 'height' ? 'Reset height' : 'Reset width'}
                onClick={() => editLayout((base) => setBarSize(base, menu.barId, axis, null))}
                onClose={onClose}
              />
            )}
            <ContextMenuItem isDivider />
            <ContextMenuItem label="Edit toolbars…" onClick={() => onEditToolbars(menu.barId)} onClose={onClose} />
            <ContextMenuItem isDivider />
            <ContextMenuItem label="Remove toolbar" onClick={() => removeToolbar(menu.barId)} onClose={onClose} />
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

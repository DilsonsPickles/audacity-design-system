import React from 'react';
import { CommandPalette, type MenuItem, type PaletteCommand } from '@audacity-ui/components';
import { useDialogs } from '../contexts/DialogContext';
import { useContextMenus } from '../contexts/ContextMenuContext';
import { clipOfElement } from '../hooks/useFocusedClip';

/** The menus' keys are their names (File, Edit, View…) — the group as shown */
const groupLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

/** The palette's commands: every runnable menu item, by menu, plus the
 *  keyboard-only commands that have no menu item */
export function paletteCommandsFromMenus(menus: Record<string, MenuItem[]>): Array<PaletteCommand & { run?: () => void }> {
  const out: Array<PaletteCommand & { run?: () => void }> = [];
  for (const [key, items] of Object.entries(menus)) {
    for (const item of items) {
      if (item.divider || !item.onClick) continue;
      out.push({ id: `${key}:${item.label}`, label: item.label, shortcut: item.shortcut, group: groupLabel(key), disabled: item.disabled, run: item.onClick });
    }
  }
  return out;
}

/**
 * THE COMMAND PALETTE'S HOST (2026-10-13): ⌘P (useKeyboardShortcuts →
 * useDialogState's 'commandPalette'). Its commands are the in-app
 * menus' items — label, chord and handler, as the menus define them —
 * plus the clip's Fades… dialog, which has no menu item (it acts on the
 * FOCUSED clip, which is why the palette restores the focus before it
 * runs anything). Mounted inside the providers, beside EditorLayout.
 */
/** What an empty palette shows before anything has been run: the common
 *  commands (user decision 2026-10-13, "just the common ones"); the ones
 *  run in this session go in front of them (SUGGESTED_MAX rows at most) */
export const CURATED_COMMAND_IDS: ReadonlyArray<string> = [
  'Edit:Go to...',
  'clip:fades',
  'View:Fit tracks to height',
  'View:Zoom in',
  'File:Save Project',
  'Edit:Preferences',
];
export const SUGGESTED_MAX = 6;

export function CommandPaletteHost({ menuDefinitions, os }: { menuDefinitions: Record<string, MenuItem[]>; os?: 'macos' | 'windows' }) {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen } = useDialogs();
  const { setFadeDialog } = useContextMenus();
  // Recently run, most recent first — this session's
  const [recentIds, setRecentIds] = React.useState<string[]>([]);
  const suggestedIds = React.useMemo(
    () => [...recentIds, ...CURATED_COMMAND_IDS].filter((id, i, all) => all.indexOf(id) === i).slice(0, SUGGESTED_MAX),
    [recentIds],
  );
  const commands = React.useMemo(() => {
    const fromMenus = paletteCommandsFromMenus(menuDefinitions);
    const extras: Array<PaletteCommand & { run?: () => void }> = [
      {
        id: 'clip:fades',
        label: 'Fades…',
        shortcut: 'Alt+Shift+F',
        group: 'Clip',
        run: () => {
          const focused = clipOfElement(document.activeElement);
          if (focused) setFadeDialog({ ...focused, focusSide: 'in' });
        },
      },
    ];
    return [...fromMenus, ...extras];
  }, [menuDefinitions, setFadeDialog]);
  const run = React.useCallback((id: string) => {
    setRecentIds((prev) => [id, ...prev.filter((p) => p !== id)].slice(0, SUGGESTED_MAX));
    commands.find((c) => c.id === id)?.run?.();
  }, [commands]);
  return (
    <CommandPalette
      isOpen={isCommandPaletteOpen}
      commands={commands}
      suggestedIds={suggestedIds}
      onRun={run}
      onClose={() => setIsCommandPaletteOpen(false)}
      os={os}
    />
  );
}

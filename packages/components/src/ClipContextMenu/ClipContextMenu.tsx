import React from 'react';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';
import { Icon } from '../Icon';
import { formatPaletteShortcut } from '../CommandPalette/CommandPalette';
import type { ClipColor } from '../types/clip';
import { useTheme } from '../ThemeProvider';
import './ClipContextMenu.css';

/** The colours a clip can wear, in the palette's order */
export const CLIP_COLOR_ITEMS: ReadonlyArray<[Exclude<ClipColor, 'classic'>, string]> = [
  ['cyan', 'Cyan'], ['blue', 'Blue'], ['violet', 'Violet'], ['magenta', 'Magenta'], ['red', 'Red'],
  ['orange', 'Orange'], ['yellow', 'Yellow'], ['green', 'Green'], ['teal', 'Teal'],
];

/** What happens to the room a cut or deleted clip leaves — the real
 *  build's "Cut and…" / "Delete and…" submenus (clipcontextmenumodel.cpp:
 *  cut-leave-gap, cut-per-track-ripple, cut-all-tracks-ripple) */
export type GapMode = 'leave-gap' | 'close-gap-track' | 'close-gap-all';

/** The two submenus' rows, in the real build's order and words */
export const GAP_MODE_ITEMS: ReadonlyArray<[GapMode, (verb: 'Cut' | 'Delete') => string]> = [
  ['leave-gap', (verb) => `${verb} and leave gap`],
  ['close-gap-track', (verb) => `${verb} and close gap on this track`],
  ['close-gap-all', (verb) => `${verb} and close gap on all tracks`],
];

export interface ClipContextMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Callback when menu should close */
  onClose: () => void;
  /** X position for the menu (in pixels) */
  x: number;
  /** Y position for the menu (in pixels) */
  y: number;
  /** The OS whose glyphs the shortcuts are written in (⌘F2 / Ctrl+F2) */
  os?: 'macos' | 'windows';

  /** "Clip properties…" — FIRST, above Rename, as the real build's
   *  clipcontextmenumodel.cpp has it (restored 2026-10-14, "I can't see
   *  clip properties in context menu anymore" — the Figma frame omits
   *  it); the host opens the Clip properties panel (⌥⌘I). Shown only
   *  when wired. */
  onOpenProperties?: () => void;
  /** Rename clip */
  onRename?: () => void;
  /** Clip color ▸ — a `ClipColor` id from the palette, or `'track'` to
   *  go back to the track's own colour */
  onColorChange?: (color: string) => void;

  /** Cut — the clip to the clipboard, the gap left */
  onCut?: () => void;
  /** Copy */
  onCopy?: () => void;
  /** Duplicate */
  onDuplicate?: () => void;
  /** Delete — the gap left */
  onDelete?: () => void;
  /** Cut and… ▸ — leave the gap, or close it on this track / all tracks */
  onCutAnd?: (mode: GapMode) => void;
  /** Delete and… ▸ — as onCutAnd, nothing to the clipboard */
  onDeleteAnd?: (mode: GapMode) => void;

  /** Edit fades — the host opens the Fades dialog on this clip (the one
   *  ⌥⇧F opens), 2026-10-14: the Figma "Context menu/Clip" frame
   *  (43 - Fades, 14458:1222) replaced the Fade-in ▸ / Fade-out ▸
   *  parents with this one item; the handle's right-click menu keeps the
   *  presets. */
  onEditFades?: () => void;

  /** Split — at the playhead */
  onSplit?: () => void;
  /** Split at silences — the real build's "disjoin" */
  onSplitAtSilences?: () => void;

  /** Whether "Stretch with tempo changes" is on (the check) */
  stretchWithTempo?: boolean;
  /** Toggle stretch with tempo changes */
  onToggleStretchWithTempo?: () => void;
  /** Open pitch and speed dialog */
  onOpenPitchSpeedDialog?: () => void;
  /** Whether the clip's pitch or speed is off its default — Reset and
   *  Render are dimmed until it is (the real build's
   *  updatePitchSpeedModifiedEnabledState) */
  pitchSpeedModified?: boolean;
  /** Reset pitch and speed — 0 semitones, 100% */
  onResetPitchSpeed?: () => void;
  /** Render pitch and speed */
  onRenderPitchSpeed?: () => void;

  /** Whether to auto-focus first menu item (when opened via keyboard) */
  autoFocus?: boolean;
}

/** A chord in the menu's right column, in the OS's glyphs */
const chord = (shortcut: string, os: 'macos' | 'windows') => formatPaletteShortcut(shortcut, os);

/**
 * ClipContextMenu — the clip's right-click menu, the Figma "Context
 * menu/Clip" frame (43 - Fades, node 14458:1222; 2026-10-14) and the
 * real build's clipcontextmenumodel.cpp, in their order:
 *
 *   Clip properties… · Rename clip · Clip color ▸ | Cut · Copy · Duplicate · Delete |
 *   Cut and… ▸ · Delete and… ▸ | Edit fades | Split · Split at silences |
 *   ✓ Stretch with tempo changes · Open pitch and speed dialog ·
 *   Reset pitch and speed · Render pitch and speed
 *
 * Every row has a 16px leading slot (the design's "checkmark frame"):
 * the check, the row's icon, or empty — so the labels line up
 * (ClipContextMenu.css).
 */
export const ClipContextMenu: React.FC<ClipContextMenuProps> = ({
  isOpen,
  onClose,
  x,
  y,
  os = 'macos',
  onOpenProperties,
  onRename,
  onColorChange,
  onCut,
  onCopy,
  onDuplicate,
  onDelete,
  onCutAnd,
  onDeleteAnd,
  onEditFades,
  onSplit,
  onSplitAtSilences,
  stretchWithTempo = false,
  onToggleStretchWithTempo,
  onOpenPitchSpeedDialog,
  pitchSpeedModified = false,
  onResetPitchSpeed,
  onRenderPitchSpeed,
  autoFocus = false,
}) => {
  const { theme } = useTheme();

  const style = {
    '--clip-context-menu-divider-bg': theme.border.divider,
  } as React.CSSProperties;

  const run = (fn?: () => void) => () => { fn?.(); onClose(); };

  return (
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y} className="clip-context-menu" autoFocus={autoFocus} style={style}>
      {onOpenProperties && (
        <ContextMenuItem label="Clip properties…" shortcut={chord('Ctrl+Alt+I', os)} onClick={onOpenProperties} onClose={onClose} />
      )}
      <ContextMenuItem label="Rename clip" shortcut={chord('Ctrl+F2', os)} onClick={onRename} onClose={onClose} />

      <ContextMenuItem label="Clip color" hasSubmenu onClose={onClose}>
        {/* The clip palette (types/clip.ts ClipColor), plus the track's
            own colour to go back to (2026-10-02) */}
        <ContextMenuItem label="Track color" onClick={run(() => onColorChange?.('track'))} />
        <ContextMenuItem isDivider label="" />
        {CLIP_COLOR_ITEMS.map(([id, label]) => (
          <ContextMenuItem key={id} label={label} onClick={run(() => onColorChange?.(id))} />
        ))}
      </ContextMenuItem>

      <div className="clip-context-menu-divider" role="separator" />

      <ContextMenuItem label="Cut" shortcut={chord('Ctrl+X', os)} icon={<Icon name="cut" size={16} />} onClick={onCut} onClose={onClose} />
      <ContextMenuItem label="Copy" shortcut={chord('Ctrl+C', os)} icon={<Icon name="copy" size={16} />} onClick={onCopy} onClose={onClose} />
      <ContextMenuItem label="Duplicate" shortcut={chord('Ctrl+D', os)} onClick={onDuplicate} onClose={onClose} />
      <ContextMenuItem label="Delete" icon={<Icon name="trash" size={16} />} onClick={onDelete} onClose={onClose} />

      <div className="clip-context-menu-divider" role="separator" />

      <ContextMenuItem label="Cut and…" hasSubmenu onClose={onClose}>
        {GAP_MODE_ITEMS.map(([mode, label]) => (
          <ContextMenuItem key={mode} label={label('Cut')} onClick={run(() => onCutAnd?.(mode))} />
        ))}
      </ContextMenuItem>
      <ContextMenuItem label="Delete and…" hasSubmenu onClose={onClose}>
        {GAP_MODE_ITEMS.map(([mode, label]) => (
          <ContextMenuItem key={mode} label={label('Delete')} onClick={run(() => onDeleteAnd?.(mode))} />
        ))}
      </ContextMenuItem>

      <div className="clip-context-menu-divider" role="separator" />

      <ContextMenuItem label="Edit fades" shortcut={chord('Alt+Shift+F', os)} onClick={onEditFades} onClose={onClose} />

      <div className="clip-context-menu-divider" role="separator" />

      <ContextMenuItem label="Split" shortcut={chord('Ctrl+I', os)} onClick={onSplit} onClose={onClose} />
      <ContextMenuItem label="Split at silences" shortcut={chord('Ctrl+Alt+I', os)} onClick={onSplitAtSilences} onClose={onClose} />

      <div className="clip-context-menu-divider" role="separator" />

      <ContextMenuItem
        label="Stretch with tempo changes"
        checked={stretchWithTempo}
        onClick={onToggleStretchWithTempo}
        onClose={onClose}
      />
      <ContextMenuItem
        label="Open pitch and speed dialog"
        shortcut={chord('Ctrl+Shift+P', os)}
        onClick={onOpenPitchSpeedDialog}
        onClose={onClose}
      />
      <ContextMenuItem
        label="Reset pitch and speed"
        disabled={!pitchSpeedModified}
        onClick={onResetPitchSpeed}
        onClose={onClose}
      />
      <ContextMenuItem
        label="Render pitch and speed"
        disabled={!pitchSpeedModified}
        onClick={onRenderPitchSpeed}
        onClose={onClose}
      />
    </ContextMenu>
  );
};

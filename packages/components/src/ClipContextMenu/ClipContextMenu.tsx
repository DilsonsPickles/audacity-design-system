import React from 'react';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem/ContextMenuItem';
import { FadeMenuItems, type FadeMenuPreset, type FadeMenuSideState, type FadeSide } from './FadeMenuItems';
import type { ClipColor } from '../types/clip';

/** The colours a clip can wear, in the palette's order */
export const CLIP_COLOR_ITEMS: ReadonlyArray<[Exclude<ClipColor, 'classic'>, string]> = [
  ['cyan', 'Cyan'], ['blue', 'Blue'], ['violet', 'Violet'], ['magenta', 'Magenta'], ['red', 'Red'],
  ['orange', 'Orange'], ['yellow', 'Yellow'], ['green', 'Green'], ['teal', 'Teal'],
];
import { useTheme } from '../ThemeProvider';
import './ClipContextMenu.css';

export interface ClipContextMenuProps {
  /**
   * Whether the menu is open
   */
  isOpen: boolean;

  /**
   * Callback when menu should close
   */
  onClose: () => void;

  /**
   * X position for the menu (in pixels)
   */
  x: number;

  /**
   * Y position for the menu (in pixels)
   */
  y: number;

  /**
   * Callback for renaming the clip
   */
  onRename?: () => void;

  /**
   * Callback for changing clip color: a `ClipColor` id from the palette,
   * or `'track'` to go back to the track's own colour
   */
  onColorChange?: (color: string) => void;

  /**
   * Callback for cut action
   */
  onCut?: () => void;

  /**
   * Callback for copy action
   */
  onCopy?: () => void;

  /**
   * Callback for duplicate action
   */
  onDuplicate?: () => void;

  /**
   * Callback for delete action
   */
  onDelete?: () => void;

  /**
   * Callback for split action
   */
  onSplit?: () => void;

  /** "Clip properties…" — the host opens the Clip properties panel on
   *  this clip (user request 2026-10-02). The item shows only when wired. */
  onOpenProperties?: () => void;

  /** "Fade in…" / "Fade in length…" — the host opens a duration dialog
   *  and applies it to the clicked clip, or to every selected clip when
   *  the clicked one is part of the selection. */
  onFadeIn?: () => void;
  /** "Fade out…" — as onFadeIn, for the clip's end. */
  onFadeOut?: () => void;
  /** The fade shape presets. With these the menu holds a Fade-in ▸
   *  and a Fade-out ▸ parent, each the handle menu's list
   *  (presets, length…, remove) — the two menus are one (2026-10-06).
   *  Without them it is the old pair of length items. */
  fadePresets?: ReadonlyArray<FadeMenuPreset>;
  /** The clicked clip's fade in: its preset and whether it has length */
  fadeInState?: FadeMenuSideState;
  fadeOutState?: FadeMenuSideState;
  /** A preset picked for a side (every selected clip's, by the fade rule) */
  onFadeShape?: (side: FadeSide, presetId: string) => void;
  /** "Remove fade in/out" — length 0 */
  onRemoveFade?: (side: FadeSide) => void;

  /**
   * Callback for export clip action
   */
  onExport?: () => void;

  /**
   * Whether "Stretch with tempo changes" is enabled
   */
  stretchWithTempo?: boolean;

  /**
   * Callback for toggling stretch with tempo changes
   */
  onToggleStretchWithTempo?: () => void;

  /**
   * Callback for opening pitch and speed dialog
   */
  onOpenPitchSpeedDialog?: () => void;

  /**
   * Callback for rendering pitch and speed
   */
  onRenderPitchSpeed?: () => void;

  /**
   * Whether the "Group clips" item is enabled (≥2 clips selected).
   */
  canGroup?: boolean;

  /**
   * Whether the "Ungroup clips" item is enabled (right-click target is in a group).
   */
  canUngroup?: boolean;

  /**
   * Callback for grouping the currently-selected clips.
   */
  onGroup?: () => void;

  /**
   * Callback for ungrouping the right-clicked clip's group.
   */
  onUngroup?: () => void;

  /**
   * Whether to auto-focus first menu item (when opened via keyboard)
   */
  autoFocus?: boolean;
}

/**
 * ClipContextMenu - Context menu for audio clips
 * Shows options for clip manipulation like rename, color, cut, copy, etc.
 */
export const ClipContextMenu: React.FC<ClipContextMenuProps> = ({
  isOpen,
  onClose,
  x,
  y,
  onRename,
  onColorChange,
  onCut,
  onCopy,
  onDuplicate,
  onDelete,
  onSplit,
  onFadeIn,
  onFadeOut,
  fadePresets,
  fadeInState,
  fadeOutState,
  onFadeShape,
  onRemoveFade,
  onExport,
  stretchWithTempo = false,
  onToggleStretchWithTempo,
  onOpenPitchSpeedDialog,
  onOpenProperties,
  onRenderPitchSpeed,
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
  autoFocus = false,
}) => {
  const { theme } = useTheme();

  const style = {
    '--clip-context-menu-divider-bg': theme.border.divider,
  } as React.CSSProperties;

  return (
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y} className="clip-context-menu" autoFocus={autoFocus} style={style}>
      {/* The panel — first; the menu has no heading of its own (2026-10-06:
          it read "Clip properties" right above "Clip properties…") */}
      {onOpenProperties && (
        <ContextMenuItem
          label="Clip properties…"
          onClick={onOpenProperties}
          onClose={onClose}
        />
      )}

      {/* Rename clip */}
      <ContextMenuItem
        label="Rename clip"
        onClick={onRename}
        onClose={onClose}
      />

      {/* Clip color submenu */}
      <ContextMenuItem
        label="Clip color"
        hasSubmenu
        onClose={onClose}
      >
        {/* The clip palette (types/clip.ts ClipColor), plus the track's
            own colour to go back to (2026-10-02 — the list was an older
            palette with colours no clip can wear) */}
        <ContextMenuItem label="Track color" onClick={() => { onColorChange?.('track'); onClose(); }} />
        <ContextMenuItem isDivider label="" />
        {CLIP_COLOR_ITEMS.map(([id, label]) => (
          <ContextMenuItem key={id} label={label} onClick={() => { onColorChange?.(id); onClose(); }} />
        ))}
      </ContextMenuItem>

      {/* Divider */}
      <div className="clip-context-menu-divider" />

      {/* Edit actions */}
      <ContextMenuItem
        label="Cut"
        onClick={onCut}
        onClose={onClose}
        icon={<CutIcon />}
      />

      <ContextMenuItem
        label="Copy"
        onClick={onCopy}
        onClose={onClose}
        icon={<CopyIcon />}
      />

      <ContextMenuItem
        label="Duplicate"
        onClick={onDuplicate}
        onClose={onClose}
      />

      <ContextMenuItem
        label="Delete clip"
        onClick={onDelete}
        onClose={onClose}
      />

      {/* Divider */}
      <div className="clip-context-menu-divider" />

      {/* Fades — with presets wired, TWO PARENTS at this level, Fade-in ▸
          and Fade-out ▸ (2026-10-07, "parent options for Fade-in and
          Fade-out" — the nouns; until then one Fade ▸ parent held them a
          level down), each the SAME list the fade handle's right-click
          opens (FadeMenuItems): the handle menu is the shortcut, this is
          the long way round (2026-10-06). A host with no presets gets the
          two verbs, "Fade in…" / "Fade out…", as plain items. */}
      {fadePresets ? (
        <>
          <ContextMenuItem label="Fade-in" hasSubmenu onClose={onClose}>
            <FadeMenuItems
              side="in"
              presets={fadePresets}
              state={fadeInState ?? { hasFade: false }}
              onShape={onFadeShape}
              onLength={() => onFadeIn?.()}
              onRemove={onRemoveFade}
              onClose={onClose}
            />
          </ContextMenuItem>
          <ContextMenuItem label="Fade-out" hasSubmenu onClose={onClose}>
            <FadeMenuItems
              side="out"
              presets={fadePresets}
              state={fadeOutState ?? { hasFade: false }}
              onShape={onFadeShape}
              onLength={() => onFadeOut?.()}
              onRemove={onRemoveFade}
              onClose={onClose}
            />
          </ContextMenuItem>
        </>
      ) : (
        <>
          <ContextMenuItem label="Fade in…" onClick={() => { onFadeIn?.(); onClose(); }} />
          <ContextMenuItem label="Fade out…" onClick={() => { onFadeOut?.(); onClose(); }} />
        </>
      )}

      {/* Divider */}
      <div className="clip-context-menu-divider" />

      {/* Group / Ungroup */}
      <ContextMenuItem
        label="Group clips"
        onClick={() => { onGroup?.(); onClose(); }}
        disabled={!canGroup}
      />

      <ContextMenuItem
        label="Ungroup clips"
        onClick={() => { onUngroup?.(); onClose(); }}
        disabled={!canUngroup}
      />

      {/* Divider */}
      <div className="clip-context-menu-divider" />

      {/* Split */}
      <ContextMenuItem
        label="Split"
        onClick={onSplit}
        onClose={onClose}
      />

      {/* Spectral editing submenu */}
      <ContextMenuItem
        label="Spectral editing"
        hasSubmenu
        onClose={onClose}
      >
        <ContextMenuItem label="Toggle Spectral View" onClick={() => { console.log('Toggle Spectral View'); onClose(); }} />
        <ContextMenuItem label="Spectral Delete" onClick={() => { console.log('Spectral Delete'); onClose(); }} />
        <ContextMenuItem label="Spectral Smoothing" onClick={() => { console.log('Spectral Smoothing'); onClose(); }} />
      </ContextMenuItem>

      {/* Export clip (disabled) */}
      <ContextMenuItem
        label="Export clip"
        onClick={onExport}
        disabled
        onClose={onClose}
      />

      {/* Divider */}
      <div className="clip-context-menu-divider" />

      {/* Stretch with tempo changes (with checkmark) */}
      <ContextMenuItem
        label="Stretch with tempo changes"
        onClick={onToggleStretchWithTempo}
        onClose={onClose}
        icon={stretchWithTempo ? <CheckIcon /> : null}
      />

      {/* Pitch and speed */}
      <ContextMenuItem
        label="Open pitch and speed dialog"
        onClick={onOpenPitchSpeedDialog}
        onClose={onClose}
      />

      <ContextMenuItem
        label="Render pitch and speed"
        onClick={onRenderPitchSpeed}
        onClose={onClose}
      />
    </ContextMenu>
  );
};

// Icon components
const CutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M9.5 7L14 2.5L13.5 2L9 6.5L4.5 2L4 2.5L8.5 7L4 11.5L4.5 12L9 7.5L13.5 12L14 11.5L9.5 7Z" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11 3V1H3v8h2v6h8V7h2V3h-4zM4 8V2h6v1H6v5H4zm9 6H7V4h6v10z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M14 4L6 12L2 8l1-1 3 3 7-7 1 1z" />
  </svg>
);

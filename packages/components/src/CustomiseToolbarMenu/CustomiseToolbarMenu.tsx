/**
 * CustomiseToolbarMenu — the popover under the transport toolbar's cog
 * (Figma: 01 Audacity Component library › CustomiseToolbar/Right,
 * node 3399:83985; user request 2026-10-07): "Customise toolbar", then
 * every tool of the toolbar as a row — an EYE (open = shown, shut =
 * hidden), the tool's own icon, its name — grouped by dividers. A
 * press on a row toggles that tool's visibility in the toolbar. Sits
 * 256px wide with the design's triangle pointing up at the cog, its
 * list scrolling within the viewport. Built on ContextMenu for the
 * portal, outside-click and Escape; the look is its own.
 */
import React from 'react';
import { ContextMenu } from '../ContextMenu';
import triangleSvg from '../assets/customise-toolbar/triangle.svg';
import dividerSvg from '../assets/customise-toolbar/divider.svg';
import './CustomiseToolbarMenu.css';

export interface CustomiseToolbarTool {
  kind: 'tool';
  /** The toolbar's id for the tool (`hiddenTools` carries these) */
  id: string;
  label: string;
  /** The tool's MusescoreIcon glyph, as the design draws it */
  glyph: string;
  /** The glyph's colour where the design gives it one (play, record) */
  color?: string;
}
export interface CustomiseToolbarDivider { kind: 'divider' }
export type CustomiseToolbarEntry = CustomiseToolbarTool | CustomiseToolbarDivider;

const tool = (id: string, label: string, glyph: string, color?: string): CustomiseToolbarTool => ({ kind: 'tool', id, label, glyph, color });
const DIVIDER: CustomiseToolbarDivider = { kind: 'divider' };

/** The design's list, in its order and groups, with its glyphs */
export const CUSTOMISE_TOOLBAR_ENTRIES: ReadonlyArray<CustomiseToolbarEntry> = [
  tool('play', 'Play', '', '#74BE59'),
  tool('stop', 'Stop', ''),
  tool('record', 'Record', '', '#F08080'),
  tool('step-back', 'Step backwards', ''),
  tool('step-forward', 'Step forwards', ''),
  tool('loop', 'Loop', ''),
  DIVIDER,
  tool('automation', 'Automation', ''),
  DIVIDER,
  tool('zoom-in', 'Zoom in', ''),
  tool('zoom-out', 'Zoom out', ''),
  tool('fit-selection', 'Fit selection to width', ''),
  tool('fit-project', 'Fit project to width', ''),
  tool('zoom-toggle', 'Zoom toggle', ''),
  DIVIDER,
  tool('spectral-editing', 'Spectral editing', ''),
  tool('spectral-box-select', 'Spectral box select', ''),
  tool('spectral-brush', 'Spectral brush', ''),
  DIVIDER,
  tool('cut', 'Cut', ''),
  tool('copy', 'Copy', ''),
  tool('paste', 'Paste', ''),
  DIVIDER,
  tool('trim', 'Trim', ''),
  tool('silence', 'Silence', ''),
  DIVIDER,
  tool('metronome', 'Metronome', ''),
  DIVIDER,
  tool('timecode', 'Timecode', ''),
  tool('bpm', 'BPM', ''),
  tool('time-signature', 'Time signature', ''),
  DIVIDER,
  tool('snapping', 'Snapping', ''),
  DIVIDER,
  tool('microphone-levels', 'Microphone levels', ''),
  tool('playback-meter', 'Playback meter', ''),
];

/** Every tool id the menu knows */
export const CUSTOMISE_TOOLBAR_TOOL_IDS: ReadonlyArray<string> = CUSTOMISE_TOOLBAR_ENTRIES
  .filter((e): e is CustomiseToolbarTool => e.kind === 'tool')
  .map((e) => e.id);

/** The menu is 256 wide; the triangle's centre sits 26px in from its right edge */
export const CUSTOMISE_TOOLBAR_WIDTH = 256;
const TRIANGLE_FROM_RIGHT = 26;
const TRIANGLE_W = 16;
const TRIANGLE_H = 9;

export interface CustomiseToolbarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  /** The cog's rectangle in viewport pixels: the menu hangs under it,
   *  the triangle on its centre */
  anchor: { left: number; right: number; bottom: number } | null;
  /** Tools currently hidden from the toolbar */
  hiddenTools: ReadonlyArray<string>;
  /** A row was pressed: show or hide that tool */
  onToggleTool: (id: string) => void;
  entries?: ReadonlyArray<CustomiseToolbarEntry>;
}

export function CustomiseToolbarMenu({ isOpen, onClose, anchor, hiddenTools, onToggleTool, entries = CUSTOMISE_TOOLBAR_ENTRIES }: CustomiseToolbarMenuProps) {
  const hidden = React.useMemo(() => new Set(hiddenTools), [hiddenTools]);
  const anchorX = anchor ? (anchor.left + anchor.right) / 2 : 0;
  const x = Math.round(anchorX - (CUSTOMISE_TOOLBAR_WIDTH - TRIANGLE_FROM_RIGHT));
  // The box's top is a triangle's height under the cog, less the 1px
  // the triangle overlaps the border
  const y = anchor ? Math.round(anchor.bottom + TRIANGLE_H - 1) : 0;
  const maxHeight = typeof window === 'undefined' ? undefined : Math.max(160, window.innerHeight - y - 16);
  return (
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y} className="customise-toolbar">
      <img
        className="customise-toolbar__triangle"
        src={triangleSvg}
        alt=""
        width={TRIANGLE_W}
        height={TRIANGLE_H}
        style={{ right: TRIANGLE_FROM_RIGHT - TRIANGLE_W / 2 }}
      />
      <div className="customise-toolbar__main" role="menu" aria-label="Customise toolbar" data-customise-toolbar style={{ maxHeight }}>
        <div className="customise-toolbar__header">Customise toolbar</div>
        <div className="customise-toolbar__list">
          {entries.map((entry, i) => entry.kind === 'divider' ? (
            <img key={`d${i}`} className="customise-toolbar__divider" src={dividerSvg} alt="" height={8} />
          ) : (
            <button
              key={entry.id}
              type="button"
              role="menuitemcheckbox"
              aria-checked={!hidden.has(entry.id)}
              className="customise-toolbar__item"
              data-customise-tool={entry.id}
              onClick={() => onToggleTool(entry.id)}
            >
              <span className="customise-toolbar__eye musescore-icon" aria-hidden="true">{hidden.has(entry.id) ? '' : ''}</span>
              <span className="customise-toolbar__icon musescore-icon" aria-hidden="true" style={entry.color ? { color: entry.color } : undefined}>{entry.glyph}</span>
              <span className="customise-toolbar__label">{entry.label}</span>
            </button>
          ))}
        </div>
      </div>
    </ContextMenu>
  );
}

export default CustomiseToolbarMenu;

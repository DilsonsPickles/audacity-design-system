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
import { Icon, type IconName } from '../Icon';
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
  /** An icon DRAWN by the Icon component instead of the font glyph (the track-height pair, 2026-10-22) */
  icon?: IconName;
  /** The glyph's colour where the design gives it one (play, record) */
  color?: string;
}
export interface CustomiseToolbarDivider { kind: 'divider' }
export type CustomiseToolbarEntry = CustomiseToolbarTool | CustomiseToolbarDivider;

const tool = (id: string, label: string, glyph: string, color?: string, icon?: IconName): CustomiseToolbarTool => ({ kind: 'tool', id, label, glyph, color, icon });
const DIVIDER: CustomiseToolbarDivider = { kind: 'divider' };

/** The design's list, in its order and groups, with its glyphs */
export const CUSTOMISE_TOOLBAR_ENTRIES: ReadonlyArray<CustomiseToolbarEntry> = [
  // THE PROJECT TOOLBAR'S BUTTONS, tools since 2026-11-10 ("all these
  // buttons need to be added to the customise toolbar flyout") — the
  // Home / Project / Export / Debug tabs are not here: they are the way
  // back to Home and cannot be hidden
  tool('mixer-button', 'Mixer', '', undefined, 'mixer'),
  tool('audio-setup', 'Audio setup', '', undefined, 'cog'),
  tool('share-audio', 'Share audio', '', undefined, 'cloud'),
  tool('get-effects', 'Get effects', '', undefined, 'plugins'),
  DIVIDER,
  tool('workspace', 'Workspace', '', undefined, 'workspace'),
  tool('undo', 'Undo', '', undefined, 'undo'),
  tool('redo', 'Redo', '', undefined, 'redo'),
  DIVIDER,
  tool('play', 'Play', '', '#74BE59'),
  tool('stop', 'Stop', ''),
  tool('record', 'Record', '', '#F08080'),
  tool('step-back', 'Step backwards', ''),
  tool('step-forward', 'Step forwards', ''),
  tool('loop', 'Loop', ''),
  tool('varispeed', 'Play-at-Speed', '\uEF55'),
  DIVIDER,
  tool('automation', 'Automation', ''),
  DIVIDER,
  tool('zoom-in', 'Zoom in', ''),
  tool('zoom-out', 'Zoom out', ''),
  tool('fit-selection', 'Fit selection to width', ''),
  tool('fit-project', 'Fit project to width', ''),
  tool('collapse-tracks', 'Collapse tracks', '\uEF37', undefined, 'track-collapse'),
  tool('expand-tracks', 'Expand collapsed tracks', '\uEF36', undefined, 'track-expand'),
  tool('fit-tracks-height', 'Fit tracks to height', '\uF439', undefined, 'track-fit-height'),
  tool('zoom-toggle', 'Zoom toggle', ''),
  DIVIDER,
  // Spectral box select and Spectral brush went (2026-11-04, "remove spectral
  // box select and brush") — listed for the design's sake with no tool behind
  tool('spectral-editing', 'Spectral editing', ''),
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
/** The least the menu keeps from the window's edges */
const EDGE_GAP = 10;
/** Below the cog when at least this much room is there (else above, if roomier) */
const MIN_ROOM_BELOW = 320;

export interface CustomiseToolbarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  /** The cog's rectangle in viewport pixels: the menu hangs under it,
   *  the triangle on its centre — or, when the cog is low in the window
   *  (it is a movable tool since 2026-11-10: the bottom dock), stands
   *  above it with the triangle pointing down. `top` enables that. */
  anchor: { left: number; right: number; bottom: number; top?: number } | null;
  /** Tools currently hidden from the toolbar */
  hiddenTools: ReadonlyArray<string>;
  /** A row was pressed: show or hide that tool */
  onToggleTool: (id: string) => void;
  entries?: ReadonlyArray<CustomiseToolbarEntry>;
  /** "Rearrange tools…" at the menu's foot (2026-11-10, custom toolbars):
   *  enters the layout's edit mode; absent = no such item */
  onRearrange?: () => void;
  /** "Reset layout", beside it; absent = no such item */
  onResetLayout?: () => void;
  resetLayoutDisabled?: boolean;
}

export function CustomiseToolbarMenu({ isOpen, onClose, anchor, hiddenTools, onToggleTool, entries = CUSTOMISE_TOOLBAR_ENTRIES, onRearrange, onResetLayout, resetLayoutDisabled = false }: CustomiseToolbarMenuProps) {
  const hidden = React.useMemo(() => new Set(hiddenTools), [hiddenTools]);
  const anchorX = anchor ? (anchor.left + anchor.right) / 2 : 0;
  const viewportW = typeof window === 'undefined' ? Infinity : window.innerWidth;
  const viewportH = typeof window === 'undefined' ? Infinity : window.innerHeight;
  // Right-aligned on the cog, as the design hangs it — slid back inside the
  // window when the cog is near its left edge (a side dock), the triangle
  // staying on the cog
  const x = Math.round(Math.max(EDGE_GAP, Math.min(anchorX - (CUSTOMISE_TOOLBAR_WIDTH - TRIANGLE_FROM_RIGHT), viewportW - CUSTOMISE_TOOLBAR_WIDTH - EDGE_GAP)));
  const triangleRight = x + CUSTOMISE_TOOLBAR_WIDTH - anchorX - TRIANGLE_W / 2;
  // Below the cog unless the room below is short and there is more above
  const roomBelow = anchor ? viewportH - anchor.bottom - TRIANGLE_H - EDGE_GAP : 0;
  const roomAbove = anchor?.top !== undefined ? anchor.top - TRIANGLE_H - EDGE_GAP : 0;
  const above = anchor?.top !== undefined && roomBelow < MIN_ROOM_BELOW && roomAbove > roomBelow;
  // The box's height, measured once it is drawn, to stand it above the cog
  const mainRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!isOpen || !above) return;
    const h = mainRef.current?.offsetHeight ?? 0;
    if (h !== height) setHeight(h);
  });
  // The box's edge is a triangle's height from the cog, less the 1px the
  // triangle overlaps the border
  const y = !anchor ? 0 : above
    ? Math.round(anchor.top! - TRIANGLE_H + 1 - height)
    : Math.round(anchor.bottom + TRIANGLE_H - 1);
  const maxHeight = typeof window === 'undefined' ? undefined : Math.max(160, above ? roomAbove : viewportH - y - 16);
  return (
    // Portaled to the body: the cog may sit in any dock now, and an
    // ancestor that is a containing block for fixed elements would shift it
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y} className={`customise-toolbar${above ? ' customise-toolbar--above' : ''}`} portalTo={typeof document === 'undefined' ? null : document.body}>
      <img
        className="customise-toolbar__triangle"
        src={triangleSvg}
        alt=""
        width={TRIANGLE_W}
        height={TRIANGLE_H}
        style={{ right: triangleRight }}
      />
      <div ref={mainRef} className="customise-toolbar__main" role="menu" aria-label="Customise toolbar" data-customise-toolbar style={{ maxHeight }}>
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
              {entry.icon ? (
                <Icon name={entry.icon} className="customise-toolbar__icon" />
              ) : (
                <span className="customise-toolbar__icon musescore-icon" aria-hidden="true" style={entry.color ? { color: entry.color } : undefined}>{entry.glyph}</span>
              )}
              <span className="customise-toolbar__label">{entry.label}</span>
            </button>
          ))}
        </div>
        {(onRearrange || onResetLayout) && (
          <div className="customise-toolbar__footer">
            {onRearrange && (
              <button type="button" role="menuitem" className="customise-toolbar__action" data-customise-rearrange onClick={onRearrange}>
                Rearrange tools…
              </button>
            )}
            {onResetLayout && (
              <button type="button" role="menuitem" className="customise-toolbar__action" data-customise-reset disabled={resetLayoutDisabled} onClick={onResetLayout}>
                Reset layout
              </button>
            )}
          </div>
        )}
      </div>
    </ContextMenu>
  );
}

export default CustomiseToolbarMenu;

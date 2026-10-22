import React from 'react';
import '../assets/fonts/musescore-icon.css';
import './Icon.css';

export type IconName =
  | 'mixer'
  | 'menu'
  | 'edit'
  | 'file'
  | 'gripper'
  | 'undo'
  | 'redo'
  | 'play'
  | 'pause'
  | 'stop'
  | 'record'
  | 'rewind'
  | 'forward'
  | 'skip-back'
  | 'skip-forward'
  | 'loop'
  | 'plus'
  | 'zoom-in'
  | 'zoom-out'
  | 'automation'
  | 'cloud'
  | 'cloud-filled'
  | 'cloud-sync'
  | 'export'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'split'
  | 'spectrogram'
  | 'workspace'
  | 'cog'
  | 'trash'
  | 'silence'
  | 'trim'
  | 'waveform'
  | 'playhead'
  | 'caret-down'
  | 'close'
  | 'user'
  | 'book'
  | 'brush'
  | 'volume'
  | 'metronome'
  | 'plug'
  | 'plugins'
  | 'microphone'
  | 'keyboard'
  | 'label'
  | 'midi'
  | 'chevron-left'
  | 'chevron-right'
  | 'zoom-toggle'
  | 'zoom-to-selection'
  | 'zoom-to-fit'
  | 'power'
  | 'save'
  | 'grid-view'
  | 'list-view'
  | 'lock'
  | 'folder'
  | 'clock'
  | 'track-expand'
  | 'track-collapse'
  | 'track-fit-height'
  | 'refresh'
  | 'check'
  | 'search';

// Unicode mappings for MusescoreIcon font
const ICON_MAP: Record<IconName, string> = {
  mixer: '\uF41B',
  menu: '\uEF13',
  gripper: '\uF3A2',
  undo: '\uEF19',
  redo: '\uEF1A',
  play: '\uF446',
  pause: '\uF44B',
  stop: '\uF447',
  record: '\uF44A',
  rewind: '\uE007',
  forward: '\uE008',
  'skip-back': '\uF448',
  'skip-forward': '\uF449',
  loop: '\uEF1F',
  plus: '\uEF2A',
  'zoom-in': '\uEF18',
  'zoom-out': '\uEF16',
  automation: '\uF45C',
  cloud: '\uEF25',
  'cloud-filled': '\uF454',
  'cloud-sync': '\uEF25',
  export: '\uEF24',
  copy: '\uF398',
  paste: '\uF399',
  cut: '\uF39A',
  split: '\uF494',
  spectrogram: '\uF442',
  workspace: '\uF46B',
  cog: '\uEF55',
  trash: '\uEF2C',
  silence: '\uF43A',
  trim: '\uF43B',
  waveform: '\uF43C',
  playhead: '\uF478',
  'caret-down': '\uEF12',
  close: '\uEF14',
  user: '\uEF99',
  book: '\uF441',
  brush: '\uF444',
  /* The pen \u2014 the correct "edit" glyph (the brush above is a paintbrush) */
  edit: '\uEF63',
  /* Document/file glyph - e.g. the Macros panel's run-on-files action */
  file: '\uEF22',
  volume: '\uEF4E',
  metronome: '\uEF20',
  plug: '\uF440',
  plugins: '\uF440',
  microphone: '\uF41B',
  keyboard: '\uF35D',
  label: '\uF3C7',
  midi: '\uF35E',
  'chevron-left': '\uF39C',
  'chevron-right': '\uF39B',
  'zoom-toggle': '\uF437',
  'zoom-to-selection': '\uF438',
  'zoom-to-fit': '\uF439',
  power: '\uF38F',
  save: '\uEF29',
  'grid-view': '\uF35B',
  'list-view': '\uF3AA',
  lock: '\uF375',
  // EF23 is a FOLDER glyph in MusescoreIcon.ttf. It was named `eye`,
  // which nothing ever rendered \u2014 had anything asked for an eye it
  // would have drawn a folder. Renamed rather than aliased so one
  // codepoint keeps one honest name.
  folder: '\uEF23',
  // The shared font's CLOCK (the real build's iconcodes.h 0xF475): the armed Record button (2026-10-19)
  clock: '\uF475',
  // The toolbar's track-height pair (2026-10-20): the shared font's ARROW_DOWN
  // 0xEF36 = expand (taller, as ⌥⌘↓ is) and ARROW_UP 0xEF37 = collapse
  'track-expand': '\uEF36',
  'track-collapse': '\uEF37',
  // Fit tracks to height: drawn (below); the font's fit glyph is its stand-in code
  'track-fit-height': '\uF439',
  refresh: '\uF358',
  check: '\uEF31',
  /* Plain magnifier (the zoom-in/out glyphs carry +/- marks) \u2014 the
     Macro manager Figma spec's search-field icon */
  search: '\uEF17',
};

/** The glyph each icon name draws — the MusescoreIcon codepoints, read
 *  back by the dev Inspector ("show the icon's code", 2026-10-01) */
export const ICON_CODES: Readonly<Record<IconName, string>> = ICON_MAP;

/** The icon name(s) a glyph is registered under — a few codepoints
 *  carry two names (cloud / cloud-sync, plug / plugins, mixer /
 *  microphone); empty for a glyph the map does not know. */
export function iconNamesOf(glyph: string): IconName[] {
  return (Object.keys(ICON_MAP) as IconName[]).filter((name) => ICON_MAP[name] === glyph);
}

/** A glyph's codepoint, written U+XXXX */
export function glyphCodepoint(glyph: string): string {
  const cp = glyph.codePointAt(0);
  return cp === undefined ? '' : `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

export interface IconProps {
  /**
   * Icon name from MusescoreIcon font
   */
  name: IconName;
  /**
   * Icon size in pixels
   */
  size?: number;
  /**
   * Icon color
   */
  color?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/* A chevron on the 16-grid: `y` its point, `dir` which way it points. */
const chevron = (y: number, dir: 'up' | 'down') =>
  dir === 'down'
    ? `M5.5 ${y - 2}L8 ${y}L10.5 ${y - 2}`
    : `M5.5 ${y + 2}L8 ${y}L10.5 ${y + 2}`;

/**
 * Icons DRAWN here rather than taken from the shared font (2026-10-22,
 * "some ideas for icon" — a sketch): the toolbar's track-height trio.
 * The bar is the track; the chevrons say which way its edges go —
 * toward it to collapse, away from it to expand, out to the view's
 * edges to fit ("use the same bar iconography for the fit", the same
 * day). At the FONT'S WEIGHT: 1px strokes at 16px, round caps, inside
 * the 14-grid — the font's glyphs are 64 units on a 1024 em, which is
 * 1px, and a first cut at 1.3 read heavier than its neighbours. Keyed
 * by the same names as the font map, so a host asks for the name and
 * gets the drawing; `ICON_CODES` keeps a font code for the Inspector.
 * These belong in the font eventually (see the glyph how-to in the
 * 2026-10-22 conversation): drop them when the font has them.
 */
const svgProps = {
  viewBox: '0 0 16 16', width: '1em', height: '1em', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1, strokeLinecap: 'round', strokeLinejoin: 'round',
} as const;
const bar = <rect x="2.5" y="6.5" width="11" height="3" rx="0.5" />;
const DRAWN_ICONS: Partial<Record<IconName, React.ReactNode>> = {
  'track-collapse': (
    <svg {...svgProps}>
      {bar}
      <path d={chevron(3.5, 'down')} />
      <path d={chevron(12.5, 'up')} />
    </svg>
  ),
  'track-expand': (
    <svg {...svgProps}>
      {bar}
      <path d={chevron(1.5, 'up')} />
      <path d={chevron(14.5, 'down')} />
    </svg>
  ),
  'track-fit-height': (
    <svg {...svgProps}>
      <path d="M2.5 1.5H13.5" />
      {bar}
      <path d={chevron(3.5, 'up')} />
      <path d={chevron(12.5, 'down')} />
      <path d="M2.5 14.5H13.5" />
    </svg>
  ),
};

/** Whether an icon is drawn (an SVG) rather than a font glyph. */
export const isDrawnIcon = (name: IconName): boolean => name in DRAWN_ICONS;

export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  color,
  className = '',
}) => {
  const drawn = DRAWN_ICONS[name];
  const iconChar = ICON_MAP[name] || '';

  return (
    <span
      className={`icon musescore-icon ${className}`}
      style={{
        fontSize: `${size}px`,
        ...(color && { color }),
      }}
      aria-hidden="true"
      data-drawn-icon={drawn ? name : undefined}
    >
      {drawn ?? iconChar}
    </span>
  );
};

export default Icon;

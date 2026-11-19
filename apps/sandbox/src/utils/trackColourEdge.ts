import type { ThemeTokens } from '@audacity-ui/tokens';

/** The clips' own colour cycle for a track with no colour stored —
 *  TrackNew's TRACK_COLORS, by track index */
const TRACK_COLOUR_CYCLE = ['blue', 'violet', 'magenta', 'teal', 'cyan', 'green', 'orange', 'red', 'yellow'] as const;
type TrackColourName = typeof TRACK_COLOUR_CYCLE[number];

/**
 * THE COLOUR ON A TRACK HEADER'S LEFT EDGE (2026-11-19, "Let's try adding
 * the track colour on the left edge of the header"): the track's colour as
 * its clips are drawn — its clip header tone, the stored colour or the
 * index cycle TrackNew falls back to. None for a group row (it has no clips)
 * or while clips are drawn classic (no track colours are shown).
 */
export function trackColourEdge(
  track: { color?: string; type?: string },
  index: number,
  theme: ThemeTokens,
  clipStyle: 'classic' | 'colourful',
): string | undefined {
  if (track.type === 'folder' || clipStyle === 'classic') return undefined;
  const name = (track.color && track.color in theme.audio.clip ? track.color : TRACK_COLOUR_CYCLE[index % TRACK_COLOUR_CYCLE.length]) as TrackColourName;
  return theme.audio.clip[name]?.header;
}

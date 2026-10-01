/**
 * What the status bar says for the clip handle under the pointer (user
 * decision 2026-10-01). One line per handle: the plain gesture first,
 * then the modifier gestures, in the operating system's own modifier
 * names. The gestures named here are the ones TrackNew implements —
 * keep the two in step.
 */
import type { ClipHandleHint } from '@audacity-ui/components';

export type HintOperatingSystem = 'windows' | 'macos';

export function handleHintText(hint: ClipHandleHint, os: HintOperatingSystem, options: { snapEnabled?: boolean } = {}): string {
  const alt = os === 'macos' ? 'Option' : 'Alt';
  const cmd = os === 'macos' ? 'Cmd' : 'Ctrl';
  const join = (...parts: string[]) => parts.join(' · ');
  switch (hint) {
    case 'trim':
      return 'Drag to trim the clip';
    case 'stretch':
      return 'Drag to stretch the clip';
    case 'edge-trim':
      return join('Drag to trim the clip', `${alt}-drag to stretch`);
    case 'edge-stretch':
      return 'Drag to stretch the clip';
    case 'fade-length':
      // Shift inverts the snapping switch, as it does for a clip drag:
      // the line names what Shift will do from where the switch is now
      return join('Drag to set the fade length', options.snapEnabled ? 'Shift-drag to ignore snapping' : 'Shift-drag to snap to the grid');
    case 'fade-shape':
      return join('Drag up or down to shape the fade', `${cmd}-click to toggle linear`, 'Double-click to reset');
    case 'crossfade':
      return join('Drag up or down to shape the crossfade', `${alt}-drag to roll`, `${cmd}-click to toggle linear`, 'Double-click to reset');
    case 'crossfade-roll':
      // The roll is a content edit: it can only go as far as the clips
      // have audio beyond their edges, so a fresh overlap of untrimmed
      // clips will not roll at all — say so, or it reads as broken
      return join('Drag left or right to roll the crossfade', 'only as far as the clips have hidden audio');
  }
}

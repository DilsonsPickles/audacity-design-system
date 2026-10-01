/**
 * What the status bar says for the clip handle under the pointer (user
 * decision 2026-10-01). One line per handle: the plain gesture first,
 * then the modifier gestures, in the operating system's own modifier
 * names. The gestures named here are the ones TrackNew implements —
 * keep the two in step.
 */
import type { ClipHandleHint } from '@audacity-ui/components';

export type HintOperatingSystem = 'windows' | 'macos';

export function handleHintText(hint: ClipHandleHint, os: HintOperatingSystem): string {
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
      return join('Drag to set the fade length', `${alt}-drag to ignore snapping`);
    case 'fade-shape':
      return join('Drag up or down to shape the fade', `${cmd}-click for linear`, 'Double-click to reset');
    case 'crossfade':
      return join('Drag up or down to shape the crossfade', `${alt}-drag to roll`, 'Double-click for linear');
    case 'crossfade-roll':
      return 'Drag left or right to roll the crossfade';
  }
}

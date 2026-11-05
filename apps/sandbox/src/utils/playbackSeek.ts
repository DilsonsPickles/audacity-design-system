/**
 * SEEK WHILE PLAYING — Audacity 3's arrow keys (2026-11-05, "let's see
 * using arrow keys like we use them in AU3 … during playback that is").
 *
 * In Audacity 3 the arrows mean one thing while the project is stopped
 * (move the cursor) and another while it plays: Left / Right are "Short
 * seek left / right during playback" and with Shift the long seek — and
 * comma / period are the same pair. The periods are Audacity 3's
 * defaults (Preferences › Playback › Seek time when playing: 1 s short,
 * 15 s long); they are constants here, not yet a preference.
 */
export const SHORT_SEEK_SECONDS = 1;
export const LONG_SEEK_SECONDS = 15;

export interface PlaybackSeekKey {
  direction: -1 | 1;
  long: boolean;
}

/** The seek a key press asks for, or null when it is not a seek key.
 *  Cmd / Ctrl / Option chords are never a seek (they move clips, etc.). */
export function playbackSeekKeyOf(e: Pick<KeyboardEvent, 'key' | 'code' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'>): PlaybackSeekKey | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  const left = e.key === 'ArrowLeft' || e.code === 'Comma' || (!e.code && (e.key === ',' || e.key === '<'));
  const right = e.key === 'ArrowRight' || e.code === 'Period' || (!e.code && (e.key === '.' || e.key === '>'));
  if (!left && !right) return null;
  return { direction: left ? -1 : 1, long: e.shiftKey };
}

/** Where a seek lands: the period either way, held inside the project.
 *  A forward seek stops at the project's end and never moves BACK:
 *  playback runs on past the last clip, and from out there → must not
 *  jump the playhead backwards to the end. */
export function playbackSeekTarget(position: number, seek: PlaybackSeekKey, projectEnd: number): number {
  const to = position + seek.direction * (seek.long ? LONG_SEEK_SECONDS : SHORT_SEEK_SECONDS);
  if (seek.direction < 0) return Math.max(0, to);
  return projectEnd > 0 ? Math.max(position, Math.min(projectEnd, to)) : to;
}

const ARROW_OWNING_ROLES = [
  'slider', 'spinbutton', 'textbox', 'combobox', 'listbox', 'menu', 'menubar',
  'tablist', 'radiogroup', 'grid', 'tree',
].map((role) => `[role="${role}"]`).join(', ');

/**
 * Does the focused element keep its own Left / Right while the project
 * plays? A seek works from anywhere in the project — a clip, a track, a
 * header, the ruler, or no focus at all — but never takes the arrows
 * from a control that is being DRIVEN with them: a text field, a slider
 * or knob, a menu, a list, a timecode, a trim / stretch / fade handle
 * held from the keyboard. A TOOLBAR button keeps them only when it was
 * reached by keyboard (Tab / F6 — its roving navigation); one that has
 * the focus because it was CLICKED (the Play button, the usual way a
 * playback starts) does not, or the seek would be dead after every
 * mouse-started play.
 */
export function keepsItsArrowsWhilePlaying(target: EventTarget | null, inputMode: 'mouse' | 'keyboard'): boolean {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return type !== 'checkbox' && type !== 'button' && type !== 'submit';
  }
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  if (el.closest(ARROW_OWNING_ROLES)) return true;
  if (el.closest('.timecode, [data-fade-handle], [data-handle-kind]')) return true;
  if (el.closest('.project-toolbar, .transport-toolbar, [role="toolbar"]')) return inputMode === 'keyboard';
  return false;
}

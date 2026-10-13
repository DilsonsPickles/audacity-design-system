/**
 * ⌥⇧F opens the FADES dialog on the focused clip (user decision
 * 2026-10-13: "a dialog for setting fade out / fade in… accessible via
 * keyboard shortcut with the clip in focus, preferably using the F key
 * with a modifier"). The F family: F / ⇧F focus the fade handles
 * (2026-10-12), ⌥F takes a fade TO THE PLAYHEAD (the frequent action,
 * on the lighter chord — TrackNew's, with the clip inferring the side),
 * ⌥⇧F is the typed form, the dialog (Shift = the fuller form, as
 * elsewhere); ⌘F reads as Find on a Mac (and as Fit to width to
 * Audacity 3 users), ⌘⇧F and ⌥⌘F are the track-height commands.
 *
 * From a focused FADE HANDLE it opens on that side's length field; from
 * the clip, on the fade-in's. Matched on `e.code` — Option+F types "ƒ"
 * on macOS, so `e.key` is useless (the ⌥⌘I rule) — and refused inside a
 * text field, where the keystroke is a character. Lives in its own
 * document listener, like ⌥⌘I: the dialog's state is the context-menu
 * state (useContextMenuState.fadeDialog), which useKeyboardShortcuts,
 * running in App above the provider, cannot reach. Yields to a dialog
 * that owns the keyboard. The targets (the clip, or every selected
 * clip when it is selected) are resolved by AppContextMenus from the
 * live tracks; a clip with no fades (a MIDI clip) opens nothing.
 */
import React from 'react';
import { useContextMenus } from '../contexts/ContextMenuContext';
import { clipOfElement } from './useFocusedClip';
import { dialogOwnsKeyboard } from '../utils/focusRouting';

export const FADE_DIALOG_HOTKEY_LABEL = '⌥⇧F';

export function isFadeDialogHotkey(e: KeyboardEvent): boolean {
  return e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyF';
}

export function useFadeDialogHotkey(): void {
  const { setFadeDialog } = useContextMenus();
  // Mirrored in a ref: ONE listener, reading the live setter (the ref-mirror rule)
  const live = React.useRef(setFadeDialog);
  React.useEffect(() => { live.current = setFadeDialog; }, [setFadeDialog]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isFadeDialogHotkey(e)) return;
      if (dialogOwnsKeyboard(e.target, document)) return;
      const target = e.target instanceof Element ? e.target : null;
      // In a text field (a clip's rename box sits inside the clip) the
      // keystroke is its character, not the chord
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      const focused = clipOfElement(document.activeElement);
      if (!focused) return;
      e.preventDefault();
      const side = document.activeElement?.closest('[data-fade-handle]')?.getAttribute('data-fade-handle') === 'out' ? 'out' : 'in';
      live.current({ ...focused, focusSide: side });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}

/**
 * ⌥⌘I toggles the Clip properties panel (user decision 2026-10-07 —
 * "what's a good shortcut?": the I is the inspector mnemonic, plain ⌘I
 * is Audacity's own Split, ⌘⇧I is taken; Option makes it the chord
 * nothing else uses). A TOGGLE, like ⌘, for Preferences: closed → opens
 * on the FOCUSED clip (else the clip it last showed; else the dock
 * panel's own rule finds the single selection) and moves focus into
 * the panel; open → closes and hands focus back to that clip.
 *
 * Lives in its own document listener rather than useKeyboardShortcuts:
 * that chain runs in App, above ClipPropertiesProvider, and cannot
 * reach the panel's state. Matched on `e.code` — Option+I types a dead
 * key on macOS, so `e.key` is not "i". Works from inside a text field
 * too (that is how the panel's own fields close it). Yields to a dialog
 * that owns the keyboard.
 */
import React from 'react';
import { useClipProperties } from '../contexts/ClipPropertiesContext';
import { clipOfElement } from './useFocusedClip';
import { dialogOwnsKeyboard } from '../utils/focusRouting';

export const CLIP_PROPERTIES_HOTKEY_LABEL = '⌥⌘I';

export function isClipPropertiesHotkey(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.altKey && !e.shiftKey && e.code === 'KeyI';
}

/** The panel's first focusable, wherever the panel is docked (null in an OS window) */
function focusPanel(doc: Document) {
  const panel = doc.querySelector('[data-clip-properties-panel]');
  const first = panel?.querySelector<HTMLElement>('input, button:not(:disabled), [tabindex="0"]');
  first?.focus();
}

export function useClipPropertiesHotkey(): void {
  const { isClipPropertiesOpen, setIsClipPropertiesOpen, clipPropertiesTarget, openClipProperties } = useClipProperties();
  // Mirrored in a ref: ONE listener, reading live state (the ref-mirror rule)
  const live = React.useRef({ isClipPropertiesOpen, clipPropertiesTarget, openClipProperties, setIsClipPropertiesOpen });
  React.useEffect(() => {
    live.current = { isClipPropertiesOpen, clipPropertiesTarget, openClipProperties, setIsClipPropertiesOpen };
  }, [isClipPropertiesOpen, clipPropertiesTarget, openClipProperties, setIsClipPropertiesOpen]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isClipPropertiesHotkey(e)) return;
      if (dialogOwnsKeyboard(e.target, document)) return;
      e.preventDefault();
      const { isClipPropertiesOpen: open, clipPropertiesTarget: target, openClipProperties: openOn, setIsClipPropertiesOpen: setOpen } = live.current;
      if (open) {
        setOpen(false);
        // Focus back to the clip the panel showed, once it has gone
        requestAnimationFrame(() => {
          if (!target) return;
          document.querySelector<HTMLElement>(`[data-clip-id="${target.clipId}"][data-track-index="${target.trackIndex}"]`)?.focus();
        });
        return;
      }
      const focused = clipOfElement(document.activeElement);
      if (focused) openOn(focused);
      else if (target) openOn(target);
      else setOpen(true);
      // Into the panel, once it is mounted
      requestAnimationFrame(() => requestAnimationFrame(() => focusPanel(document)));
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}

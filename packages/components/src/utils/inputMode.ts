/**
 * Global input-mode tracking.
 *
 * Distinguishes "the user is driving with a pointer" from "the user is
 * driving with the keyboard" so focus-style decisions (e.g. track
 * container-focus bars: blue for mouse, black/white for keyboard) can
 * stay consistent across whichever event eventually sets focus.
 *
 * Mouse down → mode flips to 'mouse'.
 * Tab key down → mode flips to 'keyboard'.
 * Arrow / Home / End / Escape — left as-is; they're navigation that
 * inherits whichever mode was last established. Clicking after a Tab
 * goes back to mouse; Tabbing after a click goes back to keyboard.
 *
 * Listeners are installed once on first import.
 */

let mode: 'mouse' | 'keyboard' = 'keyboard';
let installed = false;

const ensureInstalled = () => {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('mousedown', () => {
    mode = 'mouse';
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      mode = 'keyboard';
    }
  }, true);
};

ensureInstalled();

export function getInputMode(): 'mouse' | 'keyboard' {
  return mode;
}

import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { KeyboardMap, parseShortcutRow, stateOf } from '../KeyboardMap';
import { SHORTCUT_ROWS } from '../../PreferencesModal/pages/shortcutsData';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('parseShortcutRow — the Shortcuts page\'s strings into chords', () => {
  const row = (shortcut: string) => parseShortcutRow({ id: 'x', action: 'A', shortcut });
  it('reads modifiers, pairs, alternatives, ranges and named keys', () => {
    expect(row('⌥⇧F').map((b) => [b.mods, b.key, b.state])).toEqual([[['opt', 'shift'], 'F', 'opt+shift']]);
    expect(row('⌥⌘⇧F · ⌘⇧F').map((b) => b.text)).toEqual(['⌥⇧⌘F', '⇧⌘F']);
    expect(row('← → / ↑ ↓').map((b) => b.key)).toEqual(['←', '→', '↑', '↓']);
    expect(row('1–5 / 0').map((b) => b.key)).toEqual(['1', '2', '3', '4', '5', '0']);
    expect(row('⇧F10 · Menu key').map((b) => b.key)).toEqual(['F10', 'Menu']);
    expect(row('⌫ / ⇧F10 / Esc').map((b) => b.key)).toEqual(['Delete', 'F10', 'Escape']);
    expect(row('⌘−')[0].key).toBe('-');
    expect(row('Space')[0].state).toBe('plain');
    expect(stateOf(['cmd', 'shift'])).toBe('shift+cmd');
  });
  it('every row on the Shortcuts page parses to chords on keys the map draws', () => {
    const drawn = new Set(['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', '`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Delete', 'Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Return', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Space', '←', '→', '↑', '↓', 'Menu']);
    const unknown = SHORTCUT_ROWS.filter((r) => r.shortcut).flatMap(parseShortcutRow).map((b) => b.key).filter((k) => !drawn.has(k));
    expect(unknown).toEqual([]);
  });
});

describe('the keyboard map overlay (2026-10-13)', () => {
  const rows = [
    { id: '1', action: 'Fade handles', shortcut: 'F · ⇧F' },
    { id: '2', action: 'Fade to the playhead', shortcut: '⌥F' },
    { id: '3', action: 'Trim to playhead', shortcut: '⌥[ / ⌥]' },
    { id: '4', action: 'Play', shortcut: 'Space' },
  ];
  it('lights the keys bound in the picked state, dots the others, lists a clicked key in every state, Escape closes and the focus returns', async () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { container } = render(
      <ThemeProvider>
        <KeyboardMap isOpen onClose={onClose} rows={rows} />
      </ThemeProvider>,
    );
    const key = (k: string) => container.querySelector<HTMLButtonElement>(`[data-key="${k}"]`)!;
    expect(key('F').className).toContain('keyboard-map__key--bound');
    expect(key('Space').className).toContain('keyboard-map__key--bound');
    expect(key('[').className).toContain('keyboard-map__key--other'); // bound with Option only
    expect(key('Q').disabled).toBe(true);
    // The Option state
    fireEvent.click(container.querySelector('[data-state="opt"]')!);
    expect(key('[').className).toContain('keyboard-map__key--bound');
    expect(key('Space').className).toContain('keyboard-map__key--other');
    // Click F: everything on it
    fireEvent.click(key('F'));
    const detail = container.querySelector('[data-keyboard-map-detail]')!;
    expect([...detail.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(['F', '⇧F', '⌥F']);
    // Holding Shift follows the keys you hold; releasing goes back to the picked state
    fireEvent.keyDown(document, { key: 'Shift', shiftKey: true });
    expect(container.querySelector('[data-state="shift"]')!.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyUp(document, { key: 'Shift', shiftKey: false });
    expect(container.querySelector('[data-state="opt"]')!.getAttribute('aria-pressed')).toBe('true');
    // Escape closes and the focus goes back
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(opener);
  });
});

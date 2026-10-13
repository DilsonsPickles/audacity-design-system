import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { KeyboardMap, parseShortcutRow, stateOf, contextOfOpener, liveContexts } from '../KeyboardMap';
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
  it('is a non-modal window: lights the keys bound in the picked state, dots the others, lists a clicked key in every state, Escape closes while in use and the focus returns', async () => {
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
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('false');
    expect(dialog.className).toContain('keyboard-map-window');
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
    // Escape closes — the window is non-modal, so only while it is the
    // one in use (its focus lands on the first tab a frame after open)
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(container.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(opener);
  });
});

describe('the context filter (2026-10-13, "controls filtered by context")', () => {
  const rows = [
    { id: '1', action: 'Play', shortcut: 'Space' },
    { id: '2', action: 'Fade handles', shortcut: 'F', contexts: ['clip' as const] },
    { id: '3', action: 'Delete', shortcut: '⌫', contexts: ['clip' as const, 'time' as const] },
    { id: '4', action: 'Fade handle: length', shortcut: '← →', contexts: ['fade-handle' as const] },
  ];
  it('shows only the chords that work in the picked context, counts them, and labels them in the detail', () => {
    const { container } = render(
      <ThemeProvider>
        <KeyboardMap isOpen onClose={vi.fn()} rows={rows} />
      </ThemeProvider>,
    );
    const lit = () => [...container.querySelectorAll('.keyboard-map__key--bound')].map((k) => k.getAttribute('data-key'));
    // Opens FOLLOWING the app: nothing focused, no range — everywhere only
    expect(container.querySelector('[data-context="follow"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(lit()).toEqual(['Space']);
    fireEvent.click(container.querySelector('[data-context="all"]')!);
    expect(lit().sort()).toEqual(['Delete', 'F', 'Space', '←', '→'].sort());
    fireEvent.click(container.querySelector('[data-context="time"]')!);
    expect(lit()).toEqual(['Delete']);
    expect(container.querySelector('[data-context="time"]')!.textContent).toContain('1');
    fireEvent.click(container.querySelector('[data-context="clip"]')!);
    expect(lit().sort()).toEqual(['Delete', 'F'].sort());
    // The clicked key's chords are listed BY CONTEXT, one section each
    fireEvent.click(container.querySelector('[data-key="Delete"]')!);
    const groups = [...container.querySelectorAll('[data-detail-context]')];
    expect(groups.map((g) => g.getAttribute('data-detail-context'))).toEqual(['clip', 'time']);
    expect(groups.map((g) => g.querySelector('.keyboard-map__ctx-title')?.textContent)).toEqual(['Clip focused', 'Time selected']);
    expect(groups.map((g) => [...g.querySelectorAll('kbd')].map((k) => k.textContent))).toEqual([['⌫'], ['⌫']]);
  });
  it('follows the app (2026-10-13, "cognisant of what I have selected"): the union of the contexts that apply now — the focus and the time selection, live; focus inside the window keeps them', async () => {
    const el = (html: string) => { const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d); return d.firstElementChild as HTMLElement; };
    expect(contextOfOpener(el('<div data-fade-handle="in"><button>x</button></div>').querySelector('button'), false)).toBe('fade-handle');
    expect(contextOfOpener(el('<button data-handle-kind="trim"></button>'), false)).toBe('edge-handle');
    expect(contextOfOpener(el('<div data-clip-id="1"><span></span></div>').querySelector('span'), true)).toBe('clip');
    expect(contextOfOpener(el('<button></button>'), true)).toBe('time');
    expect(contextOfOpener(null, false)).toBe('all');
    expect(liveContexts(el('<div data-clip-id="2" tabindex="0"></div>'), true)).toEqual(['global', 'clip', 'time']);
    // Live: a clip focused and a range when the map opens
    const clip = el('<div data-clip-id="9" tabindex="0"></div>');
    const other = el('<button>app</button>');
    clip.focus();
    const { container, rerender } = render(
      <ThemeProvider>
        <KeyboardMap isOpen onClose={vi.fn()} rows={rows} timeSelected />
      </ThemeProvider>,
    );
    const lit = () => [...container.querySelectorAll('.keyboard-map__key--bound')].map((k) => k.getAttribute('data-key')).sort();
    expect(container.querySelector('[data-context="follow"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(lit()).toEqual(['Delete', 'F', 'Space'].sort());
    expect(container.querySelector('[data-keyboard-map-sub]')!.textContent).toContain('Everywhere · Clip focused · Time selected');
    // Focus moving INTO the window keeps the app's contexts
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(container.contains(document.activeElement)).toBe(true);
    expect(lit()).toEqual(['Delete', 'F', 'Space'].sort());
    // Focus on something else in the app: the clip's chords go
    act(() => { other.focus(); });
    expect(lit()).toEqual(['Delete', 'Space'].sort());
    // The range cleared: only everywhere
    rerender(
      <ThemeProvider>
        <KeyboardMap isOpen onClose={vi.fn()} rows={rows} timeSelected={false} />
      </ThemeProvider>,
    );
    expect(lit()).toEqual(['Space']);
    // Back on the clip (Delete is a clip chord too)
    act(() => { clip.focus(); });
    expect(lit()).toEqual(['Delete', 'F', 'Space'].sort());
    // A picked tab stops following; "Where you are" resumes it
    fireEvent.click(container.querySelector('[data-context="time"]')!);
    expect(lit()).toEqual(['Delete']);
    fireEvent.click(container.querySelector('[data-context="follow"]')!);
    expect(lit()).toEqual(['Delete', 'F', 'Space'].sort());
  });
});

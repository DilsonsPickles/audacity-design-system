import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { CommandPalette, rankPaletteCommands, formatPaletteShortcut } from '../CommandPalette';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const COMMANDS = [
  { id: 'file:import', label: 'Import', shortcut: 'Ctrl+I', group: 'File' },
  { id: 'edit:go-to', label: 'Go to...', group: 'Edit' },
  { id: 'view:fit', label: 'Fit tracks to height', shortcut: 'Ctrl+Shift+F', group: 'View' },
  { id: 'clip:fades', label: 'Fades…', shortcut: 'Alt+Shift+F', group: 'Clip' },
];

describe('the command palette (2026-10-13)', () => {
  it('ranks: a label starting with the query, then a word starting with it, then any that contains it, then the group', () => {
    expect(rankPaletteCommands(COMMANDS, '').map((c) => c.id)).toEqual(COMMANDS.map((c) => c.id));
    expect(rankPaletteCommands(COMMANDS, 'f').map((c) => c.id)).toEqual(['view:fit', 'clip:fades', 'file:import']);
    expect(rankPaletteCommands(COMMANDS, 'height').map((c) => c.id)).toEqual(['view:fit']);
    expect(rankPaletteCommands(COMMANDS, 'go').map((c) => c.id)).toEqual(['edit:go-to']);
    expect(rankPaletteCommands(COMMANDS, 'zzz')).toEqual([]);
  });

  it('formats the menus\' chords in the OS\'s glyphs', () => {
    expect(formatPaletteShortcut('Ctrl+Shift+F', 'macos')).toBe('⌘⇧F');
    expect(formatPaletteShortcut('Alt+Shift+F', 'macos')).toBe('⌥⇧F');
    expect(formatPaletteShortcut('Ctrl+Alt+I', 'macos')).toBe('⌥⌘I');
    expect(formatPaletteShortcut('Ctrl+,', 'macos')).toBe('⌘,');
    expect(formatPaletteShortcut('Ctrl+Shift+F', 'windows')).toBe('Ctrl+Shift+F');
  });

  it('opens on the search field, filters as you type, ↑ ↓ move the highlight, Enter runs after closing and restoring focus, Escape leaves', async () => {
    const onRun = vi.fn();
    const onClose = vi.fn();
    const opener = document.createElement('button');
    opener.setAttribute('data-testid', 'opener');
    document.body.appendChild(opener);
    opener.focus();
    const { container } = render(
      <ThemeProvider>
        <CommandPalette isOpen commands={COMMANDS} onRun={onRun} onClose={onClose} />
      </ThemeProvider>,
    );
    const input = container.querySelector<HTMLInputElement>('.command-palette__input')!;
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(input);
    const rows = () => [...container.querySelectorAll('[role="option"]')].map((r) => r.getAttribute('data-command-id'));
    const active = () => container.querySelector('[role="option"][aria-selected="true"]')?.getAttribute('data-command-id');
    expect(rows().length).toBe(4);
    fireEvent.change(input, { target: { value: 'f' } });
    expect(rows()).toEqual(['view:fit', 'clip:fades', 'file:import']);
    expect(active()).toBe('view:fit');
    expect(container.querySelector('.command-palette__shortcut')?.textContent).toBe('⌘⇧F');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(active()).toBe('clip:fades');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(active()).toBe('file:import'); // wraps
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRun).not.toHaveBeenCalled(); // not yet: after the frame
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(opener);
    expect(onRun).toHaveBeenCalledWith('file:import');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('a click on a row runs it; no match says so', () => {
    const onRun = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <CommandPalette isOpen commands={COMMANDS} onRun={onRun} onClose={vi.fn()} />
      </ThemeProvider>,
    );
    fireEvent.click(container.querySelector('[data-command-id="edit:go-to"]')!);
    return act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); }).then(() => {
      expect(onRun).toHaveBeenCalledWith('edit:go-to');
      const input = container.querySelector<HTMLInputElement>('.command-palette__input')!;
      fireEvent.change(input, { target: { value: 'nothing like this' } });
      expect(container.querySelector('.command-palette__empty')?.textContent).toBe('No matching command');
    });
  });
});

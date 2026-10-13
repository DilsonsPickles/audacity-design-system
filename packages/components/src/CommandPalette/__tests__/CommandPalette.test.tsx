import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { CommandPalette, rankPaletteCommands, formatPaletteShortcut, paletteMatchRange } from '../CommandPalette';
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
    const input = container.querySelector<HTMLInputElement>('.search-field__input')!;
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

  it('a click on a row runs it; no match says so', async () => {
    const onRun = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <CommandPalette isOpen commands={COMMANDS} onRun={onRun} onClose={vi.fn()} />
      </ThemeProvider>,
    );
    fireEvent.click(container.querySelector('[data-command-id="edit:go-to"]')!);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(onRun).toHaveBeenCalledWith('edit:go-to');
    const input = container.querySelector<HTMLInputElement>('.search-field__input')!;
    fireEvent.change(input, { target: { value: 'nothing like this' } });
    expect(container.querySelector('.command-palette__empty')?.textContent).toBe('No matching command');
  });
});

describe('an empty query shows the host\'s short list (2026-10-13)', () => {
  it('lists the suggested ids in order, skipping unknown ones, and the whole catalogue only once you type', () => {
    const { container } = render(
      <ThemeProvider>
        <CommandPalette isOpen commands={COMMANDS} suggestedIds={['clip:fades', 'nope', 'edit:go-to']} onRun={vi.fn()} onClose={vi.fn()} />
      </ThemeProvider>,
    );
    const rows = () => [...container.querySelectorAll('[role="option"]')].map((r) => r.getAttribute('data-command-id'));
    const input = container.querySelector<HTMLInputElement>('.search-field__input')!;
    expect(rows()).toEqual(['clip:fades', 'edit:go-to']);
    fireEvent.change(input, { target: { value: 'imp' } });
    expect(rows()).toEqual(['file:import']);
    fireEvent.change(input, { target: { value: '' } });
    expect(rows()).toEqual(['clip:fades', 'edit:go-to']);
  });
});

describe('fuzzy matching and the highlight (2026-10-13, the Figma "Command Palette Fuzzy" frame)', () => {
  const cmds = [
    { id: 'split', label: 'Split', shortcut: 'Ctrl+I' },
    { id: 'split-tool', label: 'Split tool', shortcut: 'C' },
    { id: 'silences', label: 'Remove silences' },
    { id: 'zoom-in', label: 'Zoom in' },
  ];
  it('a query one slip away finds the word — after every exact tier — and short queries never fuzz', () => {
    expect(rankPaletteCommands(cmds, 'spilt').map((c) => c.id)).toEqual(['split', 'split-tool']);
    expect(rankPaletteCommands(cmds, 'zomo').map((c) => c.id)).toEqual(['zoom-in']);
    expect(rankPaletteCommands(cmds, 'spl').map((c) => c.id)).toEqual(['split', 'split-tool']); // exact prefix, no fuzz needed
    expect(rankPaletteCommands(cmds, 'zim').map((c) => c.id)).toEqual([]); // under four characters: no slip allowed
    expect(rankPaletteCommands(cmds, 'xxxxx')).toEqual([]);
  });
  it('the range to highlight: the substring, or the fuzzy word', () => {
    expect(paletteMatchRange('Zoom in', 'zoom')).toEqual([0, 4]);
    expect(paletteMatchRange('Remove silences', 'sil')).toEqual([7, 10]);
    expect(paletteMatchRange('Split tool', 'spilt')).toEqual([0, 5]);
    expect(paletteMatchRange('Split tool', '')).toBeNull();
  });
  it('the row wraps the match in a mark', () => {
    const { container } = render(
      <ThemeProvider>
        <CommandPalette isOpen commands={cmds} onRun={vi.fn()} onClose={vi.fn()} />
      </ThemeProvider>,
    );
    const input = container.querySelector<HTMLInputElement>('.search-field__input')!;
    fireEvent.change(input, { target: { value: 'spilt' } });
    const marks = [...container.querySelectorAll('[role="option"] mark')].map((m) => m.textContent);
    expect(marks).toEqual(['Split', 'Split']);
    // The field is the design system's, with its clear button
    expect(container.querySelector('.command-palette__field .search-field--large')).not.toBeNull();
    expect(container.querySelector('.search-field__clear')).not.toBeNull();
  });
});

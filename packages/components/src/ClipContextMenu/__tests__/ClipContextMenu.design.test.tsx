import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { ClipContextMenu } from '../ClipContextMenu';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const labelsOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.context-menu > .context-menu-item .context-menu-item-label')).map((el) => el.textContent);

describe('ClipContextMenu › the Figma "Context menu/Clip" frame (43 - Fades, 2026-10-14)', () => {
  it('lists the design\'s rows in its order, with its chords in the OS\'s glyphs, and nothing the design dropped', () => {
    const { container, queryByText } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={() => {}} os="macos" />
      </ThemeProvider>,
    );
    expect(labelsOf(container)).toEqual([
      'Rename clip', 'Clip color',
      'Cut', 'Copy', 'Duplicate', 'Delete',
      'Cut and…', 'Delete and…',
      'Edit fades',
      'Split', 'Split at silences',
      'Stretch with tempo changes', 'Open pitch and speed dialog', 'Reset pitch and speed', 'Render pitch and speed',
    ]);
    const chords = Array.from(container.querySelectorAll('.context-menu-item-shortcut')).map((el) => el.textContent);
    expect(chords).toEqual(['⌘F2', '⌘X', '⌘C', '⌘D', '⌥⇧F', '⌘I', '⌥⌘I', '⌘⇧P']);
    // Six groups, five dividers
    expect(container.querySelectorAll('.clip-context-menu-divider')).toHaveLength(5);
    for (const gone of ['Clip properties…', 'Fade-in', 'Fade-out', 'Fade in…', 'Group clips', 'Ungroup clips', 'Spectral editing', 'Export clip', 'Delete clip']) {
      expect(queryByText(gone), gone).toBeNull();
    }
    // Cut, Copy and Delete carry the design's glyphs in the leading slot
    const iconed = Array.from(container.querySelectorAll('.context-menu-item-icon')).map((el) => el.closest('.context-menu-item')?.querySelector('.context-menu-item-label')?.textContent);
    expect(iconed).toEqual(['Cut', 'Copy', 'Delete']);
  });

  it('writes the chords as typed on Windows', () => {
    const { container } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={() => {}} os="windows" />
      </ThemeProvider>,
    );
    const chords = Array.from(container.querySelectorAll('.context-menu-item-shortcut')).map((el) => el.textContent);
    expect(chords[0]).toBe('Ctrl+F2');
    expect(chords[4]).toBe('Alt+Shift+F');
  });

  it('Cut and… / Delete and… hold the real build\'s three forms and report the one picked, then close', () => {
    const onCutAnd = vi.fn();
    const onDeleteAnd = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={onClose} onCutAnd={onCutAnd} onDeleteAnd={onDeleteAnd} />
      </ThemeProvider>,
    );
    fireEvent.mouseEnter(getByText('Cut and…'));
    expect(getByText('Cut and leave gap')).toBeTruthy();
    expect(getByText('Cut and close gap on all tracks')).toBeTruthy();
    fireEvent.click(getByText('Cut and close gap on this track'));
    expect(onCutAnd).toHaveBeenCalledWith('close-gap-track');
    expect(onClose).toHaveBeenCalled();

    fireEvent.mouseEnter(getByText('Delete and…'));
    fireEvent.click(getByText('Delete and close gap on all tracks'));
    expect(onDeleteAnd).toHaveBeenCalledWith('close-gap-all');
  });

  it('Edit fades runs the host\'s opener and closes', () => {
    const onEditFades = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={onClose} onEditFades={onEditFades} />
      </ThemeProvider>,
    );
    fireEvent.click(getByText('Edit fades'));
    expect(onEditFades).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('Reset and Render pitch and speed are dimmed until the clip\'s pitch or speed is off its default', () => {
    const onReset = vi.fn();
    const dimmed = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={() => {}} onResetPitchSpeed={onReset} />
      </ThemeProvider>,
    );
    const item = (q: ReturnType<typeof render>, label: string) => q.getByText(label).closest('.context-menu-item') as HTMLElement;
    expect(item(dimmed, 'Reset pitch and speed').getAttribute('aria-disabled')).toBe('true');
    expect(item(dimmed, 'Render pitch and speed').getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(dimmed.getByText('Reset pitch and speed'));
    expect(onReset).not.toHaveBeenCalled();
    cleanup();

    const live = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={() => {}} onResetPitchSpeed={onReset} pitchSpeedModified />
      </ThemeProvider>,
    );
    expect(item(live, 'Reset pitch and speed').getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(live.getByText('Reset pitch and speed'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('Stretch with tempo changes wears the check in the leading slot when on, an empty slot when off', () => {
    const on = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={() => {}} stretchWithTempo />
      </ThemeProvider>,
    );
    const slot = (q: ReturnType<typeof render>) => q.getByText('Stretch with tempo changes').closest('.context-menu-item')!.querySelector('.context-menu-item-checkmark') as HTMLElement;
    expect(slot(on).childElementCount).toBe(1);
    cleanup();
    const off = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={() => {}} />
      </ThemeProvider>,
    );
    expect(slot(off).childElementCount).toBe(0);
  });

  it('the colour submenu is the clip palette plus "Track color", reported by id (2026-10-02)', () => {
    const onColorChange = vi.fn();
    const { getByText } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={() => {}} onColorChange={onColorChange} />
      </ThemeProvider>,
    );
    fireEvent.mouseEnter(getByText('Clip color'));
    for (const label of ['Track color', 'Cyan', 'Blue', 'Violet', 'Magenta', 'Red', 'Orange', 'Yellow', 'Green', 'Teal']) {
      expect(getByText(label), label).toBeTruthy();
    }
    fireEvent.click(getByText('Red'));
    expect(onColorChange).toHaveBeenCalledWith('red');
  });
});

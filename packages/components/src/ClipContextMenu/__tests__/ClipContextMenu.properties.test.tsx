import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { ClipContextMenu } from '../ClipContextMenu';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('ClipContextMenu › Clip properties… (2026-10-02)', () => {
  it('shows the item first under the heading when wired, runs it and closes; hides it when not', () => {
    const onOpenProperties = vi.fn();
    const onClose = vi.fn();
    const { getByText, container } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={onClose} onOpenProperties={onOpenProperties} />
      </ThemeProvider>,
    );
    const item = getByText('Clip properties…');
    const heading = container.querySelector('.clip-context-menu-header')!;
    expect(heading.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getByText('Rename clip').compareDocumentPosition(item) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    fireEvent.click(item);
    expect(onOpenProperties).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
    cleanup();

    const { queryByText } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={vi.fn()} />
      </ThemeProvider>,
    );
    expect(queryByText('Clip properties…')).toBeNull();
  });

  it('the colour submenu is the clip palette plus "Track color", reported by id (2026-10-02)', () => {
    const onColorChange = vi.fn();
    const { getByText, queryByText } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={vi.fn()} onColorChange={onColorChange} />
      </ThemeProvider>,
    );
    fireEvent.mouseEnter(getByText('Clip color')); // open the submenu
    for (const label of ['Cyan', 'Blue', 'Violet', 'Magenta', 'Red', 'Orange', 'Yellow', 'Green', 'Teal', 'Track color']) {
      expect(getByText(label), label).toBeTruthy();
    }
    expect(queryByText('Purple')).toBeNull(); // the old list's colours no clip can wear
    fireEvent.click(getByText('Red'));
    expect(onColorChange).toHaveBeenLastCalledWith('red');
    fireEvent.click(getByText('Track color'));
    expect(onColorChange).toHaveBeenLastCalledWith('track');
  });
});

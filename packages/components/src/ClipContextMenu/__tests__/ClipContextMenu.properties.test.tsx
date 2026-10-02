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
});

import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../../ContextMenuItem/ContextMenuItem';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

// 2026-11-16, "the right click menus are getting stuck" (the desktop app)
describe('ContextMenu closes on a press outside', () => {
  const tick = () => act(() => new Promise((r) => setTimeout(r, 5)));

  it('even when the press is stopped on its way up', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <div data-testid="ruler" onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} />
        <ContextMenu isOpen x={10} y={10} onClose={onClose}>
          <ContextMenuItem label="One" />
        </ContextMenu>
      </ThemeProvider>,
    );
    await tick();
    fireEvent.mouseDown(container.querySelector('[data-testid="ruler"]') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('even when the host re-renders it faster than its arming timer, with a new onClose each time', async () => {
    const closes: number[] = [];
    const Host = ({ n }: { n: number }) => (
      <ThemeProvider>
        <div data-testid="outside" />
        <ContextMenu isOpen x={10} y={10} onClose={() => closes.push(n)}>
          <ContextMenuItem label="One" />
        </ContextMenu>
      </ThemeProvider>
    );
    const { container, rerender } = render(<Host n={0} />);
    // a re-render before the timer fires used to clear it and start again
    rerender(<Host n={1} />);
    await tick();
    rerender(<Host n={2} />);
    fireEvent.mouseDown(container.querySelector('[data-testid="outside"]') as HTMLElement);
    // the latest onClose, once
    expect(closes).toEqual([2]);
  });

  it('a press inside the menu does not close it', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <ContextMenu isOpen x={10} y={10} onClose={onClose}>
          <ContextMenuItem label="One" />
        </ContextMenu>
      </ThemeProvider>,
    );
    await tick();
    fireEvent.mouseDown(container.querySelector('.context-menu') as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });
});

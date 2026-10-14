import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import React from 'react';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../../ContextMenuItem/ContextMenuItem';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

// jsdom lays nothing out: give every element a 200×500 layout box and
// the window a 1000×600 viewport
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 200 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 500 });
  vi.stubGlobal('innerWidth', 1000);
  vi.stubGlobal('innerHeight', 600);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const menuEl = (container: HTMLElement) => container.querySelector('.context-menu') as HTMLElement;

describe('ContextMenu stays on screen (2026-10-14, "context menu is being cut off")', () => {
  it('a menu opened near the bottom is moved up to 10px from the edge, and STAYS there across re-renders', () => {
    const { container, rerender } = render(
      <ThemeProvider>
        <ContextMenu isOpen x={100} y={400} onClose={() => {}}>
          <ContextMenuItem label="One" />
        </ContextMenu>
      </ThemeProvider>,
    );
    // 600 − 500 − 10
    expect(menuEl(container).style.top).toBe('90px');
    expect(menuEl(container).style.left).toBe('100px');
    // A host re-render with new children must not put it back at y
    rerender(
      <ThemeProvider>
        <ContextMenu isOpen x={100} y={400} onClose={() => {}}>
          <ContextMenuItem label="One" />
          <ContextMenuItem label="Two" />
        </ContextMenu>
      </ThemeProvider>,
    );
    expect(menuEl(container).style.top).toBe('90px');
  });

  it('a menu opened past the right edge is moved left; one that fits is left where it was asked', () => {
    const { container } = render(
      <ThemeProvider>
        <ContextMenu isOpen x={900} y={20} onClose={() => {}}>
          <ContextMenuItem label="One" />
        </ContextMenu>
      </ThemeProvider>,
    );
    // 1000 − 200 − 10
    expect(menuEl(container).style.left).toBe('790px');
    expect(menuEl(container).style.top).toBe('20px');
    cleanup();
    const fits = render(
      <ThemeProvider>
        <ContextMenu isOpen x={50} y={40} onClose={() => {}}>
          <ContextMenuItem label="One" />
        </ContextMenu>
      </ThemeProvider>,
    );
    expect(menuEl(fits.container).style.left).toBe('50px');
    expect(menuEl(fits.container).style.top).toBe('40px');
  });
});

import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../../ContextMenuItem/ContextMenuItem';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('ContextMenu — a SCROLLING STRETCH (2026-11-18, "the add tool context menu needs to be shorter and scroll")', () => {
  it('the arrow keys walk the items inside a [data-menu-scroll] wrapper as well as the direct ones', async () => {
    render(
      <ThemeProvider>
        <ContextMenu isOpen x={10} y={10} onClose={() => {}}>
          <ContextMenuItem label="Top" />
          <div data-menu-scroll style={{ maxHeight: 60, overflowY: 'auto' }}>
            <ContextMenuItem label="Inner one" />
            <ContextMenuItem label="Inner two" />
          </div>
        </ContextMenu>
      </ThemeProvider>,
    );
    const label = () => (document.activeElement as HTMLElement | null)?.querySelector('.context-menu-item-label')?.textContent;
    const top = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((e) => e.textContent?.includes('Top'))!;
    act(() => { top.focus(); });
    expect(label()).toBe('Top');
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(label()).toBe('Inner one');
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(label()).toBe('Inner two');
  });
});

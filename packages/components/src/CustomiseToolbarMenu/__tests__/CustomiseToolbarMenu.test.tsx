import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { CustomiseToolbarMenu, CUSTOMISE_TOOLBAR_ENTRIES, CUSTOMISE_TOOLBAR_TOOL_IDS } from '../CustomiseToolbarMenu';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('CustomiseToolbarMenu — the cog\'s popover (2026-10-07)', () => {
  it('lists every tool of the design in its groups, eyes open unless hidden; a press toggles the tool', () => {
    const onToggleTool = vi.fn();
    render(
      <ThemeProvider>
        <CustomiseToolbarMenu isOpen onClose={vi.fn()} anchor={{ left: 900, right: 928, bottom: 100 }} hiddenTools={['zoom-in']} onToggleTool={onToggleTool} />
      </ThemeProvider>,
    );
    const menu = document.body.querySelector('[data-customise-toolbar]') as HTMLElement;
    expect(menu.querySelector('.customise-toolbar__header')?.textContent).toBe('Customise toolbar');
    const rows = [...menu.querySelectorAll('[role="menuitemcheckbox"]')];
    expect(rows.map((r) => r.getAttribute('data-customise-tool'))).toEqual([...CUSTOMISE_TOOLBAR_TOOL_IDS]);
    expect(rows[0].textContent).toContain('Play');
    expect(rows[0].getAttribute('aria-checked')).toBe('true');
    const zoomIn = menu.querySelector('[data-customise-tool="zoom-in"]') as HTMLElement;
    expect(zoomIn.getAttribute('aria-checked')).toBe('false');
    expect(zoomIn.querySelector('.customise-toolbar__eye')?.textContent).toBe(''); // shut
    expect(rows[0].querySelector('.customise-toolbar__eye')?.textContent).toBe(''); // open
    // The design's dividers, between the groups
    const dividers = CUSTOMISE_TOOLBAR_ENTRIES.filter((e) => e.kind === 'divider').length;
    expect(menu.querySelectorAll('.customise-toolbar__divider')).toHaveLength(dividers);
    fireEvent.click(zoomIn);
    expect(onToggleTool).toHaveBeenCalledWith('zoom-in');
    // The design's own triangle, up at the cog
    expect(document.body.querySelector('.customise-toolbar__triangle')).toBeTruthy();
  });

  it('Escape closes it, and so does a press outside', async () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      render(
        <ThemeProvider>
          <CustomiseToolbarMenu isOpen onClose={onClose} anchor={{ left: 900, right: 928, bottom: 100 }} hiddenTools={[]} onToggleTool={vi.fn()} />
        </ThemeProvider>,
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1); // the outside-click listener arms after a tick
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('closed, nothing is rendered', () => {
    render(
      <ThemeProvider>
        <CustomiseToolbarMenu isOpen={false} onClose={vi.fn()} anchor={null} hiddenTools={[]} onToggleTool={vi.fn()} />
      </ThemeProvider>,
    );
    expect(document.body.querySelector('[data-customise-toolbar]')).toBeNull();
  });
});

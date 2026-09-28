import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { PanelHeader, type PanelHeaderTab } from '../PanelHeader';

afterEach(cleanup);

const TABS: PanelHeaderTab[] = [
  { id: 'effects', label: 'Effects' },
  { id: 'macros', label: 'Macro manager' },
];

function renderHeader(props: Partial<React.ComponentProps<typeof PanelHeader>> = {}) {
  const utils = render(
    <ThemeProvider>
      <PanelHeader tabs={TABS} activeTabId="macros" {...props} />
    </ThemeProvider>,
  );
  const tab = (id: string) => utils.container.querySelector<HTMLElement>(`[data-tab-id="${id}"]`)!;
  return { ...utils, tab };
}

describe('PanelHeader — the tab menu from the keyboard', () => {
  it('Shift+F10 and the Menu key open the active tab\'s menu, anchored to its button', () => {
    for (const init of [{ key: 'F10', shiftKey: true }, { key: 'ContextMenu' }]) {
      // The host positions the menu from the event's button. Read it
      // DURING the call: React clears currentTarget once it returns.
      let anchor: string | null = null;
      const onMenuClick = vi.fn((e: React.MouseEvent<HTMLButtonElement>) => {
        anchor = e.currentTarget.getAttribute('aria-label');
      });
      const { tab } = renderHeader({ onMenuClick });
      const notPrevented = fireEvent.keyDown(tab('macros'), init);
      expect(notPrevented).toBe(false);
      expect(onMenuClick).toHaveBeenCalledTimes(1);
      expect(anchor).toBe('Macro manager menu');
      cleanup();
    }
  });

  it('the menu key is kept from the app', () => {
    const { tab } = renderHeader({ onMenuClick: vi.fn() });
    const seen: string[] = [];
    const listener = (e: KeyboardEvent) => seen.push(e.key);
    document.addEventListener('keydown', listener);
    fireEvent.keyDown(tab('macros'), { key: 'F10', shiftKey: true });
    document.removeEventListener('keydown', listener);
    expect(seen).toEqual([]);
  });

  it('an inactive tab has no menu to open', () => {
    const onMenuClick = vi.fn();
    const { tab } = renderHeader({ onMenuClick });
    expect(fireEvent.keyDown(tab('effects'), { key: 'F10', shiftKey: true })).toBe(true);
    expect(onMenuClick).not.toHaveBeenCalled();
  });

  it('a tab that declares no menu has none', () => {
    const onMenuClick = vi.fn();
    const { tab } = renderHeader({
      onMenuClick,
      tabs: [{ id: 'macros', label: 'Macro manager', hasMenu: false }],
    });
    fireEvent.keyDown(tab('macros'), { key: 'ContextMenu' });
    expect(onMenuClick).not.toHaveBeenCalled();
  });

  it('plain F10 is not the menu key', () => {
    const onMenuClick = vi.fn();
    const { tab } = renderHeader({ onMenuClick });
    fireEvent.keyDown(tab('macros'), { key: 'F10' });
    expect(onMenuClick).not.toHaveBeenCalled();
  });

  it('says so to assistive tech: only the tab with a menu announces one', () => {
    const { tab } = renderHeader();
    expect(tab('macros').getAttribute('aria-haspopup')).toBe('menu');
    expect(tab('effects').hasAttribute('aria-haspopup')).toBe(false);
  });

  it('Enter still switches tab', () => {
    const onTabChange = vi.fn();
    const { tab } = renderHeader({ onTabChange });
    fireEvent.keyDown(tab('effects'), { key: 'Enter' });
    expect(onTabChange).toHaveBeenCalledWith('effects');
  });
});

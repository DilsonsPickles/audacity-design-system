import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { AU4_TAB_GROUPS_PROFILE } from '@audacity-ui/core';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
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

describe('PanelHeader — the strip as a tab group', () => {
  beforeEach(() => {
    try { localStorage.removeItem('audacity-accessibility-profile'); } catch { /* no storage */ }
  });

  const THREE: PanelHeaderTab[] = [
    { id: 'effects', label: 'Effects' },
    { id: 'macros', label: 'Macro manager' },
    { id: 'mixer', label: 'Mixer' },
  ];
  const ORDER = AU4_TAB_GROUPS_PROFILE.config.tabOrder!;

  function renderStrip(
    props: Partial<React.ComponentProps<typeof PanelHeader>> = {},
    profile: 'au4-tab-groups' | 'wcag-flat' = 'au4-tab-groups',
  ) {
    const utils = render(
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId={profile}>
          <PanelHeader tabs={THREE} activeTabId="macros" tabGroupId="dock-tabs-end" {...props} />
        </AccessibilityProfileProvider>
      </ThemeProvider>,
    );
    const tab = (id: string) => utils.container.querySelector<HTMLElement>(`[data-tab-id="${id}"]`)!;
    const indices = () => THREE.map((t) => tab(t.id).tabIndex);
    const focused = () => document.activeElement as HTMLElement;
    return { ...utils, tab, indices, focused };
  }

  it('is ONE tab stop — the active tab — at the group\'s place in the order', () => {
    const { indices } = renderStrip();
    expect(indices()).toEqual([-1, ORDER['dock-tabs-end'], -1]);
  });

  it('a dock\'s tabs come before what the dock holds, on both sides', () => {
    expect(ORDER['dock-tabs-start']).toBeLessThan(ORDER['effects-panel']);
    expect(ORDER['dock-tabs-start']).toBeLessThan(ORDER['macros-panel-actions']);
    expect(ORDER['macros-panel-actions']).toBeLessThan(ORDER['macros-panel']);
    expect(ORDER['macros-panel']).toBeLessThan(ORDER['add-track']);

    expect(ORDER['dock-tabs-end']).toBeGreaterThan(ORDER.tracks);
    expect(ORDER['dock-tabs-end']).toBeLessThan(ORDER['macros-panel-actions-end']);
    expect(ORDER['macros-panel-actions-end']).toBeLessThan(ORDER['macros-panel-end']);
    expect(ORDER['macros-panel-end']).toBeLessThan(ORDER['selection-toolbar']);
  });

  it('arrows move focus along the strip, wrapping, without switching tab', () => {
    const onTabChange = vi.fn();
    const { tab, focused, indices } = renderStrip({ onTabChange });
    act(() => { tab('macros').focus(); });
    fireEvent.keyDown(focused(), { key: 'ArrowRight' });
    expect(focused()).toBe(tab('mixer'));
    expect(indices()).toEqual([-1, -1, ORDER['dock-tabs-end']]);
    fireEvent.keyDown(focused(), { key: 'ArrowRight' });
    expect(focused()).toBe(tab('effects'));
    fireEvent.keyDown(focused(), { key: 'ArrowLeft' });
    expect(focused()).toBe(tab('mixer'));
    fireEvent.keyDown(focused(), { key: 'Home' });
    expect(focused()).toBe(tab('effects'));
    fireEvent.keyDown(focused(), { key: 'End' });
    expect(focused()).toBe(tab('mixer'));
    expect(onTabChange).not.toHaveBeenCalled();
    fireEvent.keyDown(focused(), { key: 'Enter' });
    expect(onTabChange).toHaveBeenCalledWith('mixer');
  });

  it('keeps the arrows from the app', () => {
    const { tab, focused } = renderStrip();
    const seen: string[] = [];
    const listener = (e: KeyboardEvent) => seen.push(e.key);
    document.addEventListener('keydown', listener);
    act(() => { tab('macros').focus(); });
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      expect(fireEvent.keyDown(focused(), { key }), key).toBe(false);
    }
    document.removeEventListener('keydown', listener);
    expect(seen).toEqual([]);
  });

  it('leaving the strip hands the stop back to the active tab', () => {
    const { tab, focused, indices } = renderStrip();
    act(() => { tab('macros').focus(); });
    fireEvent.keyDown(focused(), { key: 'ArrowRight' });
    act(() => { focused().blur(); });
    expect(indices()).toEqual([-1, ORDER['dock-tabs-end'], -1]);
  });

  it('a lone tab holds its place: the arrows have nowhere to go', () => {
    const { tab, focused } = renderStrip({ tabs: [{ id: 'macros', label: 'Macro manager' }] });
    act(() => { tab('macros').focus(); });
    expect(fireEvent.keyDown(focused(), { key: 'ArrowRight' })).toBe(false);
    expect(focused()).toBe(tab('macros'));
  });

  it('flat profile: every tab is a stop and the arrows are left alone', () => {
    const { tab, focused, indices } = renderStrip({}, 'wcag-flat');
    expect(indices()).toEqual([0, 0, 0]);
    act(() => { tab('macros').focus(); });
    expect(fireEvent.keyDown(focused(), { key: 'ArrowRight' })).toBe(true);
    expect(focused()).toBe(tab('macros'));
  });

  it('without a group id nothing changes: every tab is tabindex 0', () => {
    const { container } = render(
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <PanelHeader tabs={THREE} activeTabId="macros" />
        </AccessibilityProfileProvider>
      </ThemeProvider>,
    );
    const all = [...container.querySelectorAll<HTMLElement>('[role="tab"]')].map((t) => t.tabIndex);
    expect(all).toEqual([0, 0, 0]);
  });
});

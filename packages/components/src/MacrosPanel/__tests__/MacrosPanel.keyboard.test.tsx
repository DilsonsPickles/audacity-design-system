import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { AU4_TAB_GROUPS_PROFILE } from '@audacity-ui/core';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { MacrosPanel } from '../MacrosPanel';
import type { Macro } from '../../MacroManager/macroTypes';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  // The provider reads a stored profile first
  try { localStorage.removeItem('audacity-accessibility-profile'); } catch { /* no storage */ }
});

const MACROS: Macro[] = [
  { id: 'm1', name: 'Fade ends', steps: [] },
  { id: 'm2', name: 'MP3 conversion', steps: [] },
  { id: 'm3', name: 'Trim silence', steps: [] },
];

const LIST_TAB = AU4_TAB_GROUPS_PROFILE.config.tabOrder!['macros-panel'];
const ACTIONS_TAB = AU4_TAB_GROUPS_PROFILE.config.tabOrder!['macros-panel-actions'];

type PanelProps = Partial<React.ComponentProps<typeof MacrosPanel>>;

function renderPanel(props: PanelProps = {}, profile: 'au4-tab-groups' | 'wcag-flat' = 'au4-tab-groups') {
  const ui = (p: PanelProps) => (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId={profile}>
        <MacrosPanel macros={MACROS} {...p} />
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
  const utils = render(ui(props));
  const row = (id: string) => utils.container.querySelector<HTMLElement>(`[data-macro-id="${id}"]`)!;
  const cell = (id: string, which: 'name' | 'run' | 'menu') =>
    row(id).querySelector<HTMLElement>(
      which === 'name' ? '.macros-panel__row-name' : which === 'run' ? '.macros-panel__run' : '.macros-panel__menu',
    )!;
  const focused = () => utils.container.ownerDocument.activeElement as HTMLElement;
  const focus = (el: HTMLElement) => act(() => { el.focus(); });
  const press = (key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(focused(), { key, ...init });
  const tabStops = () =>
    [...utils.container.querySelectorAll<HTMLElement>('.macros-panel__list button')].filter((b) => b.tabIndex >= 0);
  const menuLabels = () =>
    [...utils.container.querySelectorAll('[role="menuitem"]')].map((i) => (i.textContent ?? '').trim());
  return { ...utils, rerenderWith: (p: PanelProps) => utils.rerender(ui(p)), row, cell, focused, focus, press, tabStops, menuLabels };
}

describe('MacrosPanel keyboard — structure', () => {
  it('a row is a labelled group of three real buttons, never a button holding buttons', () => {
    const { row, cell, container } = renderPanel();
    expect(row('m1').getAttribute('role')).toBe('group');
    expect(row('m1').getAttribute('aria-label')).toBe('Fade ends');
    expect(row('m1').hasAttribute('tabindex')).toBe(false);
    expect(container.querySelector('[role="button"] button')).toBeNull();
    expect(cell('m1', 'name').tagName).toBe('BUTTON');
    expect(cell('m1', 'name').getAttribute('aria-label')).toBe('Edit Fade ends');
    expect(cell('m1', 'run').getAttribute('aria-label')).toBe('Run Fade ends on current project');
    expect(cell('m1', 'menu').getAttribute('aria-label')).toBe('Fade ends options');
  });

  it('the list is a group named by the panel\'s own heading', () => {
    const { container } = renderPanel();
    const list = container.querySelector('.macros-panel__list')!;
    expect(list.getAttribute('role')).toBe('group');
    const title = container.querySelector(`#${list.getAttribute('aria-labelledby')}`);
    expect(title?.textContent).toBe('Macros');
  });
});

describe('MacrosPanel keyboard — Tab stops (tab-groups profile)', () => {
  it('the whole list is ONE tab stop, however many macros there are', () => {
    const { tabStops, cell } = renderPanel();
    expect(tabStops()).toEqual([cell('m1', 'name')]);
    expect(cell('m1', 'name').tabIndex).toBe(LIST_TAB);
    expect(cell('m2', 'name').tabIndex).toBe(-1);
    expect(cell('m1', 'run').tabIndex).toBe(-1);
  });

  it('the header actions are one tab stop, before the list', () => {
    const { container } = renderPanel();
    const buttons = [...container.querySelectorAll<HTMLElement>('.macros-panel__header-actions button')];
    expect(buttons.map((b) => b.tabIndex)).toEqual([ACTIONS_TAB, -1]);
    expect(ACTIONS_TAB).toBeLessThan(LIST_TAB);
    expect(container.querySelector('.macros-panel__header-actions')!.getAttribute('role')).toBe('toolbar');
  });

  it('docked at the end, both groups move after the tracks in the tab order', () => {
    const { container, cell } = renderPanel({ placement: 'end' });
    const order = AU4_TAB_GROUPS_PROFILE.config.tabOrder!;
    expect(cell('m1', 'name').tabIndex).toBe(order['macros-panel-end']);
    expect(container.querySelector<HTMLElement>('.macros-panel__header-actions button')!.tabIndex)
      .toBe(order['macros-panel-actions-end']);
    expect(order['macros-panel-actions-end']).toBeGreaterThan(order.tracks);
    expect(order['macros-panel-end']).toBeLessThan(order['selection-toolbar']);
  });

  it('the tab stop follows focus and is remembered when focus leaves', () => {
    const { focus, press, cell, tabStops } = renderPanel();
    focus(cell('m1', 'name'));
    for (let i = 0; i < 4; i++) press('ArrowDown');
    expect(tabStops()).toEqual([cell('m2', 'run')]);
    act(() => { (document.activeElement as HTMLElement).blur(); });
    expect(tabStops()).toEqual([cell('m2', 'run')]);
  });

  it('clicking a cell makes it the tab stop', () => {
    const { focus, cell, tabStops } = renderPanel();
    focus(cell('m3', 'menu'));
    expect(tabStops()).toEqual([cell('m3', 'menu')]);
  });

  it('when the remembered macro is deleted the stop falls back to a row that exists', () => {
    const { focus, cell, tabStops, rerenderWith } = renderPanel();
    focus(cell('m3', 'name'));
    act(() => { (document.activeElement as HTMLElement).blur(); });
    rerenderWith({ macros: MACROS.slice(0, 2) });
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0]).toBe(cell('m1', 'name'));
  });
});

describe('MacrosPanel keyboard — moving around the list', () => {
  const where = (el: HTMLElement) => {
    const id = el.closest<HTMLElement>('[data-macro-id]')!.dataset.macroId;
    const cell = el.classList.contains('macros-panel__row-name') ? 'name'
      : el.classList.contains('macros-panel__run') ? 'run' : 'menu';
    return `${id}.${cell}`;
  };
  const ALL = MACROS.flatMap((m) => [`${m.id}.name`, `${m.id}.run`, `${m.id}.menu`]);

  it('the list is ONE sequence: every control of every macro, in reading order', () => {
    const { focus, press, focused, cell } = renderPanel();
    focus(cell('m1', 'name'));
    const walked = [where(focused())];
    for (let i = 1; i < ALL.length; i++) {
      press('ArrowRight');
      walked.push(where(focused()));
    }
    expect(walked).toEqual(ALL);
  });

  it('Down does exactly what Right does, and Up what Left does — as in a toolbar', () => {
    const walk = (key: string, from: [string, 'name' | 'run' | 'menu'], presses: number) => {
      const { focus, press, focused, cell } = renderPanel();
      focus(cell(from[0], from[1]));
      const seen: string[] = [];
      for (let i = 0; i < presses; i++) {
        press(key);
        seen.push(where(focused()));
      }
      cleanup();
      return seen;
    };
    expect(walk('ArrowDown', ['m1', 'name'], ALL.length)).toEqual(walk('ArrowRight', ['m1', 'name'], ALL.length));
    expect(walk('ArrowUp', ['m2', 'run'], ALL.length)).toEqual(walk('ArrowLeft', ['m2', 'run'], ALL.length));
    // ...and Down really does step to the next CONTROL, not the next macro
    expect(walk('ArrowDown', ['m1', 'name'], 3)).toEqual(['m1.run', 'm1.menu', 'm2.name']);
    expect(walk('ArrowUp', ['m2', 'name'], 3)).toEqual(['m1.menu', 'm1.run', 'm1.name']);
  });

  it('cycles: past the last control is the first, and back', () => {
    const { focus, press, focused, cell } = renderPanel();
    focus(cell('m3', 'menu'));
    press('ArrowDown');
    expect(focused()).toBe(cell('m1', 'name'));
    press('ArrowUp');
    expect(focused()).toBe(cell('m3', 'menu'));
    press('ArrowRight');
    expect(focused()).toBe(cell('m1', 'name'));
    press('ArrowLeft');
    expect(focused()).toBe(cell('m3', 'menu'));
  });

  it('a full lap comes back to where it began', () => {
    const { focus, press, focused, cell } = renderPanel();
    focus(cell('m2', 'run'));
    for (let i = 0; i < ALL.length; i++) press('ArrowDown');
    expect(focused()).toBe(cell('m2', 'run'));
  });

  it('the tab stop follows focus round the end', () => {
    const { focus, press, cell, tabStops } = renderPanel();
    focus(cell('m3', 'menu'));
    press('ArrowDown');
    expect(tabStops()).toEqual([cell('m1', 'name')]);
  });

  it('Home and End go to the first and last control of the list', () => {
    const { focus, press, focused, cell } = renderPanel();
    focus(cell('m2', 'run'));
    press('End');
    expect(focused()).toBe(cell('m3', 'menu'));
    press('Home');
    expect(focused()).toBe(cell('m1', 'name'));
  });

  it('PageDown and PageUp move by MACROS, keep the control, and stop at the ends', () => {
    const { focus, press, focused, cell } = renderPanel();
    focus(cell('m1', 'run'));
    press('PageDown');
    expect(focused()).toBe(cell('m3', 'run'));
    press('PageDown'); // already on the last macro: does not cycle
    expect(focused()).toBe(cell('m3', 'run'));
    press('PageUp');
    expect(focused()).toBe(cell('m1', 'run'));
    press('PageUp');
    expect(focused()).toBe(cell('m1', 'run'));
  });

  it('a single macro is still a sequence of three', () => {
    const { focus, press, focused, cell } = renderPanel({ macros: MACROS.slice(0, 1) });
    focus(cell('m1', 'name'));
    press('ArrowDown');
    expect(focused()).toBe(cell('m1', 'run'));
    press('ArrowDown');
    press('ArrowDown');
    expect(focused()).toBe(cell('m1', 'name'));
  });

  it('keeps every key it uses from the app', () => {
    // The app's shortcuts listen on the document: arrows there move the
    // playhead and the track focus, Home/End jump the playhead.
    const { focus, focused, cell } = renderPanel();
    const seen: string[] = [];
    const listener = (e: KeyboardEvent) => seen.push(e.key);
    document.addEventListener('keydown', listener);
    focus(cell('m1', 'name'));
    for (const key of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']) {
      const notPrevented = fireEvent.keyDown(focused(), { key });
      expect(notPrevented, key).toBe(false);
    }
    document.removeEventListener('keydown', listener);
    expect(seen).toEqual([]);
  });

  it('leaves Space, Delete and modified arrows to the app', () => {
    const { focus, focused, cell } = renderPanel();
    const seen: string[] = [];
    const listener = (e: KeyboardEvent) => seen.push(`${e.shiftKey ? 'Shift+' : ''}${e.metaKey ? 'Cmd+' : ''}${e.key}`);
    document.addEventListener('keydown', listener);
    focus(cell('m2', 'name'));
    fireEvent.keyDown(focused(), { key: ' ' });
    fireEvent.keyDown(focused(), { key: 'Delete' });
    fireEvent.keyDown(focused(), { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(focused(), { key: 'ArrowLeft', metaKey: true });
    document.removeEventListener('keydown', listener);
    expect(seen).toEqual([' ', 'Delete', 'Shift+ArrowDown', 'Cmd+ArrowLeft']);
    expect(focused()).toBe(cell('m2', 'name'));
  });
});

describe('MacrosPanel keyboard — acting on a macro', () => {
  it('Enter on the name opens the macro at once — no double-click wait', () => {
    vi.useFakeTimers();
    const onEditMacro = vi.fn();
    const { focus, press, cell } = renderPanel({ onEditMacro });
    focus(cell('m2', 'name'));
    press('Enter');
    expect(onEditMacro).toHaveBeenCalledTimes(1);
    expect(onEditMacro).toHaveBeenCalledWith('m2');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onEditMacro).toHaveBeenCalledTimes(1); // and not a second time, late
  });

  it('Enter on Run and on the menu is left to the button', () => {
    const onEditMacro = vi.fn();
    const { focus, focused, cell } = renderPanel({ onEditMacro });
    focus(cell('m1', 'run'));
    expect(fireEvent.keyDown(focused(), { key: 'Enter' })).toBe(true);
    focus(cell('m1', 'menu'));
    expect(fireEvent.keyDown(focused(), { key: 'Enter' })).toBe(true);
    expect(onEditMacro).not.toHaveBeenCalled();
  });

  it('Cmd/Ctrl+Enter runs the macro on the project, from any cell', () => {
    const onRunOnProject = vi.fn();
    const onEditMacro = vi.fn();
    const { focus, press, cell } = renderPanel({ onRunOnProject, onEditMacro });
    focus(cell('m2', 'name'));
    press('Enter', { metaKey: true });
    focus(cell('m3', 'menu'));
    press('Enter', { ctrlKey: true });
    expect(onRunOnProject.mock.calls).toEqual([['m2'], ['m3']]);
    expect(onEditMacro).not.toHaveBeenCalled();
  });

  it('F2 renames the macro that has focus', () => {
    const onRenameMacro = vi.fn();
    const { focus, press, cell, container } = renderPanel({ onRenameMacro });
    focus(cell('m2', 'run'));
    press('F2');
    const input = container.ownerDocument.querySelector<HTMLInputElement>('.dialog input');
    expect(input?.value).toBe('MP3 conversion');
  });

  it('Shift+F10 and the Menu key open the row\'s menu', () => {
    for (const init of [{ key: 'F10', shiftKey: true }, { key: 'ContextMenu' }]) {
      const { focus, focused, cell, menuLabels } = renderPanel();
      focus(cell('m2', 'name'));
      fireEvent.keyDown(focused(), init);
      expect(menuLabels()).toContain('Rename macro');
      expect(cell('m2', 'menu').className).toContain('ghost-button--active');
      expect(cell('m1', 'menu').className).not.toContain('ghost-button--active');
      cleanup();
    }
  });

  it('plain F10 is not the menu key', () => {
    const { focus, press, cell, menuLabels } = renderPanel();
    focus(cell('m2', 'name'));
    press('F10');
    expect(menuLabels()).toEqual([]);
  });
});

describe('MacrosPanel keyboard — where focus goes afterwards', () => {
  const deleteVia = (api: ReturnType<typeof renderPanel>, id: string) => {
    fireEvent.click(api.cell(id, 'menu'));
    const item = [...api.container.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((i) => i.textContent?.trim() === 'Delete macro')!;
    fireEvent.click(item);
  };

  it('deleting a macro moves focus to the one that takes its place', () => {
    vi.useFakeTimers();
    const onDeleteMacro = vi.fn();
    const api = renderPanel({ onDeleteMacro });
    deleteVia(api, 'm2');
    expect(onDeleteMacro).toHaveBeenCalledWith('m2');
    api.rerenderWith({ onDeleteMacro, macros: MACROS.filter((m) => m.id !== 'm2') });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell('m3', 'name'));
  });

  it('deleting the LAST macro in the list moves focus up', () => {
    vi.useFakeTimers();
    const api = renderPanel();
    deleteVia(api, 'm3');
    api.rerenderWith({ macros: MACROS.slice(0, 2) });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell('m2', 'name'));
  });

  it('deleting the only macro moves focus to New macro', () => {
    vi.useFakeTimers();
    const api = renderPanel({ macros: MACROS.slice(0, 1) });
    deleteVia(api, 'm1');
    api.rerenderWith({ macros: [] });
    act(() => { vi.runAllTimers(); });
    // The button itself — the page body's text contains "New macro" too
    expect(api.focused().tagName).toBe('BUTTON');
    expect(api.focused().textContent).toContain('New macro');
  });

  it('cancelling a rename returns focus to the macro', () => {
    vi.useFakeTimers();
    const api = renderPanel();
    api.focus(api.cell('m2', 'menu'));
    api.press('F2');
    const input = api.container.ownerDocument.querySelector<HTMLInputElement>('.dialog input')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell('m2', 'name'));
  });

  it('cancelling New macro returns focus to the New macro button', () => {
    vi.useFakeTimers();
    const api = renderPanel();
    const newMacro = [...api.container.querySelectorAll<HTMLElement>('.macros-panel__header-actions button')][0];
    fireEvent.click(newMacro);
    const input = api.container.ownerDocument.querySelector<HTMLInputElement>('.dialog input')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(newMacro);
  });
});

describe('MacrosPanel keyboard — flat profile', () => {
  it('every control is its own tab stop', () => {
    const { tabStops, container } = renderPanel({}, 'wcag-flat');
    expect(tabStops()).toHaveLength(MACROS.length * 3);
    expect(tabStops().every((b) => b.tabIndex === 0)).toBe(true);
    const actions = [...container.querySelectorAll<HTMLElement>('.macros-panel__header-actions button')];
    expect(actions.every((b) => b.tabIndex === 0)).toBe(true);
  });

  it('arrows do nothing and are left to the app', () => {
    const { focus, focused, cell } = renderPanel({}, 'wcag-flat');
    focus(cell('m1', 'name'));
    expect(fireEvent.keyDown(focused(), { key: 'ArrowDown' })).toBe(true);
    expect(focused()).toBe(cell('m1', 'name'));
  });

  it('the row shortcuts still work', () => {
    const onRunOnProject = vi.fn();
    const onEditMacro = vi.fn();
    const { focus, press, cell, menuLabels } = renderPanel({ onRunOnProject, onEditMacro }, 'wcag-flat');
    focus(cell('m2', 'name'));
    press('Enter');
    press('Enter', { metaKey: true });
    press('F10', { shiftKey: true });
    expect(onEditMacro).toHaveBeenCalledWith('m2');
    expect(onRunOnProject).toHaveBeenCalledWith('m2');
    expect(menuLabels()).toContain('Delete macro');
  });
});

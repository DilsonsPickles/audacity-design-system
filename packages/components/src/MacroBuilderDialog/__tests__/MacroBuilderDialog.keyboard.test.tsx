import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { MacroBuilderDialog } from '../MacroBuilderDialog';
import type { Command } from '../../SelectCommandDialog';
import type { Macro } from '../../MacroManager/macroTypes';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  try { localStorage.removeItem('audacity-accessibility-profile'); } catch { /* no storage */ }
});

const COMMANDS: Command[] = [
  { id: 'select-all', name: 'Select all', category: 'Selection' },
  { id: 'select-next-clip', name: 'Next clip', category: 'Selection' },
  { id: 'split', name: 'Split', category: 'Clips' },
  { id: 'join', name: 'Join selected clips', category: 'Clips' },
  { id: 'effect:fade-in', name: 'Fade In', category: 'Effects' },
];

const MACRO: Macro = {
  id: 'm1',
  name: 'Podcast prep',
  steps: [
    { command: 'Select all', parameters: '' },
    { command: 'Fade In', parameters: 'duration="2"' },
    { command: 'Split', parameters: '' },
  ],
};

type Props = Partial<React.ComponentProps<typeof MacroBuilderDialog>>;
type Profile = 'au4-tab-groups' | 'wcag-flat';

function renderBuilder(props: Props = {}, profile: Profile = 'au4-tab-groups') {
  const ui = (p: Props) => (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId={profile}>
        <MacroBuilderDialog isOpen macro={MACRO} availableCommands={COMMANDS} onRun={() => {}} onRunFiles={() => {}} {...p} />
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
  const utils = render(ui(props));
  const c = utils.container;
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => c.querySelector<T>(sel)!;
  const all = <T extends HTMLElement = HTMLElement>(sel: string) => [...c.querySelectorAll<T>(sel)];
  const command = (id: string) => all('[data-command-id]').find((el) => el.dataset.commandId === id)!;
  const step = (n: number) => q(`[data-step-index="${n - 1}"]`);
  const stepEdit = (n: number) => step(n).querySelector<HTMLElement>('.macro-builder__step-edit')!;
  const stepMenu = (n: number) => step(n).querySelector<HTMLElement>('.macro-builder__step-menu')!;
  const focused = () => document.activeElement as HTMLElement;
  const focus = (el: HTMLElement) => act(() => { el.focus(); });
  const press = (key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(focused(), { key, ...init });
  const selected = () => all('[data-command-id][aria-selected="true"]').map((el) => el.dataset.commandId);
  const stops = (within: string) => all(`${within} button, ${within} [tabindex]`)
    .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled);
  const menuItem = (label: string) =>
    all('[role="menuitem"]').find((el) => el.textContent?.trim() === label)!;
  const search = () => q<HTMLInputElement>('input[aria-label="Search commands"]');
  const splitter = () => q('.macro-builder__splitter');
  const pane = () => q('.macro-builder__commands-pane');
  return {
    ...utils, rerenderWith: (p: Props) => utils.rerender(ui(p)),
    q, all, command, step, stepEdit, stepMenu, focused, focus, press, selected, stops, menuItem, search, splitter, pane,
  };
}

/** Keys that reach a listener on `document` — where the app's shortcuts live. */
function leaked(run: () => void): string[] {
  const seen: string[] = [];
  const listener = (e: KeyboardEvent) => seen.push(e.key);
  document.addEventListener('keydown', listener);
  run();
  document.removeEventListener('keydown', listener);
  return seen;
}

describe('Edit macro keyboard — Tab stops', () => {
  it('each list is ONE tab stop, however much it holds', () => {
    const { stops, command, step } = renderBuilder();
    expect(stops('.macro-builder__command-list')).toEqual([command('select-all')]);
    expect(stops('.macro-builder__step-list')).toEqual([step(1)]);
  });

  it('the window has a fixed handful of stops, in reading order', () => {
    const { all } = renderBuilder();
    const zones = all('.macro-builder button, .macro-builder input, .macro-builder [tabindex]')
      .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled)
      .filter((el) => el.closest('.macro-builder__columns, .macro-builder__footer'))
      .map((el) =>
        el.matches('input') ? 'search'
          : el.closest('.macro-builder__command-list') ? 'commands'
            : el.closest('.macro-builder__selection-summary') ? 'add-bar'
              : el.matches('.macro-builder__splitter') ? 'splitter'
                : el.closest('.macro-builder__steps-header') ? 'macro-menu'
                  : el.closest('.macro-builder__step-list') ? 'steps'
                    : el.closest('.macro-builder__footer') ? 'footer' : '?');
    // Nothing selected yet, so the Add bar has nothing to stop on
    expect(zones).toEqual(['search', 'commands', 'splitter', 'macro-menu', 'steps', 'footer']);
  });

  it('the Add bar becomes a stop once there is something to add', () => {
    const { stops, command, focus, press } = renderBuilder();
    focus(command('select-all'));
    press('ArrowDown');
    const bar = stops('.macro-builder__selection-summary');
    expect(bar).toHaveLength(1);
    expect(bar[0].textContent).toContain('Clear');
  });

  it('the footer is one stop with the arrows between its buttons', () => {
    const { stops, all, focus, press, focused } = renderBuilder();
    const footer = stops('.macro-builder__footer');
    expect(footer).toHaveLength(1);
    expect(footer[0].textContent).toContain('Run');
    focus(footer[0]);
    press('ArrowRight');
    expect(focused().textContent).toContain('Run on files');
    press('ArrowRight');
    expect(focused().textContent).toContain('Done');
    expect(all('.macro-builder__footer button')).toHaveLength(3);
  });

  it('the tab stop follows focus and is remembered', () => {
    const { stops, command, step, stepMenu, focus, press } = renderBuilder();
    focus(command('select-all'));
    press('ArrowDown');
    press('ArrowDown');
    focus(step(1));
    press('ArrowDown');
    press('ArrowLeft');
    act(() => { (document.activeElement as HTMLElement).blur(); });
    expect(stops('.macro-builder__command-list')).toEqual([command('split')]);
    expect(stops('.macro-builder__step-list')).toEqual([stepMenu(2)]);
  });

  it('when a search hides the remembered command the stop falls to one that shows', () => {
    const { stops, command, focus, search } = renderBuilder();
    focus(command('effect:fade-in'));
    fireEvent.change(search(), { target: { value: 'sel' } });
    expect(stops('.macro-builder__command-list')).toEqual([command('select-all')]);
  });
});

describe('Edit macro keyboard — the command list', () => {
  it('Down and Up move the selection with focus, and cycle', () => {
    const { command, focus, press, focused, selected } = renderBuilder();
    focus(command('select-all'));
    press('ArrowDown');
    expect(focused()).toBe(command('select-next-clip'));
    expect(selected()).toEqual(['select-next-clip']);
    press('ArrowUp');
    press('ArrowUp');
    expect(focused()).toBe(command('effect:fade-in'));
    press('ArrowDown');
    expect(focused()).toBe(command('select-all'));
  });

  it('Home, End and paging jump within the list', () => {
    const { command, focus, press, focused } = renderBuilder();
    focus(command('split'));
    press('End');
    expect(focused()).toBe(command('effect:fade-in'));
    press('Home');
    expect(focused()).toBe(command('select-all'));
    press('PageDown');
    expect(focused()).toBe(command('effect:fade-in'));
    press('PageDown'); // paging stops at the end
    expect(focused()).toBe(command('effect:fade-in'));
    press('PageUp');
    expect(focused()).toBe(command('select-all'));
  });

  it('Shift+Down grows the selection from where it began; Shift+Up shrinks it back', () => {
    const { command, focus, press, selected } = renderBuilder();
    focus(command('select-all'));
    press('ArrowDown'); // Next clip: the anchor
    press('ArrowDown', { shiftKey: true });
    press('ArrowDown', { shiftKey: true });
    expect(selected()).toEqual(['select-next-clip', 'split', 'join']);
    press('ArrowUp', { shiftKey: true });
    expect(selected()).toEqual(['select-next-clip', 'split']);
  });

  it('a selection grown upward is added from the anchor outward', () => {
    const onAddCommand = vi.fn();
    const { command, focus, press } = renderBuilder({ onAddCommand });
    focus(command('join'));
    press('ArrowUp'); // Split: the anchor
    press('ArrowUp', { shiftKey: true });
    press('ArrowUp', { shiftKey: true });
    press('Enter');
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual(['Split', 'Next clip', 'Select all']);
  });

  it('growing a selection stops at the ends — a range does not wrap', () => {
    const { command, focus, press, selected, focused } = renderBuilder();
    focus(command('join'));
    press('ArrowDown');
    press('ArrowDown', { shiftKey: true });
    expect(focused()).toBe(command('effect:fade-in'));
    expect(selected()).toEqual(['effect:fade-in']);
  });

  it('Enter adds what has focus, and leaves focus where it was', () => {
    const onAddCommand = vi.fn();
    const { command, focus, press, focused } = renderBuilder({ onAddCommand });
    focus(command('split'));
    press('Enter');
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[2]);
    expect(focused()).toBe(command('split'));
  });

  it('keeps every key it uses from the app', () => {
    const { command, focus, focused } = renderBuilder();
    focus(command('split'));
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Enter'];
    expect(leaked(() => keys.forEach((key) => fireEvent.keyDown(focused(), { key })))).toEqual([]);
  });

  it('Left and Right go nowhere — there is one column', () => {
    const { command, focus, press, focused } = renderBuilder();
    focus(command('split'));
    press('ArrowRight');
    press('ArrowLeft');
    expect(focused()).toBe(command('split'));
  });

  it('is a multi-select listbox to assistive tech', () => {
    const { q } = renderBuilder();
    const list = q('.macro-builder__command-list');
    expect(list.getAttribute('role')).toBe('listbox');
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('stays one stop driven by the arrows under the flat profile too — a listbox is one control', () => {
    const { stops, command, focus, press, focused } = renderBuilder({}, 'wcag-flat');
    expect(stops('.macro-builder__command-list')).toHaveLength(1);
    focus(command('select-all'));
    press('ArrowDown');
    expect(focused()).toBe(command('select-next-clip'));
  });
});

describe('Edit macro keyboard — the step list', () => {
  it('Down and Up go down and up the steps, on the same control, and cycle', () => {
    const { step, stepMenu, focus, press, focused } = renderBuilder();
    focus(step(1));
    press('ArrowDown');
    expect(focused()).toBe(step(2));
    press('ArrowDown');
    press('ArrowDown');
    expect(focused()).toBe(step(1));
    press('ArrowUp');
    expect(focused()).toBe(step(3));
    focus(stepMenu(1));
    press('ArrowDown');
    expect(focused()).toBe(stepMenu(2));
  });

  it('Left and Right go along a step\'s row, and cycle', () => {
    const { step, stepEdit, stepMenu, focus, press, focused } = renderBuilder();
    focus(step(2));
    press('ArrowRight');
    expect(focused()).toBe(stepEdit(2));
    press('ArrowRight');
    expect(focused()).toBe(stepMenu(2));
    press('ArrowRight');
    expect(focused()).toBe(step(2));
    press('ArrowLeft');
    expect(focused()).toBe(stepMenu(2));
  });

  it('Home and End go to the first and last step', () => {
    const { step, focus, press, focused } = renderBuilder();
    focus(step(2));
    press('End');
    expect(focused()).toBe(step(3));
    press('Home');
    expect(focused()).toBe(step(1));
  });

  it('Enter on a step opens its editor', () => {
    const { step, focus, press } = renderBuilder();
    focus(step(2));
    press('Enter');
    expect(document.querySelector('.dialog:not(.macro-builder) input, .dialog:not(.macro-builder) textarea')).not.toBeNull();
  });

  it('Enter on a step\'s menu button opens the menu ONLY — it used to open the editor as well', () => {
    const { stepMenu, focus, focused, all } = renderBuilder();
    focus(stepMenu(2));
    // The browser turns Enter on a button into a click
    const notPrevented = fireEvent.keyDown(focused(), { key: 'Enter' });
    expect(notPrevented).toBe(true);
    fireEvent.click(focused());
    expect(all('[role="menuitem"]').map((i) => i.textContent?.trim())).toContain('Delete step');
    expect(document.querySelectorAll('.dialog')).toHaveLength(1); // the window itself
  });

  it('Shift+F10 and the Menu key open the step\'s menu from any cell', () => {
    for (const init of [{ key: 'F10', shiftKey: true }, { key: 'ContextMenu' }]) {
      const { step, focus, focused, menuItem } = renderBuilder();
      focus(step(2));
      fireEvent.keyDown(focused(), init);
      expect(menuItem('Move up')).toBeTruthy();
      expect(menuItem('Delete step')).toBeTruthy();
      cleanup();
    }
  });

  it('Cmd/Ctrl+Down and Up carry the step with them', () => {
    const onMoveStep = vi.fn();
    const { step, focus, press } = renderBuilder({ onMoveStep });
    focus(step(2));
    press('ArrowDown', { metaKey: true });
    press('ArrowUp', { ctrlKey: true });
    expect(onMoveStep.mock.calls).toEqual([['m1', 1, 1], ['m1', 1, -1]]);
  });

  it('a step cannot be carried past either end, and the key is still kept from the app', () => {
    const onMoveStep = vi.fn();
    const { step, focus, focused } = renderBuilder({ onMoveStep });
    focus(step(1));
    const keys = leaked(() => {
      fireEvent.keyDown(focused(), { key: 'ArrowUp', metaKey: true });
    });
    focus(step(3));
    fireEvent.keyDown(focused(), { key: 'ArrowDown', metaKey: true });
    expect(onMoveStep).not.toHaveBeenCalled();
    expect(keys).toEqual([]);
  });

  it('focus follows a step that was moved', () => {
    vi.useFakeTimers();
    const api = renderBuilder();
    api.focus(api.step(1));
    api.press('ArrowDown', { metaKey: true });
    const [a, b, c] = MACRO.steps;
    api.rerenderWith({ macro: { ...MACRO, steps: [b, a, c] } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.step(2));
    expect(api.focused().textContent).toContain('Select all');
  });

  it('Delete removes the step and keeps the key from the app', () => {
    const onDeleteStep = vi.fn();
    const { step, focus, focused } = renderBuilder({ onDeleteStep });
    focus(step(2));
    const keys = leaked(() => {
      fireEvent.keyDown(focused(), { key: 'Delete' });
    });
    expect(onDeleteStep).toHaveBeenCalledWith('m1', 1);
    expect(keys).toEqual([]);
  });

  it('after a delete, focus is on the step that took its place', () => {
    vi.useFakeTimers();
    const api = renderBuilder();
    api.focus(api.step(2));
    api.press('Delete');
    api.rerenderWith({ macro: { ...MACRO, steps: [MACRO.steps[0], MACRO.steps[2]] } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.step(2));
    expect(api.focused().textContent).toContain('Split');
  });

  it('after deleting the LAST step in the list, focus moves up', () => {
    vi.useFakeTimers();
    const api = renderBuilder();
    api.focus(api.step(3));
    api.press('Backspace');
    api.rerenderWith({ macro: { ...MACRO, steps: MACRO.steps.slice(0, 2) } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.step(2));
  });

  it('after deleting the only step, focus goes to the search field', () => {
    vi.useFakeTimers();
    const one = { ...MACRO, steps: MACRO.steps.slice(0, 1) };
    const api = renderBuilder({ macro: one });
    api.focus(api.step(1));
    api.press('Delete');
    api.rerenderWith({ macro: { ...MACRO, steps: [] } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.search());
  });

  it('the menu\'s Move down takes focus with the step, on its menu button', () => {
    vi.useFakeTimers();
    const api = renderBuilder();
    fireEvent.click(api.stepMenu(1));
    fireEvent.click(api.menuItem('Move down'));
    const [a, b, c] = MACRO.steps;
    api.rerenderWith({ macro: { ...MACRO, steps: [b, a, c] } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.stepMenu(2));
  });

  it('keeps every key it uses from the app', () => {
    const { step, focus, focused } = renderBuilder();
    focus(step(2));
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
    expect(leaked(() => keys.forEach((key) => fireEvent.keyDown(focused(), { key })))).toEqual([]);
  });

  it('each step says what it is, and where, to assistive tech', () => {
    const { step } = renderBuilder();
    expect(step(2).getAttribute('aria-label')).toBe('Step 2 of 3: Fade In, duration: 2');
    expect(step(1).getAttribute('aria-label')).toBe('Step 1 of 3: Select all');
  });

  it('flat profile: every control is a stop, arrows are left alone, the shortcuts still work', () => {
    const onDeleteStep = vi.fn();
    const onMoveStep = vi.fn();
    const { stops, step, focus, focused } = renderBuilder({ onDeleteStep, onMoveStep }, 'wcag-flat');
    expect(stops('.macro-builder__step-list')).toHaveLength(MACRO.steps.length * 3);
    focus(step(2));
    expect(fireEvent.keyDown(focused(), { key: 'ArrowDown' })).toBe(true);
    expect(focused()).toBe(step(2));
    fireEvent.keyDown(focused(), { key: 'ArrowDown', metaKey: true });
    fireEvent.keyDown(focused(), { key: 'Delete' });
    expect(onMoveStep).toHaveBeenCalledWith('m1', 1, 1);
    expect(onDeleteStep).toHaveBeenCalledWith('m1', 1);
  });
});

describe('Edit macro keyboard — the splitter', () => {
  const width = (el: HTMLElement) => el.style.flex;

  it('is a stop, and a control with a value', () => {
    const { splitter } = renderBuilder();
    expect(splitter().tabIndex).toBe(0);
    expect(splitter().getAttribute('role')).toBe('separator');
    expect(splitter().getAttribute('aria-valuenow')).toBe('280');
    expect(splitter().getAttribute('aria-valuemin')).toBe('180');
  });

  it('arrows resize the pane; Shift takes a bigger step', () => {
    const { splitter, pane, focus, press } = renderBuilder();
    focus(splitter());
    press('ArrowRight');
    expect(width(pane())).toBe('0 0 296px');
    press('ArrowLeft', { shiftKey: true });
    expect(width(pane())).toBe('0 0 232px');
    expect(splitter().getAttribute('aria-valuenow')).toBe('232');
  });

  it('cannot go below the minimum; Home goes straight there', () => {
    const { splitter, pane, focus, press } = renderBuilder();
    focus(splitter());
    for (let i = 0; i < 12; i++) press('ArrowLeft');
    expect(width(pane())).toBe('0 0 180px');
    press('ArrowRight');
    press('Home');
    expect(width(pane())).toBe('0 0 180px');
  });

  it('Enter resets it, as a double-click does', () => {
    const { splitter, pane, focus, press } = renderBuilder();
    focus(splitter());
    press('ArrowRight', { shiftKey: true });
    press('Enter');
    expect(width(pane())).toBe('0 0 280px');
  });

  it('keeps its keys from the app', () => {
    const { splitter, focus, focused } = renderBuilder();
    focus(splitter());
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'Enter'];
    expect(leaked(() => keys.forEach((key) => fireEvent.keyDown(focused(), { key })))).toEqual([]);
  });
});

describe('Edit macro keyboard — where focus goes afterwards', () => {
  it('closing a step\'s editor returns focus to the step', () => {
    vi.useFakeTimers();
    const { step, focus, press, focused } = renderBuilder();
    focus(step(2));
    press('Enter');
    const close = [...document.querySelectorAll<HTMLElement>('.dialog:not(.macro-builder) button')]
      .find((b) => b.textContent?.trim() === 'Cancel')!;
    fireEvent.click(close);
    act(() => { vi.runAllTimers(); });
    expect(focused()).toBe(step(2));
  });

  it('closing Rename returns focus to the macro\'s menu button', () => {
    vi.useFakeTimers();
    const { q, menuItem, focused } = renderBuilder();
    const menuButton = q('.macro-builder__steps-header button');
    fireEvent.click(menuButton);
    fireEvent.click(menuItem('Rename macro'));
    const input = document.querySelector<HTMLInputElement>('.dialog:not(.macro-builder) input')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    act(() => { vi.runAllTimers(); });
    expect(focused()).toBe(menuButton);
  });

  it('removing every step moves focus to the search field', () => {
    vi.useFakeTimers();
    const api = renderBuilder();
    fireEvent.click(api.q('.macro-builder__steps-header button'));
    fireEvent.click(api.menuItem('Remove all steps'));
    api.rerenderWith({ macro: { ...MACRO, steps: [] } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.search());
  });
});

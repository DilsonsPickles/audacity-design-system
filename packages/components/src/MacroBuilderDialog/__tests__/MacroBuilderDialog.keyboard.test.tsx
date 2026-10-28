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
  /** A cell of the step table: row 0 is the head, step n is row n. */
  const cell = (row: number, col: 'grip' | 'number' | 'command' | 'actions') => q(`[data-grid-row="${row}"][data-grid-col="${col}"]`);
  const focused = () => document.activeElement as HTMLElement;
  const focus = (el: HTMLElement) => act(() => { el.focus(); });
  const press = (key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(focused(), { key, ...init });
  const selected = () => all('[data-command-id][aria-selected="true"]').map((el) => el.dataset.commandId);
  const stops = (within: string) => all(`${within} button, ${within} [tabindex]`)
    .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled);
  const menuItem = (label: string) =>
    all('[role="menuitem"]').find((el) => el.textContent?.trim() === label)!;
  const search = () => q<HTMLInputElement>('input[aria-label="Search commands"]');
  const pane = () => q('.macro-builder__commands-pane');
  return {
    ...utils, rerenderWith: (p: Props) => utils.rerender(ui(p)),
    q, all, command, step, stepEdit, stepMenu, cell, focused, focus, press, selected, stops, menuItem, search, pane,
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

describe('Edit macro — the step table is an ARIA grid (2026-10-21)', () => {
  it('head row of column headers, a rowgroup of step rows, cells in their columns', () => {
    const { q, all, step, stepEdit, stepMenu } = renderBuilder();
    const grid = q('.macro-builder__step-table');
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.getAttribute('aria-label')).toBe('Macro steps');
    expect(grid.getAttribute('aria-rowcount')).toBe(String(MACRO.steps.length + 1));
    expect(grid.getAttribute('aria-colcount')).toBe('4');
    const head = q('.macro-builder__step-table-head');
    expect(head.getAttribute('role')).toBe('row');
    expect(head.getAttribute('aria-rowindex')).toBe('1');
    expect([...head.querySelectorAll('[role="columnheader"]')].map((h) => h.getAttribute('aria-label') ?? h.textContent))
      .toEqual(['Reorder', 'Step', 'Command', 'Actions']);
    expect(q('.macro-builder__step-list').getAttribute('role')).toBe('rowgroup');
    // Every step is a row at its place after the head; its cells name their columns
    expect(all('[data-step-index]').map((r) => [r.getAttribute('role'), r.getAttribute('aria-rowindex')]))
      .toEqual([['row', '2'], ['row', '3'], ['row', '4']]);
    expect(step(2).hasAttribute('tabindex')).toBe(false); // the cells take focus, never the row
    const cells = [...step(2).querySelectorAll('[role="gridcell"]')];
    expect(cells.map((c) => c.getAttribute('aria-colindex'))).toEqual(['1', '2', '3', '4']);
    expect(cells[0].getAttribute('aria-label')).toBe('Reorder step 2');
    expect(cells[2].textContent).toContain('Fade In');
    expect(cells[3].contains(stepEdit(2))).toBe(true);
    expect(cells[3].contains(stepMenu(2))).toBe(true);
  });

  it('with no steps the rowgroup holds the hint as one row of one cell spanning the table', () => {
    const { q } = renderBuilder({ macro: { ...MACRO, steps: [] } });
    const list = q('.macro-builder__step-list');
    expect([...list.children].map((c) => c.getAttribute('role'))).toEqual(['row']);
    const cell = list.querySelector('[role="gridcell"]')!;
    expect(cell.getAttribute('aria-colspan')).toBe('4');
    expect(cell.textContent).toMatch(/Drag a command here/);
    expect(q('.macro-builder__step-table').getAttribute('aria-rowcount')).toBe('2');
  });
});

describe('Edit macro keyboard — Tab stops', () => {
  it('each list is ONE tab stop, however much it holds', () => {
    const { stops, command, cell } = renderBuilder();
    expect(stops('.macro-builder__command-list')).toEqual([command('select-all')]);
    // The table's stop starts on the head's first cell — the top left, the Reorder column
    expect(stops('.macro-builder__step-table')).toEqual([cell(0, 'grip')]);
  });

  it('the window has five stops, in reading order — with or without a selection', () => {
    const { all, command } = renderBuilder();
    fireEvent.click(command('split'));
    const zones = all('.macro-builder button, .macro-builder input, .macro-builder [tabindex]')
      .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled)
      .filter((el) => el.closest('.macro-builder__columns, .macro-builder__footer'))
      .map((el) =>
        el.matches('input') ? 'search'
          : el.closest('.macro-builder__command-list') ? 'commands'
                : el.closest('.macro-builder__steps-header') ? 'macro-menu'
                  : el.closest('.macro-builder__step-table') ? 'steps'
                    : el.closest('.macro-builder__footer') ? 'footer' : '?');
    expect(zones).toEqual(['search', 'commands', 'macro-menu', 'steps', 'footer']);
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
    const { stops, command, cell, focus, press } = renderBuilder();
    focus(command('select-all'));
    press('ArrowDown');
    press('ArrowDown');
    focus(cell(1, 'command'));
    press('ArrowDown');
    press('ArrowRight');
    act(() => { (document.activeElement as HTMLElement).blur(); });
    expect(stops('.macro-builder__command-list')).toEqual([command('split')]);
    expect(stops('.macro-builder__step-table')).toEqual([cell(2, 'actions')]);
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

  it('Shift+arrows move like plain arrows — there is no range to grow', () => {
    const { command, focus, press, selected, focused } = renderBuilder();
    focus(command('select-all'));
    press('ArrowDown', { shiftKey: true });
    press('ArrowDown', { shiftKey: true });
    expect(focused()).toBe(command('split'));
    expect(selected()).toEqual(['split']);
  });

  it('only ever one command is selected, however the arrows are used', () => {
    const { command, focus, press, selected } = renderBuilder();
    focus(command('select-all'));
    for (const key of ['ArrowDown', 'ArrowDown', 'End', 'ArrowUp', 'Home', 'PageDown']) {
      press(key);
      expect(selected(), key).toHaveLength(1);
    }
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

  it('is a single-select listbox to assistive tech', () => {
    const { q, all } = renderBuilder();
    const list = q('.macro-builder__command-list');
    expect(list.getAttribute('role')).toBe('listbox');
    expect(list.hasAttribute('aria-multiselectable')).toBe(false);
    expect(all('[role="option"]')).toHaveLength(COMMANDS.length);
  });

  it('the list is still ONE stop with the selected command\'s + showing', () => {
    const { command, focus, press, stops, q } = renderBuilder();
    focus(command('select-all'));
    press('ArrowDown');
    expect(q('.macro-builder__command-add').closest('[data-command-id]')).toBe(command('select-next-clip'));
    expect(stops('.macro-builder__command-list')).toEqual([command('select-next-clip')]);
  });

  it('Enter is the keyboard\'s drag: it adds to the end, and Cmd/Ctrl+arrows place the step', () => {
    // Dragging a command to a place has no keyboard twin in one move;
    // these two together are its equivalent
    const onAddCommand = vi.fn();
    const onMoveStep = vi.fn();
    const { command, cell, focus, press } = renderBuilder({ onAddCommand, onMoveStep });
    focus(command('effect:fade-in'));
    press('Enter');
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[4]);
    focus(cell(3, 'command'));
    press('ArrowUp', { metaKey: true });
    expect(onMoveStep).toHaveBeenCalledWith('m1', 2, -1);
  });

  it('Enter adds the focused command, and it stays selected to be added again', () => {
    const onAddCommand = vi.fn();
    const { command, focus, press, selected } = renderBuilder({ onAddCommand });
    focus(command('split'));
    press('Enter');
    press('Enter');
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual(['Split', 'Split']);
    expect(selected()).toEqual(['split']);
  });

  it('stays one stop driven by the arrows under the flat profile too — a listbox is one control', () => {
    const { stops, command, focus, press, focused } = renderBuilder({}, 'wcag-flat');
    expect(stops('.macro-builder__command-list')).toHaveLength(1);
    focus(command('select-all'));
    press('ArrowDown');
    expect(focused()).toBe(command('select-next-clip'));
  });
});

describe('Edit macro keyboard — the step table (a data grid, 2026-10-21)', () => {
  it('Down and Up go down and up the rows, the head included, in the same column, and cycle', () => {
    const { cell, focus, press, focused } = renderBuilder();
    focus(cell(0, 'command'));
    press('ArrowDown');
    expect(focused()).toBe(cell(1, 'command'));
    press('ArrowDown');
    press('ArrowDown');
    expect(focused()).toBe(cell(3, 'command'));
    press('ArrowDown');
    expect(focused()).toBe(cell(0, 'command'));
    press('ArrowUp');
    expect(focused()).toBe(cell(3, 'command'));
    focus(cell(1, 'actions'));
    press('ArrowDown');
    expect(focused()).toBe(cell(2, 'actions'));
  });

  it('Left and Right go along a row, cell to cell, and cycle', () => {
    const { cell, focus, press, focused } = renderBuilder();
    focus(cell(2, 'grip'));
    press('ArrowRight');
    expect(focused()).toBe(cell(2, 'number'));
    press('ArrowRight');
    expect(focused()).toBe(cell(2, 'command'));
    press('ArrowRight');
    expect(focused()).toBe(cell(2, 'actions'));
    press('ArrowRight');
    expect(focused()).toBe(cell(2, 'grip'));
    press('ArrowLeft');
    expect(focused()).toBe(cell(2, 'actions'));
    focus(cell(0, 'grip'));
    press('ArrowRight');
    expect(focused()).toBe(cell(0, 'number'));
  });

  it('Home and End go to the ends of the row; Cmd/Ctrl+Home and End to the table\'s corners', () => {
    const { cell, focus, press, focused } = renderBuilder();
    focus(cell(2, 'command'));
    press('End');
    expect(focused()).toBe(cell(2, 'actions'));
    press('Home');
    expect(focused()).toBe(cell(2, 'grip'));
    press('End', { metaKey: true });
    expect(focused()).toBe(cell(3, 'actions'));
    press('Home', { ctrlKey: true });
    expect(focused()).toBe(cell(0, 'grip'));
  });

  it('Enter or Space on the Command cell opens the step\'s editor', () => {
    for (const key of ['Enter', ' ']) {
      const { cell, focus, press } = renderBuilder();
      focus(cell(2, 'command'));
      press(key);
      expect(document.querySelector('.dialog:not(.macro-builder) input, .dialog:not(.macro-builder) textarea')).not.toBeNull();
      cleanup();
    }
  });

  it('Enter or Space on the Actions cell goes into it — its first control — and Escape comes back out', () => {
    const { cell, stepEdit, stepMenu, focus, press, focused } = renderBuilder();
    focus(cell(2, 'actions'));
    press(' ');
    expect(focused()).toBe(stepEdit(2));
    press('ArrowRight');
    expect(focused()).toBe(stepMenu(2));
    press('ArrowRight');
    expect(focused()).toBe(stepEdit(2));
    press('Escape');
    expect(focused()).toBe(cell(2, 'actions'));
    press('Enter');
    expect(focused()).toBe(stepEdit(2));
    // Down keeps the control, in the row below
    press('ArrowDown');
    expect(focused()).toBe(stepEdit(3));
  });

  it('Enter or Space on the Reorder cell picks the step up: Up and Down carry it, Enter lets go', () => {
    vi.useFakeTimers();
    const onMoveStep = vi.fn();
    const api = renderBuilder({ onMoveStep });
    api.focus(api.cell(2, 'grip'));
    api.press(' ');
    expect(api.step(2).className).toContain('macro-builder__step--dragging');
    api.press('ArrowDown');
    expect(onMoveStep).toHaveBeenCalledWith('m1', 1, 1);
    const [a, b, c] = MACRO.steps;
    api.rerenderWith({ macro: { ...MACRO, steps: [a, c, b] }, onMoveStep });
    act(() => { vi.runAllTimers(); });
    // Focus and the carried look went with it
    expect(api.focused()).toBe(api.cell(3, 'grip'));
    expect(api.step(3).className).toContain('macro-builder__step--dragging');
    expect(api.step(2).className).not.toContain('macro-builder__step--dragging');
    api.press('ArrowUp');
    expect(onMoveStep).toHaveBeenLastCalledWith('m1', 2, -1);
    api.rerenderWith({ macro: { ...MACRO }, onMoveStep });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell(2, 'grip'));
    expect(api.step(2).className).toContain('macro-builder__step--dragging');
    api.press('Enter');
    expect(api.step(2).className).not.toContain('macro-builder__step--dragging');
    expect(api.focused()).toBe(api.cell(2, 'grip'));
    // Let go: Down is the arrow again, and the step stays
    api.press('ArrowDown');
    expect(api.focused()).toBe(api.cell(3, 'grip'));
    expect(onMoveStep).toHaveBeenCalledTimes(2);
  });

  it('a held Down keeps carrying — presses that land before focus has caught up still move the step', () => {
    vi.useFakeTimers();
    const onMoveStep = vi.fn();
    const api = renderBuilder({ onMoveStep });
    api.focus(api.cell(1, 'grip'));
    api.press('Enter');
    api.press('ArrowDown');
    const [a, b, c] = MACRO.steps;
    // Re-rendered, but the deferred refocus has not run: focus is still on row 1
    api.rerenderWith({ macro: { ...MACRO, steps: [b, a, c] }, onMoveStep });
    expect(api.focused()).toBe(api.cell(1, 'grip'));
    api.press('ArrowDown');
    expect(onMoveStep.mock.calls).toEqual([['m1', 0, 1], ['m1', 1, 1]]);
    api.rerenderWith({ macro: { ...MACRO, steps: [b, c, a] }, onMoveStep });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell(3, 'grip'));
    expect(api.step(3).className).toContain('macro-builder__step--dragging');
  });

  it('Escape lets go of a carried step without closing the window; leaving the cell lets go too', () => {
    const onClose = vi.fn();
    const { cell, focus, press, focused, step } = renderBuilder({ onClose });
    focus(cell(2, 'grip'));
    press('Enter');
    expect(step(2).className).toContain('macro-builder__step--dragging');
    press('Escape');
    expect(step(2).className).not.toContain('macro-builder__step--dragging');
    expect(onClose).not.toHaveBeenCalled();
    expect(focused()).toBe(cell(2, 'grip'));
    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
    press('Enter');
    expect(step(2).className).toContain('macro-builder__step--dragging');
    focus(cell(2, 'command'));
    expect(step(2).className).not.toContain('macro-builder__step--dragging');
  });

  it('Escape inside the Actions cell comes back out to the cell; Escape on a cell closes the window', () => {
    const onClose = vi.fn();
    const { cell, stepMenu, focus, press, focused } = renderBuilder({ onClose });
    focus(cell(2, 'actions'));
    press('Enter');
    press('ArrowRight');
    expect(focused()).toBe(stepMenu(2));
    press('Escape');
    expect(focused()).toBe(cell(2, 'actions'));
    expect(onClose).not.toHaveBeenCalled();
    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Enter or Space on a head cell, or the Step number, goes nowhere — and never reaches the app', () => {
    const { cell, focus, focused } = renderBuilder();
    for (const target of [cell(0, 'grip'), cell(0, 'command'), cell(1, 'number')]) {
      focus(target);
      const keys = leaked(() => {
        fireEvent.keyDown(focused(), { key: 'Enter' });
        fireEvent.keyDown(focused(), { key: ' ' });
      });
      expect(keys).toEqual([]);
      expect(focused()).toBe(target);
    }
    expect(document.querySelectorAll('.dialog')).toHaveLength(1); // the window itself
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
      const { cell, focus, focused, menuItem } = renderBuilder();
      focus(cell(2, 'number'));
      fireEvent.keyDown(focused(), init);
      expect(menuItem('Move up')).toBeTruthy();
      expect(menuItem('Delete step')).toBeTruthy();
      cleanup();
    }
  });

  it('Cmd/Ctrl+Down and Up carry the step with them', () => {
    const onMoveStep = vi.fn();
    const { cell, focus, press } = renderBuilder({ onMoveStep });
    focus(cell(2, 'command'));
    press('ArrowDown', { metaKey: true });
    press('ArrowUp', { ctrlKey: true });
    expect(onMoveStep.mock.calls).toEqual([['m1', 1, 1], ['m1', 1, -1]]);
  });

  it('a step cannot be carried past either end, and the key is still kept from the app', () => {
    const onMoveStep = vi.fn();
    const { cell, focus, focused } = renderBuilder({ onMoveStep });
    focus(cell(1, 'command'));
    const keys = leaked(() => {
      fireEvent.keyDown(focused(), { key: 'ArrowUp', metaKey: true });
    });
    focus(cell(3, 'command'));
    fireEvent.keyDown(focused(), { key: 'ArrowDown', metaKey: true });
    expect(onMoveStep).not.toHaveBeenCalled();
    expect(keys).toEqual([]);
  });

  it('focus follows a step that was moved, in the same cell', () => {
    vi.useFakeTimers();
    const api = renderBuilder();
    api.focus(api.cell(1, 'command'));
    api.press('ArrowDown', { metaKey: true });
    const [a, b, c] = MACRO.steps;
    api.rerenderWith({ macro: { ...MACRO, steps: [b, a, c] } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell(2, 'command'));
    expect(api.focused().textContent).toContain('Select all');
  });

  it('Delete removes the step and keeps the key from the app', () => {
    const onDeleteStep = vi.fn();
    const { cell, focus, focused } = renderBuilder({ onDeleteStep });
    focus(cell(2, 'number'));
    const keys = leaked(() => {
      fireEvent.keyDown(focused(), { key: 'Delete' });
    });
    expect(onDeleteStep).toHaveBeenCalledWith('m1', 1);
    expect(keys).toEqual([]);
  });

  it('after a delete, focus is on the step that took its place', () => {
    vi.useFakeTimers();
    const api = renderBuilder();
    api.focus(api.cell(2, 'command'));
    api.press('Delete');
    api.rerenderWith({ macro: { ...MACRO, steps: [MACRO.steps[0], MACRO.steps[2]] } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell(2, 'command'));
    expect(api.focused().textContent).toContain('Split');
  });

  it('after deleting the LAST step in the list, focus moves up', () => {
    vi.useFakeTimers();
    const api = renderBuilder();
    api.focus(api.cell(3, 'command'));
    api.press('Backspace');
    api.rerenderWith({ macro: { ...MACRO, steps: MACRO.steps.slice(0, 2) } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell(2, 'command'));
  });

  it('after deleting the only step, focus goes to the head — the table is still there', () => {
    vi.useFakeTimers();
    const one = { ...MACRO, steps: MACRO.steps.slice(0, 1) };
    const api = renderBuilder({ macro: one });
    api.focus(api.cell(1, 'command'));
    api.press('Delete');
    api.rerenderWith({ macro: { ...MACRO, steps: [] } });
    act(() => { vi.runAllTimers(); });
    expect(api.focused()).toBe(api.cell(0, 'grip'));
    // And with no steps Down from the head goes nowhere, but is still kept from the app
    expect(leaked(() => api.press('ArrowDown'))).toEqual([]);
    expect(api.focused()).toBe(api.cell(0, 'grip'));
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
    const { cell, focus, focused } = renderBuilder();
    focus(cell(2, 'command'));
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ' '];
    expect(leaked(() => keys.forEach((key) => fireEvent.keyDown(focused(), { key })))).toEqual([]);
  });

  it('each step says what it is, and where, to assistive tech', () => {
    const { step } = renderBuilder();
    expect(step(2).getAttribute('aria-label')).toBe('Step 2 of 3: Fade In, duration: 2');
    expect(step(1).getAttribute('aria-label')).toBe('Step 1 of 3: Select all');
  });

  it('flat profile: every cell and control is a stop, arrows are left alone, Enter and the shortcuts still work', () => {
    const onDeleteStep = vi.fn();
    const onMoveStep = vi.fn();
    const { stops, cell, stepEdit, focus, focused, press } = renderBuilder({ onDeleteStep, onMoveStep }, 'wcag-flat');
    expect(stops('.macro-builder__step-table-head')).toHaveLength(4);
    expect(stops('.macro-builder__step-list')).toHaveLength(MACRO.steps.length * 6); // 4 cells + 2 controls
    focus(cell(2, 'command'));
    expect(fireEvent.keyDown(focused(), { key: 'ArrowDown' })).toBe(true);
    expect(focused()).toBe(cell(2, 'command'));
    focus(cell(2, 'actions'));
    press('Enter');
    expect(focused()).toBe(stepEdit(2));
    focus(cell(2, 'command'));
    fireEvent.keyDown(focused(), { key: 'ArrowDown', metaKey: true });
    fireEvent.keyDown(focused(), { key: 'Delete' });
    expect(onMoveStep).toHaveBeenCalledWith('m1', 1, 1);
    expect(onDeleteStep).toHaveBeenCalledWith('m1', 1);
  });
});

describe('Edit macro — the commands pane has a fixed width (2026-10-28)', () => {
  it('no splitter: the divider is a line, no stop, nothing to drag', () => {
    const { q, all, pane } = renderBuilder();
    expect(all('.macro-builder__splitter')).toEqual([]);
    expect(all('.macro-builder [role="separator"]')).toEqual([]);
    const divider = q('.macro-builder__divider');
    expect(divider.getAttribute('aria-hidden')).toBe('true');
    expect(divider.hasAttribute('tabindex')).toBe(false);
    expect(pane().style.flex).toBe('0 0 280px');
  });
});

describe('Edit macro keyboard — where focus goes afterwards', () => {
  it('closing a step\'s editor returns focus to the step\'s Command cell', () => {
    vi.useFakeTimers();
    const { cell, focus, press, focused } = renderBuilder();
    focus(cell(2, 'command'));
    press('Enter');
    const close = [...document.querySelectorAll<HTMLElement>('.dialog:not(.macro-builder) button')]
      .find((b) => b.textContent?.trim() === 'Cancel')!;
    fireEvent.click(close);
    act(() => { vi.runAllTimers(); });
    expect(focused()).toBe(cell(2, 'command'));
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

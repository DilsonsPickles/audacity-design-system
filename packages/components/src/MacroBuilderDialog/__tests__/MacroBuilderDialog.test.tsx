import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { MacroBuilderDialog } from '../MacroBuilderDialog';
import type { Command } from '../../SelectCommandDialog';
import type { Macro } from '../../MacroManager/macroTypes';

afterEach(cleanup);

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
    { command: 'Fade In', parameters: 'duration=2' },
    { command: 'Split', parameters: '' },
  ],
};

function renderBuilder(props: Partial<React.ComponentProps<typeof MacroBuilderDialog>> = {}) {
  return render(
    <ThemeProvider>
      <MacroBuilderDialog isOpen macro={MACRO} availableCommands={COMMANDS} {...props} />
    </ThemeProvider>,
  );
}

const commandRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('[data-command-id]'));
/** The names, not the rows' whole text — a row holds its + button too */
const commandNames = (container: HTMLElement) =>
  commandRows(container).map((el) => el.querySelector('.macro-builder__command-name')?.textContent);
const stepRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-step-index]'));
const searchInput = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input[aria-label="Search commands"]')!;
const selectionAdd = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('.macro-builder__selection-add');
const openStepMenu = (container: HTMLElement, stepNumber: number) => {
  fireEvent.click(container.querySelector<HTMLButtonElement>(`button[aria-label="Step ${stepNumber} options"]`)!);
  return (label: string) =>
    Array.from(container.querySelectorAll<HTMLElement>('.context-menu-item, [role="menuitem"]'))
      .find((el) => el.textContent?.trim() === label)!;
};

describe('MacroBuilderDialog', () => {
  it('renders the command list, header band and step cards in one window', () => {
    const { container } = renderBuilder();
    // The commands header holds the search, and nothing else: there is
    // no category picker (removed 2026-09-28)
    const header = container.querySelector('.macro-builder__commands-header');
    expect(header?.querySelector('input[aria-label="Search commands"]')).toBeTruthy();
    expect(header?.querySelector('[aria-haspopup="menu"]')).toBeNull();
    expect(header?.textContent).not.toContain('All commands');
    // The steps pane's header carries the macro's name; below it, the
    // table head labels the columns
    expect(container.querySelector('.macro-builder__steps-header')?.textContent).toContain('Podcast prep');
    expect(container.querySelector('.macro-builder__step-table-head')?.textContent).toBe('StepCommandActions');
    expect(commandNames(container)).toEqual([
      'Select all', 'Next clip', 'Split', 'Join selected clips', 'Fade In',
    ]);
    // Query the text block, not the card — the card also carries the
    // grip/pencil/kebab icon glyphs. No numbering: position is order.
    const stepTexts = stepRows(container).map(
      (el) => el.querySelector('.macro-builder__step-text')?.textContent,
    );
    expect(stepTexts).toEqual(['Select all', 'Fade Induration=2', 'Split']);
    // Each card carries its processing ordinal — position is the order
    const ordinals = stepRows(container).map(
      (el) => el.querySelector('.macro-builder__step-number')?.textContent,
    );
    expect(ordinals).toEqual(['1', '2', '3']);
  });

  it('search filters across all categories', () => {
    const { container } = renderBuilder();
    fireEvent.change(searchInput(container), { target: { value: 'sel' } });
    expect(commandNames(container)).toEqual(['Select all', 'Join selected clips']);
  });

  it('double-clicking a command adds it directly', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.doubleClick(commandRows(container)[4]); // Fade In
    expect(onAddCommand).toHaveBeenCalledTimes(1);
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[4]);
  });

  it('one command is selected at a time — a click replaces the selection', () => {
    const { container } = renderBuilder();
    const selected = () => Array.from(container.querySelectorAll('.macro-builder__command-item--selected'))
      .map((el) => el.querySelector('.macro-builder__command-name')?.textContent);
    fireEvent.click(commandRows(container)[4]);
    expect(selected()).toEqual(['Fade In']);
    fireEvent.click(commandRows(container)[0]);
    expect(selected()).toEqual(['Select all']);
  });

  it('Cmd+click and Shift+click select like a plain click — there is no multi-select', () => {
    const { container } = renderBuilder();
    const selected = () => Array.from(container.querySelectorAll('[data-command-id][aria-selected="true"]'))
      .map((el) => (el as HTMLElement).dataset.commandId);
    fireEvent.click(commandRows(container)[0]);
    fireEvent.click(commandRows(container)[2], { metaKey: true });
    expect(selected()).toEqual(['split']);
    fireEvent.click(commandRows(container)[4], { shiftKey: true });
    expect(selected()).toEqual(['effect:fade-in']);
    // ...and Cmd+click on the selected command does not deselect it
    fireEvent.click(commandRows(container)[4], { ctrlKey: true });
    expect(selected()).toEqual(['effect:fade-in']);
  });

  it('a command row holds nothing but its name — no add button', () => {
    const { container } = renderBuilder();
    fireEvent.click(commandRows(container)[2]);
    expect(container.querySelectorAll('.macro-builder__command-list button')).toHaveLength(0);
    expect(commandRows(container)[2].textContent).toBe('Split');
  });

  it('there is no selection bar any more', () => {
    const { container } = renderBuilder();
    fireEvent.click(commandRows(container)[0]);
    expect(container.querySelector('.macro-builder__selection-summary')).toBeNull();
    // The count it used to show (a command is NAMED "Join selected clips")
    expect(container.textContent).not.toMatch(/\d+ selected/);
    expect(container.textContent).not.toContain('Clear');
  });

  it('a search that hides the selected command clears the selection', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.click(commandRows(container)[4]); // Fade In
    fireEvent.change(searchInput(container), { target: { value: 'split' } });
    expect(container.querySelector('.macro-builder__command-item--selected')).toBeNull();
    // ...so Enter adds what can be SEEN, not the command that was hidden
    fireEvent.keyDown(searchInput(container), { key: 'Enter' });
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual(['Split']);
  });

  it('a search that still shows the selected command keeps it selected', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.click(commandRows(container)[3]); // Join selected clips
    fireEvent.change(searchInput(container), { target: { value: 'sel' } });
    // Results: Select all, Join selected clips — Enter adds the selected one
    fireEvent.keyDown(searchInput(container), { key: 'Enter' });
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual(['Join selected clips']);
  });

  it('the commands pane opens 280px wide', () => {
    const { container } = renderBuilder();
    const pane = container.querySelector<HTMLElement>('.macro-builder__commands-pane')!;
    expect(pane.style.flex).toBe('0 0 280px');
  });

  it('the splitter drag resizes the commands pane; double-click resets it', () => {
    const { container } = renderBuilder();
    const columns = container.querySelector<HTMLElement>('.macro-builder__columns')!;
    const pane = container.querySelector<HTMLElement>('.macro-builder__commands-pane')!;
    // jsdom has no layout — give the panes real horizontal extents
    columns.getBoundingClientRect = () => ({
      top: 0, bottom: 500, left: 0, right: 700, width: 700, height: 500, x: 0, y: 0, toJSON: () => ({}),
    });
    pane.getBoundingClientRect = () => ({
      top: 0, bottom: 500, left: 0, right: 300, width: 300, height: 500, x: 0, y: 0, toJSON: () => ({}),
    });
    const splitter = container.querySelector<HTMLElement>('.macro-builder__splitter')!;
    fireEvent.mouseDown(splitter, { button: 0, clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 380 });
    fireEvent.mouseUp(document);
    expect(pane.style.flex).toBe('0 0 380px');
    // Clamped at the minimum on the way down
    fireEvent.mouseDown(splitter, { button: 0, clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 0 });
    fireEvent.mouseUp(document);
    expect(pane.style.flex).toBe('0 0 180px');
    fireEvent.doubleClick(splitter);
    // Reset returns to the default
    expect(pane.style.flex).toBe('0 0 280px');
  });

  it('Enter on a command adds it', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.keyDown(commandRows(container)[2], { key: 'Enter' });
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual(['Split']);
  });

  it('arrow keys walk the selection through the list; ArrowDown from search enters it', () => {
    const { container } = renderBuilder();
    // Drop from the search into the first row
    fireEvent.keyDown(searchInput(container), { key: 'ArrowDown' });
    expect(commandRows(container)[0].getAttribute('aria-selected')).toBe('true');
    // Walk down two, up one
    fireEvent.keyDown(commandRows(container)[0], { key: 'ArrowDown' });
    fireEvent.keyDown(commandRows(container)[1], { key: 'ArrowDown' });
    expect(commandRows(container)[2].getAttribute('aria-selected')).toBe('true');
    expect(commandRows(container)[1].getAttribute('aria-selected')).toBe('false');
    fireEvent.keyDown(commandRows(container)[2], { key: 'ArrowUp' });
    expect(commandRows(container)[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(commandRows(container)[1], { key: 'ArrowUp' });
    expect(commandRows(container)[0].getAttribute('aria-selected')).toBe('true');
    // The list cycles, like the app's other groups: ArrowUp on the
    // first row goes round to the last (it used to stay put)
    fireEvent.keyDown(commandRows(container)[0], { key: 'ArrowUp' });
    const rows = commandRows(container);
    expect(rows[rows.length - 1].getAttribute('aria-selected')).toBe('true');
    expect(rows[0].getAttribute('aria-selected')).toBe('false');
  });

  it('Enter in the search field adds the first visible match', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.change(searchInput(container), { target: { value: 'join' } });
    fireEvent.keyDown(searchInput(container), { key: 'Enter' });
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[3]);
  });

  it('the row menu moves its step up and down', () => {
    const onMoveStep = vi.fn();
    const { container } = renderBuilder({ onMoveStep });
    const item = openStepMenu(container, 2);
    fireEvent.click(item('Move up'));
    expect(onMoveStep).toHaveBeenCalledWith('m1', 1, -1);
    const item2 = openStepMenu(container, 2);
    fireEvent.click(item2('Move down'));
    expect(onMoveStep).toHaveBeenCalledWith('m1', 1, 1);
  });

  it('Move up is inert on the first step, Move down on the last', () => {
    const onMoveStep = vi.fn();
    const { container } = renderBuilder({ onMoveStep });
    fireEvent.click(openStepMenu(container, 1)('Move up'));
    fireEvent.click(openStepMenu(container, 3)('Move down'));
    expect(onMoveStep).not.toHaveBeenCalled();
  });

  it('the row menu deletes its step', () => {
    const onDeleteStep = vi.fn();
    const { container } = renderBuilder({ onDeleteStep });
    fireEvent.click(openStepMenu(container, 2)('Delete step'));
    expect(onDeleteStep).toHaveBeenCalledWith('m1', 1);
  });

  it('the card pencil opens the parameters editor for its step', () => {
    const getCommandParameters = vi.fn(() => [
      { key: 'duration', label: 'Duration', type: 'number' as const, defaultValue: '1' },
    ]);
    const { container } = renderBuilder({ getCommandParameters });
    fireEvent.click(container.querySelector<HTMLButtonElement>('button[aria-label="Edit step 2"]')!);
    expect(getCommandParameters).toHaveBeenCalledWith('Fade In');
  });

  it('reorders steps by dragging a row', () => {
    const onReorderStep = vi.fn();
    const { container } = renderBuilder({ onReorderStep });
    // jsdom has no layout — give each row a real vertical extent (40px pitch)
    const rows = stepRows(container);
    rows.forEach((row, i) => {
      row.getBoundingClientRect = () => ({
        top: i * 40, bottom: i * 40 + 32, left: 0, right: 300,
        width: 300, height: 32, x: 0, y: i * 40,
        toJSON: () => ({}),
      });
    });

    fireEvent.mouseDown(rows[0], { button: 0, clientY: 10 });
    // Under the 3px threshold — still a click, no reorder
    fireEvent.mouseMove(document, { clientY: 11 });
    expect(onReorderStep).not.toHaveBeenCalled();
    // Drag into the second row's bounds
    fireEvent.mouseMove(document, { clientY: 50 });
    expect(onReorderStep).toHaveBeenCalledWith('m1', 0, 1);
    // Continue into the third row — the dragged index followed the swap
    fireEvent.mouseMove(document, { clientY: 90 });
    expect(onReorderStep).toHaveBeenCalledWith('m1', 1, 2);
    fireEvent.mouseUp(document);

    // After release, further movement does nothing
    onReorderStep.mockClear();
    fireEvent.mouseMove(document, { clientY: 10 });
    expect(onReorderStep).not.toHaveBeenCalled();
  });

  it('the macro menu\'s "Remove all steps" clears the macro', () => {
    const onClearSteps = vi.fn();
    const { container } = renderBuilder({ onClearSteps });
    fireEvent.click(container.querySelector<HTMLButtonElement>('button[aria-label="Macro options"]')!);
    const item = Array.from(container.querySelectorAll<HTMLElement>('.context-menu-item, [role="menuitem"]'))
      .find((el) => el.textContent?.trim() === 'Remove all steps')!;
    fireEvent.click(item);
    expect(onClearSteps).toHaveBeenCalledWith('m1');
  });

  it('adding by double-click or Enter puts the step on the END — no index is passed', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.doubleClick(commandRows(container)[4]);
    fireEvent.keyDown(commandRows(container)[2], { key: 'Enter' });
    expect(onAddCommand.mock.calls).toEqual([['m1', COMMANDS[4]], ['m1', COMMANDS[2]]]);
  });

  it('shows the empty-state hint when the macro has no steps', () => {
    const { container } = renderBuilder({ macro: { id: 'm2', name: 'Empty', steps: [] } });
    expect(container.querySelector('.macro-builder__steps-hint')?.textContent).toBe(
      'Drag a command here, or double-click it, to add it to your macro',
    );
  });
});

describe('MacroBuilderDialog — dragging a command into the steps', () => {
  afterEach(() => {
    // A drag that a test left in flight would leave these behind
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  });

  const rect = (left: number, top: number, width: number, height: number) => () => ({
    left, top, width, height, right: left + width, bottom: top + height, x: left, y: top,
    toJSON: () => ({}),
  });

  /** jsdom has no layout: commands on the left (0–280), the steps pane
   *  on the right (300–800, from y=0), its rows 44px apart from y=100. */
  function layOut(container: HTMLElement) {
    container.querySelector<HTMLElement>('.macro-builder__steps-pane')!.getBoundingClientRect = rect(300, 0, 500, 600);
    container.querySelector<HTMLElement>('.macro-builder__step-list')!.getBoundingClientRect = rect(300, 100, 500, 500);
    stepRows(container).forEach((row, i) => {
      row.getBoundingClientRect = rect(300, 100 + i * 44, 500, 44);
    });
  }
  const ghost = () => document.querySelector<HTMLElement>('.macro-builder__drag-ghost');
  const dropLines = (container: HTMLElement) => stepRows(container).map((row) =>
    row.classList.contains('macro-builder__step--drop-before') ? 'before'
      : row.classList.contains('macro-builder__step--drop-after') ? 'after' : '-');

  function startDrag(container: HTMLElement, commandIndex: number) {
    layOut(container);
    fireEvent.mouseDown(commandRows(container)[commandIndex], { button: 0, clientX: 100, clientY: 50 });
  }

  it('dropping on the top half of a step puts the command in FRONT of it', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    startDrag(container, 4); // Fade In
    fireEvent.mouseMove(document, { clientX: 500, clientY: 100 + 44 + 10 }); // top half of step 2
    expect(dropLines(container)).toEqual(['-', 'before', '-']);
    fireEvent.mouseUp(document);
    expect(onAddCommand).toHaveBeenCalledTimes(1);
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[4], undefined, 1);
  });

  it('dropping on the bottom half puts it AFTER that step', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    startDrag(container, 4);
    fireEvent.mouseMove(document, { clientX: 500, clientY: 100 + 44 + 34 }); // bottom half of step 2
    expect(dropLines(container)).toEqual(['-', '-', 'before']);
    fireEvent.mouseUp(document);
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[4], undefined, 2);
  });

  it('dropping below the last step puts it on the end', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    startDrag(container, 2);
    fireEvent.mouseMove(document, { clientX: 500, clientY: 500 });
    expect(dropLines(container)).toEqual(['-', '-', 'after']);
    fireEvent.mouseUp(document);
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[2], undefined, 3);
  });

  it('dropping above the first step — even over the table head — puts it at the top', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    startDrag(container, 2);
    fireEvent.mouseMove(document, { clientX: 500, clientY: 60 });
    expect(dropLines(container)).toEqual(['before', '-', '-']);
    fireEvent.mouseUp(document);
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[2], undefined, 0);
  });

  it('into a macro with no steps: the whole well is the target', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand, macro: { ...MACRO, steps: [] } });
    startDrag(container, 0);
    fireEvent.mouseMove(document, { clientX: 500, clientY: 300 });
    expect(container.querySelector('.macro-builder__step-list')!.className)
      .toContain('macro-builder__step-list--drop-target');
    fireEvent.mouseUp(document);
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[0], undefined, 0);
  });

  it('nothing is added until the drop', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    startDrag(container, 4);
    fireEvent.mouseMove(document, { clientX: 500, clientY: 120 });
    fireEvent.mouseMove(document, { clientX: 500, clientY: 200 });
    fireEvent.mouseMove(document, { clientX: 500, clientY: 400 });
    expect(onAddCommand).not.toHaveBeenCalled();
    fireEvent.mouseUp(document);
    expect(onAddCommand).toHaveBeenCalledTimes(1);
  });

  it('letting go anywhere but the steps adds nothing', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    startDrag(container, 4);
    fireEvent.mouseMove(document, { clientX: 500, clientY: 200 }); // over the steps…
    fireEvent.mouseMove(document, { clientX: 120, clientY: 200 }); // …and back over the commands
    expect(dropLines(container)).toEqual(['-', '-', '-']);
    expect(ghost()!.className).toContain('macro-builder__drag-ghost--no-drop');
    fireEvent.mouseUp(document);
    expect(onAddCommand).not.toHaveBeenCalled();
    expect(ghost()).toBeNull();
  });

  it('Escape abandons the drag — and is kept from the dialog, which would close on it', () => {
    const onAddCommand = vi.fn();
    const onClose = vi.fn();
    const { container } = renderBuilder({ onAddCommand, onClose });
    startDrag(container, 4);
    fireEvent.mouseMove(document, { clientX: 500, clientY: 200 });
    expect(ghost()).not.toBeNull();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(ghost()).toBeNull();
    expect(dropLines(container)).toEqual(['-', '-', '-']);
    expect(onClose).not.toHaveBeenCalled();
    // The drag is over: letting go now does nothing
    fireEvent.mouseUp(document);
    expect(onAddCommand).not.toHaveBeenCalled();
  });

  it('Escape with no drag in flight is left alone', () => {
    const onClose = vi.fn();
    const { container } = renderBuilder({ onClose });
    startDrag(container, 4); // pressed, not yet moved
    container.querySelector<HTMLInputElement>('input')!.focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('a press that barely moves is a click, not a drag', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    startDrag(container, 4);
    fireEvent.mouseMove(document, { clientX: 102, clientY: 51 });
    expect(ghost()).toBeNull();
    fireEvent.mouseUp(document);
    expect(onAddCommand).not.toHaveBeenCalled();
  });

  it('the ghost names the command and follows the pointer', () => {
    const { container } = renderBuilder();
    startDrag(container, 3);
    fireEvent.mouseMove(document, { clientX: 420, clientY: 210 });
    expect(ghost()!.textContent).toBe('Join selected clips');
    expect(ghost()!.style.left).toBe('420px');
    expect(ghost()!.style.top).toBe('210px');
    expect(ghost()!.getAttribute('aria-hidden')).toBe('true');
    fireEvent.mouseUp(document);
  });

  it('the dropped command is left selected; the drag tidies up after itself', () => {
    const { container } = renderBuilder();
    startDrag(container, 4);
    fireEvent.mouseMove(document, { clientX: 500, clientY: 200 });
    expect(document.body.style.cursor).toBe('grabbing');
    fireEvent.mouseUp(document);
    expect(commandRows(container)[4].getAttribute('aria-selected')).toBe('true');
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
    // ...and its listeners are gone: moving again raises no ghost
    fireEvent.mouseMove(document, { clientX: 500, clientY: 300 });
    expect(ghost()).toBeNull();
  });

  it('only the left button drags', () => {
    const { container } = renderBuilder();
    layOut(container);
    fireEvent.mouseDown(commandRows(container)[4], { button: 2, clientX: 100, clientY: 50 });
    fireEvent.mouseMove(document, { clientX: 500, clientY: 200 });
    expect(ghost()).toBeNull();
  });
});

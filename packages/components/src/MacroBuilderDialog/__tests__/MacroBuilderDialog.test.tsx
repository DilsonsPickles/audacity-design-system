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
    // The commands header holds the category dropdown + search side by side
    const header = container.querySelector('.macro-builder__commands-header');
    expect(header?.querySelector('.macro-builder__scope')?.textContent).toContain('All commands');
    expect(header?.querySelector('input[aria-label="Search commands"]')).toBeTruthy();
    // The full-width band above both panes carries the macro's name
    expect(container.querySelector('.macro-builder__header')?.textContent).toContain('Podcast prep');
    expect(commandRows(container).map((el) => el.textContent)).toEqual([
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

  it('narrows the command list from the scope menu, showing the scope on the field', () => {
    const { container } = renderBuilder();
    fireEvent.click(container.querySelector<HTMLButtonElement>('.macro-builder__scope')!);
    const clipsItem = Array.from(container.querySelectorAll<HTMLElement>('.context-menu-item, [role="menuitem"]'))
      .find((el) => el.textContent?.trim() === 'Clips')!;
    fireEvent.click(clipsItem);
    expect(commandRows(container).map((el) => el.textContent)).toEqual(['Split', 'Join selected clips']);
    expect(container.querySelector('.macro-builder__scope')?.textContent).toContain('Clips');
  });

  it('search filters across all categories', () => {
    const { container } = renderBuilder();
    fireEvent.change(searchInput(container), { target: { value: 'sel' } });
    expect(commandRows(container).map((el) => el.textContent)).toEqual(['Select all', 'Join selected clips']);
  });

  it('double-clicking a command adds it directly', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.doubleClick(commandRows(container)[4]); // Fade In
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[4]);
  });

  it('double-clicking a member of a multi-selection adds the whole selection', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.click(commandRows(container)[4]); // Fade In
    fireEvent.click(commandRows(container)[0], { metaKey: true }); // Select all
    // The double-click's first half is a plain click that collapses the
    // selection — the dblclick must still add what it landed on
    fireEvent.click(commandRows(container)[0]);
    fireEvent.doubleClick(commandRows(container)[0]);
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual(['Fade In', 'Select all']);
  });

  it('Cmd+click builds a multi-selection spanning categories, added in click order', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    // Pick one command, then narrow to another category and pick two more
    fireEvent.click(commandRows(container)[4]); // Fade In (Effects)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.macro-builder__scope')!);
    const clipsItem = Array.from(container.querySelectorAll<HTMLElement>('.context-menu-item, [role="menuitem"]'))
      .find((el) => el.textContent?.trim() === 'Clips')!;
    fireEvent.click(clipsItem);
    fireEvent.click(commandRows(container)[0], { metaKey: true }); // Split
    fireEvent.click(commandRows(container)[1], { metaKey: true }); // Join selected clips
    // The selection bar shows how many its Add will append
    expect(container.querySelector('.macro-builder__selection-summary')?.textContent).toContain('3 selected');
    fireEvent.click(selectionAdd(container)!);
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual([
      'Fade In', 'Split', 'Join selected clips',
    ]);
    // Selection clears after the add; the bar stays, disabled
    expect(container.querySelector('.macro-builder__selection-summary')?.textContent).toContain('0 selected');
    expect(selectionAdd(container)!.disabled).toBe(true);
  });

  it('Shift+click extends the selection through the visible range', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.click(commandRows(container)[1]); // Next clip
    fireEvent.click(commandRows(container)[3], { shiftKey: true }); // through Join
    fireEvent.click(selectionAdd(container)!);
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual([
      'Next clip', 'Split', 'Join selected clips',
    ]);
  });

  it('the selection bar is always visible — Add disabled until something is selected', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    expect(container.querySelector('.macro-builder__selection-summary')?.textContent).toContain('0 selected');
    expect(selectionAdd(container)!.disabled).toBe(true);
    // Clear only appears when there is something to clear
    expect(container.querySelector('.macro-builder__selection-clear')).toBeNull();
    fireEvent.click(commandRows(container)[4]); // Fade In
    expect(container.querySelector('.macro-builder__selection-summary')?.textContent).toContain('1 selected');
    expect(selectionAdd(container)!.disabled).toBe(false);
    fireEvent.click(selectionAdd(container)!);
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[4]);
    expect(selectionAdd(container)!.disabled).toBe(true);
  });

  it('the selection bar survives scoping away from a hidden selection, and Clear empties it', () => {
    const { container } = renderBuilder();
    fireEvent.click(commandRows(container)[4]); // Fade In (Effects)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.macro-builder__scope')!);
    const clipsItem = Array.from(container.querySelectorAll<HTMLElement>('.context-menu-item, [role="menuitem"]'))
      .find((el) => el.textContent?.trim() === 'Clips')!;
    fireEvent.click(clipsItem);
    expect(container.querySelector('.macro-builder__selection-summary')?.textContent).toContain('1 selected');
    fireEvent.click(container.querySelector<HTMLButtonElement>('.macro-builder__selection-clear')!);
    expect(container.querySelector('.macro-builder__selection-summary')?.textContent).toContain('0 selected');
    expect(container.querySelector('.macro-builder__selection-clear')).toBeNull();
  });

  it('Cmd+click on a selected command removes it from the selection', () => {
    const { container } = renderBuilder();
    fireEvent.click(commandRows(container)[0]);
    fireEvent.click(commandRows(container)[1], { metaKey: true });
    fireEvent.click(commandRows(container)[0], { metaKey: true }); // deselect first
    const selected = Array.from(container.querySelectorAll('.macro-builder__command-item--selected'))
      .map((el) => el.textContent);
    expect(selected).toEqual(['Next clip']);
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
    expect(pane.style.flex).toBe('');
  });

  it('Enter on a selected command row adds it — or the whole selection it belongs to', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    // Single: Enter on a focused row adds that row's command
    fireEvent.click(commandRows(container)[2]); // Split
    fireEvent.keyDown(commandRows(container)[2], { key: 'Enter' });
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual(['Split']);
    // Multi: Enter on any selected row adds the whole selection in click order
    onAddCommand.mockClear();
    fireEvent.click(commandRows(container)[4]); // Fade In
    fireEvent.click(commandRows(container)[0], { metaKey: true }); // Select all
    fireEvent.keyDown(commandRows(container)[0], { key: 'Enter' });
    expect(onAddCommand.mock.calls.map((call) => call[1].name)).toEqual(['Fade In', 'Select all']);
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
    // Pinned at the top — ArrowUp on the first row stays put
    fireEvent.keyDown(commandRows(container)[1], { key: 'ArrowUp' });
    fireEvent.keyDown(commandRows(container)[0], { key: 'ArrowUp' });
    expect(commandRows(container)[0].getAttribute('aria-selected')).toBe('true');
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

  it('shows the empty-state hint when the macro has no steps', () => {
    const { container } = renderBuilder({ macro: { id: 'm2', name: 'Empty', steps: [] } });
    expect(container.querySelector('.macro-builder__steps-hint')?.textContent).toBe(
      'Double-click a command to add it to your macro',
    );
  });
});

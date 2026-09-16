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
const transferButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('button[aria-label="Add command to macro"]')!;
const trashButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('button[aria-label="Remove selected step"]')!;
const upButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('button[aria-label="Move step up"]')!;
const downButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('button[aria-label="Move step down"]')!;

describe('MacroBuilderDialog', () => {
  it('renders the command list, category dropdown and step list in one window', () => {
    const { container } = renderBuilder();
    // The category filter is a dropdown atop the commands column
    const dropdown = container.querySelector('.macro-builder__category-dropdown');
    expect(dropdown?.textContent).toContain('All commands');
    expect(commandRows(container).map((el) => el.textContent)).toEqual([
      'Select all', 'Next clip', 'Split', 'Join selected clips', 'Fade In',
    ]);
    // Query the text block, not the row — the row's textContent also
    // carries the pencil button's (invisible) icon glyph
    const stepTexts = stepRows(container).map(
      (el) => el.querySelector('.macro-builder__step-text')?.textContent,
    );
    expect(stepTexts).toEqual(['1. Select all', '2. Fade Induration=2', '3. Split']);
    // The search field is always present — no picker window to open
    expect(searchInput(container)).toBeTruthy();
  });

  it('narrows the command list from the category dropdown', () => {
    const { container, baseElement } = renderBuilder();
    const trigger = container.querySelector<HTMLButtonElement>('.macro-builder__category-dropdown button')!;
    fireEvent.click(trigger);
    // The dropdown menu portals to document.body — scope to this render's baseElement
    const clipsOption = Array.from(baseElement.querySelectorAll<HTMLElement>('.dropdown__option'))
      .find((el) => el.textContent?.trim() === 'Clips')!;
    fireEvent.click(clipsOption);
    expect(commandRows(container).map((el) => el.textContent)).toEqual(['Split', 'Join selected clips']);
  });

  it('search filters across all categories', () => {
    const { container } = renderBuilder();
    fireEvent.change(searchInput(container), { target: { value: 'sel' } });
    expect(commandRows(container).map((el) => el.textContent)).toEqual(['Select all', 'Join selected clips']);
  });

  it('the transfer button adds the highlighted command without parameters', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    expect(transferButton(container).disabled).toBe(true);
    fireEvent.click(commandRows(container)[2]); // Split
    expect(transferButton(container).disabled).toBe(false);
    fireEvent.click(transferButton(container));
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[2]);
  });

  it('double-clicking a command adds it directly', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.doubleClick(commandRows(container)[4]); // Fade In
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[4]);
  });

  it('Enter in the search field adds the first visible match', () => {
    const onAddCommand = vi.fn();
    const { container } = renderBuilder({ onAddCommand });
    fireEvent.change(searchInput(container), { target: { value: 'join' } });
    fireEvent.keyDown(searchInput(container), { key: 'Enter' });
    expect(onAddCommand).toHaveBeenCalledWith('m1', COMMANDS[3]);
  });

  it('reorder buttons move the selected step and follow it', () => {
    const onMoveStep = vi.fn();
    const { container } = renderBuilder({ onMoveStep });
    expect(upButton(container).disabled).toBe(true);
    expect(downButton(container).disabled).toBe(true);
    fireEvent.click(stepRows(container)[1]);
    fireEvent.click(upButton(container));
    expect(onMoveStep).toHaveBeenCalledWith('m1', 1, -1);
    // Selection followed the step to index 0 — up is now pinned
    expect(upButton(container).disabled).toBe(true);
  });

  it('down is disabled on the last step', () => {
    const { container } = renderBuilder();
    fireEvent.click(stepRows(container)[2]);
    expect(downButton(container).disabled).toBe(true);
    expect(upButton(container).disabled).toBe(false);
  });

  it('the trash removes the selected step and clears the selection', () => {
    const onDeleteStep = vi.fn();
    const { container } = renderBuilder({ onDeleteStep });
    expect(trashButton(container).disabled).toBe(true);
    fireEvent.click(stepRows(container)[1]);
    fireEvent.click(trashButton(container));
    expect(onDeleteStep).toHaveBeenCalledWith('m1', 1);
    expect(trashButton(container).disabled).toBe(true);
  });

  it('the step pencil opens the parameters editor for that step', () => {
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

  it('a drag on the row pencil never starts a reorder', () => {
    const onReorderStep = vi.fn();
    const { container } = renderBuilder({ onReorderStep });
    const pencil = container.querySelector('button[aria-label="Edit step 1"]')!;
    fireEvent.mouseDown(pencil, { button: 0, clientY: 10 });
    fireEvent.mouseMove(document, { clientY: 90 });
    fireEvent.mouseUp(document);
    expect(onReorderStep).not.toHaveBeenCalled();
  });

  it('shows the empty-state hint when the macro has no steps', () => {
    const { container } = renderBuilder({ macro: { id: 'm2', name: 'Empty', steps: [] } });
    expect(container.querySelector('.macro-builder__steps-hint')?.textContent).toBe(
      'Build your macro by adding commands to this list',
    );
  });
});

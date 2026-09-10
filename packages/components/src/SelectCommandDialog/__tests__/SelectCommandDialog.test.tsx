import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { SelectCommandDialog, type Command } from '../SelectCommandDialog';

afterEach(cleanup);

const COMMANDS: Command[] = [
  { id: 'select-all', name: 'Select all', category: 'Selection' },
  { id: 'select-next-clip', name: 'Next clip', category: 'Selection' },
  { id: 'split', name: 'Split', category: 'Clips' },
  { id: 'join', name: 'Join selected clips', category: 'Clips' },
  { id: 'effect:fade-in', name: 'Fade In', category: 'Effects' },
];

function renderDialog(props: Partial<React.ComponentProps<typeof SelectCommandDialog>> = {}) {
  return render(
    <ThemeProvider>
      <SelectCommandDialog isOpen commands={COMMANDS} {...props} />
    </ThemeProvider>,
  );
}

const railItems = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('.select-command-dialog__rail-item'));
const railLabel = (el: HTMLElement) => el.querySelector('.select-command-dialog__rail-label')?.textContent;
const railCount = (el: HTMLElement) => el.querySelector('.select-command-dialog__rail-count')?.textContent;
const options = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[role="option"]')).map((el) => el.textContent);

describe('SelectCommandDialog', () => {
  it('lists categories in data order with counts, All first', () => {
    const { container } = renderDialog();
    const items = railItems(container);
    expect(items.map(railLabel)).toEqual(['All commands', 'Selection', 'Clips', 'Effects']);
    expect(items.map(railCount)).toEqual(['5', '2', '2', '1']);
  });

  it('shows every command grouped under category headers by default', () => {
    const { container } = renderDialog();
    const headers = Array.from(container.querySelectorAll('.select-command-dialog__group-header')).map((el) => el.textContent);
    expect(headers).toEqual(['Selection', 'Clips', 'Effects']);
    expect(options(container)).toEqual(['Select all', 'Next clip', 'Split', 'Join selected clips', 'Fade In']);
  });

  it('narrows to one category from the rail and drops the headers', () => {
    const { container } = renderDialog();
    fireEvent.click(railItems(container).find((el) => railLabel(el) === 'Clips')!);
    expect(options(container)).toEqual(['Split', 'Join selected clips']);
    expect(container.querySelector('.select-command-dialog__group-header')).toBeNull();
  });

  it('searches across all categories and updates the rail counts', () => {
    const { container } = renderDialog();
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search commands"]')!;
    fireEvent.change(input, { target: { value: 'sel' } });
    // "Select all" and "Join selected clips" match
    expect(options(container)).toEqual(['Select all', 'Join selected clips']);
    const items = railItems(container);
    expect(items.map(railCount)).toEqual(['2', '1', '1', '0']);
    // Categories with no hits are disabled
    expect(items.find((el) => railLabel(el) === 'Effects')!.disabled).toBe(true);
  });

  it('search respects the selected category', () => {
    const { container } = renderDialog();
    fireEvent.click(railItems(container).find((el) => railLabel(el) === 'Selection')!);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search commands"]')!;
    fireEvent.change(input, { target: { value: 'sel' } });
    expect(options(container)).toEqual(['Select all']);
  });

  it('shows an empty state when nothing matches', () => {
    const { container } = renderDialog();
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search commands"]')!;
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(container.querySelector('.select-command-dialog__empty')?.textContent).toContain('zzz');
  });

  it('adds the highlighted command via the footer button', () => {
    const onSelectCommand = vi.fn();
    const onClose = vi.fn();
    const { container, getByText } = renderDialog({ onSelectCommand, onClose });
    fireEvent.click(container.querySelector('[data-command-id="split"]')!);
    fireEvent.click(getByText('Add command'));
    expect(onSelectCommand).toHaveBeenCalledWith(COMMANDS[2]);
    expect(onClose).toHaveBeenCalled();
  });

  it('double-clicking a command adds it immediately', () => {
    const onSelectCommand = vi.fn();
    const { container } = renderDialog({ onSelectCommand });
    fireEvent.doubleClick(container.querySelector('[data-command-id="effect:fade-in"]')!);
    expect(onSelectCommand).toHaveBeenCalledWith(COMMANDS[4]);
  });

  it('Enter in the search field adds the highlighted command', () => {
    const onSelectCommand = vi.fn();
    const { container } = renderDialog({ onSelectCommand });
    fireEvent.click(container.querySelector('[data-command-id="join"]')!);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search commands"]')!;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectCommand).toHaveBeenCalledWith(COMMANDS[3]);
  });

  it('keeps Add command disabled until something is highlighted', () => {
    const { getByText } = renderDialog();
    expect((getByText('Add command').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

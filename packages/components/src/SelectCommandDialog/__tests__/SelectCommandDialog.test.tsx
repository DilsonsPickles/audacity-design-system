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
const rows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-command-id]')).map((el) => el.textContent);
const searchInput = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input[aria-label="Search commands"]')!;

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
    expect(rows(container)).toEqual(['Select all', 'Next clip', 'Split', 'Join selected clips', 'Fade In']);
  });

  it('narrows to one category from the rail and drops the headers', () => {
    const { container } = renderDialog();
    fireEvent.click(railItems(container).find((el) => railLabel(el) === 'Clips')!);
    expect(rows(container)).toEqual(['Split', 'Join selected clips']);
    expect(container.querySelector('.select-command-dialog__group-header')).toBeNull();
  });

  it('searches across all categories and updates the rail counts', () => {
    const { container } = renderDialog();
    fireEvent.change(searchInput(container), { target: { value: 'sel' } });
    // "Select all" and "Join selected clips" match
    expect(rows(container)).toEqual(['Select all', 'Join selected clips']);
    const items = railItems(container);
    expect(items.map(railCount)).toEqual(['2', '1', '1', '0']);
    // Categories with no hits are disabled
    expect(items.find((el) => railLabel(el) === 'Effects')!.disabled).toBe(true);
  });

  it('search respects the selected category', () => {
    const { container } = renderDialog();
    fireEvent.click(railItems(container).find((el) => railLabel(el) === 'Selection')!);
    fireEvent.change(searchInput(container), { target: { value: 'sel' } });
    expect(rows(container)).toEqual(['Select all']);
  });

  it('shows an empty state when nothing matches', () => {
    const { container } = renderDialog();
    fireEvent.change(searchInput(container), { target: { value: 'zzz' } });
    expect(container.querySelector('.select-command-dialog__empty')?.textContent).toContain('zzz');
  });

  it('clicking a command reports it and leaves closing to the consumer', () => {
    const onSelectCommand = vi.fn();
    const onClose = vi.fn();
    const { container } = renderDialog({ onSelectCommand, onClose });
    fireEvent.click(container.querySelector('[data-command-id="split"]')!);
    expect(onSelectCommand).toHaveBeenCalledWith(COMMANDS[2]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the search query across a pick and resets it once closed', () => {
    const { container, rerender } = renderDialog();
    fireEvent.change(searchInput(container), { target: { value: 'split' } });
    fireEvent.click(container.querySelector('[data-command-id="split"]')!);
    expect(searchInput(container).value).toBe('split');
    rerender(
      <ThemeProvider>
        <SelectCommandDialog isOpen={false} commands={COMMANDS} />
      </ThemeProvider>,
    );
    rerender(
      <ThemeProvider>
        <SelectCommandDialog isOpen commands={COMMANDS} />
      </ThemeProvider>,
    );
    expect(searchInput(container).value).toBe('');
  });

  it('Enter in the search field picks the first visible match', () => {
    const onSelectCommand = vi.fn();
    const { container } = renderDialog({ onSelectCommand });
    fireEvent.change(searchInput(container), { target: { value: 'fade' } });
    fireEvent.keyDown(searchInput(container), { key: 'Enter' });
    expect(onSelectCommand).toHaveBeenCalledWith(COMMANDS[4]);
  });

  it('Enter with no matches does nothing', () => {
    const onSelectCommand = vi.fn();
    const { container } = renderDialog({ onSelectCommand });
    fireEvent.change(searchInput(container), { target: { value: 'zzz' } });
    fireEvent.keyDown(searchInput(container), { key: 'Enter' });
    expect(onSelectCommand).not.toHaveBeenCalled();
  });

  it('has no footer — picking is the commitment', () => {
    const { container, queryByText } = renderDialog();
    expect(queryByText('Add command')).toBeNull();
    expect(container.querySelector('.select-command-dialog__footer')).toBeNull();
  });
});

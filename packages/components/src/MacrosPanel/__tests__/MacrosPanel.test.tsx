import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { MacrosPanel } from '../MacrosPanel';
import type { Macro } from '../../MacroManager/macroTypes';

afterEach(cleanup);

const MACROS: Macro[] = [
  { id: 'm1', name: 'Fade ends', steps: [{ command: 'Fade In', parameters: '' }, { command: 'Fade Out', parameters: '' }] },
  { id: 'm2', name: 'MP3 conversion', steps: [{ command: 'Export as MP3', parameters: '' }] },
];

function renderPanel(props: Partial<React.ComponentProps<typeof MacrosPanel>> = {}) {
  return render(
    <ThemeProvider>
      <MacrosPanel macros={MACROS} {...props} />
    </ThemeProvider>,
  );
}

describe('MacrosPanel', () => {
  it('renders a row per macro', () => {
    const { container } = renderPanel();
    const rows = container.querySelectorAll('.macros-panel__row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Fade ends');
    expect(rows[1].textContent).toContain('MP3 conversion');
  });

  it('shows an empty state when there are no macros', () => {
    const { container } = renderPanel({ macros: [] });
    expect(container.querySelector('.macros-panel__empty')).not.toBeNull();
    expect(container.querySelectorAll('.macros-panel__row')).toHaveLength(0);
  });

  it('runs a macro on the project via the row play button', () => {
    const onRunOnProject = vi.fn();
    const { container } = renderPanel({ onRunOnProject });
    const playButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Run Fade ends on current project"]',
    );
    expect(playButton).not.toBeNull();
    fireEvent.click(playButton!);
    expect(onRunOnProject).toHaveBeenCalledWith('m1');
  });

  it('runs a macro on files via the split button caret menu', () => {
    const onRunOnFiles = vi.fn();
    const { container } = renderPanel({ onRunOnFiles });
    fireEvent.click(container.querySelector('button[aria-label="Run MP3 conversion options"]')!);
    const applyItem = Array.from(container.querySelectorAll('.context-menu-item, [role="menuitem"]'))
      .find((el) => el.textContent?.includes('Apply to files'));
    fireEvent.click(applyItem!);
    expect(onRunOnFiles).toHaveBeenCalledWith('m2');
  });

  it('opens the editor when a row is clicked (after the double-click window)', () => {
    vi.useFakeTimers();
    try {
      const onEditMacro = vi.fn();
      const { container } = renderPanel({ onEditMacro });
      fireEvent.click(container.querySelector('[data-macro-id="m1"]')!);
      // Deferred so a double-click can cancel it
      expect(onEditMacro).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(onEditMacro).toHaveBeenCalledWith('m1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('double-clicking a row runs the macro on the project instead of editing', () => {
    vi.useFakeTimers();
    try {
      const onEditMacro = vi.fn();
      const onRunOnProject = vi.fn();
      const { container } = renderPanel({ onEditMacro, onRunOnProject });
      const row = container.querySelector('[data-macro-id="m1"]')!;
      // A real double-click fires click, click, dblclick
      fireEvent.click(row);
      fireEvent.click(row);
      fireEvent.doubleClick(row);
      expect(onRunOnProject).toHaveBeenCalledWith('m1');
      vi.runAllTimers();
      expect(onEditMacro).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not open the editor when a row action button is clicked', () => {
    const onEditMacro = vi.fn();
    const onRunOnProject = vi.fn();
    const { container } = renderPanel({ onEditMacro, onRunOnProject });
    fireEvent.click(container.querySelector('button[aria-label="Run Fade ends on current project"]')!);
    expect(onRunOnProject).toHaveBeenCalled();
    expect(onEditMacro).not.toHaveBeenCalled();
  });

  it('offers Edit / Rename / Export / Delete in the row menu', () => {
    const onDeleteMacro = vi.fn();
    const { container } = renderPanel({ onDeleteMacro });
    fireEvent.click(container.querySelector('button[aria-label="Fade ends options"]')!);

    const items = Array.from(container.querySelectorAll('.context-menu-item, [role="menuitem"]'));
    const labels = items.map((el) => el.textContent);
    expect(labels.join(' ')).toContain('Edit macro');
    expect(labels.join(' ')).toContain('Rename macro');
    expect(labels.join(' ')).toContain('Export macro');
    expect(labels.join(' ')).toContain('Delete macro');

    const deleteItem = items.find((el) => el.textContent?.includes('Delete macro'));
    fireEvent.click(deleteItem!);
    expect(onDeleteMacro).toHaveBeenCalledWith('m1');
  });

  it('creates a macro through the Create new macro dialog', () => {
    const onCreateMacro = vi.fn();
    const { container, getByText } = renderPanel({ onCreateMacro });
    fireEvent.click(getByText('Create new'));

    const input = container.querySelector<HTMLInputElement>('#macro-name-input');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { value: 'My new macro' } });
    fireEvent.click(getByText('Create'));
    expect(onCreateMacro).toHaveBeenCalledWith('My new macro');
  });

  it('renames a macro through the rename dialog', () => {
    const onRenameMacro = vi.fn();
    const { container, getByText } = renderPanel({ onRenameMacro });
    fireEvent.click(container.querySelector('button[aria-label="Fade ends options"]')!);
    const renameItem = Array.from(container.querySelectorAll('.context-menu-item, [role="menuitem"]'))
      .find((el) => el.textContent?.includes('Rename macro'));
    fireEvent.click(renameItem!);

    const input = container.querySelector<HTMLInputElement>('#rename-macro-input');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { value: 'Fade both ends' } });
    fireEvent.click(getByText('Rename'));
    expect(onRenameMacro).toHaveBeenCalledWith('m1', 'Fade both ends');
  });
});

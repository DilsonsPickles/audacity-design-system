import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { MacroEditorDialog } from '../MacroEditorDialog';
import type { Macro } from '../../MacroManager/macroTypes';

afterEach(cleanup);

const MACRO: Macro = {
  id: 'm1',
  name: 'Fade ends',
  steps: [
    { command: 'Select', parameters: 'Start="1", End="1"' },
    { command: 'Fade In', parameters: 'Use_Preset="<Current Settings>"' },
    { command: 'Normalize', parameters: '' },
  ],
};

function renderEditor(props: Partial<React.ComponentProps<typeof MacroEditorDialog>> = {}) {
  return render(
    <ThemeProvider>
      <MacroEditorDialog isOpen macro={MACRO} {...props} />
    </ThemeProvider>,
  );
}

function contextMenuItems(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.context-menu-item, [role="menuitem"]'));
}

describe('MacroEditorDialog', () => {
  it('renders the macro name and numbered steps with parameters', () => {
    const { container } = renderEditor();
    expect(container.querySelector('.macro-editor__macro-name')?.textContent).toBe('Fade ends');
    const steps = container.querySelectorAll('.macro-editor__step');
    expect(steps).toHaveLength(3);
    expect(steps[0].textContent).toContain('1. Select');
    expect(steps[0].textContent).toContain('Start="1", End="1"');
    expect(steps[1].textContent).toContain('2. Fade In');
  });

  it('renders nothing when macro is null', () => {
    const { container } = render(
      <ThemeProvider>
        <MacroEditorDialog isOpen macro={null} />
      </ThemeProvider>,
    );
    expect(container.querySelector('.macro-editor')).toBeNull();
  });

  it('offers no run actions when onRun is not wired', () => {
    const { container, queryByText } = renderEditor();
    expect(queryByText('Run')).toBeNull();
    expect(container.querySelector('.macro-editor__run')).toBeNull();
  });

  it('renames the macro through the header Rename macro dialog', () => {
    const onRenameMacro = vi.fn();
    const { container, getByText } = renderEditor({ onRenameMacro });
    fireEvent.click(getByText('Rename macro'));
    const input = container.querySelector<HTMLInputElement>('#rename-macro-input');
    fireEvent.change(input!, { target: { value: 'Fade both ends' } });
    fireEvent.click(getByText('Rename'));
    expect(onRenameMacro).toHaveBeenCalledWith('m1', 'Fade both ends');
  });

  it('deletes and exports the macro from the header', () => {
    const onDeleteMacro = vi.fn();
    const onExportMacro = vi.fn();
    const { getByText } = renderEditor({ onDeleteMacro, onExportMacro });
    fireEvent.click(getByText('Delete macro'));
    expect(onDeleteMacro).toHaveBeenCalledWith('m1');
    fireEvent.click(getByText('Export macro'));
    expect(onExportMacro).toHaveBeenCalledWith('m1');
  });

  it('deletes a step via its row trash button', () => {
    const onDeleteStep = vi.fn();
    const { container } = renderEditor({ onDeleteStep });
    fireEvent.click(container.querySelector('button[aria-label="Delete step 2"]')!);
    expect(onDeleteStep).toHaveBeenCalledWith('m1', 1);
  });

  it('moves a step via its row menu', () => {
    const onMoveStep = vi.fn();
    const { container } = renderEditor({ onMoveStep });
    fireEvent.click(container.querySelector('button[aria-label="Step 2 options"]')!);
    const moveUp = contextMenuItems(container).find((el) => el.textContent?.includes('Move up'));
    fireEvent.click(moveUp!);
    expect(onMoveStep).toHaveBeenCalledWith('m1', 1, -1);
  });

  it('disables Move up on the first step', () => {
    const onMoveStep = vi.fn();
    const { container } = renderEditor({ onMoveStep });
    fireEvent.click(container.querySelector('button[aria-label="Step 1 options"]')!);
    const moveUp = contextMenuItems(container).find((el) => el.textContent?.includes('Move up'));
    fireEvent.click(moveUp!);
    expect(onMoveStep).not.toHaveBeenCalled();
  });

  it('edits step parameters through the pencil dialog', () => {
    const onEditStep = vi.fn();
    const { container, getByText } = renderEditor({ onEditStep });
    fireEvent.click(container.querySelector('button[aria-label="Edit step 1"]')!);
    const input = container.querySelector<HTMLInputElement>('#step-parameters-input');
    expect(input?.value).toBe('Start="1", End="1"');
    fireEvent.change(input!, { target: { value: 'Start="0", End="2"' } });
    fireEvent.click(getByText('Save'));
    expect(onEditStep).toHaveBeenCalledWith('m1', 0, 'Start="0", End="2"');
  });

  it('reorders steps by dragging a row grip handle', () => {
    const onReorderStep = vi.fn();
    const { container } = renderEditor({ onReorderStep });
    // jsdom has no layout — give each row a real vertical extent (60px pitch)
    const rows = container.querySelectorAll<HTMLElement>('.macro-editor__step');
    rows.forEach((row, i) => {
      row.getBoundingClientRect = () => ({
        top: i * 60, bottom: i * 60 + 52, left: 0, right: 600,
        width: 600, height: 52, x: 0, y: i * 60,
        toJSON: () => ({}),
      });
    });

    const grip = rows[0].querySelector('.macro-editor__step-grip')!;
    fireEvent.mouseDown(grip, { button: 0 });
    // Drag into the second row's bounds
    fireEvent.mouseMove(document, { clientY: 80 });
    expect(onReorderStep).toHaveBeenCalledWith('m1', 0, 1);
    // Continue into the third row — the dragged index followed the swap
    fireEvent.mouseMove(document, { clientY: 140 });
    expect(onReorderStep).toHaveBeenCalledWith('m1', 1, 2);
    fireEvent.mouseUp(document);

    // After release, further movement does nothing
    onReorderStep.mockClear();
    fireEvent.mouseMove(document, { clientY: 20 });
    expect(onReorderStep).not.toHaveBeenCalled();
  });

  it('auto-scrolls the list while dragging past its bottom edge', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; });
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    try {
      const onReorderStep = vi.fn();
      const { container } = renderEditor({ onReorderStep });
      const list = container.querySelector<HTMLElement>('.macro-editor__step-list')!;
      list.getBoundingClientRect = () => ({
        top: 0, bottom: 200, left: 0, right: 600,
        width: 600, height: 200, x: 0, y: 0,
        toJSON: () => ({}),
      });
      const rows = container.querySelectorAll<HTMLElement>('.macro-editor__step');
      rows.forEach((row, i) => {
        row.getBoundingClientRect = () => ({
          top: i * 60, bottom: i * 60 + 52, left: 0, right: 600,
          width: 600, height: 52, x: 0, y: i * 60,
          toJSON: () => ({}),
        });
      });

      fireEvent.mouseDown(rows[0].querySelector('.macro-editor__step-grip')!, { button: 0 });
      // Park the pointer in the bottom edge zone, below every row
      fireEvent.mouseMove(document, { clientY: 195 });
      expect(list.scrollTop).toBe(0);

      // Run a couple of scroll-loop frames — the list scrolls without
      // further mouse movement
      rafCallbacks.shift()!(0);
      const afterOneFrame = list.scrollTop;
      expect(afterOneFrame).toBeGreaterThan(0);
      rafCallbacks.shift()!(0);
      expect(list.scrollTop).toBeGreaterThan(afterOneFrame);

      // Releasing stops the loop
      fireEvent.mouseUp(document);
      expect(cafSpy).toHaveBeenCalled();
    } finally {
      rafSpy.mockRestore();
      cafSpy.mockRestore();
    }
  });

  it('adds a step via New step and closes via Done', () => {
    const onClose = vi.fn();
    const { container, getByText } = renderEditor({ onClose, availableCommands: [] });
    fireEvent.click(getByText('New step'));
    // SelectCommandDialog opens (empty command list is fine for this assertion)
    expect(container.textContent).toContain('Select command');
    fireEvent.click(getByText('Done'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('MacroEditorDialog — non-modal window with Run (2026-09-10)', () => {
  it('renders as a non-modal window so the app behind stays interactive', () => {
    const { container } = renderEditor();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('false');
    expect(container.querySelector('.dialog-overlay--non-modal')).not.toBeNull();
  });

  it('footer Run executes the macro on the project via onRun', () => {
    const onRun = vi.fn();
    const { getByText } = renderEditor({ onRun });
    fireEvent.click(getByText('Run'));
    expect(onRun).toHaveBeenCalledWith('m1');
  });

  it('renders no Run button when onRun is not provided', () => {
    const { queryByText } = renderEditor();
    expect(queryByText('Run')).toBeNull();
  });
});

describe('MacroEditorDialog — footer run actions', () => {
  it('"Run on files…" calls onRunFiles with the macro id', () => {
    const onRun = vi.fn();
    const onRunFiles = vi.fn();
    const { getByText } = renderEditor({ onRun, onRunFiles });
    fireEvent.click(getByText('Run on files…'));
    expect(onRunFiles).toHaveBeenCalledWith('m1');
    expect(onRun).not.toHaveBeenCalled();
  });
});

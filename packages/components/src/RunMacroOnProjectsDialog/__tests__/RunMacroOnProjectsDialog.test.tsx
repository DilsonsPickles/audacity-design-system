import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { RunMacroOnProjectsDialog } from '../RunMacroOnProjectsDialog';

afterEach(cleanup);

const PROJECTS = [
  { id: 'p1', title: 'Podcast ep 12', dateModified: 1757000000000 },
  { id: 'p2', title: 'Field recording', dateModified: 1757100000000 },
  { id: 'p3', title: 'Band demo', dateModified: 1757200000000 },
];

function renderDialog(props: Partial<React.ComponentProps<typeof RunMacroOnProjectsDialog>> = {}) {
  return render(
    <ThemeProvider>
      <RunMacroOnProjectsDialog
        isOpen
        macroName="Fade ends"
        projects={PROJECTS}
        perProjectMs={100}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('RunMacroOnProjectsDialog', () => {
  it('lists the saved projects with all selected by default', () => {
    const { container, getByText } = renderDialog();
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(3);
    expect(getByText('Podcast ep 12')).toBeTruthy();
    expect(getByText('Apply to 3 projects')).toBeTruthy();
  });

  it('deselecting projects updates the apply count; zero disables the button', () => {
    const { container, getByText } = renderDialog();
    const boxes = Array.from(container.querySelectorAll('[role="listitem"] input[type="checkbox"], [role="listitem"] .checkbox')) as HTMLElement[];
    // Fall back to clicking the Checkbox component root if no native input
    const clickBox = (i: number) => fireEvent.click(boxes[i] ?? container.querySelectorAll('[role="listitem"]')[i].firstElementChild!);
    clickBox(0);
    expect(getByText('Apply to 2 projects')).toBeTruthy();
    clickBox(1);
    clickBox(2);
    const applyBtn = getByText('Apply to 0 projects').closest('button')!;
    expect(applyBtn.hasAttribute('disabled') || applyBtn.className.includes('disabled')).toBe(true);
  });

  it('runs through the selected projects and reports completion', () => {
    vi.useFakeTimers();
    try {
      const onRunComplete = vi.fn();
      const { getByText } = renderDialog({ onRunComplete });
      fireEvent.click(getByText('Apply to 3 projects'));
      // processing 1 of 3
      expect(getByText(/Processing 1 of 3/)).toBeTruthy();
      act(() => { vi.advanceTimersByTime(100); });
      expect(getByText(/Processing 2 of 3/)).toBeTruthy();
      act(() => { vi.advanceTimersByTime(200); });
      expect(onRunComplete).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
      expect(getByText(/was applied to 3 projects/)).toBeTruthy();
      expect(getByText('Close')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the empty state when there are no saved projects', () => {
    const { getByText } = renderDialog({ projects: [] });
    expect(getByText(/No saved projects yet/)).toBeTruthy();
  });
});

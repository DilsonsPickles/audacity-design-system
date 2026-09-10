import React from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { RunMacroOnFilesDialog } from '../RunMacroOnFilesDialog';

afterEach(cleanup);

const FILES = [
  { id: 'f1', path: '/Users/alex/Documents/AU3 copy.aup3' },
  { id: 'f2', path: '/Users/alex/Documents/AU3.aup3' },
];

function renderDialog(props: Partial<React.ComponentProps<typeof RunMacroOnFilesDialog>> = {}) {
  return render(
    <ThemeProvider>
      <RunMacroOnFilesDialog
        isOpen
        macroName="Fade ends"
        files={FILES}
        stepNames={['Fade In', 'Normalize']}
        perStepMs={100}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('RunMacroOnFilesDialog', () => {
  it('shows Applying… over the file list with the arrow on the first file', () => {
    vi.useFakeTimers();
    try {
      const { getByText, container } = renderDialog();
      expect(getByText('Applying…')).toBeTruthy();
      expect(getByText('/Users/alex/Documents/AU3 copy.aup3')).toBeTruthy();
      const rows = container.querySelectorAll('.run-macro-files__row');
      expect(rows[0].className).toContain('--current');
      expect(rows[1].className).not.toContain('--current');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cycles the nested step window through the macro steps for each file', () => {
    vi.useFakeTimers();
    try {
      const { getByText, container } = renderDialog();
      expect(getByText('Fade In')).toBeTruthy();
      expect(getByText(/Step 1 of 2 · file 1 of 2/)).toBeTruthy();
      act(() => { vi.advanceTimersByTime(100); });
      expect(getByText('Normalize')).toBeTruthy();
      // Next tick rolls to file 2, step 1 — arrow advances
      act(() => { vi.advanceTimersByTime(100); });
      expect(getByText(/Step 1 of 2 · file 2 of 2/)).toBeTruthy();
      const rows = container.querySelectorAll('.run-macro-files__row');
      expect(rows[1].className).toContain('--current');
    } finally {
      vi.useRealTimers();
    }
  });

  it('finishes with a single onRunComplete and a done state', () => {
    vi.useFakeTimers();
    try {
      const onRunComplete = vi.fn();
      const { getByText } = renderDialog({ onRunComplete });
      // 2 files x 2 steps x 100ms
      act(() => { vi.advanceTimersByTime(400); });
      expect(onRunComplete).toHaveBeenCalledTimes(1);
      expect(onRunComplete).toHaveBeenCalledWith(['f1', 'f2']);
      expect(getByText(/was applied to 2 files/)).toBeTruthy();
      expect(getByText('Close')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Cancel mid-run closes without completing', () => {
    vi.useFakeTimers();
    try {
      const onRunComplete = vi.fn();
      const onClose = vi.fn();
      const { getByText } = renderDialog({ onRunComplete, onClose });
      act(() => { vi.advanceTimersByTime(100); });
      fireEvent.click(getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(1000); });
      expect(onRunComplete).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

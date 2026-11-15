import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@audacity-ui/components';
import { CopyingProjectDialog, formatElapsed } from '../CopyingProjectDialog';

afterEach(cleanup);

// Save project as…'s "Copying project" block (2026-11-16)
describe('CopyingProjectDialog', () => {
  it('writes the elapsed time as Audacity 3 does', () => {
    expect(formatElapsed(0)).toBe('0:00:00');
    expect(formatElapsed(22_400)).toBe('0:00:22');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
    expect(formatElapsed(-50)).toBe('0:00:00');
  });

  it('shows the message, an indeterminate bar and the elapsed time, with no way out', () => {
    const onEscape = vi.fn();
    const { getByText, container } = render(
      <ThemeProvider>
        <div onKeyDown={onEscape}>
          <CopyingProjectDialog isOpen startedAt={1_000} now={23_000} />
        </div>
      </ThemeProvider>,
    );
    expect(getByText('This may take several seconds')).toBeTruthy();
    const bar = document.querySelector('[data-copying-project] [role="progressbar"]') as HTMLElement;
    expect(bar.getAttribute('data-indeterminate')).toBe('true');
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(document.querySelector('[data-copying-project-elapsed]')?.textContent).toBe('Elapsed time: 0:00:22');
    // nothing to press — no close, no cancel (the macOS dots are drawn, disabled, as AU3's are)
    expect(document.querySelectorAll('.copying-project-dialog button:not(:disabled)').length).toBe(0);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('[data-copying-project]')).not.toBeNull();
    expect(container).toBeTruthy();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen } from '@testing-library/react';
import { ThemeProvider } from '@audacity-ui/components';
import { GoToDialog } from '../GoToDialog';

afterEach(cleanup);

function setup(initialSeconds = 65) {
  const onGo = vi.fn();
  const onClose = vi.fn();
  const opener = document.createElement('button');
  opener.setAttribute('data-testid', 'opener');
  document.body.appendChild(opener);
  opener.focus();
  const utils = render(
    <ThemeProvider>
      <GoToDialog isOpen initialSeconds={initialSeconds} format="hh:mm:ss" onGo={onGo} onClose={onClose} />
    </ThemeProvider>,
  );
  const timecode = () => document.body.querySelector<HTMLElement>('[data-go-to-dialog] .timecode')!;
  return { ...utils, onGo, onClose, opener, timecode };
}

describe('the Go to dialog (2026-10-13)', () => {
  it('opens on the playhead\'s position in the transport\'s control, focuses it, and Enter on the control at rest goes', async () => {
    const { timecode, onGo, onClose } = setup(65);
    expect(screen.getByText('Go to')).toBeTruthy();
    expect(timecode().getAttribute('aria-label')).toBe('Playhead position');
    // 00h01m05s, as the transport shows it
    expect(timecode().textContent?.replace(/\s/g, '')).toContain('01m05s');
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(timecode());
    fireEvent.keyDown(timecode(), { key: 'Enter' });
    expect(onGo).toHaveBeenCalledWith(65);
    expect(onClose).toHaveBeenCalled();
  });

  it('the Go button goes; Cancel and Escape leave the playhead; focus returns to what had it', async () => {
    const { onGo, onClose, opener, timecode } = setup(3);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onGo).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onGo).toHaveBeenCalledWith(3);
    fireEvent.keyDown(timecode(), { key: 'Escape' });
    expect(onClose.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(onGo).toHaveBeenCalledTimes(1);
  });
});

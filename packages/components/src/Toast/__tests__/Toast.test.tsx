import React from 'react';
import { render, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Toast } from '../Toast';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const renderToast = (props: Partial<React.ComponentProps<typeof Toast>> = {}) =>
  render(
    <ThemeProvider>
      <Toast id="t1" title="Project saved" {...props} />
    </ThemeProvider>,
  );

describe('Toast — the Figma toast: two heights, 64 and 128 (2026-11-02)', () => {
  it('every toast has the header: icon, title and a close ×, which dismisses', () => {
    const onDismiss = vi.fn();
    const { container, getByLabelText } = renderToast({ type: 'success', description: 'All saved.', onDismiss });
    expect(container.querySelector('.toast__header .toast__title')?.textContent).toBe('Project saved');
    expect(container.querySelector('.toast__header .toast__icon')).toBeTruthy();
    fireEvent.click(getByLabelText('Dismiss notification'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('a plain message is COMPACT: one line, no footer; with a duration it wears the 6px timer strip, without one it has none', () => {
    const timed = renderToast({ description: 'All saved.', duration: 5000 });
    const toast = timed.container.querySelector('.toast')!;
    expect(toast.getAttribute('data-toast-variant')).toBe('compact-timed');
    expect(toast.querySelector('.toast__timer')).toBeTruthy();
    expect(toast.querySelector('.toast__footer')).toBeNull();
    timed.unmount();
    const persistent = renderToast({ description: 'All saved.' });
    expect(persistent.container.querySelector('.toast')!.getAttribute('data-toast-variant')).toBe('compact');
    expect(persistent.container.querySelector('.toast__timer')).toBeNull();
  });

  it('a toast with actions is TALL: two lines of body, the footer lists the action THEN Dismiss — and it never dismisses itself', async () => {
    const onDismiss = vi.fn();
    const onView = vi.fn();
    const { container } = renderToast({
      description: 'You can manage this file from your uploaded projects.',
      actions: [{ label: 'View on audio.com', onClick: onView }],
      duration: 20,
      onDismiss,
    });
    expect(container.querySelector('.toast')!.getAttribute('data-toast-variant')).toBe('message');
    const buttons = [...container.querySelectorAll('.toast__footer button')].map((b) => b.textContent);
    expect(buttons).toEqual(['View on audio.com', 'Dismiss']);
    expect(container.querySelector('.toast__timer')).toBeNull();
    await new Promise((r) => setTimeout(r, 80));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click([...container.querySelectorAll<HTMLElement>('.toast__footer button')][1]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('a progress toast is TALL: the bar over "… remaining" and the percentage', () => {
    const { container } = renderToast({ type: 'syncing', title: 'Syncing to audio.com…', showProgress: true, progress: 50, timeRemaining: '29 seconds remaining' });
    expect(container.querySelector('.toast')!.getAttribute('data-toast-variant')).toBe('progress');
    const row = [...container.querySelectorAll('.toast__progress-row span')].map((s) => s.textContent);
    expect(row).toEqual(['29 seconds remaining', '50%']);
    expect(container.querySelector('.toast__footer')).toBeTruthy();
  });

  it('a timed toast dismisses itself when its countdown runs out', async () => {
    const onDismiss = vi.fn();
    renderToast({ description: 'All saved.', duration: 40, onDismiss });
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  it('the countdown PAUSES while the pointer is over the toast or the focus is in it', async () => {
    const onDismiss = vi.fn();
    const { container, getByLabelText } = renderToast({ description: 'All saved.', duration: 40, onDismiss });
    const toast = container.querySelector('.toast') as HTMLElement;
    fireEvent.mouseEnter(toast);
    expect(toast.getAttribute('data-paused')).toBe('true');
    await new Promise((r) => setTimeout(r, 120));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.mouseLeave(toast);
    act(() => { getByLabelText('Dismiss notification').focus(); });
    expect(toast.getAttribute('data-paused')).toBe('true');
    await new Promise((r) => setTimeout(r, 120));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { (document.activeElement as HTMLElement).blur(); });
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  it('text is never clipped: an over-long description is shown in full and a warning names the toast', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(48);
    const { container } = renderToast({ description: 'A very long description that runs to three lines.' });
    expect(container.querySelector('.toast__description')?.textContent).toBe('A very long description that runs to three lines.');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"Project saved"'));
    scroll.mockRestore();
    warn.mockRestore();
  });

  it('an error is announced assertively; the rest politely', () => {
    const error = renderToast({ type: 'error' });
    expect(error.container.querySelector('.toast')!.getAttribute('role')).toBe('alert');
    error.unmount();
    const info = renderToast({ type: 'info' });
    expect(info.container.querySelector('.toast')!.getAttribute('role')).toBe('status');
  });
});

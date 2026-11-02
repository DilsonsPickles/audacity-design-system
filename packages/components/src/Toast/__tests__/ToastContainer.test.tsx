import React from 'react';
import { render, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ToastContainer, NotificationBell, toast } from '../ToastContainer';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(() => {
  act(() => { toast.reset(); });
  cleanup();
});

describe('ToastContainer — the × stays under the pointer (2026-11-02)', () => {
  it('a bottom stack rests in its corner, holds its top edge while the pointer is in it, and lets go after the pointer leaves', async () => {
    const { container } = render(
      <ThemeProvider>
        <ToastContainer position="bottom-right" />
      </ThemeProvider>,
    );
    act(() => {
      toast.error('Save failed', 'Could not reach audio.com');
      toast.error('Export failed', 'The disk is full');
    });
    const stack = container.querySelector('.toast-container') as HTMLElement;
    expect(stack.hasAttribute('data-pinned')).toBe(false);
    expect(stack.style.top).toBe('');

    fireEvent.mouseEnter(stack);
    expect(stack.getAttribute('data-pinned')).toBe('true');
    expect(stack.style.bottom).toBe('auto');

    fireEvent.mouseLeave(stack);
    expect(stack.getAttribute('data-pinned')).toBe('true'); // not at once: the gap between toasts is not a leave
    await waitFor(() => expect(stack.hasAttribute('data-pinned')).toBe(false), { timeout: 2000 });
  });

  it('newest at the bottom: a toast arriving later joins below the others', () => {
    const { container } = render(
      <ThemeProvider>
        <ToastContainer position="bottom-right" />
      </ThemeProvider>,
    );
    act(() => {
      toast.error('First');
      toast.error('Second');
    });
    const titles = [...container.querySelectorAll('.toast__title')].map((t) => t.textContent);
    expect(titles).toEqual(['First', 'Second']);
  });
});

describe('the notification centre (2026-11-02, after Cakewalk\'s single panel)', () => {
  const renderCentre = () => render(
    <ThemeProvider>
      <ToastContainer position="bottom-right" />
      <NotificationBell />
    </ThemeProvider>,
  );
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('every notification pops out as its own card in the one column; closing one sends it to the archive, which the bell opens', async () => {
    const { container } = renderCentre();
    act(() => { toast.error('Save failed', 'Could not reach audio.com'); toast.error('Export failed', 'The disk is full'); });
    expect(container.querySelectorAll('.notification-panel')).toHaveLength(1);
    expect(container.querySelectorAll('.notification-panel .toast')).toHaveLength(2);
    fireEvent.click(container.querySelectorAll<HTMLElement>('[aria-label="Dismiss notification"]')[0]);
    await act(() => wait(260));
    expect(container.querySelectorAll('.notification-panel .toast')).toHaveLength(1);
    // The bell opens the archive in the same card, with Mute and Clear all
    const bell = container.querySelector('[data-notification-bell]') as HTMLElement;
    fireEvent.click(bell);
    expect(bell.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelectorAll('[data-archived] .toast')).toHaveLength(1);
    expect(container.querySelector('.notification-panel__clear')).toBeTruthy();
    // Clear all empties it
    fireEvent.click(container.querySelector('.notification-panel__clear') as HTMLElement);
    expect(container.querySelectorAll('.notification-panel .toast')).toHaveLength(0);
    expect(container.querySelector('.notification-panel__empty')).toBeTruthy();
  });

  it('a seen notification never lights the dot; one that needs you and arrives MUTED does, and opening the bell clears it', () => {
    const { container } = renderCentre();
    const bell = () => container.querySelector('[data-notification-bell]') as HTMLElement;
    act(() => { toast.info('Track deleted', 'Drums and its 3 clips were removed', [{ label: 'Undo', onClick: () => {} }]); });
    expect(bell().hasAttribute('data-attention')).toBe(false); // it popped out — seen
    act(() => { toast.setMuted(true); });
    act(() => { toast.success('Import complete', 'Kick.wav added'); });
    expect(container.querySelectorAll('.notification-panel .toast')).toHaveLength(1); // muted: not popped out
    expect(bell().hasAttribute('data-attention')).toBe(false); // a plain success needs nobody
    act(() => { toast.info('Track deleted', 'Bass was removed', [{ label: 'Undo', onClick: () => {} }]); });
    expect(bell().getAttribute('data-attention')).toBe('true');
    expect(bell().getAttribute('aria-label')).toBe('Notifications, muted, 1 needs attention');
    fireEvent.click(bell());
    expect(bell().hasAttribute('data-attention')).toBe(false);
  });

  it('muted, an ERROR still pops out', () => {
    const { container } = renderCentre();
    act(() => { toast.setMuted(true); toast.error('Save failed', 'Could not reach audio.com'); });
    expect(container.querySelectorAll('.notification-panel .toast:not([data-archived])')).toHaveLength(1);
  });

  it('a full stack pushes its oldest out to the archive — unseen if it needs you, so the dot lights', () => {
    const { container } = render(
      <ThemeProvider>
        <ToastContainer position="bottom-right" maxToasts={2} />
        <NotificationBell />
      </ThemeProvider>,
    );
    act(() => { toast.error('One'); toast.error('Two'); toast.error('Three'); });
    expect([...container.querySelectorAll('.notification-panel .toast__title')].map((t) => t.textContent)).toEqual(['Two', 'Three']);
    expect(container.querySelector('[data-notification-bell]')!.getAttribute('data-attention')).toBe('true');
  });

  it('with no maxToasts there is no count cap — a top stack makes room by height alone (2026-11-02, "let them stack all the way down the page")', () => {
    const { container } = render(
      <ThemeProvider>
        <ToastContainer position="top-right" top={100} bottomInset={48} />
      </ThemeProvider>,
    );
    act(() => { for (let i = 0; i < 8; i++) toast.error(`Error ${i}`); });
    // jsdom lays nothing out, so nothing passes the bottom: all eight stay up
    expect(container.querySelectorAll('.notification-panel .toast')).toHaveLength(8);
  });

  it('an arrival opens its row (the push-up); opening and closing the bell later does not replay it', async () => {
    const { container } = renderCentre();
    act(() => { toast.error('Save failed', 'Could not reach audio.com'); });
    expect(container.querySelector('.toast-wrapper')!.getAttribute('data-entering')).toBe('true');
    await act(() => wait(260));
    const bell = container.querySelector('[data-notification-bell]') as HTMLElement;
    fireEvent.click(bell); // remounts every row as rows of the one card
    expect(container.querySelector('.toast-wrapper[data-entering]')).toBeNull();
    fireEvent.click(bell);
    expect(container.querySelector('.toast-wrapper[data-entering]')).toBeNull();
  });
});

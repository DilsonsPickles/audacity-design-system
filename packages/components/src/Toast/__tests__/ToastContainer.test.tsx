import React from 'react';
import { render, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ToastContainer, toast } from '../ToastContainer';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(() => {
  act(() => { toast.dismissAll(); });
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

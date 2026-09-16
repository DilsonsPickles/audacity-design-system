import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { Dialog } from '../Dialog';

afterEach(cleanup);

function renderDialog() {
  return render(
    <ThemeProvider>
      <Dialog isOpen title="Test dialog" width={600}>
        <div>content</div>
      </Dialog>
    </ThemeProvider>,
  );
}

/** Give the (layout-less) jsdom dialog a real rect: 600x400 at (200, 100). */
function mockDialogRect(container: HTMLElement) {
  const dialog = container.querySelector<HTMLElement>('.dialog')!;
  dialog.getBoundingClientRect = () => ({
    top: 100, bottom: 500, left: 200, right: 800,
    width: 600, height: 400, x: 200, y: 100,
    toJSON: () => ({}),
  });
  return dialog;
}

describe('Dialog resize anchoring', () => {
  it('dragging the right edge grows rightward only — the left edge stays pinned', () => {
    const { container } = renderDialog();
    const dialog = mockDialogRect(container);
    const handle = container.querySelector<HTMLElement>('.dialog__resize-handle--right')!;
    fireEvent.mouseDown(handle, { clientX: 800, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 900, clientY: 300 });
    fireEvent.mouseUp(document);
    expect(dialog.style.width).toBe('700px');
    // Pinned where it stood when the resize began, not re-centered
    expect(dialog.style.left).toBe('200px');
    expect(dialog.style.top).toBe('100px');
    expect(dialog.style.position).toBe('fixed');
  });

  it('dragging the left edge moves the left edge and keeps the right edge pinned', () => {
    const { container } = renderDialog();
    const dialog = mockDialogRect(container);
    const handle = container.querySelector<HTMLElement>('.dialog__resize-handle--left')!;
    fireEvent.mouseDown(handle, { clientX: 200, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 120, clientY: 300 });
    fireEvent.mouseUp(document);
    // 80px wider, left edge followed the pointer: right edge unmoved (120 + 680 = 800)
    expect(dialog.style.width).toBe('680px');
    expect(dialog.style.left).toBe('120px');
    expect(dialog.style.top).toBe('100px');
  });

  it('dragging the top edge keeps the bottom edge pinned, respecting the min-height clamp', () => {
    const { container } = renderDialog();
    const dialog = mockDialogRect(container);
    const handle = container.querySelector<HTMLElement>('.dialog__resize-handle--top')!;
    fireEvent.mouseDown(handle, { clientX: 500, clientY: 100 });
    // Drag down far past the 300px minimum: height clamps, and the top
    // edge only moves as far as the clamp allows (500 - 300 = 200)
    fireEvent.mouseMove(document, { clientX: 500, clientY: 350 });
    fireEvent.mouseUp(document);
    expect(dialog.style.height).toBe('300px');
    expect(dialog.style.top).toBe('200px');
    expect(dialog.style.left).toBe('200px');
  });

  it('dragging the bottom edge grows downward only', () => {
    const { container } = renderDialog();
    const dialog = mockDialogRect(container);
    const handle = container.querySelector<HTMLElement>('.dialog__resize-handle--bottom')!;
    fireEvent.mouseDown(handle, { clientX: 500, clientY: 500 });
    fireEvent.mouseMove(document, { clientX: 500, clientY: 560 });
    fireEvent.mouseUp(document);
    expect(dialog.style.height).toBe('460px');
    expect(dialog.style.top).toBe('100px');
    expect(dialog.style.left).toBe('200px');
  });
});

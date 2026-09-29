import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
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

describe('Dialog — a non-modal window and the keyboard', () => {
  function renderWindow(props: Partial<React.ComponentProps<typeof Dialog>> = {}) {
    const utils = render(
      <ThemeProvider>
        <button data-testid="app-before">app, before</button>
        <Dialog isOpen title="Window" width={600} nonModal closeOnClickOutside={false} {...props}>
          <div data-testid="blank" style={{ padding: 20 }}>
            <input aria-label="first" />
            <button>second</button>
            <button tabIndex={-1} data-testid="not-a-stop">not a stop</button>
            <button disabled>disabled</button>
            <button style={{ display: 'none' }}>hidden</button>
            <button>last</button>
          </div>
        </Dialog>
        <button data-testid="app-after">app, after</button>
      </ThemeProvider>,
    );
    const dialog = utils.container.querySelector<HTMLElement>('.dialog')!;
    const stops = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, input'))
      .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.style.display !== 'none');
    const focused = () => document.activeElement as HTMLElement;
    const tab = (shiftKey = false) => fireEvent.keyDown(focused(), { key: 'Tab', shiftKey });
    const label = (el: HTMLElement) => el.getAttribute('aria-label') || el.textContent;
    return { ...utils, dialog, stops, focused, tab, label };
  }
  const press = (target: Element) => fireEvent.pointerDown(target);

  describe('loopTab', () => {
    it('Tab past the last control goes to the first', () => {
      const { stops, focused, tab } = renderWindow({ loopTab: true });
      const all = stops();
      all[all.length - 1].focus();
      expect(tab()).toBe(false); // taken from the browser
      expect(focused()).toBe(all[0]);
    });

    it('Shift+Tab before the first goes to the last', () => {
      const { stops, focused, tab } = renderWindow({ loopTab: true });
      const all = stops();
      all[0].focus();
      tab(true);
      expect(focused()).toBe(all[all.length - 1]);
    });

    it('a full lap visits every stop once, in order, and ends where it began', () => {
      const { stops, focused, tab } = renderWindow({ loopTab: true });
      const all = stops();
      all[0].focus();
      const visited: HTMLElement[] = [];
      for (let i = 0; i < all.length; i++) {
        tab();
        visited.push(focused());
      }
      expect(visited).toEqual([...all.slice(1), all[0]]);
    });

    it('skips what is not a stop: tabindex -1, disabled, hidden', () => {
      const { stops, label } = renderWindow({ loopTab: true });
      const names = stops().map(label);
      expect(names).toContain('first');
      expect(names).toContain('second');
      expect(names).toContain('last');
      expect(names).not.toContain('not a stop');
      expect(names).not.toContain('disabled');
      expect(names).not.toContain('hidden');
    });

    it('from something in the window that is not a stop, Tab goes to the stop after it', () => {
      const { getByTestId, focused, tab, label } = renderWindow({ loopTab: true });
      getByTestId('not-a-stop').focus();
      tab();
      expect(label(focused())).toBe('last');
      getByTestId('not-a-stop').focus();
      tab(true);
      expect(label(focused())).toBe('second');
    });

    it('never reaches the app behind the window', () => {
      const { stops, focused, tab, dialog } = renderWindow({ loopTab: true });
      stops()[0].focus();
      for (let i = 0; i < 12; i++) {
        tab(i % 3 === 0);
        expect(dialog.contains(focused())).toBe(true);
      }
    });

    it('is kept from the app\'s own Tab handlers, which listen on document', () => {
      const { stops, focused } = renderWindow({ loopTab: true });
      const seen: string[] = [];
      const listener = (e: KeyboardEvent) => seen.push(e.key);
      document.addEventListener('keydown', listener, true);
      stops()[0].focus();
      fireEvent.keyDown(focused(), { key: 'Tab' });
      document.removeEventListener('keydown', listener, true);
      expect(seen).toEqual([]);
    });

    it('leaves Tab alone while the APP is in use — the window does not pull focus in', () => {
      const { getByTestId, focused, tab } = renderWindow({ loopTab: true });
      getByTestId('app-before').focus();
      expect(tab()).toBe(true); // the browser's
      expect(focused()).toBe(getByTestId('app-before'));
    });

    it('without loopTab a non-modal window leaves Tab to the browser', () => {
      const { stops, tab } = renderWindow();
      const all = stops();
      all[all.length - 1].focus();
      expect(tab()).toBe(true);
    });

    it('after a click on a blank part of the window, Tab comes in at the start', () => {
      const { getByTestId, stops, focused, tab } = renderWindow({ loopTab: true });
      press(getByTestId('blank'));
      (document.activeElement as HTMLElement | null)?.blur();
      tab();
      expect(focused()).toBe(stops()[0]);
    });
  });

  describe('Escape', () => {
    it('closes the window while focus is inside it', () => {
      const onClose = vi.fn();
      const { stops } = renderWindow({ onClose });
      stops()[1].focus();
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes it after a click on a blank part of the window, where focus is nowhere', () => {
      // It used to stop answering: focus on the page body is not "inside"
      const onClose = vi.fn();
      const { getByTestId } = renderWindow({ onClose });
      press(getByTestId('blank'));
      (document.activeElement as HTMLElement | null)?.blur();
      expect(document.activeElement).toBe(document.body);
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('is the app\'s while the app is in use', () => {
      const onClose = vi.fn();
      const { getByTestId } = renderWindow({ onClose });
      getByTestId('app-before').focus();
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('is the app\'s again once the pointer has pressed the app', () => {
      const onClose = vi.fn();
      const { getByTestId } = renderWindow({ onClose });
      press(getByTestId('blank'));
      press(getByTestId('app-after'));
      (document.activeElement as HTMLElement | null)?.blur();
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('is the app\'s again once focus has gone to the app', () => {
      const onClose = vi.fn();
      const { getByTestId } = renderWindow({ onClose });
      press(getByTestId('blank'));
      getByTestId('app-after').focus();
      (document.activeElement as HTMLElement).blur();
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('a freshly opened window that nothing has touched leaves Escape to the app', () => {
      const onClose = vi.fn();
      renderWindow({ onClose });
      (document.activeElement as HTMLElement | null)?.blur();
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('the window can hold focus itself, but is never a Tab stop', () => {
    const { dialog } = renderWindow();
    expect(dialog.tabIndex).toBe(-1);
  });

  it('a MODAL dialog is unchanged: not focusable itself', () => {
    const { container } = render(
      <ThemeProvider>
        <Dialog isOpen title="Modal" width={600}><button>ok</button></Dialog>
      </ThemeProvider>,
    );
    expect(container.querySelector('.dialog')!.hasAttribute('tabindex')).toBe(false);
  });
});

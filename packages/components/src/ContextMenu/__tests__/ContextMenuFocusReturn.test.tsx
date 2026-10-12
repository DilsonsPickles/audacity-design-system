import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../../ContextMenuItem/ContextMenuItem';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

/** A trigger button and a menu the host renders conditionally, as the app does */
function Host({ onAction }: { onAction?: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <ThemeProvider>
      <button type="button" data-trigger onClick={() => setOpen(true)} onKeyDown={(e) => { if (e.key === 'F10' && e.shiftKey) setOpen(true); }}>
        trigger
      </button>
      <button type="button" data-elsewhere>elsewhere</button>
      {open && (
        <ContextMenu isOpen x={10} y={10} onClose={() => setOpen(false)}>
          <ContextMenuItem label="First" onClick={() => { onAction?.(); setOpen(false); }} />
          <ContextMenuItem label="Second" onClick={() => setOpen(false)} />
        </ContextMenu>
      )}
    </ThemeProvider>
  );
}

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 5)); });

describe('ContextMenu — focus returns to the trigger when the menu closes (2026-10-12, the global rule)', () => {
  it('an actioned item hands the focus back to the trigger', async () => {
    const onAction = vi.fn();
    const { container } = render(<Host onAction={onAction} />);
    const trigger = container.querySelector<HTMLElement>('[data-trigger]')!;
    act(() => { trigger.focus(); });
    fireEvent.keyDown(trigger, { key: 'F10', shiftKey: true });
    await flush(); // autoFocus on the first item
    const first = container.querySelector<HTMLElement>('[role="menuitem"]')!;
    expect(document.activeElement).toBe(first);
    fireEvent.click(first);
    await flush();
    expect(onAction).toHaveBeenCalled();
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape hands it back too', async () => {
    const { container } = render(<Host />);
    const trigger = container.querySelector<HTMLElement>('[data-trigger]')!;
    act(() => { trigger.focus(); });
    fireEvent.keyDown(trigger, { key: 'F10', shiftKey: true });
    await flush();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await flush();
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('a click outside leaves the focus where the pointer put it', async () => {
    const { container } = render(<Host />);
    const trigger = container.querySelector<HTMLElement>('[data-trigger]')!;
    act(() => { trigger.focus(); });
    fireEvent.keyDown(trigger, { key: 'F10', shiftKey: true });
    await flush();
    const elsewhere = container.querySelector<HTMLElement>('[data-elsewhere]')!;
    act(() => { elsewhere.focus(); });
    fireEvent.mouseDown(elsewhere);
    await flush();
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(elsewhere);
  });
});

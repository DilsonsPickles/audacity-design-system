import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@audacity-ui/components';
import { SetSelectionDialog, applySelectionField } from '../SetSelectionDialog';

afterEach(cleanup);

function setup(initialStart: number, initialEnd: number) {
  const onSet = vi.fn();
  const onClose = vi.fn();
  render(
    <ThemeProvider>
      <SetSelectionDialog isOpen initialStart={initialStart} initialEnd={initialEnd} format="hh:mm:ss" onFormatChange={() => {}} onSet={onSet} onClose={onClose} />
    </ThemeProvider>,
  );
  const setButton = () => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Set')!;
  return { onSet, onClose, setButton };
}

describe('Set selection… (2026-11-19)', () => {
  it('editing Start or Length moves End; editing End changes Length', () => {
    expect(applySelectionField({ start: 1, end: 3 }, 'start', 2)).toEqual({ start: 2, end: 4 });
    expect(applySelectionField({ start: 1, end: 3 }, 'length', 5)).toEqual({ start: 1, end: 6 });
    expect(applySelectionField({ start: 1, end: 3 }, 'end', 2.5)).toEqual({ start: 1, end: 2.5 });
  });

  it('values never go below zero', () => {
    expect(applySelectionField({ start: 1, end: 3 }, 'start', -4)).toEqual({ start: 0, end: 2 });
  });

  it('Set is dimmed while End is before Start', () => {
    const { setButton } = setup(3, 1);
    expect(setButton().disabled).toBe(true);
  });

  it('Set applies the range and closes', () => {
    const { setButton, onSet, onClose } = setup(1, 3);
    fireEvent.click(setButton());
    expect(onSet).toHaveBeenCalledWith(1, 3);
    expect(onClose).toHaveBeenCalled();
  });

  it('Escape closes without applying', () => {
    const { onSet, onClose } = setup(1, 3);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    expect(onSet).not.toHaveBeenCalled();
  });
});

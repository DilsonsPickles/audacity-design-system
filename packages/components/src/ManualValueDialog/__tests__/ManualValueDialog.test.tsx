import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { ManualValueDialog, parseManualValue } from '../ManualValueDialog';
import { useValueContextMenu } from '../../hooks/useValueContextMenu';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);
beforeEach(() => { vi.useRealTimers(); });

describe('ManualValueDialog (2026-10-15, "enter manual value")', () => {
  it('parses what a stepper field holds', () => {
    expect(parseManualValue('75 %')).toBe(75);
    expect(parseManualValue('0,875 ×')).toBeCloseTo(0.875, 9);
    expect(parseManualValue('-40')).toBe(-40);
    expect(parseManualValue('')).toBeNull();
    expect(parseManualValue('loud')).toBeNull();
  });

  it('prefills the value with its unit, applies the typed number clamped to the range on Enter, cancels on Escape', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const { baseElement } = render(
      <ThemeProvider>
        <ManualValueDialog isOpen title="Volume" value={75} unit="%" min={0} max={100} onApply={onApply} onClose={onClose} />
      </ThemeProvider>,
    );
    const input = baseElement.querySelector('[data-manual-value-dialog] input') as HTMLInputElement;
    expect(input.value).toBe('75 %');
    fireEvent.change(input, { target: { value: '140' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onApply).toHaveBeenCalledWith(100); // clamped
    expect(onClose).toHaveBeenCalled();
    onApply.mockClear(); onClose.mockClear();
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('a value that is not a number cannot be applied', () => {
    const onApply = vi.fn();
    const { baseElement, getByText } = render(
      <ThemeProvider>
        <ManualValueDialog isOpen title="Pan" value={0} min={-100} max={100} onApply={onApply} onClose={() => {}} />
      </ThemeProvider>,
    );
    const input = baseElement.querySelector('[data-manual-value-dialog] input') as HTMLInputElement;
    expect(input.value).toBe('0');
    fireEvent.change(input, { target: { value: 'left' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onApply).not.toHaveBeenCalled();
    expect((getByText('Apply').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

function Host({ onEnterValue, onReset }: { onEnterValue: () => void; onReset?: () => void }) {
  const menu = useValueContextMenu({ onEnterValue, onReset, resetLabel: 'centre' });
  return (
    <div>
      <div data-testid="control" onContextMenu={menu.onContextMenu}>control</div>
      {menu.menu}
    </div>
  );
}

describe('useValueContextMenu', () => {
  it('a right-click on the control opens "Enter value…" and, with a reset, "Reset to centre"; the items run and close', () => {
    const onEnterValue = vi.fn();
    const onReset = vi.fn();
    const { getByTestId, getByText, queryByText } = render(
      <ThemeProvider><Host onEnterValue={onEnterValue} onReset={onReset} /></ThemeProvider>,
    );
    expect(queryByText('Enter value…')).toBeNull();
    const ev = fireEvent.contextMenu(getByTestId('control'), { clientX: 40, clientY: 50 });
    expect(ev).toBe(false); // the browser's menu is suppressed
    fireEvent.click(getByText('Reset to centre'));
    expect(onReset).toHaveBeenCalledTimes(1);
    act(() => { /* the menu closes on the click */ });
    expect(queryByText('Enter value…')).toBeNull();
    fireEvent.contextMenu(getByTestId('control'), { clientX: 40, clientY: 50 });
    fireEvent.click(getByText('Enter value…'));
    expect(onEnterValue).toHaveBeenCalledTimes(1);
  });

  it('without a reset there is only the one item', () => {
    const { getByTestId, getByText, queryByText } = render(
      <ThemeProvider><Host onEnterValue={() => {}} /></ThemeProvider>,
    );
    fireEvent.contextMenu(getByTestId('control'));
    expect(getByText('Enter value…')).toBeTruthy();
    expect(queryByText(/^Reset to/)).toBeNull();
  });
});

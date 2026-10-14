import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { NumberStepper } from '../NumberStepper';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('NumberStepper unit (2026-10-14, the Fades dialog\'s "s")', () => {
  it('the arrows write the unit back even when the typed text dropped it', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <NumberStepper value="1.5" unit="s" step={0.1} onChange={onChange} />
      </ThemeProvider>,
    );
    fireEvent.click(container.querySelector('.number-stepper__arrow--up')!);
    expect(onChange).toHaveBeenLastCalledWith('1.6 s');
    fireEvent.click(container.querySelector('.number-stepper__arrow--down')!);
    expect(onChange).toHaveBeenLastCalledWith('1.4 s');
  });

  it('a bare number gets its unit when the field is left; a value with the unit, or blank, is left alone', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <ThemeProvider>
        <NumberStepper value="2" unit="s" onChange={onChange} />
      </ThemeProvider>,
    );
    const input = container.querySelector('input')!;
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith('2 s');
    onChange.mockClear();
    rerender(
      <ThemeProvider>
        <NumberStepper value="2 s" unit="s" onChange={onChange} />
      </ThemeProvider>,
    );
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    rerender(
      <ThemeProvider>
        <NumberStepper value="" unit="s" placeholder="Mixed" onChange={onChange} />
      </ThemeProvider>,
    );
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('without a unit prop the arrows keep whatever unit the text carried, as before', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <NumberStepper value="20 dB" step={1} onChange={onChange} />
      </ThemeProvider>,
    );
    fireEvent.click(container.querySelector('.number-stepper__arrow--up')!);
    expect(onChange).toHaveBeenLastCalledWith('21 dB');
  });
});

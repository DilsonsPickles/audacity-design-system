import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { VarispeedControl, sliderToSpeed, speedToSlider, formatVarispeed } from '../VarispeedControl';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('VarispeedControl (2026-10-07)', () => {
  it('the slider is log-scaled: ¼× at 0, 1× at 50, 4× at 100, an octave per quarter', () => {
    expect(sliderToSpeed(0)).toBeCloseTo(0.25, 6);
    expect(sliderToSpeed(50)).toBeCloseTo(1, 6);
    expect(sliderToSpeed(75)).toBeCloseTo(2, 6);
    expect(sliderToSpeed(100)).toBeCloseTo(4, 6);
    expect(speedToSlider(1)).toBe(50);
    expect(speedToSlider(0.5)).toBe(25);
    expect(formatVarispeed(1)).toBe('1.00×');
  });

  it('the chip reads the speed and opens the popover; the presets and the slider report a speed', () => {
    const onChange = vi.fn();
    const { container } = render(<ThemeProvider><VarispeedControl speed={1} onChange={onChange} /></ThemeProvider>);
    const chip = container.querySelector('.varispeed__chip') as HTMLButtonElement;
    expect(chip.textContent).toBe('1.00×');
    expect(container.querySelector('[data-varispeed-active]')).toBeNull();
    fireEvent.click(chip);
    const panel = document.body.querySelector('[data-varispeed-panel]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.querySelector('[data-varispeed-value]')?.textContent).toBe('1.00×');
    expect(panel.querySelector('[data-varispeed-preset="1"]')?.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(panel.querySelector('[data-varispeed-preset="2"]') as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(2);
    const slider = panel.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '25' } });
    expect(onChange).toHaveBeenLastCalledWith(0.5);
  });

  it('off 1× the chip is marked active', () => {
    const { container } = render(<ThemeProvider><VarispeedControl speed={1.5} onChange={vi.fn()} /></ThemeProvider>);
    expect(container.querySelector('[data-varispeed-active]')).toBeTruthy();
    expect(container.querySelector('.varispeed__chip')?.textContent).toBe('1.50×');
  });
});

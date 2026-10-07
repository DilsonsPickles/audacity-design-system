import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { VarispeedControl, sliderToSpeed, speedToSlider, formatVarispeed } from '../VarispeedControl';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

function mount(props: Partial<React.ComponentProps<typeof VarispeedControl>> = {}) {
  const onChange = vi.fn();
  const onEnabledChange = vi.fn();
  const utils = render(
    <ThemeProvider>
      <VarispeedControl speed={0.5} enabled={false} onChange={onChange} onEnabledChange={onEnabledChange} {...props} />
    </ThemeProvider>,
  );
  const chip = utils.container.querySelector('.varispeed__chip') as HTMLButtonElement;
  const caret = utils.container.querySelector('.varispeed__caret') as HTMLButtonElement;
  return { ...utils, chip, caret, onChange, onEnabledChange };
}

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

  it('the chip reads the remembered speed and its press TOGGLES varispeed (the chip toggle)', () => {
    const { container, chip, onEnabledChange, onChange } = mount();
    expect(chip.textContent).toBe('0.50×');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[data-varispeed-active]')).toBeNull();
    fireEvent.click(chip);
    expect(onEnabledChange).toHaveBeenCalledWith(true);
    expect(onChange).not.toHaveBeenCalled();
    // The press never opens the popover
    expect(document.body.querySelector('[data-varispeed-panel]')).toBeNull();
  });

  it('on, the chip is lit and reads the speed; its press switches off', () => {
    const { container, chip, onEnabledChange } = mount({ speed: 2, enabled: true });
    expect(container.querySelector('[data-varispeed-active]')).toBeTruthy();
    expect(chip.textContent).toBe('2.00×');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chip);
    expect(onEnabledChange).toHaveBeenCalledWith(false);
  });

  it('the caret opens the popover; the slider and the ½× / 2× presets report a speed, 1× switches off', () => {
    const { caret, onChange, onEnabledChange } = mount({ speed: 0.5, enabled: true });
    fireEvent.click(caret);
    const panel = document.body.querySelector('[data-varispeed-panel]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.querySelector('[data-varispeed-value]')?.textContent).toBe('0.50×');
    expect(panel.querySelector('[data-varispeed-preset="0.5"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-varispeed-preset="1"]')?.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(panel.querySelector('[data-varispeed-preset="2"]') as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(2);
    const slider = panel.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '100' } });
    expect(onChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(panel.querySelector('[data-varispeed-preset="1"]') as HTMLElement);
    expect(onEnabledChange).toHaveBeenCalledWith(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('off, the popover reads Off and the 1× preset wears the check whatever speed is remembered', () => {
    const { caret } = mount({ speed: 0.5, enabled: false });
    fireEvent.click(caret);
    const panel = document.body.querySelector('[data-varispeed-panel]') as HTMLElement;
    expect(panel.querySelector('[data-varispeed-value]')?.textContent).toBe('Off');
    expect(panel.querySelector('[data-varispeed-preset="1"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-varispeed-preset="0.5"]')?.getAttribute('aria-pressed')).toBe('false');
  });
});

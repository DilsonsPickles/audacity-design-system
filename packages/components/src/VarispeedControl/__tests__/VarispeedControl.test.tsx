import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { VarispeedControl, sliderToSpeed, speedToSlider, formatVarispeed, stepVarispeed } from '../VarispeedControl';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

function mount(props: Partial<React.ComponentProps<typeof VarispeedControl>> = {}) {
  const onChange = vi.fn();
  const onDial = vi.fn();
  const onEnabledChange = vi.fn();
  const utils = render(
    <ThemeProvider>
      <VarispeedControl speed={0.5} enabled={false} onChange={onChange} onDial={onDial} onEnabledChange={onEnabledChange} {...props} />
    </ThemeProvider>,
  );
  const chip = utils.container.querySelector('.varispeed__chip') as HTMLButtonElement;
  const caret = utils.container.querySelector('.varispeed__caret') as HTMLButtonElement;
  return { ...utils, chip, caret, onChange, onDial, onEnabledChange };
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

  it('the caret opens the popover; the slider and every preset report a speed — 1× too, the chip is the only switch', () => {
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
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(onEnabledChange).not.toHaveBeenCalled();
  });

  it('off, the popover still reads the remembered speed and checks its preset — the chip says on or off', () => {
    const { caret } = mount({ speed: 0.5, enabled: false });
    fireEvent.click(caret);
    const panel = document.body.querySelector('[data-varispeed-panel]') as HTMLElement;
    expect(panel.querySelector('[data-varispeed-value]')?.textContent).toBe('0.50×');
    expect(panel.querySelector('[data-varispeed-preset="0.5"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-varispeed-preset="1"]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('a wheel notch on the chip steps the speed a semitone — the up gesture = faster — on the semitone grid, as a DIAL turn: never a set speed, never the switch', () => {
    expect(stepVarispeed(0.5, 12)).toBeCloseTo(1, 9);
    expect(stepVarispeed(1, -12)).toBeCloseTo(0.5, 9);
    expect(stepVarispeed(0.53, 1)).toBeCloseTo(2 ** (-10 / 12), 9); // 0.53 ≈ a semitone over ½× (−11), so one up is −10
    expect(stepVarispeed(4, 1)).toBe(4);
    expect(stepVarispeed(0.25, -1)).toBe(0.25);
    const { chip, onChange, onDial, onEnabledChange } = mount({ speed: 0.5, enabled: false });
    // Positive deltaY is the UP gesture under macOS natural scrolling (the default) = faster
    fireEvent.wheel(chip, { deltaY: 100 });
    expect(onDial).toHaveBeenCalledTimes(1);
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.5 * 2 ** (4 / 12), 9)); // 100px = four 24px notches
    fireEvent.wheel(chip, { deltaY: -10 }); // 100 left 4 of travel; −10 brings it to −6
    expect(onDial).toHaveBeenCalledTimes(1); // under a notch: accumulates
    fireEvent.wheel(chip, { deltaY: -18 }); // −24 = one notch down = slower
    expect(onDial).toHaveBeenCalledTimes(2);
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.5 * 2 ** (-1 / 12), 9));
    expect(onChange).not.toHaveBeenCalled(); // the dial is not a set speed — it does not switch on
    expect(onEnabledChange).not.toHaveBeenCalled();
  });
});

import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import {
  VarispeedControl, sliderToSpeed, speedToSlider, formatVarispeed, stepVarispeed, stepVarispeedFine,
  VARISPEED_MIN, VARISPEED_MAX, VARISPEED_UNITY_FRACTION,
} from '../VarispeedControl';
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
  it("the slider is Audacity 3's: linear 0.01×–3.0× in hundredths, the readout to three decimals, 1× marked a third of the way", () => {
    expect(VARISPEED_MIN).toBe(0.01);
    expect(VARISPEED_MAX).toBe(3);
    expect(sliderToSpeed(1)).toBeCloseTo(0.01, 9);
    expect(sliderToSpeed(100)).toBeCloseTo(1, 9);
    expect(sliderToSpeed(300)).toBeCloseTo(3, 9);
    expect(speedToSlider(1)).toBe(100);
    expect(speedToSlider(0.5)).toBe(50);
    expect(speedToSlider(9)).toBe(300); // clamped
    expect(formatVarispeed(1)).toBe('1.000×');
    expect(formatVarispeed(0.5)).toBe('0.500×');
    expect(VARISPEED_UNITY_FRACTION).toBeCloseTo(0.99 / 2.99, 9);
  });

  it('the chip reads the remembered speed and its press TOGGLES varispeed (the chip toggle)', () => {
    const { container, chip, onEnabledChange, onChange } = mount();
    expect(chip.textContent).toBe('0.500×');
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
    expect(chip.textContent).toBe('2.000×');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chip);
    expect(onEnabledChange).toHaveBeenCalledWith(false);
  });

  it('the caret opens the popover; the slider and every preset report a speed — 1× too, the chip is the only switch', () => {
    const { caret, onChange, onEnabledChange } = mount({ speed: 0.5, enabled: true });
    fireEvent.click(caret);
    const panel = document.body.querySelector('[data-varispeed-panel]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.querySelector('[data-varispeed-value]')?.textContent).toBe('0.500×');
    expect(panel.querySelector('[data-varispeed-unity]')).toBeTruthy();
    expect(panel.querySelector('[data-varispeed-preset="0.5"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-varispeed-preset="1"]')?.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(panel.querySelector('[data-varispeed-preset="2"]') as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(2);
    const slider = panel.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider.min).toBe('1');
    expect(slider.max).toBe('300');
    expect(slider.value).toBe('50');
    fireEvent.change(slider, { target: { value: '275' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(2.75, 9));
    fireEvent.click(panel.querySelector('[data-varispeed-preset="1"]') as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(onEnabledChange).not.toHaveBeenCalled();
  });

  it('off, the popover still reads the remembered speed and checks its preset — the chip says on or off', () => {
    const { caret } = mount({ speed: 0.5, enabled: false });
    fireEvent.click(caret);
    const panel = document.body.querySelector('[data-varispeed-panel]') as HTMLElement;
    expect(panel.querySelector('[data-varispeed-value]')?.textContent).toBe('0.500×');
    expect(panel.querySelector('[data-varispeed-preset="0.5"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-varispeed-preset="1"]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('a wheel notch on the chip steps the speed a tenth — the up gesture = faster — on the tenths grid, as a DIAL turn: never a set speed, never the switch', () => {
    expect(stepVarispeed(0.5, 5)).toBeCloseTo(1, 9);
    expect(stepVarispeed(1, -5)).toBeCloseTo(0.5, 9);
    expect(stepVarispeed(0.53, 1)).toBeCloseTo(0.6, 9); // snaps to the grid first
    expect(stepVarispeed(3, 1)).toBe(3);
    expect(stepVarispeed(0.01, -1)).toBe(0.01);
    const { chip, onChange, onDial, onEnabledChange } = mount({ speed: 0.5, enabled: false });
    // Positive deltaY is the UP gesture under macOS natural scrolling (the default) = faster
    fireEvent.wheel(chip, { deltaY: 100 });
    expect(onDial).toHaveBeenCalledTimes(1);
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.9, 9)); // 100px = four 24px notches
    fireEvent.wheel(chip, { deltaY: -10 }); // 100 left 4 of travel; −10 brings it to −6
    expect(onDial).toHaveBeenCalledTimes(1); // under a notch: accumulates
    fireEvent.wheel(chip, { deltaY: -18 }); // −24 = one notch down = slower
    expect(onDial).toHaveBeenCalledTimes(2);
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.4, 9));
    expect(onChange).not.toHaveBeenCalled(); // the dial is not a set speed — it does not switch on
    expect(onEnabledChange).not.toHaveBeenCalled();
  });

  it('Shift+wheel is the fine step: a hundredth of a speed per notch on the hundredths grid, read from either axis', () => {
    expect(stepVarispeedFine(0.5, 1)).toBeCloseTo(0.51, 9);
    expect(stepVarispeedFine(0.504, -1)).toBeCloseTo(0.49, 9); // snaps to the grid first
    expect(stepVarispeedFine(3, 1)).toBe(3);
    expect(stepVarispeedFine(0.01, -1)).toBe(0.01);
    const { chip, onDial } = mount({ speed: 0.5, enabled: false });
    fireEvent.wheel(chip, { deltaY: 24, shiftKey: true });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.51, 9));
    // Chromium turns a Shift+wheel's vertical delta horizontal: the X axis counts too
    fireEvent.wheel(chip, { deltaY: 0, deltaX: 48, shiftKey: true });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.52, 9));
    // Without Shift, a horizontal delta is not a notch
    fireEvent.wheel(chip, { deltaY: 0, deltaX: 48 });
    expect(onDial).toHaveBeenCalledTimes(2);
  });
});

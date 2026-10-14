import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import {
  VarispeedControl, sliderToSpeed, speedToSlider, formatVarispeed, formatVarispeedDigits, parseVarispeed,
  stepVarispeed, stepVarispeedFine, VARISPEED_MIN, VARISPEED_MAX, VARISPEED_UNITY_FRACTION,
} from '../VarispeedControl';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

function mount(props: Partial<React.ComponentProps<typeof VarispeedControl>> = {}) {
  const onChange = vi.fn();
  const onDial = vi.fn();
  const utils = render(
    <ThemeProvider>
      <VarispeedControl speed={0.5} enabled={false} onChange={onChange} onDial={onDial} {...props} />
    </ThemeProvider>,
  );
  const root = utils.container.querySelector('.varispeed') as HTMLElement;
  const label = utils.container.querySelector('[data-varispeed-label]') as HTMLElement;
  const display = utils.container.querySelector('[data-varispeed-display]') as HTMLDivElement;
  const caret = utils.container.querySelector('.varispeed__caret') as HTMLButtonElement;
  return { ...utils, root, label, display, caret, onChange, onDial };
}

describe('VarispeedControl (2026-10-07; the timecode-family readout since 2026-10-14)', () => {
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
    expect(formatVarispeedDigits(0.5)).toBe('0.500');
    expect(VARISPEED_UNITY_FRACTION).toBeCloseTo(0.99 / 2.99, 9);
  });

  it('reads "Speed 0.500 ×": a CAPTION (not a button), the digits and the unit on the dark face; off at 1×, on at any other speed', () => {
    const { container, label, display, onChange } = mount({ speed: 0.5, enabled: false });
    expect(label.tagName).toBe('SPAN');
    expect(label.textContent).toBe('Speed');
    expect(label.textContent + display.textContent).toBe('Speed0.500×');
    expect(container.querySelector('[data-varispeed-readout]')?.textContent).toBe('0.500');
    expect(container.querySelector('.timecode-unit[data-unit="times"]')?.textContent).toBe('×');
    expect(container.querySelector('[data-varispeed-active]')).toBeNull();
    fireEvent.click(label);
    expect(onChange).not.toHaveBeenCalled(); // the word does nothing
    expect(document.body.querySelector('[data-varispeed-panel]')).toBeNull();
  });

  it('on, the caption is lit and the display reads the speed', () => {
    const { container } = mount({ speed: 2, enabled: true });
    expect(container.querySelector('[data-varispeed-active]')).toBeTruthy();
    expect(container.querySelector('[data-varispeed-readout]')?.textContent).toBe('2.000');
  });

  it('a click on the digits TYPES A VALUE (2026-10-14, "a very specific value"): Enter sets it — clamped — and so switches on; Escape reverts', () => {
    expect(parseVarispeed('0.875')).toBeCloseTo(0.875, 9);
    expect(parseVarispeed('0,875')).toBeCloseTo(0.875, 9);
    expect(parseVarispeed('2 ×')).toBe(2);
    expect(parseVarispeed('9')).toBe(3); // clamped to the range
    expect(parseVarispeed('')).toBeNull();
    expect(parseVarispeed('fast')).toBeNull();
    const { container, onChange, onDial } = mount({ speed: 0.5, enabled: false });
    fireEvent.click(container.querySelector('[data-varispeed-readout]') as HTMLElement);
    const input = container.querySelector('[data-varispeed-input]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('0.500');
    fireEvent.change(input, { target: { value: '0.875' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(0.875); // a SET speed: the host stores it and switches on
    expect(container.querySelector('[data-varispeed-input]')).toBeNull();
    // Escape: nothing set
    act(() => { (container.querySelector('[data-varispeed-display]') as HTMLElement).focus(); });
    fireEvent.keyDown(container.querySelector('[data-varispeed-display]') as HTMLElement, { key: 'Enter' });
    const input2 = container.querySelector('[data-varispeed-input]') as HTMLInputElement;
    fireEvent.change(input2, { target: { value: '1.25' } });
    fireEvent.keyDown(input2, { key: 'Escape' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-varispeed-input]')).toBeNull();
    // Nonsense typed is not a speed
    fireEvent.click(container.querySelector('[data-varispeed-readout]') as HTMLElement);
    const input3 = container.querySelector('[data-varispeed-input]') as HTMLInputElement;
    fireEvent.change(input3, { target: { value: 'fast' } });
    fireEvent.keyDown(input3, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onDial).not.toHaveBeenCalled();
  });

  it('↑ ↓ on the focused display dial the speed a tenth (Shift a hundredth) — the wheel\'s rule, never the switch', () => {
    const { display, onDial, onChange } = mount({ speed: 0.5, enabled: false });
    fireEvent.keyDown(display, { key: 'ArrowUp' });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.6, 9));
    fireEvent.keyDown(display, { key: 'ArrowDown', shiftKey: true });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.49, 9));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('the caret opens the popover; the slider and every preset report a speed — 1× too, 1× is off', () => {
    const { caret, onChange } = mount({ speed: 0.5, enabled: true });
    fireEvent.click(caret);
    const panel = document.body.querySelector('[data-varispeed-panel]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.querySelector('.varispeed__title')?.textContent).toBe('Playback speed');
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
  });

  it('off, the popover still reads the remembered speed and checks its preset ', () => {
    const { caret } = mount({ speed: 0.5, enabled: false });
    fireEvent.click(caret);
    const panel = document.body.querySelector('[data-varispeed-panel]') as HTMLElement;
    expect(panel.querySelector('[data-varispeed-value]')?.textContent).toBe('0.500×');
    expect(panel.querySelector('[data-varispeed-preset="0.5"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-varispeed-preset="1"]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('a wheel notch on the display steps the speed a tenth — the up gesture = faster — on the tenths grid, as a DIAL turn: never a set speed, never the switch', () => {
    expect(stepVarispeed(0.5, 5)).toBeCloseTo(1, 9);
    expect(stepVarispeed(1, -5)).toBeCloseTo(0.5, 9);
    expect(stepVarispeed(0.53, 1)).toBeCloseTo(0.6, 9); // snaps to the grid first
    expect(stepVarispeed(3, 1)).toBe(3);
    expect(stepVarispeed(0.01, -1)).toBe(0.01);
    const { display, onChange, onDial } = mount({ speed: 0.5, enabled: false });
    // Positive deltaY is the UP gesture under macOS natural scrolling (the default) = faster
    fireEvent.wheel(display, { deltaY: 100 });
    expect(onDial).toHaveBeenCalledTimes(1);
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.9, 9)); // 100px = four 24px notches
    fireEvent.wheel(display, { deltaY: -10 }); // 100 left 4 of travel; −10 brings it to −6
    expect(onDial).toHaveBeenCalledTimes(1); // under a notch: accumulates
    fireEvent.wheel(display, { deltaY: -18 }); // −24 = one notch down = slower
    expect(onDial).toHaveBeenCalledTimes(2);
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.4, 9));
    expect(onChange).not.toHaveBeenCalled(); // the dial goes out through onDial
  });

  it('Shift+wheel is the fine step: a hundredth of a speed per notch on the hundredths grid, read from either axis', () => {
    expect(stepVarispeedFine(0.5, 1)).toBeCloseTo(0.51, 9);
    expect(stepVarispeedFine(0.504, -1)).toBeCloseTo(0.49, 9); // snaps to the grid first
    expect(stepVarispeedFine(3, 1)).toBe(3);
    expect(stepVarispeedFine(0.01, -1)).toBe(0.01);
    const { display, onDial } = mount({ speed: 0.5, enabled: false });
    fireEvent.wheel(display, { deltaY: 24, shiftKey: true });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.51, 9));
    // Chromium turns a Shift+wheel's vertical delta horizontal: the X axis counts too
    fireEvent.wheel(display, { deltaY: 0, deltaX: 48, shiftKey: true });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.52, 9));
    // Without Shift, a horizontal delta is not a notch
    fireEvent.wheel(display, { deltaY: 0, deltaX: 48 });
    expect(onDial).toHaveBeenCalledTimes(2);
  });
});

import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import {
  VarispeedControl, sliderToSpeed, speedToSlider, formatVarispeed, formatVarispeedDigits, parseVarispeed,
  stepVarispeed, stepVarispeedFine, VARISPEED_MIN, VARISPEED_MAX, VARISPEED_UNITY_FRACTION, DETENT_SPEED,
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
  const label = utils.container.querySelector('[data-varispeed-label]') as HTMLElement;
  const display = utils.container.querySelector('[data-varispeed-display]') as HTMLDivElement;
  const slider = utils.container.querySelector('[data-varispeed-slider]') as HTMLInputElement;
  return { ...utils, label, display, slider, onChange, onDial };
}

describe('VarispeedControl (2026-10-07; the timecode-family readout with a mini slider since 2026-10-14)', () => {
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

  it('reads "Speed [slider] 0.500 ×": a CAPTION (not a button), the mini slider with its 1× mark, the digits and the unit on the dark face', () => {
    const { container, label, slider, onChange } = mount({ speed: 0.5, enabled: false });
    expect(label.tagName).toBe('SPAN');
    expect(label.textContent).toBe('Speed');
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('1');
    expect(slider.max).toBe('300');
    expect(slider.value).toBe('50');
    expect(container.querySelector('[data-varispeed-unity]')).toBeTruthy();
    expect(container.querySelector('[data-varispeed-readout]')?.textContent).toBe('0.500');
    expect(container.querySelector('.timecode-unit[data-unit="times"]')?.textContent).toBe('×');
    expect(container.querySelector('[data-varispeed-active]')).toBeNull();
    // No caret, no popover
    expect(container.querySelector('.varispeed__caret')).toBeNull();
    expect(document.body.querySelector('[data-varispeed-panel]')).toBeNull();
    fireEvent.click(label);
    expect(onChange).not.toHaveBeenCalled(); // the word does nothing
  });

  it('on (the host: the speed is not 1×), the face is lit and reads the speed', () => {
    const { container, slider } = mount({ speed: 2, enabled: true });
    expect(container.querySelector('[data-varispeed-active]')).toBeTruthy();
    expect(container.querySelector('[data-varispeed-readout]')?.textContent).toBe('2.000');
    expect(slider.value).toBe('200');
  });

  it('the slider SETS the speed; a mouse drag within the detent lands on 1× (off), the keys step through it', () => {
    expect(DETENT_SPEED).toBe(0.1);
    const { slider, onChange } = mount({ speed: 0.5, enabled: false });
    fireEvent.change(slider, { target: { value: '275' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(2.75, 9));
    // Dragging: 0.93 is inside the detent → 1×
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '93' } });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.change(slider, { target: { value: '85' } }); // outside the detent → as dragged
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(0.85, 9));
    fireEvent.pointerUp(slider);
    // Not dragging (the keyboard's step): 0.93 is 0.93
    fireEvent.change(slider, { target: { value: '93' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(0.93, 9));
  });

  it('a click on the digits TYPES A VALUE (2026-10-14, "a very specific value"): Enter sets it — clamped; Escape reverts; nonsense sets nothing', () => {
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
    expect(onChange).toHaveBeenCalledWith(0.875);
    expect(container.querySelector('[data-varispeed-input]')).toBeNull();
    fireEvent.click(container.querySelector('[data-varispeed-readout]') as HTMLElement);
    const input2 = container.querySelector('[data-varispeed-input]') as HTMLInputElement;
    fireEvent.change(input2, { target: { value: '1.25' } });
    fireEvent.keyDown(input2, { key: 'Escape' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-varispeed-input]')).toBeNull();
    fireEvent.click(container.querySelector('[data-varispeed-readout]') as HTMLElement);
    const input3 = container.querySelector('[data-varispeed-input]') as HTMLInputElement;
    fireEvent.change(input3, { target: { value: 'fast' } });
    fireEvent.keyDown(input3, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onDial).not.toHaveBeenCalled();
  });

  it('↑ ↓ on the face (not the slider) step the speed a tenth (Shift a hundredth)', () => {
    const { display, onDial, onChange } = mount({ speed: 0.5, enabled: false });
    fireEvent.keyDown(display, { key: 'ArrowUp' });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.6, 9));
    fireEvent.keyDown(display, { key: 'ArrowDown', shiftKey: true });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.49, 9));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('no wheel on the readout (2026-10-14): a scroll over it changes nothing', () => {
    expect(stepVarispeed(0.5, 5)).toBeCloseTo(1, 9);
    expect(stepVarispeed(0.53, 1)).toBeCloseTo(0.6, 9); // the arrow step snaps to the grid first
    expect(stepVarispeedFine(0.504, -1)).toBeCloseTo(0.49, 9);
    const { display, onChange, onDial } = mount({ speed: 0.5, enabled: false });
    fireEvent.wheel(display, { deltaY: 100 });
    fireEvent.wheel(display, { deltaY: -100, shiftKey: true });
    expect(onDial).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

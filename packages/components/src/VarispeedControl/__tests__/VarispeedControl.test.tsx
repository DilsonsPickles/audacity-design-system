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
  const slider = utils.container.querySelector('.varispeed__track input[type="range"]') as HTMLInputElement;
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
    expect(Array.from(container.querySelectorAll('.varispeed__digit')).map((c) => c.textContent).join('')).toBe('0500');
    expect(container.querySelector('.timecode-unit[data-unit="times"]')?.textContent).toBe('×');
    expect(container.querySelector('[data-varispeed-active]')).toBeNull();
    // The design system's Slider, as the volume slider; no caret, no popover
    expect(container.querySelector('.varispeed__track .slider .slider__handle')).toBeTruthy();
    expect(container.querySelector('.varispeed__caret')).toBeNull();
    expect(document.body.querySelector('[data-varispeed-panel]')).toBeNull();
    fireEvent.click(label);
    expect(onChange).not.toHaveBeenCalled(); // the word does nothing
  });

  it('on (the host: the speed is not 1×), the face is lit and reads the speed', () => {
    const { container, slider } = mount({ speed: 2, enabled: true });
    expect(container.querySelector('[data-varispeed-active]')).toBeTruthy();
    expect(Array.from(container.querySelectorAll('.varispeed__digit')).map((c) => c.textContent).join('')).toBe('2000');
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

  it('the number is the timecode\'s digit cells; a click on a digit edits THAT digit: 0–9 set it and move on, ↑ ↓ wrap it, ← → move, Enter leaves — every change commits at once', () => {
    expect(parseVarispeed('0,875')).toBeCloseTo(0.875, 9); // the helper stays for hosts
    const { container, onChange, onDial } = mount({ speed: 0.5, enabled: false });
    const cells = container.querySelectorAll('.varispeed__digit');
    expect(Array.from(cells).map((c) => c.textContent)).toEqual(['0', '5', '0', '0']);
    expect(container.querySelector('.timecode-unit[data-unit="period"]')?.textContent).toBe('.');
    // Click the tenths digit, type 8 → 0.800, the active cell moves to the hundredths
    fireEvent.click(cells[1]);
    expect(cells[1].getAttribute('data-state')).toBe('active');
    fireEvent.keyDown(document, { key: '8' });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(0.8, 9));
    expect(cells[2].getAttribute('data-state')).toBe('active');
    // ↑ wraps the hundredths digit 0 → 1: 0.510 (the host had not re-rendered the 0.8)
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(0.51, 9));
    // ← back to the tenths; ↓ wraps 5 → 4
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(cells[1].getAttribute('data-state')).toBe('active');
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(0.4, 9));
    // Enter leaves editing
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(container.querySelector('.varispeed__digit[data-state="active"]')).toBeNull();
    expect(onDial).not.toHaveBeenCalled();
  });

  it('the units digit clamps to the range: a 9 typed there is 3× (the top), and a click outside the box leaves editing', () => {
    const { container, onChange } = mount({ speed: 0.5, enabled: false });
    const cells = container.querySelectorAll('.varispeed__digit');
    fireEvent.click(cells[0]);
    fireEvent.keyDown(document, { key: '9' });
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.mouseDown(document.body);
    expect(container.querySelector('.varispeed__digit[data-state="active"]')).toBeNull();
  });

  it('↑ ↓ on the box with no digit active step the speed a tenth (Shift a hundredth)', () => {
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

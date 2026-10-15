import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import {
  VarispeedControl, sliderToSpeed, speedToSlider, formatVarispeed, formatVarispeedPercent, parseVarispeed,
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
  const readout = utils.container.querySelector('[data-varispeed-display]') as HTMLElement;
  const slider = utils.container.querySelector('.varispeed__track input[type="range"]') as HTMLInputElement;
  return { ...utils, label, readout, slider, onChange, onDial };
}

describe('VarispeedControl (2026-10-07; caption · slider · fixed-width percent readout since 2026-10-15)', () => {
  it("the slider is Audacity 3's: linear 0.01×–3.0× in hundredths — whole percents — with 100% marked a third of the way", () => {
    expect(VARISPEED_MIN).toBe(0.01);
    expect(VARISPEED_MAX).toBe(3);
    expect(sliderToSpeed(1)).toBeCloseTo(0.01, 9);
    expect(sliderToSpeed(100)).toBeCloseTo(1, 9);
    expect(sliderToSpeed(300)).toBeCloseTo(3, 9);
    expect(speedToSlider(1)).toBe(100);
    expect(speedToSlider(0.5)).toBe(50);
    expect(speedToSlider(9)).toBe(300); // clamped
    expect(formatVarispeedPercent(1)).toBe('100%');
    expect(formatVarispeedPercent(0.875)).toBe('88%');
    expect(formatVarispeedPercent(3)).toBe('300%');
    expect(formatVarispeed(0.5)).toBe('0.500×'); // the × form stays for hosts
    expect(parseVarispeed('0,875')).toBeCloseTo(0.875, 9);
    expect(parseVarispeed('75%')).toBeCloseTo(0.75, 9);
    expect(parseVarispeed('fast')).toBeNull();
    expect(VARISPEED_UNITY_FRACTION).toBeCloseTo(0.99 / 2.99, 9);
  });

  it('reads "Speed [slider] 50%": a CAPTION (not a button), the design system\'s slider with its mark, a plain-text readout — no dark face, no digit cells', () => {
    const { container, label, slider, readout, onChange } = mount({ speed: 0.5, enabled: false });
    expect(label.tagName).toBe('SPAN');
    expect(label.textContent).toBe('Speed');
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('1');
    expect(slider.max).toBe('300');
    expect(slider.value).toBe('50');
    expect(container.querySelector('[data-varispeed-unity]')).toBeTruthy();
    expect(container.querySelector('.varispeed__track .slider .slider__handle')).toBeTruthy();
    expect(readout.textContent).toBe('50%');
    expect(readout.getAttribute('aria-label')).toBe('Playback speed 50%');
    expect(container.querySelector('.varispeed__digit')).toBeNull();
    expect(container.querySelector('.timecode-unit')).toBeNull();
    expect(container.querySelector('[data-varispeed-active]')).toBeNull();
    fireEvent.click(label);
    expect(onChange).not.toHaveBeenCalled(); // the word does nothing
  });

  it('on (the host: the speed is not 100%), the control is marked active and the readout reads the speed', () => {
    const { container, slider, readout } = mount({ speed: 2, enabled: true });
    expect(container.querySelector('[data-varispeed-active]')).toBeTruthy();
    expect(readout.textContent).toBe('200%');
    expect(slider.value).toBe('200');
  });

  it('the slider SETS the speed; a mouse drag within the detent lands on 100% (off), the keys step through it', () => {
    expect(DETENT_SPEED).toBe(0.1);
    const { slider, onChange } = mount({ speed: 0.5, enabled: false });
    fireEvent.change(slider, { target: { value: '275' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(2.75, 9));
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '93' } }); // inside the detent → 1×
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.change(slider, { target: { value: '85' } }); // outside → as dragged
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(0.85, 9));
    fireEvent.pointerUp(slider);
    fireEvent.change(slider, { target: { value: '93' } }); // not dragging: 93 is 93
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(0.93, 9));
  });

  it('↑ ↓ on the readout step the speed a tenth (Shift a hundredth); Enter and a double-click open "Enter value…" in percent', () => {
    const { readout, baseElement, onDial, onChange } = mount({ speed: 0.5, enabled: false });
    fireEvent.keyDown(readout, { key: 'ArrowUp' });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.6, 9));
    fireEvent.keyDown(readout, { key: 'ArrowDown', shiftKey: true });
    expect(onDial).toHaveBeenLastCalledWith(expect.closeTo(0.49, 9));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(readout, { key: 'Enter' });
    const input = baseElement.querySelector('[data-manual-value-dialog] input') as HTMLInputElement;
    expect(input.value).toBe('50 %');
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(0.75, 9));
  });

  it('no wheel on the readout (2026-10-14): a scroll over it changes nothing', () => {
    expect(stepVarispeed(0.5, 5)).toBeCloseTo(1, 9);
    expect(stepVarispeed(0.53, 1)).toBeCloseTo(0.6, 9); // the arrow step snaps to the grid first
    expect(stepVarispeedFine(0.504, -1)).toBeCloseTo(0.49, 9);
    const { readout, onChange, onDial } = mount({ speed: 0.5, enabled: false });
    fireEvent.wheel(readout, { deltaY: 100 });
    fireEvent.wheel(readout, { deltaY: -100, shiftKey: true });
    expect(onDial).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('the caption is not a state (2026-10-15)', () => {
  it('has no active-state styling hook: the on marker lives on the control, the caption is the same span on or off', () => {
    const off = render(<ThemeProvider><VarispeedControl speed={1} enabled={false} onChange={() => {}} onDial={() => {}} /></ThemeProvider>);
    const on = render(<ThemeProvider><VarispeedControl speed={2} enabled onChange={() => {}} onDial={() => {}} /></ThemeProvider>);
    const a = off.container.querySelector('[data-varispeed-label]') as HTMLElement;
    const b = on.container.querySelector('[data-varispeed-label]') as HTMLElement;
    expect(a.className).toBe(b.className);
    expect(a.getAttributeNames().sort()).toEqual(b.getAttributeNames().sort());
  });
});

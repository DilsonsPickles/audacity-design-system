import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { VarispeedTimecode, formatVarispeedDigits3 } from '../VarispeedTimecode';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

function mount(speed = 1, withToggle = false) {
  const onChange = vi.fn();
  const onToggle = vi.fn();
  const utils = render(
    <ThemeProvider>
      <VarispeedTimecode speed={speed} enabled={speed !== 1} onChange={onChange} onToggle={withToggle ? onToggle : undefined} />
    </ThemeProvider>,
  );
  const root = utils.container.querySelector('[data-varispeed-timecode]') as HTMLElement;
  return { ...utils, root, onChange, onToggle };
}

describe('VarispeedTimecode — play-at-speed as a timecode (2026-11-11)', () => {
  it('pads the percent to three digits so the face never changes width', () => {
    expect(formatVarispeedDigits3(0.01)).toBe('001');
    expect(formatVarispeedDigits3(0.75)).toBe('075');
    expect(formatVarispeedDigits3(1)).toBe('100');
    expect(formatVarispeedDigits3(3)).toBe('300');
  });

  it('reads "Speed", the digits, then "%", in the timecode unit type', () => {
    const { root } = mount(0.5);
    expect(root.querySelector('.timecode-unit[data-unit="speed"]')?.textContent).toBe('Speed');
    expect(root.querySelector('.varispeed-timecode__digits')?.textContent).toBe('050');
    expect(root.querySelector('.timecode-unit[data-unit="percent"]')?.textContent).toBe('%');
    expect(root.getAttribute('aria-valuetext')).toBe('50%');
  });

  it('the arrows step a tenth; ↑ ↓ a tenth, Shift a hundredth', () => {
    const { root, onChange } = mount(1);
    fireEvent.pointerDown(root.querySelector('.bpm-stepper__arrow--up')!);
    fireEvent.pointerUp(root.querySelector('.bpm-stepper__arrow--up')!);
    expect(onChange).toHaveBeenLastCalledWith(1.1);
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(0.9);
    fireEvent.keyDown(root, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(1.01);
  });

  it('a click on a digit edits that digit: 0–9 set it and move on, ↑ wraps it', () => {
    const { root, onChange } = mount(1);
    const cells = root.querySelectorAll('.timecode-digit');
    expect(cells).toHaveLength(3);
    fireEvent.click(cells[1]);
    expect(cells[1].getAttribute('data-state')).toBe('active');
    fireEvent.keyDown(window, { key: '7' });
    expect(onChange).toHaveBeenLastCalledWith(1.7);
    expect(cells[2].getAttribute('data-state')).toBe('active');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(1.71); // 170 → its last digit up
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(cells[2].getAttribute('data-state')).toBe('default');
  });

  it('a double-click on the face types a percent; Enter commits it, clamped', async () => {
    const { root, onChange } = mount(1);
    fireEvent.doubleClick(root.querySelector('[data-varispeed-display]')!);
    const input = root.querySelector('.bpm-stepper__input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(0.75);
    fireEvent.doubleClick(root.querySelector('[data-varispeed-display]')!);
    const again = root.querySelector('.bpm-stepper__input') as HTMLInputElement;
    fireEvent.change(again, { target: { value: '999' } });
    await act(async () => { fireEvent.keyDown(again, { key: 'Enter' }); });
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('a click on "Speed" is the 0 key — the host\'s toggle, else 100%', () => {
    const toggled = mount(0.5, true);
    fireEvent.click(toggled.root.querySelector('[data-varispeed-label]')!, { detail: 1 });
    expect(toggled.onToggle).toHaveBeenCalledTimes(1);
    // A double-click's second click is not a second toggle, nor the text field
    fireEvent.click(toggled.root.querySelector('[data-varispeed-label]')!, { detail: 2 });
    fireEvent.doubleClick(toggled.root.querySelector('[data-varispeed-label]')!);
    expect(toggled.onToggle).toHaveBeenCalledTimes(1);
    expect(toggled.root.querySelector('.bpm-stepper__input')).toBeNull();
    expect(toggled.onChange).not.toHaveBeenCalled();
    cleanup();
    const bare = mount(0.5);
    fireEvent.click(bare.root.querySelector('[data-varispeed-label]')!, { detail: 1 });
    expect(bare.onChange).toHaveBeenLastCalledWith(1);
  });
});

describe('VarispeedTimecode — the lamp (2026-11-11)', () => {
  it('marks itself active off 100% and carries the amber for "Speed"', () => {
    const on = render(<ThemeProvider><VarispeedTimecode speed={0.5} enabled onChange={() => {}} /></ThemeProvider>);
    const root = on.container.querySelector('[data-varispeed-timecode]') as HTMLElement;
    expect(root.getAttribute('data-varispeed-active')).toBe('true');
    expect(root.style.getPropertyValue('--varispeed-lamp')).not.toBe('');
    cleanup();
    const off = render(<ThemeProvider><VarispeedTimecode speed={1} enabled={false} onChange={() => {}} /></ThemeProvider>);
    expect(off.container.querySelector('[data-varispeed-timecode]')?.hasAttribute('data-varispeed-active')).toBe(false);
  });
});

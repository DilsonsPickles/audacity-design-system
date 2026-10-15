import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { lightTheme, darkTheme, type ThemeTokens } from '@audacity-ui/tokens';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { TimeCode, parseTimeText } from '../TimeCode';

afterEach(cleanup);

function renderTimeCode(theme: ThemeTokens) {
  // Default variant is 'dark' (the transport-toolbar chip), which is what
  // renders on both the light and dark app toolbars.
  return render(
    <ThemeProvider theme={theme}>
      <TimeCode value={0} format="hh:mm:ss" />
    </ThemeProvider>
  );
}

describe('TimeCode — theme-aware dark-variant background', () => {
  it('dark theme: the timecode chip background is #171F25', () => {
    const { container } = renderTimeCode(darkTheme);
    const root = container.querySelector('.timecode') as HTMLElement;
    expect(root.style.getPropertyValue('--timecode-bg')).toBe('#171F25');
    expect(root.style.getPropertyValue('--timecode-bg')).toBe(
      darkTheme.background.control.timecode.idle,
    );
    // Unit segments share the chip background so it reads as one surface.
    expect(root.style.getPropertyValue('--timecode-unit-bg')).toBe('#171F25');
  });

  it('light theme: chip background stays #212433 — light mode / website unchanged', () => {
    const { container } = renderTimeCode(lightTheme);
    const root = container.querySelector('.timecode') as HTMLElement;
    expect(root.style.getPropertyValue('--timecode-bg')).toBe('#212433');
    expect(root.style.getPropertyValue('--timecode-unit-bg')).toBe('#212433');
  });

  it('token values: dark #171F25, light preserves the original #212433', () => {
    expect(darkTheme.background.control.timecode.idle).toBe('#171F25');
    expect(lightTheme.background.control.timecode.idle).toBe('#212433');
  });
});

describe('the format menu is portaled to the body (2026-10-13)', () => {
  it('opens outside the control\'s own subtree, so a Dialog ancestor cannot place or clip it', () => {
    const { container } = render(
      <ThemeProvider>
        <div style={{ containerType: 'inline-size', overflow: 'hidden' }} data-testid="host">
          <TimeCode value={5} format="hh:mm:ss" onChange={vi.fn()} />
        </div>
      </ThemeProvider>,
    );
    fireEvent.click(container.querySelector('.timecode__format-button')!);
    const menu = document.body.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(container.querySelector('[data-testid="host"]')!.contains(menu)).toBe(false);
    expect(menu!.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(5);
  });
});

describe('mm:ss+milliseconds (2026-10-15, the timecodes\' default)', () => {
  it('reads "00m00.000s": two minute cells, no hours, minutes running past 59; the digits read back as seconds', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <TimeCode value={61 * 60 + 5.25} format="mm:ss+milliseconds" onChange={onChange} onFormatChange={() => {}} />
      </ThemeProvider>,
    );
    const text = (container.querySelector('.timecode__display') as HTMLElement).textContent?.replace(/\s/g, '');
    expect(text).toBe('61m05.250s');
    expect(container.querySelector('.timecode-unit[data-unit="hours"]')).toBeNull();
    // Type a 7 into the first minutes cell: 71m05.250s = 4265.25 s
    const digits = container.querySelectorAll('.timecode-digit');
    fireEvent.click(digits[0]);
    fireEvent.keyDown(document, { key: '7' });
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(71 * 60 + 5.25, 6));
  });
});

describe('free-text entry (2026-10-15, Bitwig\'s timecode)', () => {
  it('parses what a person types', () => {
    expect(parseTimeText('37.909', 'mm:ss+milliseconds')).toBeCloseTo(37.909, 9);
    expect(parseTimeText('1:02.5', 'mm:ss+milliseconds')).toBeCloseTo(62.5, 9);
    expect(parseTimeText('1:02:03', 'hh:mm:ss')).toBe(3723);
    expect(parseTimeText('2m3.5s', 'mm:ss+milliseconds')).toBeCloseTo(123.5, 9);
    expect(parseTimeText('1h2m', 'hh:mm:ss')).toBe(3720);
    expect(parseTimeText('00m37.909s', 'mm:ss+milliseconds')).toBeCloseTo(37.909, 9);
    expect(parseTimeText('12,5', 'seconds')).toBe(12.5);
    expect(parseTimeText('44100', 'samples', 44100)).toBe(1);
    expect(parseTimeText('', 'hh:mm:ss')).toBeNull();
    expect(parseTimeText('later', 'hh:mm:ss')).toBeNull();
    expect(parseTimeText('-3', 'hh:mm:ss')).toBeNull();
  });

  it('Enter value… turns the display into one text field holding the value; Enter sets the parsed time, Escape leaves it alone', () => {
    const onChange = vi.fn();
    const { container, getByText } = render(
      <ThemeProvider>
        <TimeCode value={37.909} format="mm:ss+milliseconds" onChange={onChange} onFormatChange={() => {}} />
      </ThemeProvider>,
    );
    fireEvent.contextMenu(container.querySelector('.timecode') as HTMLElement);
    fireEvent.click(getByText('Enter value…'));
    return new Promise<void>((resolve) => setTimeout(resolve, 10)).then(() => {
      const input = container.querySelector('[data-timecode-text-input]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.value).toBe('00m37.909s');
      expect(container.querySelector('.timecode-digit')).toBeNull(); // the digits are replaced
      fireEvent.change(input, { target: { value: '1:02.5' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(62.5, 9));
      expect(container.querySelector('[data-timecode-text-input]')).toBeNull();
      // A double-click on the display opens it too; Escape leaves without a change
      fireEvent.doubleClick(container.querySelector('.timecode__display') as HTMLElement);
      const input2 = container.querySelector('[data-timecode-text-input]') as HTMLInputElement;
      expect(input2).toBeTruthy();
      fireEvent.change(input2, { target: { value: '9' } });
      fireEvent.keyDown(input2, { key: 'Escape' });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(container.querySelector('[data-timecode-text-input]')).toBeNull();
    });
  });
});

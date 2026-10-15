import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { lightTheme, darkTheme, type ThemeTokens } from '@audacity-ui/tokens';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { TimeCode } from '../TimeCode';

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

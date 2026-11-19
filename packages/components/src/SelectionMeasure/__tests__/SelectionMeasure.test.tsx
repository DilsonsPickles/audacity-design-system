import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { SelectionMeasure } from '../SelectionMeasure';

afterEach(cleanup);

const renderMeasure = (startTime: number, endTime: number) => render(
  <ThemeProvider>
    <SelectionMeasure startTime={startTime} endTime={endTime} pixelsPerSecond={200} top={300} visibleLeft={0} visibleWidth={1000} />
  </ThemeProvider>,
);

describe('SelectionMeasure (2026-11-19, D2: a dimension line under the selection)', () => {
  it('the length on the bracket and each edge time under its tick', () => {
    const { container } = renderMeasure(1.3, 2.55);
    const m = container.querySelector('[data-selection-measure]')!;
    expect(m.querySelector('[data-selection-length]')?.textContent).toBe('1.250 s');
    expect(m.querySelector('[data-selection-start]')?.textContent).toBe('0:01.300');
    expect(m.querySelector('[data-selection-end]')?.textContent).toBe('0:02.550');
    expect(m.querySelectorAll('[data-selection-tick]')).toHaveLength(2);
  });
  it('sits under the selection at the given top, spanning it', () => {
    const { container } = renderMeasure(1, 3);
    const line = container.querySelector<HTMLElement>('[data-selection-line]')!;
    expect(line.style.left).toBe('212px');
    expect(line.style.width).toBe('400px');
    expect(parseFloat(line.style.top)).toBeGreaterThanOrEqual(300);
  });
  it('nothing for a zero-length selection', () => {
    const { container } = renderMeasure(2, 2);
    expect(container.querySelector('[data-selection-measure]')).toBeNull();
  });
  it('takes no pointer events', () => {
    const { container } = renderMeasure(1, 3);
    expect(container.querySelector<HTMLElement>('[data-selection-measure]')!.style.pointerEvents).toBe('none');
  });

  it('the ONE-LINE style: no bracket, the edge times beside the length on one row', () => {
    const { container } = render(
      <ThemeProvider>
        <SelectionMeasure variant="line" startTime={1.3} endTime={2.55} pixelsPerSecond={200} top={300} visibleLeft={0} visibleWidth={1000} />
      </ThemeProvider>,
    );
    const m = container.querySelector('[data-selection-measure]')!;
    expect(m.querySelector('[data-selection-line]')).toBeNull();
    expect(m.querySelectorAll('[data-selection-tick]')).toHaveLength(0);
    // one row: each time's top within the length pill's 17px band (centred on it)
    const top = (q: string) => parseFloat((m.querySelector(q) as HTMLElement).style.top);
    for (const q of ['[data-selection-start]', '[data-selection-end]']) {
      expect(Math.abs(top(q) - top('[data-selection-length]'))).toBeLessThan(17);
    }
  });
  it('the edge in hand is marked active, the other is not', () => {
    const { container } = render(
      <ThemeProvider>
        <SelectionMeasure variant="line" activeEdge="end" startTime={1} endTime={3} pixelsPerSecond={200} top={300} visibleLeft={0} visibleWidth={1000} />
      </ThemeProvider>,
    );
    expect(container.querySelector('[data-selection-end]')!.hasAttribute('data-active')).toBe(true);
    expect(container.querySelector('[data-selection-start]')!.hasAttribute('data-active')).toBe(false);
  });

  it('every reading is BLACK with WHITE text (2026-11-19, "I\'d rather the time stamps were black, with white text")', () => {
    for (const variant of ['line', 'dimension'] as const) {
      const { container, unmount } = render(
        <ThemeProvider>
          <SelectionMeasure variant={variant} activeEdge="end" startTime={1} endTime={3} pixelsPerSecond={200} top={300} visibleLeft={0} visibleWidth={1000} />
        </ThemeProvider>,
      );
      for (const q of ['[data-selection-start]', '[data-selection-length]', '[data-selection-end]']) {
        const el = container.querySelector(q) as HTMLElement;
        expect(el.style.background).toBe('rgb(0, 0, 0)');
        expect(el.style.color).toBe('rgb(255, 255, 255)');
      }
      unmount();
    }
  });
});

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
});

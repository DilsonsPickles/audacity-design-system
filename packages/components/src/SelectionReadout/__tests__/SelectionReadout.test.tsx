import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { SelectionReadout } from '../SelectionReadout';

afterEach(cleanup);

describe('SelectionReadout (2026-11-19, the ruler readout)', () => {
  it('shows the full label for a selection, with the data attribute', () => {
    const { container } = render(<ThemeProvider><SelectionReadout startTime={1.3} endTime={2.55} pixelsPerSecond={200} scrollX={0} viewportWidth={1000} height={40} /></ThemeProvider>);
    expect(container.querySelector('[data-selection-readout]')?.textContent).toBe('1.250 s · 0:01.300 – 0:02.550');
  });
  it('renders nothing for a zero-length selection', () => {
    const { container } = render(<ThemeProvider><SelectionReadout startTime={2} endTime={2} pixelsPerSecond={200} scrollX={0} viewportWidth={1000} height={40} /></ThemeProvider>);
    expect(container.querySelector('[data-selection-readout]')).toBeNull();
  });
  it('takes no pointer events', () => {
    const { container } = render(<ThemeProvider><SelectionReadout startTime={1} endTime={3} pixelsPerSecond={200} scrollX={0} viewportWidth={1000} height={40} /></ThemeProvider>);
    expect(getComputedStyle(container.querySelector('[data-selection-readout]')!).pointerEvents).toBe('none');
  });
});

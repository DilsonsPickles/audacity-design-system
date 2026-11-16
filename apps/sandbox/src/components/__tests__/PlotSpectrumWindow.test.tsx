import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PreferencesProvider, ThemeProvider } from '@audacity-ui/components';
import { PlotSpectrumWindow, type PlotSpectrumSource } from '../PlotSpectrumWindow';

afterEach(cleanup);

// Plot spectrum (2026-11-16): click-to-focus, and a Select action
const tone = Float32Array.from({ length: 8192 }, (_, i) => Math.sin((2 * Math.PI * 1000 * i) / 44100));

function renderWindow(selection: PlotSpectrumSource | null, region: Float32Array | null = tone) {
  const readRegion = vi.fn(() => (region ? { samples: region, sampleRate: 44100 } : null));
  const onSelectRange = vi.fn();
  const props = { isOpen: true, onClose: vi.fn(), selection, readRegion, onSelectRange, osWindow: false };
  const utils = render(
    <PreferencesProvider><ThemeProvider><PlotSpectrumWindow {...props} /></ThemeProvider></PreferencesProvider>,
  );
  const plotButton = () => Array.from(document.querySelectorAll('[data-plot-selection] button')).find((b) => b.textContent === 'Plot selection') as HTMLButtonElement;
  return { ...utils, props, plotButton, rerenderWith: (sel: PlotSpectrumSource | null) => utils.rerender(
    <PreferencesProvider><ThemeProvider><PlotSpectrumWindow {...props} selection={sel} /></ThemeProvider></PreferencesProvider>,
  ) };
}

const A: PlotSpectrumSource = { startTime: 300, endTime: 330, tracks: [{ id: 1, name: 'Track 1' }] };
const B: PlotSpectrumSource = { startTime: 600, endTime: 616, tracks: [{ id: 1, name: 'Track 1' }, { id: 2, name: 'Track 2' }] };

describe('PlotSpectrumWindow', () => {
  it('with no selection there is nothing to plot', () => {
    const { plotButton } = renderWindow(null);
    expect(plotButton().disabled).toBe(true);
    expect(document.querySelector('[data-plot-selection]')?.textContent).toContain('None');
  });

  it('each Plot selection adds a curve and a row; the second shows the tracks it spans', () => {
    const { plotButton, rerenderWith, props } = renderWindow(A);
    fireEvent.click(plotButton());
    rerenderWith(B);
    fireEvent.click(plotButton());
    expect(props.readRegion).toHaveBeenLastCalledWith([1, 2], 600, 616);
    const rows = document.querySelectorAll('[data-plot-row]');
    expect(rows).toHaveLength(2);
    // two curves, none focused: lines only
    expect(document.querySelectorAll('[data-plot-fill]')).toHaveLength(0);
    expect(rows[0].textContent).toContain('0:05:00.00');
    expect(rows[1].textContent).toContain('2 tracks');
    expect(document.querySelectorAll('[data-plot-curve]')).toHaveLength(2);
  });

  it('a click on a row FOCUSES its curve — the others dim — and never touches the project', () => {
    const { plotButton, rerenderWith, props } = renderWindow(A);
    fireEvent.click(plotButton());
    rerenderWith(B);
    fireEvent.click(plotButton());
    fireEvent.click(document.querySelector('[data-plot-row="1"]') as HTMLElement);
    expect(document.querySelector('[data-plot-row="1"]')?.hasAttribute('data-focused')).toBe(true);
    expect(document.querySelector('[data-plot-curve="2"]')?.hasAttribute('data-dimmed')).toBe(true);
    expect(document.querySelector('[data-plot-curve="1"]')?.hasAttribute('data-dimmed')).toBe(false);
    expect(props.onSelectRange).not.toHaveBeenCalled();
    // compared curves stay lines, focused or not
    expect(document.querySelectorAll('[data-plot-fill]')).toHaveLength(0);
    // a second click lets go
    fireEvent.click(document.querySelector('[data-plot-row="1"]') as HTMLElement);
    expect(document.querySelector('[data-plot-curve="2"]')?.hasAttribute('data-dimmed')).toBe(false);
  });

  it('Select puts the project selection back to the plotted range, without focusing', () => {
    const { plotButton, props } = renderWindow(A);
    fireEvent.click(plotButton());
    // a single curve is filled
    expect(document.querySelector('[data-plot-fill="1"]')).not.toBeNull();
    fireEvent.click(document.querySelector('[data-plot-select="1"]') as HTMLElement);
    expect(props.onSelectRange).toHaveBeenCalledWith(A);
    expect(document.querySelector('[data-plot-row="1"]')?.hasAttribute('data-focused')).toBe(false);
  });

  it('Remove, and Delete on a row, take the curve away', () => {
    const { plotButton, rerenderWith } = renderWindow(A);
    fireEvent.click(plotButton());
    rerenderWith(B);
    fireEvent.click(plotButton());
    fireEvent.click(document.querySelector('[data-plot-remove="1"]') as HTMLElement);
    fireEvent.keyDown(document.querySelector('[data-plot-row="2"]') as HTMLElement, { key: 'Delete' });
    expect(document.querySelectorAll('[data-plot-row]')).toHaveLength(0);
  });

  it('a selection with no audio says so and plots nothing', () => {
    const { plotButton } = renderWindow(A, null);
    fireEvent.click(plotButton());
    expect(document.querySelector('[data-plot-selection]')?.textContent).toContain('No audio in the selection');
    expect(document.querySelectorAll('[data-plot-row]')).toHaveLength(0);
  });
});

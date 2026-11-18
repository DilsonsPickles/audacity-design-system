import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { MasterMeterVertical } from '../MasterMeterVertical';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('MasterMeterVertical — SLIM OR WIDE (2026-11-18, "can we make the vertical one this slim? I do want option to make it fat")', () => {
  it('wide by default for other hosts; size="slim" marks the slim form', () => {
    const wide = render(<ThemeProvider><MasterMeterVertical /></ThemeProvider>);
    const w = wide.container.querySelector('.master-meter-vertical')!;
    expect(w.classList.contains('master-meter-vertical--slim')).toBe(false);
    expect(w.getAttribute('data-meter-size')).toBe('wide');
    cleanup();
    const slim = render(<ThemeProvider><MasterMeterVertical size="slim" /></ThemeProvider>);
    const s = slim.container.querySelector('.master-meter-vertical')!;
    expect(s.classList.contains('master-meter-vertical--slim')).toBe(true);
    expect(s.getAttribute('data-meter-size')).toBe('slim');
  });
});

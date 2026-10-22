import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { Icon, isDrawnIcon } from '../Icon';

afterEach(cleanup);

describe('drawn icons — the track-height pair (2026-10-22)', () => {
  it('collapse and expand are drawn SVGs in currentColor: a bar with chevrons toward it / away from it', () => {
    for (const name of ['track-collapse', 'track-expand'] as const) {
      expect(isDrawnIcon(name)).toBe(true);
      const { container } = render(<Icon name={name} size={16} />);
      const span = container.querySelector('.icon')!;
      expect(span.getAttribute('data-drawn-icon')).toBe(name);
      const svg = span.querySelector('svg')!;
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(svg.querySelector('rect')).not.toBeNull();
      expect(svg.querySelectorAll('path')).toHaveLength(2);
      cleanup();
    }
  });

  it('a font icon is still the glyph, with no drawing', () => {
    expect(isDrawnIcon('play')).toBe(false);
    const { container } = render(<Icon name="play" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('.icon')!.hasAttribute('data-drawn-icon')).toBe(false);
  });
});

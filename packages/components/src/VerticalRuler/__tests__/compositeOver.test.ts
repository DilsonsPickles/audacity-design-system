import { describe, it, expect } from 'vitest';
import { compositeOver } from '../VerticalRulerPanel';

describe('compositeOver — the ruler column paints what the canvas composites (2026-10-13)', () => {
  it('composites an rgba overlay over an opaque base; a solid overlay wins outright', () => {
    expect(compositeOver('rgba(255, 255, 255, 0.5)', '#000000')).toBe('#808080');
    expect(compositeOver('rgba(0, 0, 0, 0.14)', '#ffffff')).toBe('#dbdbdb');
    expect(compositeOver('#123456', '#ffffff')).toBe('#123456');
    expect(compositeOver('rgba(255, 255, 255, 0.03)', '#171F25')).toBe('#1e262c');
  });
  it('leaves an unparseable overlay alone', () => {
    expect(compositeOver('var(--x)', '#000')).toBe('var(--x)');
  });
});

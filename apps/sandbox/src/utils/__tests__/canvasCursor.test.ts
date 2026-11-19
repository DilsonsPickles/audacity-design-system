import { describe, it, expect } from 'vitest';
import { canvasCursor } from '../canvasCursor';

describe('canvasCursor (2026-11-19, "if we hover cursor on edge of selection, we should be able to grab the edge")', () => {
  it('the selection hook\'s resize cursor shows over a selection edge', () => {
    expect(canvasCursor('ew-resize')).toBe('ew-resize');
  });
  it('otherwise the text cursor, the canvas\'s own', () => {
    expect(canvasCursor('default')).toBe('text');
    expect(canvasCursor('text')).toBe('text');
    expect(canvasCursor(undefined)).toBe('text');
  });
});

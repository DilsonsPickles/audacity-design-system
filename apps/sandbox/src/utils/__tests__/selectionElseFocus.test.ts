import { describe, it, expect } from 'vitest';
import { selectionElseFocus } from '../selectionElseFocus';

describe('selection, else focus (2026-10-13)', () => {
  it('takes the selection when there is one, whatever is focused; the focused clip only when nothing is selected; nothing with neither', () => {
    expect(selectionElseFocus([1, 2], 3)).toEqual([1, 2]);
    expect(selectionElseFocus([1, 2], 1)).toEqual([1, 2]);
    expect(selectionElseFocus([], 3)).toEqual([3]);
    expect(selectionElseFocus([], null)).toEqual([]);
  });
});

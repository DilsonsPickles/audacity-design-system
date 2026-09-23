import { describe, it, expect } from 'vitest';
import { isFocusableTrack, nearestFocusableTrack, resolveFocusedTrack } from '../trackFocus';
import type { Track } from '../../contexts/TracksContext';

const t = (id: number, o: Partial<Track> = {}) => ({ id, name: `t${id}`, clips: [], ...o }) as Track;

// [0] plain, [1] folder 10 (expanded), [2] child, [3] child, [4] plain
const expanded = [t(1), t(10, { type: 'folder' }), t(2, { folderId: 10 }), t(3, { folderId: 10 }), t(4)];
// same, but the folder is collapsed so its children are hidden
const collapsed = [t(1), t(10, { type: 'folder', collapsed: true }), t(2, { folderId: 10 }), t(3, { folderId: 10 }), t(4)];

describe('isFocusableTrack', () => {
  it('a folder header is never focusable; its visible children are', () => {
    expect(isFocusableTrack(expanded, 1)).toBe(false);
    expect(isFocusableTrack(expanded, 2)).toBe(true);
    expect(isFocusableTrack(expanded, 0)).toBe(true);
  });
  it('a child hidden in a collapsed folder is not focusable', () => {
    expect(isFocusableTrack(collapsed, 2)).toBe(false);
    expect(isFocusableTrack(collapsed, 3)).toBe(false);
  });
  it('out of range is not focusable', () => {
    expect(isFocusableTrack(expanded, 9)).toBe(false);
  });
});

describe('nearestFocusableTrack — arrow stepping', () => {
  it('ArrowDown from above a folder lands on its first child, not the header', () => {
    expect(nearestFocusableTrack(expanded, 0, 1)).toBe(2);
  });
  it('ArrowUp from the first child steps over the header to the row above', () => {
    expect(nearestFocusableTrack(expanded, 2, -1)).toBe(0);
  });
  it('a collapsed folder is skipped whole — header and hidden children', () => {
    expect(nearestFocusableTrack(collapsed, 0, 1)).toBe(4);
    expect(nearestFocusableTrack(collapsed, 4, -1)).toBe(0);
  });
  it('returns null at the ends', () => {
    expect(nearestFocusableTrack(expanded, 4, 1)).toBeNull();
    expect(nearestFocusableTrack(expanded, 0, -1)).toBeNull();
  });
});

describe('resolveFocusedTrack — where a requested focus actually lands', () => {
  it('a focusable row is itself', () => {
    expect(resolveFocusedTrack(expanded, 3, 0)).toBe(3);
  });
  it('a folder header redirects to its first visible child', () => {
    expect(resolveFocusedTrack(expanded, 1, 0)).toBe(2);
  });
  it('a collapsed folder with a focusable row below redirects below it', () => {
    expect(resolveFocusedTrack(collapsed, 1, 0)).toBe(4);
  });
  it('with nothing focusable below, keeps the previous focus', () => {
    const tail = [t(1), t(10, { type: 'folder', collapsed: true }), t(2, { folderId: 10 })];
    expect(resolveFocusedTrack(tail, 1, 0)).toBe(0);
  });
  it('with no usable previous either, falls back to the nearest row above', () => {
    const tail = [t(1), t(10, { type: 'folder', collapsed: true }), t(2, { folderId: 10 })];
    expect(resolveFocusedTrack(tail, 1, null)).toBe(0);
    expect(resolveFocusedTrack(tail, 1, 2)).toBe(0); // previous is hidden, so it doesn't count
  });
  it('null stays null', () => {
    expect(resolveFocusedTrack(expanded, null, 3)).toBeNull();
  });
});

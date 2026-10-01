import { describe, it, expect } from 'vitest';
import { nearestGaps, clipOffsets, sizeOf, describeControl, describeElement, spacingText, type Box } from '../inspectorGeometry';

const box = (left: number, top: number, w: number, h: number): Box => ({ left, top, right: left + w, bottom: top + h });

describe('inspectorGeometry — the dev Inspector\'s measurements (2026-10-01)', () => {
  it('sizes to the half pixel, and offsets from the clip (negative = outside)', () => {
    expect(sizeOf(box(10, 20, 30.25, 32))).toEqual({ width: 30.5, height: 32 });
    const clip = box(100, 0, 400, 114);
    // A trim box straddling the clip's left edge: 24 outside, 6 inside
    expect(clipOffsets(box(76, 20, 30, 32), clip)).toEqual({ left: -24, right: 394, top: 20 });
  });

  it('finds the nearest neighbour on each side, among those beside (not over) the target', () => {
    const target = box(100, 20, 30, 32);
    const gaps = nearestGaps(target, [
      { box: box(136, 20, 36, 32), label: 'fade' },      // 6 to the right
      { box: box(200, 20, 10, 32), label: 'far' },        // further right
      { box: box(80, 20, 15, 32), label: 'zone' },        // 5 to the left
      { box: box(100, 52, 30, 32), label: 'stretch' },    // touching below
      { box: box(110, 30, 10, 10), label: 'inside' },     // overlapping: skipped
      { box: box(300, 200, 10, 10), label: 'elsewhere' }, // no overlap on either axis
    ]);
    expect(gaps.map((g) => [g.side, g.px, g.to])).toEqual([
      ['left', 5, 'zone'],
      ['right', 6, 'fade'],
      ['below', 0, 'stretch'],
    ]);
    const right = gaps.find((g) => g.side === 'right')!;
    expect([right.from, right.toCoord, right.at]).toEqual([130, 136, 36]); // the line, mid-overlap
  });

  it('names controls from their attributes', () => {
    expect(describeControl({ className: 'clip-display__handle clip-display__handle--trim-left' })).toBe('Trim handle (left)');
    expect(describeControl({ className: 'clip-display__handle clip-display__handle--stretch-right' })).toBe('Stretch handle (right)');
    expect(describeControl({ buriedHandle: 'trim-right' })).toBe('Buried trim handle (right)');
    expect(describeControl({ fadeHandle: 'in' })).toBe('Fade in length handle');
    expect(describeControl({ quickfadeNode: 'out' })).toBe('Fade out shape handle');
    expect(describeControl({ crossfadeNode: '1-2' })).toBe('Crossfade node');
    expect(describeControl({ edgeTrim: 'left', edgeMode: 'stretch' })).toBe('Edge zone (left, stretch)');
    expect(describeControl({ edgeTrim: 'right', edgeMode: 'trim' })).toBe('Edge zone (right)');
    expect(describeControl({ clipId: '7' })).toBe('Clip 7');
    expect(describeControl({})).toBe('Element');
  });
});

describe('inspectorGeometry — any element (2026-10-01, "I was hoping that dev view would work anywhere")', () => {
  it('names an element by tag, id, first two classes, role and label', () => {
    expect(describeElement({ tag: 'BUTTON', className: 'toolbar__button toolbar__button--play extra', role: 'button', ariaLabel: 'Play' }))
      .toBe('button.toolbar__button.toolbar__button--play[button] "Play"');
    expect(describeElement({ tag: 'DIV', id: 'root' })).toBe('div#root');
    expect(describeElement({ tag: 'SPAN', ariaLabel: 'A label that is far too long to show whole' })).toBe('span "A label that is far too lon…"');
  });

  it('writes spacing the CSS way, or not at all', () => {
    expect(spacingText('padding', 0, 0, 0, 0)).toBeNull();
    expect(spacingText('padding', 4, 4, 4, 4)).toBe('padding 4');
    expect(spacingText('margin', 0, 8, 0, 8)).toBe('margin 0 8');
    expect(spacingText('padding', 1, 2, 3, 4)).toBe('padding 1 2 3 4');
  });
});

/**
 * A time-selection drag snaps its moving edge to the host's grid while
 * snapping is on, and SHIFT INVERTS that — read live on each move — as
 * a clip drag's and a fade handle's Shift do (user decision 2026-10-01).
 * The anchor snaps too, so a snapped selection starts on the grid as
 * well as ending on it; the moving edge's snap goes out as a guideline.
 */
import React, { useRef } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useTimeSelection } from '../useTimeSelection';
import { CLIP_CONTENT_OFFSET } from '../../constants';

afterEach(cleanup);

const snapTime = (t: number) => Math.round(t / 0.5) * 0.5; // a 0.5s grid
const tracks = [{ id: 1, name: 'A', height: 114, clips: [] }];

function Host({ snapEnabled, onChange, onGuideline, alignTime }: { snapEnabled: boolean; onChange: (s: unknown) => void; onGuideline: (t: number | null, kind?: 'grid' | 'alignment') => void; alignTime?: (t: number) => number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const { startDrag } = useTimeSelection({
    containerRef: ref,
    currentTimeSelection: null,
    currentSelectedTracks: [],
    pixelsPerSecond: 100,
    leftPadding: 0,
    tracks,
    defaultTrackHeight: 114,
    trackGap: 2,
    initialGap: 0,
    onTimeSelectionChange: onChange,
    onSelectedTracksChange: () => {},
    onFocusedTrackChange: () => {},
    snapTime,
    alignTime,
    snapEnabled,
    onSnapGuideline: onGuideline,
  });
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={ref}
      data-canvas
      style={{ width: 1000, height: 200 }}
      onMouseDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        startDrag(e.clientX - r.left, e.clientY - r.top);
      }}
    />
  );
}

function renderHost(snapEnabled: boolean, alignTime?: (t: number) => number | null) {
  const onChange = vi.fn();
  const onGuideline = vi.fn();
  const { container } = render(<Host snapEnabled={snapEnabled} onChange={onChange} onGuideline={onGuideline} alignTime={alignTime} />);
  const canvas = container.querySelector('[data-canvas]') as HTMLElement;
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 200, width: 1000, height: 200, x: 0, y: 0, toJSON: () => ({}) }),
  });
  const last = () => onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as { startTime: number; endTime: number };
  const x = (projectTime: number) => CLIP_CONTENT_OFFSET + projectTime * 100;
  return { canvas, onChange, onGuideline, last, x };
}

describe('time-selection drag snapping (2026-10-01)', () => {
  it('snapping on: both ends land on the grid, the guideline marks the moving edge', () => {
    const { canvas, last, onGuideline, x } = renderHost(true);
    fireEvent.mouseDown(canvas, { button: 0, clientX: x(1.2), clientY: 50 });
    fireEvent.mouseMove(document, { clientX: x(2.3), clientY: 50 });
    expect(last()).toMatchObject({ startTime: 1, endTime: 2.5 });
    expect(onGuideline).toHaveBeenLastCalledWith(2.5, 'grid');
    fireEvent.mouseUp(document, { clientX: x(2.3), clientY: 50 });
    expect(onGuideline).toHaveBeenLastCalledWith(null);
  });

  it('snapping on + Shift: the pointer\'s own times, no guideline — read live, so letting go snaps again', () => {
    const { canvas, last, onGuideline, x } = renderHost(true);
    fireEvent.mouseDown(canvas, { button: 0, clientX: x(1.2), clientY: 50 });
    fireEvent.mouseMove(document, { clientX: x(2.3), clientY: 50, shiftKey: true });
    expect(last().startTime).toBeCloseTo(1.2, 9);
    expect(last().endTime).toBeCloseTo(2.3, 9);
    expect(onGuideline).toHaveBeenLastCalledWith(null);
    fireEvent.mouseMove(document, { clientX: x(2.3), clientY: 50 });
    expect(last()).toMatchObject({ startTime: 1, endTime: 2.5 });
    expect(onGuideline).toHaveBeenLastCalledWith(2.5, 'grid');
    fireEvent.mouseUp(document, { clientX: x(2.3), clientY: 50 });
  });

  it('snapping off: free; off + Shift: the grid', () => {
    const { canvas, last, onGuideline, x } = renderHost(false);
    fireEvent.mouseDown(canvas, { button: 0, clientX: x(1.2), clientY: 50 });
    fireEvent.mouseMove(document, { clientX: x(2.3), clientY: 50 });
    expect(last().startTime).toBeCloseTo(1.2, 9);
    expect(last().endTime).toBeCloseTo(2.3, 9);
    expect(onGuideline).toHaveBeenLastCalledWith(null);
    fireEvent.mouseMove(document, { clientX: x(2.3), clientY: 50, shiftKey: true });
    expect(last()).toMatchObject({ startTime: 1, endTime: 2.5 });
    expect(onGuideline).toHaveBeenLastCalledWith(2.5, 'grid');
    fireEvent.mouseUp(document, { clientX: x(2.3), clientY: 50, shiftKey: true });
    expect(onGuideline).toHaveBeenLastCalledWith(null);
  });
});

describe('time-selection drag — the clip-edge magnet (2026-10-07)', () => {
  // A clip edge at 2.0s, reach 0.06s (6px at 100px/s)
  const alignTime = (t: number) => (Math.abs(t - 2) <= 0.06 ? 2 : null);

  it('snapping off: an edge within reach catches the moving edge — and the anchor — with a yellow guideline', () => {
    const { canvas, last, onGuideline, x } = renderHost(false, alignTime);
    fireEvent.mouseDown(canvas, { button: 0, clientX: x(1.97), clientY: 50 }); // the anchor, 3px off the edge
    fireEvent.mouseMove(document, { clientX: x(3.3), clientY: 50 });
    expect(last()).toMatchObject({ startTime: 2, endTime: 3.3 });
    expect(onGuideline).toHaveBeenLastCalledWith(null); // the moving edge is on nothing
    fireEvent.mouseMove(document, { clientX: x(2.04), clientY: 50 });
    expect(last()).toMatchObject({ startTime: 2, endTime: 2 });
    expect(onGuideline).toHaveBeenLastCalledWith(2, 'alignment');
    fireEvent.mouseUp(document, { clientX: x(2.04), clientY: 50 });
  });

  it('snapping on: the grid wins over the edge; on + Shift is no snap at all, the edge not consulted', () => {
    const { canvas, last, onGuideline, x } = renderHost(true, alignTime);
    fireEvent.mouseDown(canvas, { button: 0, clientX: x(1), clientY: 50 });
    fireEvent.mouseMove(document, { clientX: x(2.04), clientY: 50 });
    expect(last()).toMatchObject({ endTime: 2 });
    expect(onGuideline).toHaveBeenLastCalledWith(2, 'grid');
    fireEvent.mouseMove(document, { clientX: x(2.04), clientY: 50, shiftKey: true });
    expect(last().endTime).toBeCloseTo(2.04, 5);
    expect(onGuideline).toHaveBeenLastCalledWith(null);
    fireEvent.mouseUp(document, { clientX: x(2.04), clientY: 50 });
  });
});

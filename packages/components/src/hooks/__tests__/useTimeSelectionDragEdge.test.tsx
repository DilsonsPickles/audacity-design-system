/**
 * THE EDGE IN HAND (2026-11-19, the selection measure's one-line style lights
 * the edge being dragged): `dragEdge` names the edge the pointer is moving —
 * a new selection's by which side of the press the pointer is on.
 */
import React, { useRef, useState } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import type { TimeSelection } from '@audacity-ui/core';
import { useTimeSelection } from '../useTimeSelection';
import { CLIP_CONTENT_OFFSET } from '../../constants';

afterEach(cleanup);

const tracks = [{ id: 1, name: 'A', height: 114, clips: [] }];

function Host({ initial = null }: { initial?: TimeSelection | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<TimeSelection | null>(initial);
  const { startDrag, dragEdge } = useTimeSelection({
    containerRef: ref,
    currentTimeSelection: sel,
    currentSelectedTracks: [],
    pixelsPerSecond: 100,
    // the app's padding (Canvas passes 12 = CLIP_CONTENT_OFFSET), so a press on an edge resizes
    leftPadding: CLIP_CONTENT_OFFSET,
    tracks,
    defaultTrackHeight: 114,
    trackGap: 2,
    initialGap: 0,
    onTimeSelectionChange: setSel,
    onSelectedTracksChange: () => {},
    onFocusedTrackChange: () => {},
  });
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={ref}
      data-canvas
      data-drag-edge={dragEdge ?? ''}
      data-sel={sel ? `${Math.round(sel.startTime * 100) / 100}-${Math.round(sel.endTime * 100) / 100}` : ''}
      style={{ width: 1000, height: 200 }}
      onMouseDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        startDrag(e.clientX - r.left, e.clientY - r.top);
      }}
    />
  );
}

function renderHost(initial: TimeSelection | null = null) {
  const { container } = render(<Host initial={initial} />);
  const canvas = container.querySelector('[data-canvas]') as HTMLElement;
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 200, width: 1000, height: 200, x: 0, y: 0, toJSON: () => ({}) }),
  });
  const x = (t: number) => CLIP_CONTENT_OFFSET + t * 100;
  return { canvas, x };
}

describe('useTimeSelection — the edge in hand', () => {
  it('a new selection dragged right moves its END, dragged back past the press its START', () => {
    const { canvas, x } = renderHost();
    fireEvent.mouseDown(canvas, { button: 0, clientX: x(2), clientY: 50 });
    fireEvent.mouseMove(document, { clientX: x(4), clientY: 50 });
    expect(canvas.getAttribute('data-drag-edge')).toBe('end');
    fireEvent.mouseMove(document, { clientX: x(1), clientY: 50 });
    expect(canvas.getAttribute('data-drag-edge')).toBe('start');
  });

  it('no edge in hand at rest', () => {
    const { canvas } = renderHost();
    expect(canvas.getAttribute('data-drag-edge')).toBe('');
  });

  it('a resized edge is in hand, and an edge dragged past the other reads as that other', () => {
    const { canvas, x } = renderHost({ startTime: 1, endTime: 3 });
    fireEvent.mouseDown(canvas, { button: 0, clientX: x(3), clientY: 50 });
    fireEvent.mouseMove(document, { clientX: x(4), clientY: 50 });
    expect(canvas.getAttribute('data-drag-edge')).toBe('end');
    fireEvent.mouseMove(document, { clientX: x(0.5), clientY: 50 });
    expect(canvas.getAttribute('data-drag-edge')).toBe('start');
  });
});

describe('useTimeSelection — the edge you SEE is the edge you grab (2026-11-19, "if we hover cursor on edge of selection, we should be able to grab the edge … this is in real audacity build")', () => {
  it('a press on the DRAWN end edge (12px clip offset included) resizes the selection, not a new one', () => {
    const { canvas, x } = renderHost({ startTime: 1, endTime: 3 });
    fireEvent.mouseDown(canvas, { button: 0, clientX: x(3), clientY: 50 });
    fireEvent.mouseMove(document, { clientX: x(4), clientY: 50 });
    // resizing the end keeps the start where it was
    expect(canvas.getAttribute('data-drag-edge')).toBe('end');
    expect(canvas.getAttribute('data-sel')).toBe('1-4');
  });
});

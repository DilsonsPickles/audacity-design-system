// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React, { useRef } from 'react';
import { TracksProvider, useTracksState } from '../../contexts/TracksContext';
import { useClipDragging } from '../useClipDragging';
import type { ClipDragState } from '../../contexts/TracksContext';

afterEach(cleanup);

/**
 * Minimal harness that:
 *  - reads tracks state and forwards it to the test via onState
 *  - exposes useClipDragging
 *  - on mousedown, starts dragging clip 2 (by id) from track 0
 */
function Harness({ onState }: { onState: (s: ReturnType<typeof useTracksState>) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksState = useTracksState();

  const { startClipDrag } = useClipDragging({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    tracks: tracksState.tracks,
    pixelsPerSecond: 100,
    clipContentOffset: 0,
    topGap: 0,
    trackGap: 0,
    defaultTrackHeight: 100,
  });

  // Forward latest state to the test on every render
  React.useEffect(() => {
    onState(tracksState);
  });

  return (
    <div
      ref={containerRef}
      style={{ width: 1000, height: 200 }}
      data-testid="container"
      onMouseDown={(e) => {
        const clip = tracksState.tracks[0]?.clips.find((c: any) => c.id === 2);
        if (!clip) return;

        const dragState: ClipDragState = {
          clip,
          trackIndex: 0,
          offsetX: 0,
          initialX: e.clientX,
          initialStartTime: clip.start,
          initialTrackIndex: 0,
        };
        startClipDrag(dragState);
      }}
    />
  );
}

describe('useClipDragging — overlap resolution', () => {
  it('drag clip 2 onto right side of clip 1, release → clip 1 is trimmed to 3s', () => {
    let lastState: ReturnType<typeof useTracksState>;

    // clip 1: 0→5s, clip 2: 8→12s (at 100 px/s = pixels 800→1200)
    const initialClips = [
      { id: 1, name: '', start: 0, duration: 5, trimStart: 0, envelopePoints: [] },
      { id: 2, name: '', start: 8, duration: 4, trimStart: 0, envelopePoints: [] },
    ];

    const { container } = render(
      <TracksProvider
        initialTracks={[{ id: 1, name: 'Track 1', clips: initialClips } as any]}
      >
        <Harness onState={(s) => { lastState = s; }} />
      </TracksProvider>,
    );

    const el = container.querySelector('[data-testid="container"]') as HTMLElement;

    // Give the container a deterministic bounding rect so pixel→time math works
    Object.defineProperty(el, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0, top: 0, width: 1000, height: 200,
        right: 1000, bottom: 200, x: 0, y: 0,
        toJSON: () => ({}),
      }),
    });

    // Mousedown on clip 2 (initially at px 800)
    fireEvent.mouseDown(el, { clientX: 800, clientY: 50 });

    // Mousemove to px 300 → newStartTime = (300 - 0) / 100 = 3.0s
    // Clip 2 lands at 3→7s, overlapping clip 1 (0→5s) on its right → trim clip 1 to duration=3
    act(() => {
      fireEvent.mouseMove(document, { clientX: 300, clientY: 50 });
    });

    act(() => {
      fireEvent.mouseUp(document);
    });

    const track = lastState!.tracks[0];
    const clip1 = track.clips.find((c: any) => c.id === 1);
    const clip2 = track.clips.find((c: any) => c.id === 2);

    // Clip 2 should have moved to start=3
    expect(clip2?.start).toBe(3);
    // Clip 1 should have been trimmed: its right side (start=3→5) is now occupied by clip 2
    // resolveOverlap trim: newDuration = mStart - uStart = 3 - 0 = 3
    expect(clip1?.duration).toBe(3);
  });
});

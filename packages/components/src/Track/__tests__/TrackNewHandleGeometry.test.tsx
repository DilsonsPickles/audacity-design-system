/**
 * The clip handles' hit boxes follow the app's (ClipHandles.qml; spec
 * 2026-09-30, the Figma "hit zones" frame), the inside reach brought down
 * to the edge zone's the same day: 30 × 32 boxes straddling the edge, 24
 * outside and 6 inside, trim directly under the header and stretch
 * directly under the trim. Clip.css draws the in-clip buttons;
 * TrackNew re-draws a BURIED edge's pair at track level with the same
 * numbers — this pins those, since a stylesheet cannot be read in jsdom.
 */
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TrackNew } from '../TrackNew';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        {children}
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

describe('buried-edge trim and stretch handles use the app\'s boxes', () => {
  it('a selected clip buried at both edges gets 30px boxes straddling each edge, trim at 20 and stretch at 52', () => {
    // Clip 1 (selected) lies wholly under clip 2 — containment, so both
    // its edges are covered (an edge overlap would be a crossfade, and a
    // crossfaded edge gets no duplicates, 2026-10-01)
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 2, duration: 4, selected: true },
            { id: 2, name: 'B', start: 0, duration: 8 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipTrimEdge={vi.fn()}
          onClipStretchEdge={vi.fn()}
        />
      </Providers>,
    );
    const clip = container.querySelector('[data-clip-id="1"]') as HTMLElement;
    fireEvent.mouseEnter(clip, { buttons: 0 }); // the handles follow the pointer (2026-10-01)
    const clipLeft = parseInt(clip.style.left, 10);
    const clipRight = clipLeft + 400;
    const handle = (kind: string) => {
      const el = container.querySelector(`[data-buried-handle="${kind}"]`) as HTMLElement;
      expect(el, kind).toBeTruthy();
      return { left: parseInt(el.style.left, 10), top: parseInt(el.style.top, 10) };
    };
    // 24 outside … 6 inside (the edge zone's reach), on both edges
    expect(handle('trim-left').left).toBe(clipLeft - 24);
    expect(handle('stretch-left').left).toBe(clipLeft - 24);
    expect(handle('trim-right').left).toBe(clipRight - 6);
    expect(handle('stretch-right').left).toBe(clipRight - 6);
    // Trim directly under the 20px header, stretch directly under the
    // 32px trim row
    for (const edge of ['left', 'right']) {
      expect(handle(`trim-${edge}`).top).toBe(20);
      expect(handle(`stretch-${edge}`).top).toBe(52);
    }
  });
});

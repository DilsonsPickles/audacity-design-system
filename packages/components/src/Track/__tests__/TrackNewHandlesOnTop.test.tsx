import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { TrackNew } from '../TrackNew';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

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

/** Clip A selected; clip B LATER in the array (painted above A) */
function renderPair(bStart: number, bDuration = 4, aStart = 0) {
  const utils = render(
    <Providers>
      <TrackNew
        clips={[
          { id: 1, name: 'A', start: aStart, duration: 4, selected: true },
          { id: 2, name: 'B', start: bStart, duration: bDuration },
        ]}
        width={1400}
        trackIndex={0}
        pixelsPerSecond={100}
        onClipTrimEdge={vi.fn()}
        onClipStretchEdge={vi.fn()}
      />
    </Providers>,
  );
  const clipA = utils.container.querySelector<HTMLElement>('[data-clip-id="1"]')!;
  fireEvent.mouseEnter(clipA, { buttons: 0 }); // the selected clip under the pointer shows its handles
  const buried = () => [...utils.container.querySelectorAll('[data-buried-handle]')].map((e) => e.getAttribute('data-buried-handle')).sort();
  return { ...utils, buried };
}

describe('a selected clip\'s handles sit above every clip (2026-10-13, "selected clip\'s handles MUST have the highest z-index")', () => {
  it('a later clip that BUTTS against the selected one covers the handle\'s outside 24px — the right pair is re-rendered above the stack', () => {
    const { buried } = renderPair(4);
    expect(buried()).toEqual(['stretch-right', 'trim-right']);
  });
  it('a later clip within 24px of the edge covers it too; one farther away does not', () => {
    expect(renderPair(4.2).buried()).toEqual(['stretch-right', 'trim-right']); // 20px gap, inside the 24
    expect(renderPair(4.3).buried()).toEqual([]); // 30px gap, clear
  });
  it('a later clip that CONTAINS the selected one buries both edges (the old rule); an edge OVERLAP is a crossfade, which owns its edge and gets none', () => {
    expect(renderPair(0, 8, 1).buried()).toEqual(['stretch-left', 'stretch-right', 'trim-left', 'trim-right']);
    expect(renderPair(3).buried()).toEqual([]);
  });
});

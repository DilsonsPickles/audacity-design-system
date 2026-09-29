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

const clips = [
  { id: 1, name: 'Selected', start: 0, duration: 4, selected: true },
  { id: 2, name: 'Unselected', start: 5, duration: 4 },
];

function renderTrack(props: Partial<React.ComponentProps<typeof TrackNew>> = {}) {
  const onClipTrimEdge = vi.fn();
  const onClipClick = vi.fn();
  const onMouseDownBelow = vi.fn();
  const utils = render(
    <Providers>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div onMouseDown={onMouseDownBelow}>
        <TrackNew
          clips={clips}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipTrimEdge={onClipTrimEdge}
          onClipClick={onClipClick}
          {...props}
        />
      </div>
    </Providers>,
  );
  const edges = (clipId: number) =>
    Array.from(utils.container.querySelectorAll<HTMLElement>(`[data-clip-id="${clipId}"] [data-clip-edge]`));
  return { ...utils, onClipTrimEdge, onClipClick, onMouseDownBelow, edges };
}

describe('trimming an unselected clip by its edge', () => {
  it('an unselected clip has a strip along each edge; a selected clip has its handles instead', () => {
    const { container, edges } = renderTrack();
    expect(edges(2).map((el) => el.getAttribute('data-clip-edge'))).toEqual(['left', 'right']);
    expect(edges(1)).toHaveLength(0);
    // …and the other way round for the trim handles
    expect(container.querySelectorAll('[data-clip-id="1"] .clip-display__handle--trim-left')).toHaveLength(1);
    expect(container.querySelectorAll('[data-clip-id="2"] .clip-display__handle')).toHaveLength(0);
    // The strips are narrow, invisible to assistive tech, and wear the trim cursor's class
    for (const el of edges(2)) {
      expect(el.style.width).toBe('6px');
      expect(el.getAttribute('aria-hidden')).toBe('true');
      expect(el.className).toContain(`clip-display__edge--${el.getAttribute('data-clip-edge')}`);
    }
  });

  it('dragging a strip streams the pointer to onClipTrimEdge, for that clip and that edge, until release', () => {
    const { onClipTrimEdge, edges } = renderTrack();
    for (const [index, edge] of (['left', 'right'] as const).entries()) {
      onClipTrimEdge.mockClear();
      fireEvent.mouseDown(edges(2)[index], { button: 0, clientX: 500 });
      // A press alone trims nothing
      expect(onClipTrimEdge).not.toHaveBeenCalled();
      fireEvent.mouseMove(document, { clientX: 530 });
      fireEvent.mouseMove(document, { clientX: 560 });
      expect(onClipTrimEdge.mock.calls).toEqual([[2, edge, 530], [2, edge, 560]]);
      fireEvent.mouseUp(document);
      fireEvent.mouseMove(document, { clientX: 600 });
      expect(onClipTrimEdge).toHaveBeenCalledTimes(2); // over with the release
    }
  });

  it('a strip is not the clip: pressing or clicking it starts nothing else', () => {
    const { onClipClick, onMouseDownBelow, edges } = renderTrack();
    fireEvent.mouseDown(edges(2)[0], { button: 0, clientX: 500 });
    expect(onMouseDownBelow).not.toHaveBeenCalled(); // no clip drag / time selection underneath
    fireEvent.mouseUp(document);
    fireEvent.click(edges(2)[0]);
    expect(onClipClick).not.toHaveBeenCalled();
    // Only the main button trims
    const { onClipTrimEdge, edges: edges2 } = renderTrack();
    fireEvent.mouseDown(edges2(2)[0], { button: 2, clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 530 });
    expect(onClipTrimEdge).not.toHaveBeenCalled();
  });

  it('the drag carries on when the clip becomes selected under it — the host selects a clip it trims', () => {
    function Host({ onTrim }: { onTrim: (edge: string, x: number) => void }) {
      const [selected, setSelected] = React.useState(false);
      return (
        <TrackNew
          clips={[{ id: 2, name: 'Unselected', start: 5, duration: 4, selected }]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipTrimEdge={(_id, edge, x) => { setSelected(true); onTrim(edge, x); }}
        />
      );
    }
    const onTrim = vi.fn();
    const { container } = render(<Providers><Host onTrim={onTrim} /></Providers>);
    fireEvent.mouseDown(container.querySelector('[data-clip-edge="right"]') as HTMLElement, { button: 0, clientX: 900 });
    fireEvent.mouseMove(document, { clientX: 880 });
    // Selected now: the strips are gone, the handles are up…
    expect(container.querySelector('[data-clip-edge]')).toBeNull();
    expect(container.querySelector('.clip-display__handle--trim-right')).toBeTruthy();
    // …and the same drag is still trimming
    fireEvent.mouseMove(document, { clientX: 860 });
    expect(onTrim.mock.calls).toEqual([['right', 880], ['right', 860]]);
    fireEvent.mouseUp(document);
    fireEvent.mouseMove(document, { clientX: 800 });
    expect(onTrim).toHaveBeenCalledTimes(2);
  });

  it('no strips where there is nothing to trim with', () => {
    const { edges } = renderTrack({ onClipTrimEdge: undefined });
    expect(edges(2)).toHaveLength(0);
  });
});

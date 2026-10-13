import { render, fireEvent, cleanup, act } from '@testing-library/react';
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

function setup(selected: boolean, wired = true) {
  const onClipClick = vi.fn();
  const onPlayheadToClipStart = vi.fn();
  const utils = render(
    <Providers>
      <TrackNew
        clips={[{ id: 1, name: 'A', start: 2.5, duration: 4, selected }]}
        width={800}
        trackIndex={0}
        pixelsPerSecond={100}
        onClipClick={onClipClick}
        onPlayheadToClipStart={wired ? onPlayheadToClipStart : undefined}
      />
    </Providers>,
  );
  const clip = utils.container.querySelector<HTMLElement>('[data-clip-id="1"]')!;
  act(() => { clip.focus(); });
  return { clip, onClipClick, onPlayheadToClipStart };
}

describe('Enter on a clip (2026-10-13): select, then the playhead to its start', () => {
  it('an unselected clip: Enter selects (the toggle); a selected one: Enter parks the playhead at its start', () => {
    const a = setup(false);
    fireEvent.keyDown(a.clip, { key: 'Enter' });
    expect(a.onClipClick).toHaveBeenCalledWith(1, false, false);
    expect(a.onPlayheadToClipStart).not.toHaveBeenCalled();
    cleanup();
    const b = setup(true);
    fireEvent.keyDown(b.clip, { key: 'Enter' });
    expect(b.onPlayheadToClipStart).toHaveBeenCalledWith(1);
    expect(b.onClipClick).not.toHaveBeenCalled();
  });

  it('Shift+Enter and Cmd+Enter on a selected clip stay the range and multi toggles', () => {
    const { clip, onClipClick, onPlayheadToClipStart } = setup(true);
    fireEvent.keyDown(clip, { key: 'Enter', shiftKey: true });
    expect(onClipClick).toHaveBeenLastCalledWith(1, true, false);
    fireEvent.keyDown(clip, { key: 'Enter', metaKey: true });
    expect(onClipClick).toHaveBeenLastCalledWith(1, false, true);
    expect(onPlayheadToClipStart).not.toHaveBeenCalled();
  });

  it('a host that does not wire it keeps Enter as the toggle on a selected clip', () => {
    const { clip, onClipClick } = setup(true, false);
    fireEvent.keyDown(clip, { key: 'Enter' });
    expect(onClipClick).toHaveBeenCalledWith(1, false, false);
  });
});

describe('⌘[ / ⌘] on a focused clip take the playhead to its start / end (2026-10-13)', () => {
  it('⌘[ → start, ⌘] → end; the Shift and Option forms are not it', () => {
    const onPlayheadToClipEdge = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew clips={[{ id: 1, name: 'A', start: 1, duration: 3 }]} width={800} trackIndex={0} pixelsPerSecond={100} onPlayheadToClipEdge={onPlayheadToClipEdge} />
      </Providers>,
    );
    const clip = container.querySelector<HTMLElement>('[data-clip-id="1"]')!;
    act(() => { clip.focus(); });
    fireEvent.keyDown(clip, { key: '[', code: 'BracketLeft', metaKey: true });
    expect(onPlayheadToClipEdge).toHaveBeenLastCalledWith(1, 'start');
    fireEvent.keyDown(clip, { key: ']', code: 'BracketRight', metaKey: true });
    expect(onPlayheadToClipEdge).toHaveBeenLastCalledWith(1, 'end');
    fireEvent.keyDown(clip, { key: '{', code: 'BracketLeft', metaKey: true, shiftKey: true });
    fireEvent.keyDown(clip, { key: '“', code: 'BracketLeft', altKey: true });
    expect(onPlayheadToClipEdge).toHaveBeenCalledTimes(2);
  });
});

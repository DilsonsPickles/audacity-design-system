/**
 * The handle under the pointer is reported to the host for its status
 * bar (user decision 2026-10-01): which handle, Alt folded in, null on
 * leave, and only on CHANGE — a track never announces "nothing" on
 * mount, which would wipe another track's hint.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
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

// A selected clip with a fade (trim/stretch handles, fade handles, a
// shape node), an unselected clip (edge zones), and a crossfading pair
const clips = [
  { id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, selected: true },
  { id: 2, name: 'B', start: 6, duration: 4 },
  { id: 3, name: 'C', start: 11, duration: 4 },
  { id: 4, name: 'D', start: 13, duration: 4 },
];

function renderTrack() {
  const onHandleHint = vi.fn();
  const utils = render(
    <Providers>
      <TrackNew
        clips={clips}
        width={2000}
        trackIndex={0}
        pixelsPerSecond={100}
        onHandleHint={onHandleHint}
        onClipTrimEdge={vi.fn()}
        onClipStretchEdge={vi.fn()}
        onClipFadeChange={vi.fn()}
        onClipFadeShapeChange={vi.fn()}
        onCrossfadeShapeChange={vi.fn()}
        onCrossfadeRoll={vi.fn()}
      />
    </Providers>,
  );
  const q = (sel: string) => utils.container.querySelector(sel) as HTMLElement;
  const last = () => onHandleHint.mock.calls[onHandleHint.mock.calls.length - 1]?.[0];
  return { ...utils, onHandleHint, q, last };
}

describe('a right-click on a quick fade\'s handle asks the host for the fade menu (2026-10-01)', () => {
  it('both the length handle and the shape handle, with the clip, side and pointer position; the browser menu is suppressed', () => {
    const onFadeContextMenu = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={clips}
          width={2000}
          trackIndex={0}
          pixelsPerSecond={100}
          onFadeContextMenu={onFadeContextMenu}
          onClipFadeChange={vi.fn()}
          onClipFadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="1"]') as HTMLElement, { buttons: 0 });
    const lengthHandle = container.querySelector('[data-fade-handle="in"][data-fade-clip="1"]') as HTMLElement;
    const prevented = !fireEvent.contextMenu(lengthHandle, { clientX: 40, clientY: 50 });
    expect(prevented).toBe(true);
    expect(onFadeContextMenu).toHaveBeenLastCalledWith(1, 'in', 40, 50);
    const node = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
    fireEvent.contextMenu(node, { clientX: 70, clientY: 60 });
    expect(onFadeContextMenu).toHaveBeenLastCalledWith(1, 'in', 70, 60);
    expect(onFadeContextMenu).toHaveBeenCalledTimes(2);
  });
});

describe('the handle under the pointer is reported for the status bar', () => {
  it('says nothing on mount', () => {
    const { onHandleHint } = renderTrack();
    expect(onHandleHint).not.toHaveBeenCalled();
  });

  it('trim and stretch handles, in the clip and buried', () => {
    const { q, last } = renderTrack();
    fireEvent.mouseEnter(q('[data-clip-id="1"] .clip-display__handle--trim-left'));
    expect(last()).toBe('trim');
    fireEvent.mouseLeave(q('[data-clip-id="1"] .clip-display__handle--trim-left'));
    expect(last()).toBeNull();
    fireEvent.mouseEnter(q('[data-clip-id="1"] .clip-display__handle--stretch-right'));
    expect(last()).toBe('stretch');
    fireEvent.mouseLeave(q('[data-clip-id="1"] .clip-display__handle--stretch-right'));
    expect(last()).toBeNull();
  });

  it('an edge zone: trim, and stretch while Alt is held — changing under a resting pointer', () => {
    const { q, last, onHandleHint } = renderTrack();
    fireEvent.mouseEnter(q('[data-edge-trim="left"][data-clip-ref="2"]'));
    expect(last()).toBe('edge-trim');
    fireEvent.keyDown(document, { key: 'Alt' });
    expect(last()).toBe('edge-stretch');
    fireEvent.keyUp(document, { key: 'Alt' });
    expect(last()).toBe('edge-trim');
    fireEvent.mouseLeave(q('[data-edge-trim="left"][data-clip-ref="2"]'));
    expect(last()).toBeNull();
    // Alt with nothing under the pointer reports nothing new
    const calls = onHandleHint.mock.calls.length;
    fireEvent.keyDown(document, { key: 'Alt' });
    fireEvent.keyUp(document, { key: 'Alt' });
    expect(onHandleHint.mock.calls.length).toBe(calls);
  });

  it('the fade length handle and the shape node', () => {
    const { q, last, container } = renderTrack();
    fireEvent.mouseEnter(q('[data-clip-id="1"]'), { buttons: 0 });
    fireEvent.mouseEnter(q('[data-fade-handle="in"][data-fade-clip="1"]'), { buttons: 0 });
    expect(last()).toBe('fade-length');
    fireEvent.mouseLeave(q('[data-fade-handle="in"][data-fade-clip="1"]'));
    expect(last()).toBeNull();
    // Leaving the handle also ends the clip's hover (the node is
    // hover-only): the pointer comes back onto the clip, then the node
    fireEvent.mouseEnter(q('[data-clip-id="1"]'), { buttons: 0 });
    const node = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
    fireEvent.mouseEnter(node, { buttons: 0 });
    expect(last()).toBe('fade-shape');
    fireEvent.mouseLeave(node);
    expect(last()).toBeNull();
  });

  it('the crossfade node: shape, and roll while Alt is held', () => {
    const { q, last, container } = renderTrack();
    fireEvent.mouseEnter(q('[data-clip-id="3"]'), { buttons: 0 });
    const node = container.querySelector('[data-crossfade-node]') as HTMLElement;
    expect(node).toBeTruthy();
    fireEvent.mouseEnter(node, { buttons: 0 });
    expect(last()).toBe('crossfade');
    fireEvent.keyDown(document, { key: 'Alt' });
    expect(last()).toBe('crossfade-roll');
    fireEvent.keyUp(document, { key: 'Alt' });
    expect(last()).toBe('crossfade');
    fireEvent.mouseLeave(node);
    expect(last()).toBeNull();
  });
});

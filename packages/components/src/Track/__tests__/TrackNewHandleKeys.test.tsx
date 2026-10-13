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
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">{children}</AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

function setup(clipOverrides: Record<string, unknown> = {}, trackProps: Record<string, unknown> = {}) {
  const onClipTrim = vi.fn();
  const onClipStretch = vi.fn();
  const onClipMenuClick = vi.fn();
  const onHandleHint = vi.fn();
  const utils = render(
    <Providers>
      <TrackNew
        clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, ...clipOverrides }]}
        width={800}
        trackIndex={0}
        pixelsPerSecond={100}
        onClipTrim={onClipTrim}
        onClipStretch={onClipStretch}
        onClipTrimEdge={vi.fn()}
        onClipStretchEdge={vi.fn()}
        onClipFadeChange={vi.fn()}
        onClipMenuClick={onClipMenuClick}
        onHandleHint={onHandleHint}
        {...trackProps}
      />
    </Providers>,
  );
  const clip = utils.container.querySelector<HTMLElement>('[data-clip-id="1"]')!;
  const handle = (kind: 'trim' | 'stretch', edge: 'left' | 'right') =>
    utils.container.querySelector<HTMLElement>(`[data-clip-id="1"] [data-handle-kind="${kind}"][data-handle-edge="${edge}"]`);
  act(() => { clip.focus(); });
  return { ...utils, clip, handle, onClipTrim, onClipStretch, onClipMenuClick, onHandleHint };
}

describe('T and S focus the trim and stretch handles (2026-10-12)', () => {
  it('T mounts and focuses the LEFT trim handle; T again the right; T again the clip; Shift+T from the clip is the right one', () => {
    const { clip, handle, onHandleHint } = setup();
    expect(handle('trim', 'left')).toBeNull(); // hover-only until the key
    fireEvent.keyDown(clip, { key: 't', code: 'KeyT' });
    expect(document.activeElement).toBe(handle('trim', 'left'));
    expect(onHandleHint).toHaveBeenLastCalledWith('trim-keys');
    fireEvent.keyDown(handle('trim', 'left')!, { key: 't', code: 'KeyT' });
    expect(document.activeElement).toBe(handle('trim', 'right'));
    fireEvent.keyDown(handle('trim', 'right')!, { key: 't', code: 'KeyT' });
    expect(document.activeElement).toBe(clip);
    expect(onHandleHint).toHaveBeenLastCalledWith(null);
    // Shift+T is nothing now (2026-10-13, no "other side" Shift): the press falls through
    fireEvent.keyDown(clip, { key: 'T', code: 'KeyT', shiftKey: true });
    expect(document.activeElement).toBe(clip);
    expect(handle('trim', 'right')).toBeNull();
  });

  it('S focuses the left stretch handle; S and T switch kind at the same edge; F goes to the fade at that edge', () => {
    const { clip, handle, onHandleHint } = setup();
    fireEvent.keyDown(clip, { key: 's', code: 'KeyS' });
    expect(document.activeElement).toBe(handle('stretch', 'left'));
    expect(onHandleHint).toHaveBeenLastCalledWith('stretch-keys');
    fireEvent.keyDown(handle('stretch', 'left')!, { key: 's', code: 'KeyS' });
    expect(document.activeElement).toBe(handle('stretch', 'right'));
    fireEvent.keyDown(handle('stretch', 'right')!, { key: 't', code: 'KeyT' });
    expect(document.activeElement).toBe(handle('trim', 'right'));
    fireEvent.keyDown(handle('trim', 'right')!, { key: 'f', code: 'KeyF' });
    expect(document.activeElement?.getAttribute('data-fade-handle')).toBe('out');
  });

  it('T and S on a FADE handle swap to the trim / stretch handle at that edge, and F swaps back', () => {
    const { clip, handle } = setup();
    fireEvent.keyDown(clip, { key: 'f', code: 'KeyF' }); // the fade-in handle, then F again: the fade-out
    fireEvent.keyDown(document.activeElement!, { key: 'f', code: 'KeyF' });
    expect(document.activeElement?.getAttribute('data-fade-handle')).toBe('out');
    fireEvent.keyDown(document.activeElement!, { key: 't', code: 'KeyT' });
    expect(document.activeElement).toBe(handle('trim', 'right'));
    fireEvent.keyDown(document.activeElement!, { key: 'f', code: 'KeyF' });
    expect(document.activeElement?.getAttribute('data-fade-handle')).toBe('out');
    fireEvent.keyDown(document.activeElement!, { key: 's', code: 'KeyS' });
    expect(document.activeElement).toBe(handle('stretch', 'right'));
  });

  it('on an UNSELECTED clip the whole set is mounted, the PAIR in hand live and the rest DIMMED (2026-10-12, "show the other handles, but disabled transparent"); a selected single clip keeps its live set', () => {
    const { clip, container } = setup();
    // Live and dimmed, by `kind-edge` — the fade handles join the set
    const live = () => [...container.querySelectorAll('[data-clip-id="1"] [data-handle-kind]:not([data-disabled]), [data-fade-handle][data-fade-clip="1"]:not([data-disabled])')]
      .map((h) => h.hasAttribute('data-fade-handle') ? `fade-${h.getAttribute('data-fade-handle')}` : `${h.getAttribute('data-handle-kind')}-${h.getAttribute('data-handle-edge')}`);
    const dimmed = () => [...container.querySelectorAll('[data-clip-id="1"] [data-handle-kind][data-disabled], [data-fade-handle][data-fade-clip="1"][data-disabled]')]
      .map((h) => h.hasAttribute('data-fade-handle') ? `fade-${h.getAttribute('data-fade-handle')}` : `${h.getAttribute('data-handle-kind')}-${h.getAttribute('data-handle-edge')}`);
    expect(container.querySelectorAll('[data-clip-id="1"] [data-handle-kind], [data-fade-handle]').length).toBe(0);
    fireEvent.keyDown(clip, { key: 't', code: 'KeyT' });
    expect(live()).toEqual(['trim-left', 'trim-right']);
    expect(dimmed().sort()).toEqual(['fade-in', 'fade-out', 'stretch-left', 'stretch-right']);
    // A dimmed handle says so to assistive tech, and no guideline is drawn beside it
    expect(container.querySelector('[data-fade-handle][data-disabled]')!.getAttribute('aria-disabled')).toBe('true');
    expect(container.querySelector('[data-fade-guideline]')).toBeNull();
    fireEvent.keyDown(document.activeElement!, { key: 't', code: 'KeyT' });
    expect(live()).toEqual(['trim-left', 'trim-right']);
    fireEvent.keyDown(document.activeElement!, { key: 's', code: 'KeyS' });
    expect(live()).toEqual(['stretch-left', 'stretch-right']);
    expect(dimmed().sort()).toEqual(['fade-in', 'fade-out', 'trim-left', 'trim-right']);
    // F from the (right) handle: the fade at that edge goes live with its
    // pair, and both clip pairs dim
    fireEvent.keyDown(document.activeElement!, { key: 'f', code: 'KeyF' });
    expect(document.activeElement?.getAttribute('data-fade-handle')).toBe('out');
    expect(live().sort()).toEqual(['fade-in', 'fade-out']);
    expect(dimmed().sort()).toEqual(['stretch-left', 'stretch-right', 'trim-left', 'trim-right']);
    cleanup();
    const sel = setup({ selected: true }, { singleSelection: true });
    fireEvent.keyDown(sel.clip, { key: 't', code: 'KeyT' });
    expect(sel.container.querySelectorAll('[data-clip-id="1"] [data-handle-kind]').length).toBe(4);
    expect(sel.container.querySelectorAll('[data-clip-id="1"] [data-handle-kind][data-disabled]').length).toBe(0);
  });

  it('Shift+S on the clip is NOT taken (Solo is app-wide)', () => {
    const { clip, handle } = setup();
    fireEvent.keyDown(clip, { key: 'S', code: 'KeyS', shiftKey: true });
    expect(handle('stretch', 'left')).toBeNull();
    expect(document.activeElement).toBe(clip);
  });

  it('← → on a trim handle move that edge through onClipTrim with the brackets\' convention (positive = shrink), Shift a second', () => {
    const { clip, handle, onClipTrim } = setup({ trimStart: 1, fullDuration: 6 });
    fireEvent.keyDown(clip, { key: 't', code: 'KeyT' });
    const left = handle('trim', 'left')!;
    fireEvent.keyDown(left, { key: 'ArrowRight' });
    expect(onClipTrim).toHaveBeenLastCalledWith(1, 'left', 0.1);
    fireEvent.keyDown(left, { key: 'ArrowLeft', shiftKey: true });
    expect(onClipTrim).toHaveBeenLastCalledWith(1, 'left', -1);
    fireEvent.keyDown(left, { key: 't', code: 'KeyT' });
    const right = handle('trim', 'right')!;
    fireEvent.keyDown(right, { key: 'ArrowLeft' });
    expect(onClipTrim).toHaveBeenLastCalledWith(1, 'right', 0.1);
    fireEvent.keyDown(right, { key: 'ArrowRight' });
    expect(onClipTrim).toHaveBeenLastCalledWith(1, 'right', -0.1);
    // the arrows never left the handle
    expect(document.activeElement).toBe(right);
  });

  it('growing a trim edge with no source to reveal shakes the edge instead', () => {
    const { clip, handle, onClipTrim, container } = setup(); // no trimStart / fullDuration: nothing hidden
    fireEvent.keyDown(clip, { key: 't', code: 'KeyT' });
    fireEvent.keyDown(handle('trim', 'left')!, { key: 'ArrowLeft' });
    expect(onClipTrim).not.toHaveBeenCalled();
    expect(container.querySelector('[data-shake-edge="left"]')).not.toBeNull();
  });

  it('← → on a stretch handle go through onClipStretch', () => {
    const { clip, handle, onClipStretch } = setup();
    fireEvent.keyDown(clip, { key: 's', code: 'KeyS' });
    fireEvent.keyDown(handle('stretch', 'left')!, { key: 'ArrowLeft' });
    expect(onClipStretch).toHaveBeenLastCalledWith(1, 'left', -0.1);
  });

  it('Shift+F10 on a handle opens the clip menu by keyboard', () => {
    const { clip, handle, onClipMenuClick } = setup();
    fireEvent.keyDown(clip, { key: 't', code: 'KeyT' });
    fireEvent.keyDown(handle('trim', 'left')!, { key: 'F10', shiftKey: true });
    expect(onClipMenuClick).toHaveBeenCalledTimes(1);
    expect(onClipMenuClick.mock.calls[0][0]).toBe(1);
    expect(onClipMenuClick.mock.calls[0][3]).toBe(true);
  });

  it('S is a no-op on a MIDI track', () => {
    const { clip, handle } = setup({}, { isMidiTrack: true });
    fireEvent.keyDown(clip, { key: 's', code: 'KeyS' });
    expect(handle('stretch', 'left')).toBeNull();
    expect(document.activeElement).toBe(clip);
  });
});

describe('an edit begins (2026-10-13): F / T / S report the clip to the host as they take a handle, so a selection elsewhere can be dropped', () => {
  it('each letter calls onClipEditBegin with the clip', () => {
    const onClipEditBegin = vi.fn();
    const { clip } = setup({}, { onClipEditBegin });
    fireEvent.keyDown(clip, { key: 't', code: 'KeyT' });
    expect(onClipEditBegin).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    fireEvent.keyDown(clip, { key: 's', code: 'KeyS' });
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    fireEvent.keyDown(clip, { key: 'f', code: 'KeyF' });
    expect(onClipEditBegin).toHaveBeenCalledTimes(3);
  });
});

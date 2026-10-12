import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { TrackNew } from '../TrackNew';
import { fadeHandleOf, DEFAULT_QUICK_FADE_SHAPE } from '../../utils/clipCrossfades';
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

function setup(overrides: Record<string, unknown> = {}) {
  const onClipFadeChange = vi.fn();
  const onClipFadeShapeChange = vi.fn();
  const onFadeShapePreset = vi.fn();
  const onHandleHint = vi.fn();
  const utils = render(
    <Providers>
      <TrackNew
        clips={[{ id: 1, name: 'Clip 1', start: 0, duration: 4, fadeIn: 1, fadeOut: 0.5, ...overrides }]}
        width={800}
        trackIndex={0}
        pixelsPerSecond={100}
        onClipFadeChange={onClipFadeChange}
        onClipFadeShapeChange={onClipFadeShapeChange}
        onFadeShapePreset={onFadeShapePreset}
        onHandleHint={onHandleHint}
      />
    </Providers>,
  );
  const clip = utils.container.querySelector<HTMLElement>('[data-clip-id="1"]')!;
  const handle = (side: 'in' | 'out') => utils.container.querySelector<HTMLElement>(`[data-fade-handle="${side}"][data-fade-clip="1"]`);
  return { ...utils, clip, handle, onClipFadeChange, onClipFadeShapeChange, onFadeShapePreset, onHandleHint };
}

describe('the fade handles take keyboard focus (F on the clip, 2026-10-12)', () => {
  it('F on the focused clip mounts and focuses the fade-in handle; F again the fade-out; F again the clip; Escape the clip', () => {
    const { clip, handle, onHandleHint } = setup();
    act(() => { clip.focus(); });
    expect(handle('in')).toBeNull(); // hover-only until the key
    fireEvent.keyDown(clip, { key: 'f', code: 'KeyF' });
    expect(handle('in')).not.toBeNull();
    expect(document.activeElement).toBe(handle('in'));
    expect(onHandleHint).toHaveBeenLastCalledWith('fade-keys');

    fireEvent.keyDown(handle('in')!, { key: 'f', code: 'KeyF' });
    expect(document.activeElement).toBe(handle('out'));

    fireEvent.keyDown(handle('out')!, { key: 'f', code: 'KeyF' });
    expect(document.activeElement).toBe(clip);
    expect(onHandleHint).toHaveBeenLastCalledWith(null);

    fireEvent.keyDown(clip, { key: 'F', code: 'KeyF', shiftKey: true });
    expect(document.activeElement).toBe(handle('out'));
    fireEvent.keyDown(handle('out')!, { key: 'Escape' });
    expect(document.activeElement).toBe(clip);
  });

  it('on a focused handle ← → move the boundary (→ = later): a tenth, Shift a second, clamped, never past the window', () => {
    const { clip, handle, onClipFadeChange } = setup();
    act(() => { clip.focus(); });
    fireEvent.keyDown(clip, { key: 'f', code: 'KeyF' });
    const inHandle = handle('in')!;
    fireEvent.keyDown(inHandle, { key: 'ArrowRight' });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'in', 1.1);
    fireEvent.keyDown(inHandle, { key: 'ArrowLeft', shiftKey: true });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'in', 0);
    // the fade-out: → shortens it
    fireEvent.keyDown(inHandle, { key: 'f', code: 'KeyF' });
    const outHandle = handle('out')!;
    fireEvent.keyDown(outHandle, { key: 'ArrowRight' });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'out', 0.4);
    fireEvent.keyDown(outHandle, { key: 'ArrowLeft', shiftKey: true });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'out', 1.5);
    // the arrows never reach the track (no clip cycling): the handle keeps focus
    expect(document.activeElement).toBe(outHandle);
  });

  it('↑ ↓ bend the curve through the shape handle (5%, Shift 20%); 1–5 are the presets, 0 the reset; Delete removes', () => {
    const { clip, handle, onClipFadeShapeChange, onFadeShapePreset, onClipFadeChange } = setup();
    act(() => { clip.focus(); });
    fireEvent.keyDown(clip, { key: 'f', code: 'KeyF' });
    const inHandle = handle('in')!;
    const rest = fadeHandleOf('in', DEFAULT_QUICK_FADE_SHAPE);
    fireEvent.keyDown(inHandle, { key: 'ArrowUp' });
    const bent = onClipFadeShapeChange.mock.lastCall![2] as { t: number; g: number };
    expect(bent.t).toBeCloseTo(rest.t);
    expect(bent.g).toBeCloseTo(rest.g + 0.05);
    fireEvent.keyDown(inHandle, { key: 'ArrowDown', shiftKey: true });
    expect((onClipFadeShapeChange.mock.lastCall![2] as { g: number }).g).toBeCloseTo(rest.g - 0.2);

    fireEvent.keyDown(inHandle, { key: '2', code: 'Digit2' });
    expect(onFadeShapePreset).toHaveBeenLastCalledWith(1, 'in', 1);
    fireEvent.keyDown(inHandle, { key: '0', code: 'Digit0' });
    expect(onClipFadeShapeChange).toHaveBeenLastCalledWith(1, 'in', DEFAULT_QUICK_FADE_SHAPE);

    const onDocumentDelete = vi.fn();
    document.addEventListener('keydown', onDocumentDelete);
    fireEvent.keyDown(inHandle, { key: 'Delete' });
    document.removeEventListener('keydown', onDocumentDelete);
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'in', 0);
    expect(onDocumentDelete).not.toHaveBeenCalled(); // the app's delete never sees it
  });

  it('Tab on a focused handle is the CLIP\'s Tab: the next clip, never the next track by DOM order; Shift+Tab from the first clip\'s handle enters the panel (2026-10-12)', () => {
    const onEnterPanel = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1 },
            { id: 2, name: 'B', start: 5, duration: 4, fadeIn: 1 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
          onEnterPanel={onEnterPanel}
        />
      </Providers>,
    );
    const clipA = container.querySelector<HTMLElement>('[data-clip-id="1"]')!;
    const clipB = container.querySelector<HTMLElement>('[data-clip-id="2"]')!;
    act(() => { clipA.focus(); });
    fireEvent.keyDown(clipA, { key: 'f', code: 'KeyF' });
    const handleA = container.querySelector<HTMLElement>('[data-fade-handle="in"][data-fade-clip="1"]')!;
    expect(document.activeElement).toBe(handleA);
    fireEvent.keyDown(handleA, { key: 'Tab' });
    expect(document.activeElement).toBe(clipB);
    // and back: Shift+Tab from B's handle lands on A; from A's handle, the panel
    fireEvent.keyDown(clipB, { key: 'f', code: 'KeyF' });
    const handleB = container.querySelector<HTMLElement>('[data-fade-handle="in"][data-fade-clip="2"]')!;
    fireEvent.keyDown(handleB, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(clipA);
    fireEvent.keyDown(clipA, { key: 'f', code: 'KeyF' });
    fireEvent.keyDown(container.querySelector<HTMLElement>('[data-fade-handle="in"][data-fade-clip="1"]')!, { key: 'Tab', shiftKey: true });
    expect(onEnterPanel).toHaveBeenCalled();
  });

  it('Shift+F10 and the Menu key on a focused handle open the fade menu under it (2026-10-12)', () => {
    const onFadeContextMenu = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeOut: 0.5 }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
          onFadeContextMenu={onFadeContextMenu}
        />
      </Providers>,
    );
    const clip = container.querySelector<HTMLElement>('[data-clip-id="1"]')!;
    act(() => { clip.focus(); });
    fireEvent.keyDown(clip, { key: 'F', code: 'KeyF', shiftKey: true });
    const out = container.querySelector<HTMLElement>('[data-fade-handle="out"][data-fade-clip="1"]')!;
    expect(document.activeElement).toBe(out);
    fireEvent.keyDown(out, { key: 'F10', shiftKey: true });
    expect(onFadeContextMenu).toHaveBeenCalledTimes(1);
    expect(onFadeContextMenu.mock.calls[0].slice(0, 2)).toEqual([1, 'out']);
    fireEvent.keyDown(out, { key: 'ContextMenu' });
    expect(onFadeContextMenu).toHaveBeenCalledTimes(2);
  });

  it('the handle stays mounted while its menu has the focus, and lets go once the focus settles elsewhere (2026-10-12)', () => {
    const { container, clip, handle } = setup();
    act(() => { clip.focus(); });
    fireEvent.keyDown(clip, { key: 'f', code: 'KeyF' });
    const inHandle = handle('in')!;
    // a menu, as Shift+F10 would open one, takes the focus
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const item = document.createElement('div');
    item.setAttribute('role', 'menuitem');
    item.tabIndex = 0;
    menu.appendChild(item);
    container.appendChild(menu);
    act(() => { item.focus(); });
    expect(document.activeElement).toBe(item);
    expect(handle('in')).toBe(inHandle); // still mounted, the trigger the menu can return to
    // the menu returns the focus: the handle is back in hand
    act(() => { inHandle.focus(); });
    expect(document.activeElement).toBe(inHandle);
    // the focus settling somewhere else lets the handle go
    const other = document.createElement('button');
    container.appendChild(other);
    act(() => { other.focus(); });
    expect(handle('in')).toBeNull();
  });

  it('the focused handle reads back as a slider with its length and curve', () => {
    const { clip, handle } = setup({ fadeOutShape: 'linear' });
    act(() => { clip.focus(); });
    fireEvent.keyDown(clip, { key: 'F', code: 'KeyF', shiftKey: true });
    const out = handle('out')!;
    expect(out.getAttribute('role')).toBe('slider');
    expect(out.getAttribute('aria-valuetext')).toBe('0.5 seconds, linear');
    expect(out.getAttribute('data-track-index')).toBe('0');
  });

  it('F is a no-op where no handle can render: a clip too narrow for the handles keeps the focus', () => {
    const { clip, handle } = setup({ duration: 0.3 });
    act(() => { clip.focus(); });
    fireEvent.keyDown(clip, { key: 'f', code: 'KeyF' });
    expect(handle('in')).toBeNull();
    expect(document.activeElement).toBe(clip);
  });
});

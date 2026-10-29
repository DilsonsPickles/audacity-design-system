/**
 * The soft exit (user decision 2026-10-01, "subtle fade out, less than
 * 0.5s"): a hover-dependent control stays HANDLE_LEAVE_MS after it
 * stops applying, with data-leaving, so the CSS can fade it. jsdom has
 * no matchMedia, which the hook reads as "nothing can animate" — so
 * every other test sees instant exits; this one supplies a matchMedia.
 *
 * From 2026-10-23 the fade LENGTH handles were the SELECTION's, not the
 * pointer's. Since 2026-10-29 one selected clip wears all its handles and
 * SEVERAL show theirs on hover — and three clips are selected here, so
 * the fade handles follow the pointer again, leaving with it.
 */
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { TrackNew } from '../TrackNew';
import { HANDLE_LEAVE_MS } from '../../hooks/useLeavingKeys';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

const originalMatchMedia = window.matchMedia;
beforeEach(() => {
  vi.useFakeTimers();
  // justified: jsdom has no matchMedia; a stand-in answering the one query the hook makes
  (window as any).matchMedia = () => ({ matches: false }) as MediaQueryList; // justified: minimal MediaQueryList stand-in for the test
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
});

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        {children}
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

// Clip 1 selected (one of three selected) with fades; clip 2 and 3 a
// crossfading pair; clip 4 selected and wholly under clip 2 (buried
// duplicates)
const clips = [
  { id: 4, name: 'D', start: 7, duration: 1, selected: true },
  { id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeOut: 1, selected: true },
  { id: 2, name: 'B', start: 6, duration: 4, selected: true },
  { id: 3, name: 'C', start: 9, duration: 3 },
];
type Clips = typeof clips;
/** The same list with one clip's selection taken away */
const deselected = (id: number): Clips => clips.map((c) => (c.id === id ? { ...c, selected: false } : c));

function renderTrack() {
  const callbacks = {
    onClipTrimEdge: vi.fn(),
    onClipStretchEdge: vi.fn(),
    onClipFadeChange: vi.fn(),
    onClipFadeShapeChange: vi.fn(),
    onCrossfadeShapeChange: vi.fn(),
  };
  const tree = (list: Clips) => (
    <Providers>
      <TrackNew
        clips={list}
        width={1400}
        trackIndex={0}
        pixelsPerSecond={100}
        {...callbacks}
      />
    </Providers>
  );
  const utils = render(tree(clips));
  const clip = (id: number) => utils.container.querySelector(`[data-clip-id="${id}"]`) as HTMLElement;
  const count = (sel: string) => utils.container.querySelectorAll(sel).length;
  /** Rerender the same tree with another clip list (the host's selection changing) */
  const setClips = (list: Clips) => utils.rerender(tree(list));
  return { ...utils, clip, count, setClips };
}

describe('hover-dependent controls fade out rather than vanish (2026-10-01)', () => {
  it('the fade handles, the shape handles and the in-clip trim/stretch pair linger with data-leaving for HANDLE_LEAVE_MS when the pointer leaves, then go', () => {
    const { clip, count, setClips } = renderTrack();
    // One of several selected: nothing up before the pointer arrives (2026-10-29)
    expect(count('[data-fade-handle][data-fade-clip="1"]')).toBe(0);
    fireEvent.mouseEnter(clip(1), { buttons: 0 });
    expect(count('[data-fade-handle][data-fade-clip="1"]')).toBe(2);
    expect(count('[data-quickfade-node][data-clip-ref="1"]')).toBe(2);
    expect(count('[data-clip-id="1"] .clip-display__handle')).toBe(4);
    expect(count('[data-leaving]')).toBe(0);

    fireEvent.mouseLeave(clip(1));
    // All on their way out together
    expect(count('[data-quickfade-node][data-clip-ref="1"][data-leaving]')).toBe(2);
    expect(count('[data-clip-id="1"] .clip-display__handle[data-leaving]')).toBe(4);
    expect(count('[data-fade-handle][data-fade-clip="1"][data-leaving]')).toBe(2);

    act(() => { vi.advanceTimersByTime(HANDLE_LEAVE_MS - 1); });
    expect(count('[data-fade-handle][data-fade-clip="1"]')).toBe(2);
    expect(count('[data-quickfade-node][data-clip-ref="1"]')).toBe(2);
    expect(count('[data-clip-id="1"] .clip-display__handle')).toBe(4);
    act(() => { vi.advanceTimersByTime(1); });
    expect(count('[data-fade-handle][data-fade-clip="1"]')).toBe(0);
    expect(count('[data-quickfade-node]')).toBe(0);
    expect(count('[data-clip-id="1"] .clip-display__handle')).toBe(0);
    expect(count('[data-leaving]')).toBe(0);
    // …and, unselected, the clip fades by its corner zones instead
    setClips(deselected(1));
    expect(count('[data-fade-zone][data-clip-ref="1"]')).toBe(2);
  });

  it('coming back mid-exit cancels it: the same elements, no longer leaving', () => {
    const { clip, container, count } = renderTrack();
    // The fade handle: the pointer leaves, then comes back before the exit is over
    fireEvent.mouseEnter(clip(1), { buttons: 0 });
    const handle = container.querySelector('[data-fade-handle="in"][data-fade-clip="1"]')!;
    fireEvent.mouseLeave(clip(1));
    expect(handle.getAttribute('data-leaving')).toBe('true');
    act(() => { vi.advanceTimersByTime(HANDLE_LEAVE_MS / 2); });
    fireEvent.mouseEnter(clip(1), { buttons: 0 });
    expect(container.querySelector('[data-fade-handle="in"][data-fade-clip="1"]')).toBe(handle); // never unmounted
    expect(handle.getAttribute('data-leaving')).toBeNull();
    act(() => { vi.advanceTimersByTime(HANDLE_LEAVE_MS); });
    expect(count('[data-fade-handle][data-fade-clip="1"]')).toBe(2); // the old timer did not fire

    // The shape handle: the pointer leaves, then comes back
    fireEvent.mouseEnter(clip(1), { buttons: 0 });
    const dot = container.querySelector('[data-quickfade-node="in"][data-clip-ref="1"]')!;
    fireEvent.mouseLeave(clip(1));
    expect(dot.getAttribute('data-leaving')).toBe('true');
    act(() => { vi.advanceTimersByTime(HANDLE_LEAVE_MS / 2); });
    fireEvent.mouseEnter(clip(1), { buttons: 0 });
    expect(container.querySelector('[data-quickfade-node="in"][data-clip-ref="1"]')).toBe(dot);
    expect(dot.getAttribute('data-leaving')).toBeNull();
    act(() => { vi.advanceTimersByTime(HANDLE_LEAVE_MS); });
    expect(count('[data-quickfade-node][data-clip-ref="1"]')).toBe(2);
  });

  it('the crossfade node and the buried duplicates take the same exit', () => {
    const { clip, count } = renderTrack();
    fireEvent.mouseEnter(clip(2), { buttons: 0 });
    expect(count('[data-crossfade-node]')).toBe(1);
    fireEvent.mouseLeave(clip(2));
    expect(count('[data-crossfade-node][data-leaving]')).toBe(1);
    act(() => { vi.advanceTimersByTime(HANDLE_LEAVE_MS); });
    expect(count('[data-crossfade-node]')).toBe(0);

    fireEvent.mouseEnter(clip(4), { buttons: 0 });
    expect(count('[data-buried-handle]')).toBe(4);
    fireEvent.mouseLeave(clip(4));
    expect(count('[data-buried-handle][data-leaving]')).toBe(4);
    act(() => { vi.advanceTimersByTime(HANDLE_LEAVE_MS); });
    expect(count('[data-buried-handle]')).toBe(0);
  });
});

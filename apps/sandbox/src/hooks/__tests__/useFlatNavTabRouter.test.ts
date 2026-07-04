// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useFlatNavTabRouter } from '../useFlatNavTabRouter';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Stage the minimal DOM structure the router queries to build its ordered
// list for track index 0:
//   1. `.track-wrapper[data-track-index="0"] .track`   — track focus stop
//   2. `.track-control-panel` focusable children        — header controls
//   3. `.track-wrapper[data-track-index="0"] [data-clip-id]` — clips
//   4. `[data-track-ruler-index="0"]`                  — ruler
//
// The panel (step 2) drives the outer for-loop, so we always need at least
// one `.track-control-panel` element.
// ---------------------------------------------------------------------------
function stageTrack0(): {
  trackEl: HTMLElement;
  headerBtn: HTMLElement;
  clipEl: HTMLElement;
  rulerEl: HTMLElement;
} {
  // Track wrapper + .track child
  const trackWrapper = document.createElement('div');
  trackWrapper.className = 'track-wrapper';
  trackWrapper.setAttribute('data-track-index', '0');
  const trackEl = document.createElement('div');
  trackEl.className = 'track';
  trackEl.tabIndex = 0;
  vi.spyOn(trackEl, 'getBoundingClientRect').mockReturnValue({
    width: 800, height: 114, top: 0, left: 0, bottom: 114, right: 800, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);

  // Clip inside the track wrapper
  const clipEl = document.createElement('div');
  clipEl.setAttribute('data-clip-id', '1');
  clipEl.tabIndex = 0;
  vi.spyOn(clipEl, 'getBoundingClientRect').mockReturnValue({
    width: 200, height: 90, top: 20, left: 100, bottom: 110, right: 300, x: 100, y: 20, toJSON: () => ({}),
  } as DOMRect);
  trackWrapper.appendChild(trackEl);
  trackWrapper.appendChild(clipEl);
  document.body.appendChild(trackWrapper);

  // Track control panel (drives the outer loop)
  const panel = document.createElement('div');
  panel.className = 'track-control-panel';
  // A focusable button inside the panel (header control)
  const headerBtn = document.createElement('button');
  headerBtn.textContent = 'Mute';
  vi.spyOn(headerBtn, 'getBoundingClientRect').mockReturnValue({
    width: 40, height: 20, top: 0, left: 0, bottom: 20, right: 40, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
  panel.appendChild(headerBtn);
  document.body.appendChild(panel);

  // Ruler
  const rulerEl = document.createElement('div');
  rulerEl.setAttribute('data-track-ruler-index', '0');
  rulerEl.tabIndex = 0;
  vi.spyOn(rulerEl, 'getBoundingClientRect').mockReturnValue({
    width: 40, height: 114, top: 0, left: 0, bottom: 114, right: 40, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
  document.body.appendChild(rulerEl);

  return { trackEl, headerBtn, clipEl, rulerEl };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFlatNavTabRouter', () => {
  it('is inert when flat navigation is off — Tab keydown is NOT prevented', () => {
    renderHook(() => useFlatNavTabRouter({ isFlatNavigation: false }));

    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    // dispatchEvent returns false only when preventDefault was called
    expect(document.dispatchEvent(ev)).toBe(true);
  });

  it('routes Tab to the next element in the custom order when flat-nav is on', () => {
    const { trackEl, headerBtn } = stageTrack0();

    // Focus the first element in the custom order (track focus stop)
    act(() => { trackEl.focus(); });

    renderHook(() => useFlatNavTabRouter({ isFlatNavigation: true }));

    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    // The handler calls preventDefault — dispatchEvent returns false
    const notPrevented = document.dispatchEvent(ev);
    expect(notPrevented).toBe(false);
    // Focus should have advanced to the next element in order: headerBtn
    expect(document.activeElement).toBe(headerBtn);
  });

  it('routes Shift+Tab backwards through the custom order', () => {
    const { trackEl, headerBtn } = stageTrack0();

    // Focus the second element (headerBtn); Shift+Tab should go back to trackEl
    act(() => { headerBtn.focus(); });

    renderHook(() => useFlatNavTabRouter({ isFlatNavigation: true }));

    const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    const notPrevented = document.dispatchEvent(ev);
    expect(notPrevented).toBe(false);
    expect(document.activeElement).toBe(trackEl);
  });

  it('does NOT intercept Tab when focus is outside the tracked elements', () => {
    stageTrack0();

    // Focus an element not in the custom order
    const outsideEl = document.createElement('button');
    document.body.appendChild(outsideEl);
    act(() => { outsideEl.focus(); });

    renderHook(() => useFlatNavTabRouter({ isFlatNavigation: true }));

    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    // currentIndex === -1 → handler returns early without preventing
    expect(document.dispatchEvent(ev)).toBe(true);
  });

  it('does NOT intercept Tab at the boundary (last element, forward)', () => {
    const { rulerEl } = stageTrack0();

    // Focus the last element in the list — ruler
    act(() => { rulerEl.focus(); });

    renderHook(() => useFlatNavTabRouter({ isFlatNavigation: true }));

    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    // nextIndex >= list.length → handler returns without preventing
    expect(document.dispatchEvent(ev)).toBe(true);
  });

  it('removes the listener on unmount (Tab no longer intercepted)', () => {
    const { trackEl } = stageTrack0();
    act(() => { trackEl.focus(); });

    const { unmount } = renderHook(() => useFlatNavTabRouter({ isFlatNavigation: true }));

    // Confirm it intercepts before unmount
    const ev1 = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(document.dispatchEvent(ev1)).toBe(false);

    unmount();

    // After unmount the listener should be removed
    act(() => { trackEl.focus(); });
    const ev2 = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(document.dispatchEvent(ev2)).toBe(true);
  });
});

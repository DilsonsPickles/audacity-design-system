// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useTimeSelectionTabHandler } from '../useTimeSelectionTabHandler';
import { initialState } from '../../contexts/TracksContext';
import type { TracksState, Track } from '../../contexts/TracksContext';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Helper to build a minimal Track with one clip that overlaps [0, 2]
// ---------------------------------------------------------------------------
function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 1,
    name: 'Track 1',
    clips: [
      { id: 42, name: 'clip1', start: 0, duration: 5, envelopePoints: [] },
    ],
    ...overrides,
  } as Track;
}

function makeState(overrides: Partial<TracksState> = {}): TracksState {
  return {
    ...initialState,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test: Tab while a time selection is active intercepts and calls preventDefault
//
// The handler fires on the document capture phase and calls e.preventDefault()
// + e.stopImmediatePropagation() whenever it finds a targetEl. We assert
// preventDefault via the return value of dispatchEvent (returns false when
// default is prevented).
//
// The DOM the handler queries:
//   • `.track-wrapper[data-track-index="${fti}"] .track` — the track .track el
//   • `[data-clip-id="${clipId}"][data-track-index="${fti}"]` — clip el
//   • `[data-track-ruler-index="${fti}"]` — ruler el
//   • `[aria-label*="track controls"]` then `button` inside — next track panel
//
// We stage the track-wrapper + .track and the clip element so the handler
// resolves a targetEl (the clip) and calls preventDefault.
// ---------------------------------------------------------------------------

describe('useTimeSelectionTabHandler', () => {
  it('intercepts Tab while a time selection is active (calls preventDefault)', () => {
    const fti = 0;
    const clipId = 42;

    // Stage: track-wrapper > .track (needed for querySelector)
    const trackWrapper = document.createElement('div');
    trackWrapper.className = 'track-wrapper';
    trackWrapper.setAttribute('data-track-index', String(fti));

    const trackEl = document.createElement('div');
    trackEl.className = 'track';
    // tabIndex -1 so activeElement check works (canvas-scroll-container
    // variant) — but we set focus to body so isAmbient passes via the
    // `active === document.body` branch.
    trackEl.tabIndex = -1;
    trackWrapper.appendChild(trackEl);
    document.body.appendChild(trackWrapper);

    // Stage: clip element — what the handler queries and focuses
    const clipEl = document.createElement('div');
    clipEl.setAttribute('data-clip-id', String(clipId));
    clipEl.setAttribute('data-track-index', String(fti));
    clipEl.tabIndex = 0;
    document.body.appendChild(clipEl);

    // Focus is on body — satisfies the isAmbient check
    // (active === document.body branch)
    document.body.focus();

    const track = makeTrack({ id: 1, clips: [{ id: clipId, name: 'c', start: 0, duration: 5, envelopePoints: [] }] });
    const state = makeState({
      tracks: [track],
      focusedTrackIndex: fti,
      timeSelection: { startTime: 0, endTime: 2 },
    });

    renderHook(() =>
      useTimeSelectionTabHandler({ state, showVerticalRulers: false }),
    );

    // Dispatch Tab on document (capture phase listener will intercept)
    const ev = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    const notPrevented = document.dispatchEvent(ev);
    // dispatchEvent returns false when preventDefault was called
    expect(notPrevented).toBe(false);
  });

  it('does NOT intercept Tab when there is no time selection', () => {
    const state = makeState({
      tracks: [makeTrack()],
      focusedTrackIndex: 0,
      timeSelection: null,
    });

    renderHook(() =>
      useTimeSelectionTabHandler({ state, showVerticalRulers: false }),
    );

    const ev = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    const notPrevented = document.dispatchEvent(ev);
    // No time selection → handler returns early, default is NOT prevented
    expect(notPrevented).toBe(true);
  });

  it('does NOT intercept Shift+Tab (only plain Tab is handled)', () => {
    const fti = 0;
    const clipId = 42;

    // Stage DOM so the handler would find a target if it ran to completion
    const trackWrapper = document.createElement('div');
    trackWrapper.className = 'track-wrapper';
    trackWrapper.setAttribute('data-track-index', String(fti));
    const trackEl = document.createElement('div');
    trackEl.className = 'track';
    trackEl.tabIndex = -1;
    trackWrapper.appendChild(trackEl);
    document.body.appendChild(trackWrapper);

    const clipEl = document.createElement('div');
    clipEl.setAttribute('data-clip-id', String(clipId));
    clipEl.setAttribute('data-track-index', String(fti));
    clipEl.tabIndex = 0;
    document.body.appendChild(clipEl);

    const track = makeTrack({ id: 1, clips: [{ id: clipId, name: 'c', start: 0, duration: 5, envelopePoints: [] }] });
    const state = makeState({
      tracks: [track],
      focusedTrackIndex: fti,
      timeSelection: { startTime: 0, endTime: 2 },
    });

    renderHook(() =>
      useTimeSelectionTabHandler({ state, showVerticalRulers: false }),
    );

    const ev = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const notPrevented = document.dispatchEvent(ev);
    expect(notPrevented).toBe(true);
  });

  it('removes the listener on unmount (Tab no longer intercepted)', () => {
    const fti = 0;
    const clipId = 42;

    const trackWrapper = document.createElement('div');
    trackWrapper.className = 'track-wrapper';
    trackWrapper.setAttribute('data-track-index', String(fti));
    const trackEl = document.createElement('div');
    trackEl.className = 'track';
    trackEl.tabIndex = -1;
    trackWrapper.appendChild(trackEl);
    document.body.appendChild(trackWrapper);

    const clipEl = document.createElement('div');
    clipEl.setAttribute('data-clip-id', String(clipId));
    clipEl.setAttribute('data-track-index', String(fti));
    clipEl.tabIndex = 0;
    document.body.appendChild(clipEl);

    const track = makeTrack({ id: 1, clips: [{ id: clipId, name: 'c', start: 0, duration: 5, envelopePoints: [] }] });
    const state = makeState({
      tracks: [track],
      focusedTrackIndex: fti,
      timeSelection: { startTime: 0, endTime: 2 },
    });

    const { unmount } = renderHook(() =>
      useTimeSelectionTabHandler({ state, showVerticalRulers: false }),
    );

    // Verify it intercepts before unmount
    const ev1 = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(document.dispatchEvent(ev1)).toBe(false);

    unmount();

    // After unmount the listener should be gone
    const ev2 = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(document.dispatchEvent(ev2)).toBe(true);
  });

  it('schedules focus on the clip element via setTimeout', async () => {
    const fti = 0;
    const clipId = 42;

    const trackWrapper = document.createElement('div');
    trackWrapper.className = 'track-wrapper';
    trackWrapper.setAttribute('data-track-index', String(fti));
    const trackEl = document.createElement('div');
    trackEl.className = 'track';
    trackEl.tabIndex = -1;
    trackWrapper.appendChild(trackEl);
    document.body.appendChild(trackWrapper);

    const clipEl = document.createElement('div');
    clipEl.setAttribute('data-clip-id', String(clipId));
    clipEl.setAttribute('data-track-index', String(fti));
    clipEl.tabIndex = 0;
    document.body.appendChild(clipEl);

    document.body.focus();

    const track = makeTrack({ id: 1, clips: [{ id: clipId, name: 'c', start: 0, duration: 5, envelopePoints: [] }] });
    const state = makeState({
      tracks: [track],
      focusedTrackIndex: fti,
      timeSelection: { startTime: 0, endTime: 2 },
    });

    renderHook(() =>
      useTimeSelectionTabHandler({ state, showVerticalRulers: false }),
    );

    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(ev);

    // Flush the setTimeout(0) — act() processes pending timers/microtasks
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(document.activeElement).toBe(clipEl);
  });
});

// Canvas seam suite — renders Canvas inside a real TracksProvider (real
// reducer, real DOM) via renderCanvas(). See
// docs/superpowers/specs/2026-07-11-integration-net-design.md (§3) for the
// seam table this file implements. Each `describe` block below maps to one
// row of that table; the seam + DOM evidence chosen are documented in the
// comment above each block.
//
// audioMockFactory MUST come from './audioMock' (not './integrationHarness')
// — see audioMock.ts's header comment for the circular-import deadlock this
// avoids. Canvas itself never touches '@audacity-ui/audio', but
// integrationHarness.tsx unconditionally imports '../App' at module scope
// (it also exports renderApp()), and App.tsx pulls in '@audacity-ui/audio'
// transitively via AudioEngineContext — so importing renderCanvas from the
// shared harness module still needs the mock in place before the import
// runs, or the real Tone.js-backed manager tries to load in jsdom.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, waitFor } from '@testing-library/react';

import { audioMockFactory } from './audioMock';
import { renderCanvas } from './integrationHarness';
import type { Track } from '../contexts/TracksContext';

vi.mock('@audacity-ui/audio', () => audioMockFactory());

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * The div Canvas attaches its pointer handlers to (`containerRef` in
 * Canvas.tsx) carries no className/testid — it's identified in the JSX only
 * by inline `cursor: 'text'` + `userSelect: 'none'` styles. An ancestor
 * scroll wrapper (`.canvas-container`) ALSO happens to carry `cursor: text`
 * (inherited/duplicated styling), so matching on `cursor` alone picks the
 * wrong (outer) element — `userSelect: 'none'` is the combination unique to
 * the actual pointer-handler div in the current JSX (Canvas.tsx).
 */
function getPointerContainer(container: HTMLElement): HTMLElement {
  const candidates = Array.from(container.querySelectorAll('div')) as HTMLElement[];
  const found = candidates.find((d) => d.style.cursor === 'text' && d.style.userSelect === 'none');
  if (!found) throw new Error('Canvas pointer-handler container (style cursor:text + userSelect:none) not found');
  return found;
}

/**
 * jsdom's getBoundingClientRect() already returns an all-zero rect by
 * default, which happens to make `clientX/clientY - rect.left/top` reduce
 * to `clientX/clientY` directly — so coordinate math "just works" without
 * stubbing. We still stub explicitly (per the task brief) so the rect used
 * by every coordinate-dependent handler in a test is asserted, not assumed.
 */
function stubZeroRect(el: HTMLElement): void {
  el.getBoundingClientRect = () => ({
    top: 0, left: 0, right: 2000, bottom: 2000, width: 2000, height: 2000, x: 0, y: 0,
    toJSON() { return {}; },
  });
}

function trackEl(container: HTMLElement, trackIndex: number): HTMLElement {
  const el = container.querySelector(`[data-track-index="${trackIndex}"] .track`);
  if (!el) throw new Error(`.track element for trackIndex ${trackIndex} not found`);
  return el as HTMLElement;
}

function clipEl(container: HTMLElement, clipId: number): HTMLElement {
  const el = container.querySelector(`[data-clip-id="${clipId}"]`);
  if (!el) throw new Error(`clip element ${clipId} not found`);
  return el as HTMLElement;
}

function clipHeaderEl(container: HTMLElement, clipId: number): HTMLElement {
  const el = container.querySelector(`[data-clip-id="${clipId}"] .clip-header`);
  if (!el) throw new Error(`.clip-header for clip ${clipId} not found`);
  return el as HTMLElement;
}

/** Reads the `data-selected` attribute React stamps on Clip's own root div
 *  (a descendant of the `[data-clip-id]` wrapper TrackNew renders). */
function isClipSelected(container: HTMLElement, clipId: number): boolean {
  const el = container.querySelector(`[data-clip-id="${clipId}"] [data-selected]`);
  return el?.getAttribute('data-selected') === 'true';
}

// ---------------------------------------------------------------------------
// Row 1: Click a clip -> selected state in DOM; body click -> deselects
// Seam: useCanvasPointerHandlers onClick + useClipMouseDown + reducer.
// DOM evidence: Clip's own `data-selected` attribute (set from the
// `selected` prop TrackNew derives from the reducer's `clip.selected`).
// Header clicks and body clicks are deliberately different DOM targets —
// ClipHeader's onClick stopPropagation()s and calls onClipClick directly
// (the SELECT_CLIP path); a body click on an unselected clip is instead
// caught by the container's bubbled onClick (DESELECT_ALL_CLIPS path) —
// exercising both halves of the row through their real, distinct wiring.
// ---------------------------------------------------------------------------

describe('Clip selection', () => {
  it('header click selects the clip; body click on a different unselected clip deselects it', () => {
    const tracks: Track[] = [
      {
        id: 1,
        name: 'Track 1',
        clips: [
          { id: 1, name: 'Clip 1', start: 0, duration: 2, envelopePoints: [], trimStart: 0, fullDuration: 2 },
          { id: 2, name: 'Clip 2', start: 5, duration: 2, envelopePoints: [], trimStart: 0, fullDuration: 2 },
        ],
      },
    ];
    const { container } = renderCanvas(tracks);

    expect(isClipSelected(container, 1)).toBe(false);

    fireEvent.click(clipHeaderEl(container, 1));
    expect(isClipSelected(container, 1)).toBe(true);

    // Click the BODY of clip 2 (the `[data-clip-id]` wrapper itself, not
    // its header) — clip 2 is unselected, which is what triggers the
    // container's "body click on an unselected clip" deselect-all branch.
    fireEvent.click(clipEl(container, 2));
    expect(isClipSelected(container, 1)).toBe(false);
    expect(isClipSelected(container, 2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Row 2: Shift+Click after a selection -> time-selection extends, scoped to
// the gesture's rows.
// Seam: Shift+Click-on-click ordering hazard + timeSelection scope stamping
// (useCanvasPointerHandlers onClick).
// DOM evidence: TrackNew's time-selection overlay is a real DOM node (not
// canvas-painted) — `renderTimeSelectionOverlay()` returns a plain
// absolutely-positioned <div> whose backgroundColor differs by
// `inTimeSelectionScope` (rgba(98,119,136,...) in-scope vs
// rgba(49,56,70,...) out-of-scope). That's the strongest DOM-observable
// signal for scope without reaching into reducer state — no manual-check
// fallback needed here despite the spec's Canvas-pixel non-goal, because
// this overlay specifically isn't canvas-painted.
// ---------------------------------------------------------------------------

describe('Shift+Click time-selection scope', () => {
  it('extends a time selection scoped to the tracks the gesture spans', () => {
    const tracks: Track[] = [0, 1, 2].map((i) => ({ id: i + 1, name: `Track ${i + 1}`, clips: [] }));
    const { container } = renderCanvas(tracks);
    const pointerContainer = getPointerContainer(container);
    stubZeroRect(pointerContainer);

    // Establish "a selection": plain click on track 0's empty background
    // sets focusedTrackIndex=0 (handleContainerClick), which the
    // subsequent Shift+Click uses as its anchor.
    fireEvent.click(pointerContainer, { clientX: 50, clientY: 50 });

    // Shift+Click on track 1's background (y within [118,232) per
    // TOP_GAP=2 / TRACK_GAP=2 / DEFAULT_TRACK_HEIGHT=114) extends the
    // range from the anchor (track 0) to track 1 — track 2 stays
    // out of scope.
    fireEvent.click(pointerContainer, { clientX: 50, clientY: 175, shiftKey: true });

    const overlayColor = (idx: number) => (trackEl(container, idx).children[0] as HTMLElement).style.backgroundColor;

    expect(overlayColor(0)).toContain('98, 119, 136'); // in scope
    expect(overlayColor(1)).toContain('98, 119, 136'); // in scope
    expect(overlayColor(2)).toContain('49, 56, 70'); // out of scope
  });
});

// ---------------------------------------------------------------------------
// Double-click on a clip BODY selects the clip; triple-click selects the
// whole track's extent (gaps included) as a track-scoped time selection.
// Seam: useCanvasPointerHandlers onDoubleClick (audio branch) + onClick's
// e.detail >= 3 branch.
// ---------------------------------------------------------------------------

describe('Double / triple click', () => {
  const twoClipTrack = (): Track[] => ([
    {
      id: 1,
      name: 'Track 1',
      clips: [
        { id: 1, name: 'Clip 1', start: 0, duration: 2, envelopePoints: [], trimStart: 0, fullDuration: 2 },
        { id: 2, name: 'Clip 2', start: 5, duration: 2, envelopePoints: [], trimStart: 0, fullDuration: 2 },
      ],
    },
    { id: 2, name: 'Track 2', clips: [] },
  ]);

  it('double-click on an audio clip body selects that clip and parks the playhead on its start', () => {
    const { container } = renderCanvas(twoClipTrack());
    expect(isClipSelected(container, 1)).toBe(false);

    // Clip 2 starts at 5 s — double-click selects it AND moves the
    // playhead to the clip start, so Space auditions from its beginning.
    fireEvent.doubleClick(clipEl(container, 2));
    expect(isClipSelected(container, 2)).toBe(true);
    expect(isClipSelected(container, 1)).toBe(false);
    const probe = container.querySelector('[data-testid="tracks-state-probe"]') as HTMLElement;
    expect(probe.getAttribute('data-playhead')).toBe('5');
  });

  it('triple-click selects the full track extent as a track-scoped time selection', () => {
    const { container } = renderCanvas(twoClipTrack());
    const pointerContainer = getPointerContainer(container);
    stubZeroRect(pointerContainer);

    // Triple-click lands as a click with detail 3 — on track 0
    // (clientY 50 is within its row). Track extent = last clip end (7 s),
    // gaps between the clips included.
    fireEvent.click(pointerContainer, { clientX: 100, clientY: 50, detail: 3 });

    // Track 0 shows the in-scope overlay; track 1 is out of scope.
    const overlayColor = (idx: number) => (trackEl(container, idx).children[0] as HTMLElement).style.backgroundColor;
    expect(overlayColor(0)).toContain('98, 119, 136'); // in scope
    expect(overlayColor(1)).toContain('49, 56, 70'); // out of scope

    // The whole-clip range is selected, so both clips are body-deselected
    // (time selection replaced any clip selection).
    expect(isClipSelected(container, 1)).toBe(false);
    expect(isClipSelected(container, 2)).toBe(false);
  });

  it('double-click on empty space selects the gap between clips', () => {
    const { container } = renderCanvas(twoClipTrack());
    const pointerContainer = getPointerContainer(container);
    stubZeroRect(pointerContainer);

    // Clips span [0,2] and [5,7]; double-click at t = 3.5 s
    // (x = 12 offset + 350) inside the gap → selection [2, 5].
    fireEvent.doubleClick(pointerContainer, { clientX: 362, clientY: 50 });

    const overlay = trackEl(container, 0).children[0] as HTMLElement;
    expect(overlay.style.backgroundColor).toContain('98, 119, 136'); // in scope
    // Overlay rect: left = 12 + 2 s × 100, width = 3 s × 100
    expect(overlay.style.left).toBe('212px');
    expect(overlay.style.width).toBe('300px');
  });

  it('double-click on empty space before the first clip selects track-start to clip-start', () => {
    const tracks: Track[] = [
      {
        id: 1,
        name: 'Track 1',
        clips: [
          { id: 1, name: 'Clip 1', start: 1.5, duration: 2, envelopePoints: [], trimStart: 0, fullDuration: 2 },
        ],
      },
    ];
    const { container } = renderCanvas(tracks);
    const pointerContainer = getPointerContainer(container);
    stubZeroRect(pointerContainer);

    // t = 0.5 s (x = 12 + 50) → selection [0, 1.5]
    fireEvent.doubleClick(pointerContainer, { clientX: 62, clientY: 50 });
    const overlay = trackEl(container, 0).children[0] as HTMLElement;
    expect(overlay.style.left).toBe('12px');
    expect(overlay.style.width).toBe('150px');
  });

  it('double-click after all content stays a plain click (no unbounded selection)', () => {
    const { container } = renderCanvas(twoClipTrack());
    const pointerContainer = getPointerContainer(container);
    stubZeroRect(pointerContainer);

    // t = 9 s — past the last clip end (7 s); no right bound, no selection
    fireEvent.doubleClick(pointerContainer, { clientX: 912, clientY: 50 });
    const overlay = trackEl(container, 0).children[0] as HTMLElement | undefined;
    expect(overlay?.style.backgroundColor ?? '').not.toContain('98, 119, 136');
  });

  it('triple-click on an empty track does nothing', () => {
    const { container } = renderCanvas(twoClipTrack());
    const pointerContainer = getPointerContainer(container);
    stubZeroRect(pointerContainer);

    // Track 1 (empty) occupies y within [118, 232)
    fireEvent.click(pointerContainer, { clientX: 100, clientY: 175, detail: 3 });
    const overlayColor = (idx: number) => (trackEl(container, idx).children[0] as HTMLElement).style.backgroundColor;
    // No time selection: neither track shows a scoped overlay
    expect(overlayColor(0)).not.toContain('98, 119, 136');
    expect(overlayColor(1)).not.toContain('98, 119, 136');
  });
});

// ---------------------------------------------------------------------------
// Row 3: ArrowDown on focused track -> focus moves to next track.
// Seam: useTrackKeyboardHandlers navigate (onTrackNavigateVertical).
// DOM evidence: document.activeElement after the arrow-nav's deferred
// focus() call lands on the next track's `.track` element.
// ---------------------------------------------------------------------------

describe('Track ArrowDown navigation', () => {
  it('moves focus to the next track', async () => {
    const tracks: Track[] = [0, 1].map((i) => ({ id: i + 1, name: `Track ${i + 1}`, clips: [] }));
    const { container } = renderCanvas(tracks);

    const track0 = trackEl(container, 0);
    act(() => { track0.focus(); });
    fireEvent.keyDown(track0, { key: 'ArrowDown' });

    // onTrackNavigateVertical focuses the target track inside a
    // setTimeout(0) — wait for it rather than asserting synchronously.
    await waitFor(() => {
      expect(document.activeElement).toBe(trackEl(container, 1));
    });
  });
});

// ---------------------------------------------------------------------------
// Row 4: Cmd+ArrowDown -> track order changes; releasing Meta dispatches
// overlap resolution.
// Seam: useTrackKeyboardHandlers reorder + useCmdArrowMove keyup seam +
// pendingClipMoveResolution singleton.
// DOM evidence: the moved clip's `data-track-index` attribute (its
// wrapper is re-rendered under the destination track's TrackNew instance)
// for the reorder half; the trimmed neighbor's wrapper `style.width`
// (duration * pixelsPerSecond, pixelsPerSecond=100 default) for the
// overlap-resolution half — mirrors useCmdArrowMove.test.tsx's own
// duration assertion.
//
// The gesture is driven from the TRACK CONTAINER (not the clip) with
// `wasContainerFocused=false` — set via the same `data-focus-from-nav`
// attribute onTrackNavigateVertical stamps before an arrow-nav focus — so
// `onTrackReorder`'s "focused track has a selected clip" branch fires
// (useTrackKeyboardHandlers.ts), which is the literal "reorder" seam named
// in the design table and the one that arms pendingClipMoveResolution.
// ---------------------------------------------------------------------------

describe('Cmd+ArrowDown reorder + Meta-release overlap resolution', () => {
  it('moves the selected clip to the next track; releasing Meta trims the overlapped neighbor', async () => {
    const tracks: Track[] = [
      {
        id: 1,
        name: 'Track 1',
        // Selected clip — will be Cmd+ArrowDown'd onto track 2, landing at
        // 3..7s, which overlaps track 2's existing clip (0..5s).
        clips: [
          { id: 2, name: 'Clip 2', start: 3, duration: 4, envelopePoints: [], trimStart: 0, fullDuration: 4, selected: true },
        ],
      },
      {
        id: 2,
        name: 'Track 2',
        clips: [
          { id: 1, name: 'Clip 1', start: 0, duration: 5, envelopePoints: [], trimStart: 0, fullDuration: 5 },
        ],
      },
    ];
    const { container } = renderCanvas(tracks);

    const track0 = trackEl(container, 0);
    track0.setAttribute('data-focus-from-nav', '1');
    act(() => { track0.focus(); });

    fireEvent.keyDown(track0, { key: 'ArrowDown', metaKey: true });

    // Reorder half: clip 2 now lives under track index 1.
    await waitFor(() => {
      expect(clipEl(container, 2).getAttribute('data-track-index')).toBe('1');
    });

    // Overlap not yet resolved — clip 1 is still its original width.
    expect(clipEl(container, 1).style.width).toBe('500px');

    fireEvent.keyUp(document, { key: 'Meta' });

    // Overlap-resolution half: clip 1 (0..5s) trimmed to 3s (0..3s) since
    // clip 2 (selected, now 3..7s on the same track) wins the overlap.
    await waitFor(() => {
      expect(clipEl(container, 1).style.width).toBe('300px');
    });
  });
});

// ---------------------------------------------------------------------------
// Row 5: Keyboard trim -> clip duration attribute shrinks by the step.
// Seam: clipKeyboardEdit utils wired through CanvasTrackList (onClipTrim).
// DOM evidence: the clip wrapper's `style.width` (duration *
// pixelsPerSecond) shrinking by the 0.1s step * 100px/s = 10px.
// Keybinding (TrackNew.tsx clip onKeyDown): plain `[` -> right edge trims
// inward (shrinks) by 0.1s; confirmed against clipKeyboardEdit.test.ts's
// characterization of computeKeyboardTrim's right-edge shrink math.
// ---------------------------------------------------------------------------

describe('Keyboard trim', () => {
  it('[ shrinks the focused clip by the 0.1s step', () => {
    const tracks: Track[] = [
      {
        id: 1,
        name: 'Track 1',
        clips: [
          { id: 1, name: 'Clip 1', start: 0, duration: 2, envelopePoints: [], trimStart: 0, fullDuration: 2 },
        ],
      },
    ];
    const { container } = renderCanvas(tracks);

    const clip = clipEl(container, 1);
    expect(clip.style.width).toBe('200px');

    act(() => { clip.focus(); });
    fireEvent.keyDown(clip, { key: '[' });

    expect(clip.style.width).toBe('190px');
  });
});

// ---------------------------------------------------------------------------
// Row 6: Tab on a clip -> focus moves to the next clip (roving).
// Seam: TrackNew Tab-stepping (clip's own onKeyDown) under the real
// 'au4-tab-groups' accessibility profile.
// DOM evidence: document.activeElement after Tab.
// ---------------------------------------------------------------------------

describe('Tab roving between clips', () => {
  it('moves focus from clip 1 to clip 2', () => {
    const tracks: Track[] = [
      {
        id: 1,
        name: 'Track 1',
        clips: [
          { id: 1, name: 'Clip 1', start: 0, duration: 2, envelopePoints: [] },
          { id: 2, name: 'Clip 2', start: 3, duration: 2, envelopePoints: [] },
        ],
      },
    ];
    const { container } = renderCanvas(tracks);

    const clip1 = clipEl(container, 1);
    const clip2 = clipEl(container, 2);

    act(() => { clip1.focus(); });
    fireEvent.keyDown(clip1, { key: 'Tab' });

    expect(document.activeElement).toBe(clip2);
  });
});

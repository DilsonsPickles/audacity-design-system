import { describe, it, expect, afterEach } from 'vitest';
import { isKeyboardReadyFocusAnchor } from '../focusRouting';

afterEach(() => {
  document.body.innerHTML = '';
});

/** Builds the DOM shape Canvas's post-drag focus parking inspects:
 *  two tracks (the multi-row-drag case needs both). */
function buildTrackDom() {
  document.body.innerHTML = `
    <div class="track-wrapper" data-track-index="0">
      <div class="track" tabindex="0">
        <div data-clip-id="11" data-track-index="0" tabindex="0"></div>
      </div>
    </div>
    <div class="track-wrapper track-wrapper--focused" data-track-index="3">
      <div class="track track--selected" tabindex="0"></div>
    </div>
    <div class="track-control-panel">
      <button>Mute</button>
    </div>
    <div data-track-ruler-index="1" tabindex="0"></div>
  `;
}

const trackContainer = (index: number) =>
  document.querySelector(`.track-wrapper[data-track-index="${index}"] .track`);

describe('isKeyboardReadyFocusAnchor (post-time-drag focus parking)', () => {
  it('a CLIP element is NOT an anchor — the arrow-keys-dead-after-drag bug (2026-09-10)', () => {
    buildTrackDom();
    const clip = document.querySelector('[data-clip-id="11"]');
    expect(isKeyboardReadyFocusAnchor(clip, 0)).toBe(false);
  });

  it('the RELEASED track\'s .track container is an anchor', () => {
    buildTrackDom();
    expect(isKeyboardReadyFocusAnchor(trackContainer(3), 3)).toBe(true);
  });

  it('a DIFFERENT track\'s .track container is NOT an anchor — the multi-row drag bug: mousedown focuses the start row, the app focuses the released row', () => {
    buildTrackDom();
    // Drag started on track 0 (its container took native focus),
    // released on track 3 — parking must re-park onto track 3.
    expect(isKeyboardReadyFocusAnchor(trackContainer(0), 3)).toBe(false);
  });

  it('elements inside the track control panel are anchors', () => {
    buildTrackDom();
    expect(isKeyboardReadyFocusAnchor(document.querySelector('.track-control-panel button'), 3)).toBe(true);
  });

  it('a vertical ruler is an anchor', () => {
    buildTrackDom();
    expect(isKeyboardReadyFocusAnchor(document.querySelector('[data-track-ruler-index]'), 3)).toBe(true);
  });

  it('body / null are not anchors (parking proceeds)', () => {
    buildTrackDom();
    expect(isKeyboardReadyFocusAnchor(document.body, 3)).toBe(false);
    expect(isKeyboardReadyFocusAnchor(null, 3)).toBe(false);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { isKeyboardReadyFocusAnchor } from '../focusRouting';

afterEach(() => {
  document.body.innerHTML = '';
});

/** Builds the DOM shape Canvas's post-drag focus parking inspects. */
function buildTrackDom() {
  document.body.innerHTML = `
    <div class="track-wrapper track-wrapper--focused" data-track-index="1">
      <div class="track track--selected" tabindex="0">
        <div data-clip-id="11" data-track-index="1" tabindex="0"></div>
      </div>
    </div>
    <div class="track-control-panel">
      <button>Mute</button>
    </div>
    <div data-track-ruler-index="1" tabindex="0"></div>
  `;
}

describe('isKeyboardReadyFocusAnchor (post-time-drag focus parking)', () => {
  it('a CLIP element is NOT an anchor — the arrow-keys-dead-after-drag bug (2026-09-10)', () => {
    buildTrackDom();
    const clip = document.querySelector('[data-clip-id="11"]');
    expect(isKeyboardReadyFocusAnchor(clip)).toBe(false);
  });

  it('the .track container itself is an anchor', () => {
    buildTrackDom();
    expect(isKeyboardReadyFocusAnchor(document.querySelector('.track'))).toBe(true);
  });

  it('elements inside the track control panel are anchors', () => {
    buildTrackDom();
    expect(isKeyboardReadyFocusAnchor(document.querySelector('.track-control-panel button'))).toBe(true);
  });

  it('a vertical ruler is an anchor', () => {
    buildTrackDom();
    expect(isKeyboardReadyFocusAnchor(document.querySelector('[data-track-ruler-index]'))).toBe(true);
  });

  it('body / null are not anchors (parking proceeds)', () => {
    buildTrackDom();
    expect(isKeyboardReadyFocusAnchor(document.body)).toBe(false);
    expect(isKeyboardReadyFocusAnchor(null)).toBe(false);
  });
});

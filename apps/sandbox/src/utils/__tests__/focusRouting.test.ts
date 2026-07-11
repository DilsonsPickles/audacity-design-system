import { describe, it, expect, afterEach } from 'vitest';
import {
  findTrackControlPanelByIndex,
  findFirstButtonInTrackControlPanel,
  findLastButtonInTrackControlPanel,
  resolveTrackDropIndex,
  findFirstClipInTrack,
  findLastClipInTrack,
  findTrackRulerByIndex,
  findTrackContainerByIndex,
  findSelectionToolbarFirstGroup,
} from '../focusRouting';

// Plain DOM fixtures (jsdom) — no React. Each test builds only the markup
// its function needs, mirroring the real EditorLayout/TrackControlPanel/
// Track DOM shape closely enough to exercise the exact selectors.

let root: HTMLDivElement;

function mount(): HTMLDivElement {
  root = document.createElement('div');
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  root?.remove();
});

// Real aria-label format (TrackControlPanel.tsx): `${trackName} track controls`.
function panel(ariaLabel: string, buttonCount = 0): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-label', ariaLabel);
  for (let i = 0; i < buttonCount; i++) {
    const btn = document.createElement('button');
    btn.textContent = `btn-${i}`;
    el.appendChild(btn);
  }
  return el;
}

function mockRect(el: HTMLElement, top: number, bottom: number): void {
  el.getBoundingClientRect = () =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON() {} }) as DOMRect;
}

describe('findTrackControlPanelByIndex', () => {
  it('returns the panel at the given index', () => {
    const r = mount();
    const p0 = panel('Track 0 track controls');
    const p1 = panel('Track 1 track controls');
    r.append(p0, p1);
    expect(findTrackControlPanelByIndex(r, 1)).toBe(p1);
  });

  it('returns null for an out-of-range index', () => {
    const r = mount();
    r.append(panel('Track 0 track controls'));
    expect(findTrackControlPanelByIndex(r, 5)).toBeNull();
  });

  it('returns null when no panels are rendered', () => {
    const r = mount();
    expect(findTrackControlPanelByIndex(r, 0)).toBeNull();
  });
});

describe('findFirstButtonInTrackControlPanel', () => {
  it('returns the first button in the panel', () => {
    const r = mount();
    const p0 = panel('Track 0 track controls', 3);
    r.append(p0);
    expect(findFirstButtonInTrackControlPanel(r, 0)).toBe(p0.querySelectorAll('button')[0]);
  });

  it('returns null when the panel has no buttons', () => {
    const r = mount();
    r.append(panel('Track 0 track controls', 0));
    expect(findFirstButtonInTrackControlPanel(r, 0)).toBeNull();
  });

  it('returns null when the panel itself is missing', () => {
    const r = mount();
    expect(findFirstButtonInTrackControlPanel(r, 0)).toBeNull();
  });
});

describe('findLastButtonInTrackControlPanel', () => {
  it('returns the last button in the panel', () => {
    const r = mount();
    const p0 = panel('Track 0 track controls', 3);
    r.append(p0);
    const buttons = p0.querySelectorAll('button');
    expect(findLastButtonInTrackControlPanel(r, 0)).toBe(buttons[buttons.length - 1]);
  });

  it('returns null when the panel has no buttons', () => {
    const r = mount();
    r.append(panel('Track 0 track controls', 0));
    expect(findLastButtonInTrackControlPanel(r, 0)).toBeNull();
  });

  it('returns null when the panel itself is missing', () => {
    const r = mount();
    expect(findLastButtonInTrackControlPanel(r, 3)).toBeNull();
  });
});

describe('resolveTrackDropIndex', () => {
  it('returns the index of the panel whose row contains clientY', () => {
    const r = mount();
    const p0 = panel('Track 0 track controls');
    const p1 = panel('Track 1 track controls');
    const p2 = panel('Track 2 track controls');
    mockRect(p0, 0, 100);
    mockRect(p1, 100, 200);
    mockRect(p2, 200, 300);
    r.append(p0, p1, p2);
    expect(resolveTrackDropIndex(r, 150)).toBe(1);
  });

  it('returns the first panel index when clientY is above every panel', () => {
    const r = mount();
    const p0 = panel('Track 0 track controls');
    const p1 = panel('Track 1 track controls');
    mockRect(p0, 50, 150);
    mockRect(p1, 150, 250);
    r.append(p0, p1);
    expect(resolveTrackDropIndex(r, -20)).toBe(0);
  });

  it('falls back to the last panel index when clientY is below every panel', () => {
    const r = mount();
    const p0 = panel('Track 0 track controls');
    const p1 = panel('Track 1 track controls');
    mockRect(p0, 0, 100);
    mockRect(p1, 100, 200);
    r.append(p0, p1);
    expect(resolveTrackDropIndex(r, 9999)).toBe(1);
  });

  it('returns -1 when there are no panels at all', () => {
    const r = mount();
    expect(resolveTrackDropIndex(r, 50)).toBe(-1);
  });
});

describe('findFirstClipInTrack', () => {
  it('returns the clip marked data-first-clip="true" within the track element', () => {
    const r = mount();
    const trackEl = document.createElement('div');
    trackEl.setAttribute('data-track-index', '0');
    const clip1 = document.createElement('div');
    clip1.setAttribute('data-clip-id', '1');
    clip1.setAttribute('data-first-clip', 'true');
    trackEl.appendChild(clip1);
    r.append(trackEl);
    expect(findFirstClipInTrack(r, 0)).toBe(clip1);
  });

  it('returns null when the track has clips but none marked as first (empty track)', () => {
    const r = mount();
    const trackEl = document.createElement('div');
    trackEl.setAttribute('data-track-index', '0');
    r.append(trackEl);
    expect(findFirstClipInTrack(r, 0)).toBeNull();
  });

  it('returns null when no element carries that data-track-index', () => {
    const r = mount();
    expect(findFirstClipInTrack(r, 7)).toBeNull();
  });
});

describe('findLastClipInTrack', () => {
  it('returns the last data-clip-id element in the track row', () => {
    const r = mount();
    const wrapper = document.createElement('div');
    wrapper.className = 'track-wrapper';
    wrapper.setAttribute('data-track-index', '2');
    const trackRow = document.createElement('div');
    trackRow.className = 'track';
    const c1 = document.createElement('div');
    c1.setAttribute('data-clip-id', '1');
    const c2 = document.createElement('div');
    c2.setAttribute('data-clip-id', '2');
    trackRow.append(c1, c2);
    wrapper.append(trackRow);
    r.append(wrapper);
    expect(findLastClipInTrack(r, 2)).toBe(c2);
  });

  it('returns null when the track row exists but has no clips (non-first, empty track)', () => {
    const r = mount();
    const wrapper = document.createElement('div');
    wrapper.className = 'track-wrapper';
    wrapper.setAttribute('data-track-index', '1');
    const trackRow = document.createElement('div');
    trackRow.className = 'track';
    wrapper.append(trackRow);
    r.append(wrapper);
    expect(findLastClipInTrack(r, 1)).toBeNull();
  });

  it('returns null when the .track-wrapper/.track structure is missing', () => {
    const r = mount();
    expect(findLastClipInTrack(r, 4)).toBeNull();
  });
});

describe('findTrackRulerByIndex', () => {
  it('returns the ruler element for the given index', () => {
    const r = mount();
    const ruler1 = document.createElement('div');
    ruler1.setAttribute('data-track-ruler-index', '1');
    r.append(ruler1);
    expect(findTrackRulerByIndex(r, 1)).toBe(ruler1);
  });

  it('returns null when no ruler is rendered for that index (rulers hidden or label/midi track)', () => {
    const r = mount();
    expect(findTrackRulerByIndex(r, 3)).toBeNull();
  });
});

describe('findTrackContainerByIndex', () => {
  it('returns the .track row nested inside the matching .track-wrapper', () => {
    const r = mount();
    const wrapper = document.createElement('div');
    wrapper.className = 'track-wrapper';
    wrapper.setAttribute('data-track-index', '0');
    const trackRow = document.createElement('div');
    trackRow.className = 'track';
    wrapper.append(trackRow);
    r.append(wrapper);
    expect(findTrackContainerByIndex(r, 0)).toBe(trackRow);
  });

  it('returns null when the wrapper exists but has no .track child', () => {
    const r = mount();
    const wrapper = document.createElement('div');
    wrapper.className = 'track-wrapper';
    wrapper.setAttribute('data-track-index', '0');
    r.append(wrapper);
    expect(findTrackContainerByIndex(r, 0)).toBeNull();
  });

  it('returns null when no matching wrapper exists (non-first track index unmounted)', () => {
    const r = mount();
    expect(findTrackContainerByIndex(r, 9)).toBeNull();
  });
});

describe('findSelectionToolbarFirstGroup', () => {
  it('returns the first [role="group"] child of .selection-toolbar', () => {
    const r = mount();
    const toolbar = document.createElement('div');
    toolbar.className = 'selection-toolbar';
    const group = document.createElement('div');
    group.setAttribute('role', 'group');
    toolbar.append(group);
    r.append(toolbar);
    expect(findSelectionToolbarFirstGroup(r)).toBe(group);
  });

  it('returns null when the toolbar has no group child', () => {
    const r = mount();
    const toolbar = document.createElement('div');
    toolbar.className = 'selection-toolbar';
    r.append(toolbar);
    expect(findSelectionToolbarFirstGroup(r)).toBeNull();
  });

  it('returns null when .selection-toolbar is not rendered', () => {
    const r = mount();
    expect(findSelectionToolbarFirstGroup(r)).toBeNull();
  });
});

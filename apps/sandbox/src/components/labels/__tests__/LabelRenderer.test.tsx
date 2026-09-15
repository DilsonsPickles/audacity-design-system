// Tests for the rewritten label system (labels-rewrite): size-derived
// geometry, placeholder for empty labels, inline editing, and auto-edit of
// freshly added labels. The renderer reads the label-text-size preference,
// so tests seed the persisted preferences blob before rendering.
import { render, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '@audacity-ui/components';
import { colors } from '@audacity-ui/tokens';
import { LabelRenderer } from '../../LabelRenderer';
import { getLabelMetrics, labelPtToPx } from '../../../utils/labelLayout';
import type { Label, TracksAction } from '../../../contexts/TracksContext';

afterEach(cleanup);
beforeEach(() => {
  window.localStorage.clear();
});

function seedLabelTextSize(pt: number) {
  window.localStorage.setItem('audacity-preferences', JSON.stringify({ labelTextSizePt: pt }));
}

function renderLabels(labels: Label[], dispatch = vi.fn<(a: TracksAction) => void>(), trackColor?: string) {
  const props = {
    labels,
    trackColor,
    trackIndex: 0,
    trackHeight: 114,
    pixelsPerSecond: 100,
    clipContentOffset: 0,
    selectedLabelIds: [] as string[],
    hoveredEar: null,
    hoveredBanner: null,
    trackCount: 1,
    selectedTrackIndices: [0],
    setHoveredEar: () => {},
    setHoveredBanner: () => {},
    dispatch,
  };
  const utils = render(
    <PreferencesProvider>
      <div className="canvas-container">
        <LabelRenderer {...props} />
      </div>
    </PreferencesProvider>,
  );
  const rerenderLabels = (next: Label[]) =>
    utils.rerender(
      <PreferencesProvider>
        <div className="canvas-container">
          <LabelRenderer {...props} labels={next} />
        </div>
      </PreferencesProvider>,
    );
  return { ...utils, dispatch, rerenderLabels };
}

const region = (o: Partial<Label> = {}): Label => ({
  id: 1,
  trackIndex: 0,
  text: 'Chorus',
  startTime: 1,
  endTime: 3,
  ...o,
});

const banner = (container: HTMLElement, keyId = '0-1') =>
  container.querySelector(`[data-label-banner="${keyId}"]`) as HTMLElement;

describe('LabelRenderer (rewrite): size-derived geometry', () => {
  it('default 9pt/12px: 20px strap (floor), constant 8x20 ear tabs', () => {
    const { container } = renderLabels([region()]);
    const el = banner(container);
    expect(el.style.height).toBe('20px');
    expect(el.style.fontSize).toBe('');
    const ears = container.querySelectorAll('svg');
    expect(ears).toHaveLength(2);
    expect(ears[0].getAttribute('width')).toBe('8');
    expect(ears[0].getAttribute('height')).toBe('20');
  });

  it('48pt: the strap and text scale (1.5x), the ear tabs stay classic 7x14', () => {
    seedLabelTextSize(48);
    const m = getLabelMetrics(labelPtToPx(48));
    const { container } = renderLabels([region()]);
    const el = banner(container);
    expect(el.style.height).toBe(`${m.bannerHeight}px`);
    expect(m.bannerHeight).toBe(96); // 64px text x 1.5
    const text = el.firstElementChild as HTMLElement;
    expect(text.style.fontSize).toBe(`${m.fontSizePx}px`);
    const ear = container.querySelector('svg')!;
    // Constant 8x20 corner tab — ears never scale with the text.
    expect(ear.getAttribute('width')).toBe('8');
    expect(ear.getAttribute('height')).toBe('20');
    // Path stays in its native 7x14 space; the svg stretches it to fill.
    expect(ear.getAttribute('viewBox')).toBe('0 0 7 14');
  });

  it('an empty label renders an empty strap — no placeholder text', () => {
    const { container } = renderLabels([region({ text: '' })]);
    const text = banner(container).firstElementChild as HTMLElement;
    expect(text.textContent).toBe('');
  });
});

describe('LabelRenderer (rewrite): inline editing', () => {
  it('double-click opens the editor; Enter commits the new text', async () => {
    const { container, dispatch } = renderLabels([region()]);
    fireEvent.doubleClick(banner(container));

    const input = await waitFor(
      () => container.querySelector('[data-label-input="0-1"]') as HTMLInputElement,
    );
    expect(input.value).toBe('Chorus');
    // Opening the editor parks the playhead on the label's start.
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAYHEAD_POSITION', payload: 1 });

    fireEvent.change(input, { target: { value: 'Bridge' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { text: 'Bridge' } },
    });
    expect(container.querySelector('[data-label-input="0-1"]')).toBeNull();
  });

  it('Escape reverts without dispatching', async () => {
    const { container, dispatch } = renderLabels([region()]);
    fireEvent.doubleClick(banner(container));
    const input = await waitFor(
      () => container.querySelector('[data-label-input="0-1"]') as HTMLInputElement,
    );
    fireEvent.change(input, { target: { value: 'scrapped' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    // The dblclick parks the playhead, but no text change is committed.
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE_LABEL' }),
    );
    expect(container.querySelector('[data-label-input="0-1"]')).toBeNull();
  });

  it('a label ADDED with empty text opens its editor; loaded labels never self-open', async () => {
    const first = region({ id: 1, text: '' });
    const { container, rerenderLabels } = renderLabels([first]);
    // Present on first render (project load) — no editor.
    expect(container.querySelector('input')).toBeNull();

    act(() => {
      rerenderLabels([first, region({ id: 2, text: '', startTime: 5, endTime: 6 })]);
    });
    const input = await waitFor(
      () => container.querySelector('[data-label-input="0-2"]') as HTMLInputElement,
    );
    expect(input).toBeInTheDocument();
  });
});

describe('LabelRenderer (rewrite): ear stretching (build semantics)', () => {
  const pointAt1 = (): Label => region({ id: 1, text: 'cue', startTime: 1, endTime: 1 });

  it("pulling a point label's RIGHT ear stretches it into a region", () => {
    const { container, dispatch } = renderLabels([pointAt1()]);
    const rightEar = container.querySelector('[data-label-ear="0-1-right"]')!;
    // pps=100, offset 0, jsdom rects are all-zero → time = clientX / 100
    fireEvent.mouseDown(rightEar, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 250 });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { startTime: 1, endTime: 2.5 } },
    });
    fireEvent.mouseUp(document);
  });

  it("pulling a point label's LEFT ear stretches the start out, anchored on the point", () => {
    const { container, dispatch } = renderLabels([pointAt1()]);
    const leftEar = container.querySelector('[data-label-ear="0-1-left"]')!;
    fireEvent.mouseDown(leftEar, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 40 });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { startTime: 0.4, endTime: 1 } },
    });
    fireEvent.mouseUp(document);
  });

  it('dragging an edge close to the anchor snaps the region back to a POINT label', () => {
    const { container, dispatch } = renderLabels([region({ id: 1, startTime: 1, endTime: 2 })]);
    const rightEar = container.querySelector('[data-label-ear="0-1-right"]')!;
    // Right ear anchored at startTime=1; release the edge 4px (0.04s at
    // pps 100) from the anchor — inside the 6px collapse detent.
    fireEvent.mouseDown(rightEar, { clientX: 200 });
    fireEvent.mouseMove(document, { clientX: 104 });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { startTime: 1, endTime: 1 } },
    });
    fireEvent.mouseUp(document);
  });

  it('stretching past the anchor inverts (ensureOrdering swap), never a negative span', () => {
    const { container, dispatch } = renderLabels([region({ id: 1, startTime: 1, endTime: 2 })]);
    const rightEar = container.querySelector('[data-label-ear="0-1-right"]')!;
    // Right ear anchored at startTime=1; drag left of the anchor to 0.2
    fireEvent.mouseDown(rightEar, { clientX: 200 });
    fireEvent.mouseMove(document, { clientX: 20 });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { startTime: 0.2, endTime: 1 } },
    });
    fireEvent.mouseUp(document);
  });
});

describe('LabelRenderer (rewrite): selected state (Figma spec)', () => {
  it('a selected label strap goes to the 30% white-mixed tint', () => {
    const dispatch = vi.fn<(a: TracksAction) => void>();
    const props = {
      labels: [region()],
      trackColor: undefined,
      trackIndex: 0,
      trackHeight: 114,
      pixelsPerSecond: 100,
      clipContentOffset: 0,
      selectedLabelIds: ['0-1'],
      hoveredEar: null,
      hoveredBanner: null,
      trackCount: 1,
      selectedTrackIndices: [0],
      setHoveredEar: () => {},
      setHoveredBanner: () => {},
      dispatch,
    };
    const { container } = render(
      <PreferencesProvider>
        <div className="canvas-container">
          <LabelRenderer {...props} />
        </div>
      </PreferencesProvider>,
    );
    const el = container.querySelector('[data-label-banner="0-1"]') as HTMLElement;
    expect(el.style.backgroundColor).toContain('30%');
    expect(el.style.backgroundColor).toContain('white');
  });

  it('an unselected strap is LIGHTER than the ears (50% tint vs solid)', () => {
    const { container } = renderLabels([region()]);
    // NOTE: CSS serialization omits "50%" (color-mix's default weight),
    // so assert the mix itself rather than the literal percentage.
    const strap = banner(container).style.backgroundColor;
    expect(strap).toContain('color-mix');
    expect(strap).toContain('white');
    const ear = container.querySelector('svg path')!;
    expect(ear.getAttribute('fill')).toBe(colors.blue[500]); // solid
  });
});

describe('LabelRenderer (rewrite): track color', () => {
  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };

  it('labels render in the label track\'s palette color (strap tinted, ears solid)', () => {
    const { container } = renderLabels([region()], undefined, 'red');
    const strap = banner(container).style.backgroundColor;
    expect(strap).toContain('color-mix');
    expect(strap).toContain(hexToRgb(colors.red[500]));
    const ear = container.querySelector('svg path')!;
    expect(ear.getAttribute('fill')).toBe(colors.red[500]);
  });

  it('defaults to the classic blue when the track has no color', () => {
    const { container } = renderLabels([region()]);
    expect(banner(container).style.backgroundColor).toContain(hexToRgb(colors.blue[500]));
  });
});

describe('LabelRenderer (rewrite): dblclick-rename vs expand toggle', () => {
  it('double-clicking a SELECTED region label renames without expanding the track selection', async () => {
    const dispatch = vi.fn<(a: TracksAction) => void>();
    // Selected already — the single-click path would toggle expansion.
    const props = {
      labels: [region()],
      trackColor: undefined,
      trackIndex: 0,
      trackHeight: 114,
      pixelsPerSecond: 100,
      clipContentOffset: 0,
      selectedLabelIds: ['0-1'],
      hoveredEar: null,
      hoveredBanner: null,
      trackCount: 3,
      selectedTrackIndices: [0],
      setHoveredEar: () => {},
      setHoveredBanner: () => {},
      dispatch,
    };
    const { container } = render(
      <PreferencesProvider>
        <div className="canvas-container">
          <LabelRenderer {...props} />
        </div>
      </PreferencesProvider>,
    );
    const el = container.querySelector('[data-label-banner="0-1"]')!;
    // Real double-click stream: down/up/click, down/up/click, dblclick.
    fireEvent.mouseDown(el, { detail: 1 });
    fireEvent.mouseUp(document);
    fireEvent.mouseDown(el, { detail: 2 });
    fireEvent.mouseUp(document);
    fireEvent.doubleClick(el);

    await waitFor(() => expect(container.querySelector('[data-label-input="0-1"]')).toBeTruthy());
    // Wait out the expand window — the dblclick must have cancelled it.
    await new Promise((r) => setTimeout(r, 350));
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_SELECTED_TRACKS' }),
    );
    // Editor open + playhead parked = the rename gesture won.
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAYHEAD_POSITION', payload: 1 });
  });

  it('a plain click on a selected region label still expands after the window', async () => {
    const dispatch = vi.fn<(a: TracksAction) => void>();
    const props = {
      labels: [region()],
      trackColor: undefined,
      trackIndex: 0,
      trackHeight: 114,
      pixelsPerSecond: 100,
      clipContentOffset: 0,
      selectedLabelIds: ['0-1'],
      hoveredEar: null,
      hoveredBanner: null,
      trackCount: 3,
      selectedTrackIndices: [0],
      setHoveredEar: () => {},
      setHoveredBanner: () => {},
      dispatch,
    };
    const { container } = render(
      <PreferencesProvider>
        <div className="canvas-container">
          <LabelRenderer {...props} />
        </div>
      </PreferencesProvider>,
    );
    const el = container.querySelector('[data-label-banner="0-1"]')!;
    fireEvent.mouseDown(el, { detail: 1 });
    fireEvent.mouseUp(document);
    await waitFor(
      () => expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_SELECTED_TRACKS', payload: [0, 1, 2] }),
      ),
      { timeout: 1000 },
    );
  });
});

describe('LabelRenderer (rewrite): adjacent regions share a middle stalk', () => {
  const adjacentPair = (): Label[] => [
    { id: 1, trackIndex: 0, text: 'verse', startTime: 1, endTime: 2 },
    { id: 2, trackIndex: 0, text: 'chorus', startTime: 2, endTime: 3 },
  ];

  it('the junction renders ONE stalk and NO ears', () => {
    const { container } = renderLabels(adjacentPair());
    // Stalks: label 1 left, shared junction (owned by label 2), label 2
    // right — three, not four.
    expect(container.querySelectorAll('[data-label-stalk]')).toHaveLength(3);
    // Ears: only the pair's outer edges.
    const ears = Array.from(container.querySelectorAll('[data-label-ear]')).map((e) => e.getAttribute('data-label-ear'));
    expect(ears).toEqual(['0-1-left', '0-2-right']);
  });

  it('dragging the shared stalk moves BOTH labels\' edge together', () => {
    const { container, dispatch } = renderLabels(adjacentPair());
    // The shared stalk belongs to label 2 (the right-hand label).
    const sharedStalk = container.querySelector('[data-label-stalk="0-2"]')!;
    fireEvent.mouseDown(sharedStalk, { clientX: 200 });
    fireEvent.mouseMove(document, { clientX: 250 }); // t = 2.5s at pps 100
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { endTime: 2.5 } },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 2, label: { startTime: 2.5 } },
    });
    fireEvent.mouseUp(document);
  });

  it('the shared edge clamps inside the pair (no inversion through either label)', () => {
    const { container, dispatch } = renderLabels(adjacentPair());
    const sharedStalk = container.querySelector('[data-label-stalk="0-2"]')!;
    fireEvent.mouseDown(sharedStalk, { clientX: 200 });
    fireEvent.mouseMove(document, { clientX: 40 }); // t = 0.4 — left of label 1's start
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { endTime: 1 } },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 2, label: { startTime: 1 } },
    });
    fireEvent.mouseUp(document);
  });

  it('near-but-not-touching regions keep their own full chrome', () => {
    const { container } = renderLabels([
      { id: 1, trackIndex: 0, text: 'a', startTime: 1, endTime: 2 },
      { id: 2, trackIndex: 0, text: 'b', startTime: 2.05, endTime: 3 },
    ]);
    expect(container.querySelectorAll('[data-label-stalk]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-label-ear]')).toHaveLength(4);
  });
});

describe('LabelRenderer (rewrite): selecting one half of an adjacent pair', () => {
  const pair = (): Label[] => [
    { id: 1, trackIndex: 0, text: 'verse', startTime: 1, endTime: 2 },
    { id: 2, trackIndex: 0, text: 'chorus', startTime: 2, endTime: 3 },
  ];
  const renderSelected = (selectedLabelIds: string[], dispatch = vi.fn<(a: TracksAction) => void>()) => {
    const props = {
      labels: pair(),
      trackColor: undefined,
      trackIndex: 0,
      trackHeight: 114,
      pixelsPerSecond: 100,
      clipContentOffset: 0,
      selectedLabelIds,
      hoveredEar: null,
      hoveredBanner: null,
      trackCount: 1,
      selectedTrackIndices: [0],
      setHoveredEar: () => {},
      setHoveredBanner: () => {},
      dispatch,
    };
    const utils = render(
      <PreferencesProvider>
        <div className="canvas-container">
          <LabelRenderer {...props} />
        </div>
      </PreferencesProvider>,
    );
    return { ...utils, dispatch };
  };

  it('selecting the LEFT label shows both its ears; the neighbour yields the junction', () => {
    const { container } = renderSelected(['0-1']);
    const ears = Array.from(container.querySelectorAll('[data-label-ear]')).map((e) => e.getAttribute('data-label-ear'));
    expect(ears).toEqual(['0-1-left', '0-1-right', '0-2-right']);
    // Junction stalk is the selected label's own; the neighbour's is gone.
    expect(container.querySelectorAll('[data-label-stalk]')).toHaveLength(3);
  });

  it('selecting the RIGHT label shows both its ears', () => {
    const { container } = renderSelected(['0-2']);
    const ears = Array.from(container.querySelectorAll('[data-label-ear]')).map((e) => e.getAttribute('data-label-ear'));
    expect(ears).toEqual(['0-1-left', '0-2-left', '0-2-right']);
  });

  it("the selected label's junction ear stretches ONLY itself (unlink)", () => {
    const { container, dispatch } = renderSelected(['0-1']);
    const rightEar = container.querySelector('[data-label-ear="0-1-right"]')!;
    fireEvent.mouseDown(rightEar, { clientX: 200 });
    fireEvent.mouseMove(document, { clientX: 150 }); // pull the edge back to 1.5s
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { startTime: 1, endTime: 1.5 } },
    });
    // The neighbour's start is untouched — this is the unlink gesture.
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ labelId: 2 }) }),
    );
    fireEvent.mouseUp(document);
  });
});

describe('LabelRenderer (rewrite): magnetic edge snapping', () => {
  it('stretching an edge within 8px of a neighbour edge snaps to exact adjacency', () => {
    const { container, dispatch } = renderLabels([
      { id: 1, trackIndex: 0, text: 'a', startTime: 1, endTime: 1.5 },
      { id: 2, trackIndex: 0, text: 'b', startTime: 2, endTime: 3 },
    ]);
    const rightEar = container.querySelector('[data-label-ear="0-1-right"]')!;
    fireEvent.mouseDown(rightEar, { clientX: 150 });
    fireEvent.mouseMove(document, { clientX: 195 }); // 5px shy of label 2's start
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { startTime: 1, endTime: 2 } },
    });
    fireEvent.mouseUp(document);
  });

  it('dragging a whole label snaps its END onto a neighbour START', () => {
    const { container, dispatch } = renderLabels([
      { id: 1, trackIndex: 0, text: 'a', startTime: 0.2, endTime: 0.7 },
      { id: 2, trackIndex: 0, text: 'b', startTime: 2, endTime: 3 },
    ]);
    const bannerEl = container.querySelector('[data-label-banner="0-1"]') as HTMLElement;
    fireEvent.mouseDown(bannerEl, { clientX: 40, detail: 1 });
    // Move by +125px → raw start 1.45s, raw end 1.95s: end is 5px shy of
    // label 2's start → whole label snaps so end = 2.
    fireEvent.mouseMove(document, { clientX: 165 });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { startTime: 1.5, endTime: 2 } },
    });
    fireEvent.mouseUp(document);
  });

  it('outside the window there is no snap', () => {
    const { container, dispatch } = renderLabels([
      { id: 1, trackIndex: 0, text: 'a', startTime: 1, endTime: 1.5 },
      { id: 2, trackIndex: 0, text: 'b', startTime: 2, endTime: 3 },
    ]);
    const rightEar = container.querySelector('[data-label-ear="0-1-right"]')!;
    fireEvent.mouseDown(rightEar, { clientX: 150 });
    fireEvent.mouseMove(document, { clientX: 180 }); // 20px away — no snap
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { startTime: 1, endTime: 1.8 } },
    });
    fireEvent.mouseUp(document);
  });
});

describe('LabelRenderer (rewrite): junction stalk is ALWAYS a both-mover', () => {
  const pair = (): Label[] => [
    { id: 1, trackIndex: 0, text: 'verse', startTime: 1, endTime: 2 },
    { id: 2, trackIndex: 0, text: 'chorus', startTime: 2, endTime: 3 },
  ];
  const renderPair = (selectedLabelIds: string[]) => {
    const dispatch = vi.fn<(a: TracksAction) => void>();
    const props = {
      labels: pair(),
      trackColor: undefined,
      trackIndex: 0,
      trackHeight: 114,
      pixelsPerSecond: 100,
      clipContentOffset: 0,
      selectedLabelIds,
      hoveredEar: null,
      hoveredBanner: null,
      trackCount: 1,
      selectedTrackIndices: [0],
      setHoveredEar: () => {},
      setHoveredBanner: () => {},
      dispatch,
    };
    const utils = render(
      <PreferencesProvider>
        <div className="canvas-container">
          <LabelRenderer {...props} />
        </div>
      </PreferencesProvider>,
    );
    return { ...utils, dispatch };
  };

  it('with the RIGHT label selected, its junction stalk still moves both', () => {
    const { container, dispatch } = renderPair(['0-2']);
    const stalkEl = container.querySelector('[data-label-stalk="0-2"]')!;
    fireEvent.mouseDown(stalkEl, { clientX: 200 });
    fireEvent.mouseMove(document, { clientX: 250 });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { endTime: 2.5 } },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 2, label: { startTime: 2.5 } },
    });
    fireEvent.mouseUp(document);
  });

  it('with the LEFT label selected, its right junction stalk moves both too', () => {
    const { container, dispatch } = renderPair(['0-1']);
    // Label 1 is selected — it reasserts its own right stalk at the seam.
    const stalks = Array.from(container.querySelectorAll('[data-label-stalk="0-1"]'));
    const junctionStalk = stalks[stalks.length - 1]; // left stalk first, right (junction) second
    fireEvent.mouseDown(junctionStalk, { clientX: 200 });
    fireEvent.mouseMove(document, { clientX: 150 });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 1, label: { endTime: 1.5 } },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_LABEL',
      payload: { trackIndex: 0, labelId: 2, label: { startTime: 1.5 } },
    });
    fireEvent.mouseUp(document);
  });
});

describe('LabelRenderer (rewrite): stalk hover lights BOTH ears', () => {
  const renderHovered = (hoveredEar: string) => {
    const props = {
      labels: [region()],
      trackColor: undefined,
      trackIndex: 0,
      trackHeight: 114,
      pixelsPerSecond: 100,
      clipContentOffset: 0,
      selectedLabelIds: [] as string[],
      hoveredEar,
      hoveredBanner: null,
      trackCount: 1,
      selectedTrackIndices: [0],
      setHoveredEar: () => {},
      setHoveredBanner: () => {},
      dispatch: vi.fn(),
    };
    return render(
      <PreferencesProvider>
        <div className="canvas-container">
          <LabelRenderer {...props} />
        </div>
      </PreferencesProvider>,
    );
  };
  const earFills = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-label-ear] path')).map((p) => p.getAttribute('fill'));

  it('hovering a stalk puts BOTH ears in the hover tint', () => {
    const { container } = renderHovered('0-1-lstalk');
    const fills = earFills(container);
    expect(fills).toHaveLength(2);
    fills.forEach((f) => expect(f).toContain('30%'));
  });

  it('hovering an EAR still lights only that side', () => {
    const { container } = renderHovered('0-1-left');
    const fills = earFills(container);
    expect(fills[0]).toContain('30%');
    expect(fills[1]).not.toContain('30%');
  });
});

describe('LabelRenderer (rewrite): resizing does not select', () => {
  it('an ear stretch dispatches no selection change', () => {
    const { container, dispatch } = renderLabels([region()]);
    const rightEar = container.querySelector('[data-label-ear="0-1-right"]')!;
    fireEvent.mouseDown(rightEar, { clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 350 });
    fireEvent.mouseUp(document);
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_SELECTED_LABELS' }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE_LABEL' }),
    );
  });
});

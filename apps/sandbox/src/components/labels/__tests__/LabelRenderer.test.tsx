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
  window.localStorage.setItem('audacity-preferences', JSON.stringify({ labelTextSize: pt }));
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
  it('classic 9pt: 18px strap (1.5x the 12px text), constant 7x14 ear tabs', () => {
    const { container } = renderLabels([region()]);
    const el = banner(container);
    expect(el.style.height).toBe('18px');
    expect(el.style.fontSize).toBe('');
    const ears = container.querySelectorAll('svg');
    expect(ears).toHaveLength(2);
    expect(ears[0].getAttribute('width')).toBe('7');
    expect(ears[0].getAttribute('height')).toBe('14');
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
    expect(ear.getAttribute('width')).toBe('7');
    expect(ear.getAttribute('height')).toBe('14');
    expect(ear.getAttribute('viewBox')).toBe('0 0 7 14');
  });

  it('an empty label shows an italic placeholder instead of a blank slab', () => {
    const { container } = renderLabels([region({ text: '' })]);
    const text = banner(container).firstElementChild as HTMLElement;
    expect(text.textContent).toBe('Label');
    expect(text.style.fontStyle).toBe('italic');
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

describe('LabelRenderer (rewrite): track color', () => {
  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };

  it('labels render in the label track\'s palette color', () => {
    const { container } = renderLabels([region()], undefined, 'red');
    expect(banner(container).style.backgroundColor).toBe(hexToRgb(colors.red[400]));
    const ear = container.querySelector('svg path')!;
    expect(ear.getAttribute('fill')).toBe(colors.red[500]);
  });

  it('defaults to the classic blue when the track has no color', () => {
    const { container } = renderLabels([region()]);
    expect(banner(container).style.backgroundColor).toBe(hexToRgb(colors.blue[400]));
  });
});

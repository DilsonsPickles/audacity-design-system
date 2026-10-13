import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { TracksProvider, useTracks, type Track } from '../../contexts/TracksContext';
import { usePlayheadClipHotkeys, playheadClipChordOf } from '../usePlayheadClipHotkeys';

afterEach(cleanup);

type Seen = { clips: Array<[number, number, number, number, number, boolean]> };

function Probe({ seen }: { seen: Seen }) {
  usePlayheadClipHotkeys();
  const { state, dispatch } = useTracks();
  seen.clips = state.tracks[0].clips.map((c) => [c.id, c.start, c.duration, c.fadeIn ?? 0, c.fadeOut ?? 0, !!c.selected]);
  React.useEffect(() => {
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 1 });
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
  }, [dispatch]);
  return (
    <div>
      <div data-track-panel-index="0" tabIndex={0} data-testid="header0" />
      <div data-clip-id="11" data-track-index="0" tabIndex={0} data-testid="clip" />
      <input data-testid="field" />
    </div>
  );
}

const seed = (): Track[] => [
  { id: 1, name: 'Track 1', clips: [{ id: 11, name: 'Clip A', start: 0, duration: 4, trimStart: 0, fullDuration: 4 } as Track['clips'][number]] },
];
const press = (el: Element, code: string, key = 'x') => fireEvent.keyDown(el, { code, key, altKey: true });

describe('⌥F / ⌥T / ⌥S / ⌥Enter from a TRACK: the clip under the playhead (2026-10-13)', () => {
  it('is Option + F / T / S / Enter by code, Shift or Cmd not among them', () => {
    const ev = (o: Partial<KeyboardEvent>) => ({ metaKey: false, ctrlKey: false, altKey: true, shiftKey: false, ...o }) as KeyboardEvent;
    expect(playheadClipChordOf(ev({ code: 'KeyF' }))).toBe('fade');
    expect(playheadClipChordOf(ev({ code: 'KeyT' }))).toBe('trim');
    expect(playheadClipChordOf(ev({ code: 'KeyS' }))).toBe('stretch');
    expect(playheadClipChordOf(ev({ code: 'Enter' }))).toBe('select');
    expect(playheadClipChordOf(ev({ code: 'KeyF', shiftKey: true }))).toBeNull();
    expect(playheadClipChordOf(ev({ code: 'KeyT', metaKey: true }))).toBeNull();
    expect(playheadClipChordOf(ev({ code: 'KeyT', altKey: false }))).toBeNull();
  });
  it('⌥F fades, ⌥T trims and ⌥S stretches the clip under the playhead from the focused header; not from a clip, not from a text field', () => {
    const seen: Seen = { clips: [] };
    const { getByTestId } = render(<TracksProvider initialTracks={seed()}><Probe seen={seen} /></TracksProvider>);
    const header = getByTestId('header0');
    act(() => { header.focus(); });
    // The playhead at 1 s, in the first half of 0..4: the fade-in, 1 s
    act(() => { press(header, 'KeyF'); });
    expect(seen.clips[0].slice(1, 5)).toEqual([0, 4, 1, 0]);
    // ⌥T: the nearer edge (the start) to the playhead — the clip now runs 1..4
    act(() => { press(header, 'KeyT'); });
    expect(seen.clips[0].slice(1, 3)).toEqual([1, 3]);
    // ⌥S from the clip's start at 1 with the playhead at 1: nothing to stretch (refused, not clamped)
    act(() => { press(header, 'KeyS'); });
    expect(seen.clips[0].slice(1, 3)).toEqual([1, 3]);
    // From a focused clip the document listener leaves the edits to TrackNew
    act(() => { getByTestId('clip').focus(); });
    act(() => { press(getByTestId('clip'), 'KeyT'); });
    expect(seen.clips[0].slice(1, 3)).toEqual([1, 3]);
    // In a text field the keystroke is a character
    act(() => { getByTestId('field').focus(); });
    act(() => { press(getByTestId('field'), 'KeyT'); });
    expect(seen.clips[0].slice(1, 3)).toEqual([1, 3]);
  });
  it('⌥S stretches the nearer edge to the playhead (the far half: the end comes in)', () => {
    const seen: Seen = { clips: [] };
    const { getByTestId } = render(<TracksProvider initialTracks={seed()}><Probe seen={seen} /></TracksProvider>);
    const header = getByTestId('header0');
    act(() => { header.focus(); });
    // Move the playhead into the second half: 3 s
    act(() => { fireEvent.keyDown(header, { code: 'Enter', key: 'Enter', altKey: true }); });
    // (⌥Enter selected the clip; now stretch — the playhead is at 1 s, first half: the start to 1)
    act(() => { press(header, 'KeyS'); });
    const [, start, duration] = seen.clips[0];
    expect(start).toBeCloseTo(1);
    expect(duration).toBeCloseTo(3);
  });
  it('⌥Enter selects the clip under the playhead and moves the focus to it; with no clip there it does nothing', async () => {
    const seen: Seen = { clips: [] };
    const { getByTestId } = render(<TracksProvider initialTracks={seed()}><Probe seen={seen} /></TracksProvider>);
    const header = getByTestId('header0');
    act(() => { header.focus(); });
    expect(seen.clips[0][5]).toBe(false);
    act(() => { fireEvent.keyDown(header, { code: 'Enter', key: 'Enter', altKey: true }); });
    expect(seen.clips[0][5]).toBe(true);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(getByTestId('clip'));
  });
});

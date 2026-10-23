import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { type Track } from '../../contexts/TracksContext';
import { useTracks } from '../../contexts/useTracks';
import { TracksProvider } from '../../contexts/TracksProvider';
import { usePlayheadClipHotkeys, playheadClipChordOf } from '../usePlayheadClipHotkeys';

afterEach(cleanup);

type Seen = { clips: Array<[number, number, number, number, number, boolean]> };

function Probe({ seen, playhead = 1 }: { seen: Seen; playhead?: number }) {
  usePlayheadClipHotkeys();
  const { state, dispatch } = useTracks();
  seen.clips = state.tracks[0].clips.map((c) => [c.id, c.start, c.duration, c.fadeIn ?? 0, c.fadeOut ?? 0, !!c.selected]);
  React.useEffect(() => {
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: playhead });
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
  }, [dispatch, playhead]);
  return (
    <div>
      <div data-track-panel-index="0" tabIndex={0} data-testid="header0" />
      <div data-clip-id="11" data-track-index="0" tabIndex={0} data-testid="clip" />
      <div data-clip-id="12" data-track-index="0" tabIndex={0} data-testid="clipB" />
      <input data-testid="field" />
    </div>
  );
}

const seed = (): Track[] => [
  { id: 1, name: 'Track 1', clips: [{ id: 11, name: 'Clip A', start: 0, duration: 4, trimStart: 0, fullDuration: 4 } as Track['clips'][number]] },
];
const seedTwo = (): Track[] => [
  { id: 1, name: 'Track 1', clips: [
    { id: 11, name: 'Clip A', start: 0, duration: 4, trimStart: 0, fullDuration: 4 } as Track['clips'][number],
    { id: 12, name: 'Clip B', start: 6, duration: 4, trimStart: 0, fullDuration: 4 } as Track['clips'][number],
  ] },
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
  it('⌥F fades, ⌥T trims and ⌥S stretches the clip under the playhead from the focused header, and the clip takes the focus; not from a clip, not from a text field', async () => {
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
    // …and the edited clip takes the focus — not the selection (2026-10-13)
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(getByTestId('clip'));
    expect(seen.clips[0][5]).toBe(false);
    act(() => { header.focus(); });
    // ⌥S from the clip's start at 1 with the playhead at 1: nothing to stretch (refused, not clamped)
    act(() => { press(header, 'KeyS'); });
    expect(seen.clips[0].slice(1, 3)).toEqual([1, 3]);
    // From a focused clip the chord is the clip under the playhead on ITS
    // track — here the same clip, at 1 s, its start already there
    act(() => { getByTestId('clip').focus(); });
    act(() => { press(getByTestId('clip'), 'KeyT'); });
    expect(seen.clips[0].slice(1, 3)).toEqual([1, 3]);
    // In a text field the keystroke is a character
    act(() => { getByTestId('field').focus(); });
    act(() => { press(getByTestId('field'), 'KeyT'); });
    expect(seen.clips[0].slice(1, 3)).toEqual([1, 3]);
    // Drain the edit's focus-on-next-frame so it cannot leak into the next test
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
  });
  it('⌥S stretches the nearer edge to the playhead (the far half: the end comes in)', async () => {
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
    // Drain the edit's focus-on-next-frame so it cannot leak into the next test
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
  });
  it('⌥Enter selects the clip under the playhead and leaves the focus where it is (2026-10-13); with no clip there it does nothing', async () => {
    const seen: Seen = { clips: [] };
    const { getByTestId } = render(<TracksProvider initialTracks={seed()}><Probe seen={seen} /></TracksProvider>);
    const header = getByTestId('header0');
    act(() => { header.focus(); });
    expect(seen.clips[0][5]).toBe(false);
    act(() => { fireEvent.keyDown(header, { code: 'Enter', key: 'Enter', altKey: true }); });
    expect(seen.clips[0][5]).toBe(true);
    expect(document.activeElement?.getAttribute('data-testid')).toBe('header0'); // sync
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement?.getAttribute('data-testid')).toBe('header0'); // after a frame
  });
});

describe('the chord takes the clip UNDER THE PLAYHEAD, whichever clip is focused (2026-10-13)', () => {
  it('⌥F with clip A focused AND SELECTED and the playhead over clip B fades B, drops the selection (B is not selected either) and moves the focus to B; A is otherwise untouched', async () => {
    const seen: Seen = { clips: [] };
    const tracks = seedTwo();
    tracks[0].clips[0].selected = true;
    const { getByTestId } = render(<TracksProvider initialTracks={tracks}><Probe seen={seen} playhead={7} /></TracksProvider>);
    act(() => { getByTestId('clip').focus(); });
    expect(seen.clips.find((c) => c[0] === 11)?.[5]).toBe(true);
    act(() => { press(getByTestId('clip'), 'KeyF'); });
    // Clip B (6..10), playhead at 7: its first half → a 1 s fade-in on B; nothing selected after
    expect(seen.clips.find((c) => c[0] === 12)?.slice(3, 6)).toEqual([1, 0, false]);
    expect(seen.clips.find((c) => c[0] === 11)?.slice(3, 6)).toEqual([0, 0, false]);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(getByTestId('clipB'));
  });
});

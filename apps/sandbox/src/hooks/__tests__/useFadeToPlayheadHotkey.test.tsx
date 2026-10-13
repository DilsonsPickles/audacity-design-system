import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { TracksProvider, useTracks, type Track } from '../../contexts/TracksContext';
import { useFadeToPlayheadHotkey, isFadeToPlayheadHotkey } from '../useFadeToPlayheadHotkey';

afterEach(cleanup);

function Probe({ seen }: { seen: { fades: unknown } }) {
  useFadeToPlayheadHotkey();
  const { state, dispatch } = useTracks();
  seen.fades = state.tracks.map((t) => t.clips.map((c) => [c.id, c.fadeIn ?? 0, c.fadeOut ?? 0]));
  React.useEffect(() => {
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 1 });
    dispatch({ type: 'SET_FOCUSED_TRACK', payload: 0 });
  }, [dispatch]);
  return (
    <div>
      <div data-track-panel-index="0" tabIndex={0} data-testid="header0" />
      <div data-clip-id={state.tracks[0]?.clips[0]?.id} data-track-index="0" tabIndex={0} data-testid="clip" />
      <button data-testid="elsewhere">elsewhere</button>
      <input data-testid="field" />
    </div>
  );
}

const seed: Track[] = [
  { id: 1, name: 'Track 1', clips: [{ id: 11, name: 'Clip', start: 0, duration: 4 } as Track['clips'][number]] },
];

const press = (el: Element | Document = document) => fireEvent.keyDown(el, { code: 'KeyF', key: 'ƒ', altKey: true });

describe('⌥F from a TRACK fades the clip under the playhead (2026-10-13)', () => {
  it('is ⌥F by key code, not ⌥⇧F', () => {
    const ev = (o: Partial<KeyboardEvent>) => ({ metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, code: 'KeyF', ...o }) as KeyboardEvent;
    expect(isFadeToPlayheadHotkey(ev({ altKey: true }))).toBe(true);
    expect(isFadeToPlayheadHotkey(ev({ altKey: true, shiftKey: true }))).toBe(false);
    expect(isFadeToPlayheadHotkey(ev({}))).toBe(false);
    expect(isFadeToPlayheadHotkey(ev({ altKey: true, code: 'KeyT' }))).toBe(false);
  });
  it('from a focused header, or the focused track with nothing focused, the clip under the playhead gets the fade; not from a clip (TrackNew\'s), not from a text field', () => {
    const seen = { fades: null as unknown };
    const { getByTestId } = render(<TracksProvider initialTracks={seed}><Probe seen={seen} /></TracksProvider>);
    const before = JSON.stringify(seen.fades);
    expect(before).toBe(JSON.stringify([[[11, 0, 0]]]));
    // Focus on the header: a fade-in to the playhead (1 s into a clip that starts at 0)
    act(() => { getByTestId('header0').focus(); });
    act(() => { press(getByTestId('header0')); });
    // The playhead at 1 s is in the clip's first half: a 1 s fade-in
    expect(JSON.stringify(seen.fades)).toBe(JSON.stringify([[[11, 1, 0]]]));
    // From a clip the document listener leaves it to TrackNew
    const snapshot = JSON.stringify(seen.fades);
    act(() => { getByTestId('clip').focus(); });
    act(() => { press(getByTestId('clip')); });
    expect(JSON.stringify(seen.fades)).toBe(snapshot);
    // In a text field the keystroke is a character
    act(() => { getByTestId('field').focus(); });
    act(() => { press(getByTestId('field')); });
    expect(JSON.stringify(seen.fades)).toBe(snapshot);
  });
});

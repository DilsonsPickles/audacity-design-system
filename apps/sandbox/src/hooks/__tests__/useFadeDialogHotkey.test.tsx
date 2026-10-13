import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { ContextMenuProvider, useContextMenus } from '../../contexts/ContextMenuContext';
import { useFadeDialogHotkey, isFadeDialogHotkey } from '../useFadeDialogHotkey';

afterEach(cleanup);

function Probe({ seen }: { seen: { dialog: unknown } }) {
  useFadeDialogHotkey();
  const { fadeDialog } = useContextMenus();
  seen.dialog = fadeDialog;
  return (
    <div>
      <div data-clip-id="7" data-track-index="1" tabIndex={0} data-testid="clip">
        <input data-testid="rename" />
      </div>
      <div data-fade-clip="7" data-track-index="1" data-fade-handle="out" tabIndex={-1} data-testid="handle" />
      <button data-testid="elsewhere">elsewhere</button>
    </div>
  );
}

const press = (el: Element | Document = document) => fireEvent.keyDown(el, { code: 'KeyF', key: 'ƒ', altKey: true });

describe('⌥F opens the fades dialog on the focused clip (2026-10-13)', () => {
  it('is the chord ⌥F by key code — not F, ⇧F, ⌘F or ⌥⌘F', () => {
    const ev = (o: Partial<KeyboardEvent>) => ({ metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, code: 'KeyF', ...o }) as KeyboardEvent;
    expect(isFadeDialogHotkey(ev({ altKey: true }))).toBe(true);
    expect(isFadeDialogHotkey(ev({ altKey: true, key: 'ƒ' }))).toBe(true);
    expect(isFadeDialogHotkey(ev({}))).toBe(false);
    expect(isFadeDialogHotkey(ev({ shiftKey: true }))).toBe(false);
    expect(isFadeDialogHotkey(ev({ metaKey: true }))).toBe(false);
    expect(isFadeDialogHotkey(ev({ metaKey: true, altKey: true }))).toBe(false);
    expect(isFadeDialogHotkey(ev({ altKey: true, code: 'KeyT' }))).toBe(false);
  });

  it('from the focused clip it opens on the fade-in; from a focused fade-out handle, on the fade-out', () => {
    const seen = { dialog: null as unknown };
    const { getByTestId } = render(<ContextMenuProvider><Probe seen={seen} /></ContextMenuProvider>);
    const clip = getByTestId('clip');
    act(() => { clip.focus(); });
    act(() => { press(clip); });
    expect(seen.dialog).toEqual({ trackIndex: 1, clipId: 7, focusSide: 'in' });
    const handle = getByTestId('handle');
    act(() => { handle.focus(); });
    act(() => { press(handle); });
    expect(seen.dialog).toEqual({ trackIndex: 1, clipId: 7, focusSide: 'out' });
  });

  it('does nothing with no clip focused, or from a text field inside the clip (the keystroke is its character there)', () => {
    const seen = { dialog: null as unknown };
    const { getByTestId } = render(<ContextMenuProvider><Probe seen={seen} /></ContextMenuProvider>);
    act(() => { getByTestId('elsewhere').focus(); });
    act(() => { press(getByTestId('elsewhere')); });
    expect(seen.dialog).toBeNull();
    act(() => { getByTestId('rename').focus(); });
    act(() => { press(getByTestId('rename')); });
    expect(seen.dialog).toBeNull();
  });
});

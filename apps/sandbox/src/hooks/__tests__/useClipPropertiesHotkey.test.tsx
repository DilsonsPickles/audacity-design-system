import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { ClipPropertiesProvider, useClipProperties } from '../../contexts/ClipPropertiesContext';
import { useClipPropertiesHotkey, isClipPropertiesHotkey } from '../useClipPropertiesHotkey';

afterEach(cleanup);

function Probe({ seen }: { seen: { open: boolean; target: unknown } }) {
  useClipPropertiesHotkey();
  const { isClipPropertiesOpen, clipPropertiesTarget } = useClipProperties();
  seen.open = isClipPropertiesOpen;
  seen.target = clipPropertiesTarget;
  return (
    <div>
      <div data-clip-id="7" data-track-index="1" tabIndex={0} data-testid="clip" />
      {isClipPropertiesOpen && (
        <section data-clip-properties-panel>
          <input data-testid="field" />
        </section>
      )}
    </div>
  );
}

const press = (el: Element | Document = document) => fireEvent.keyDown(el, { code: 'KeyI', key: 'ˆ', metaKey: true, altKey: true });

describe('⌥⌘I toggles the Clip properties panel (2026-10-07)', () => {
  it('is the chord ⌥⌘I by key code, not ⌘I or ⌘⇧I', () => {
    const ev = (o: Partial<KeyboardEvent>) => ({ metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, code: 'KeyI', ...o }) as KeyboardEvent;
    expect(isClipPropertiesHotkey(ev({ metaKey: true, altKey: true }))).toBe(true);
    expect(isClipPropertiesHotkey(ev({ ctrlKey: true, altKey: true }))).toBe(true);
    expect(isClipPropertiesHotkey(ev({ metaKey: true }))).toBe(false);
    expect(isClipPropertiesHotkey(ev({ metaKey: true, shiftKey: true }))).toBe(false);
    expect(isClipPropertiesHotkey(ev({ metaKey: true, altKey: true, code: 'KeyK' }))).toBe(false);
  });

  it('closed: opens on the focused clip and moves focus into the panel; open: closes and hands focus back to the clip', async () => {
    const seen = { open: false, target: null as unknown };
    const { getByTestId } = render(<ClipPropertiesProvider><Probe seen={seen} /></ClipPropertiesProvider>);
    const clip = getByTestId('clip');
    act(() => { clip.focus(); });
    act(() => { press(clip); });
    expect(seen.open).toBe(true);
    expect(seen.target).toEqual({ trackIndex: 1, clipId: 7 });
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))); });
    expect(document.activeElement).toBe(getByTestId('field'));
    // From inside the panel's own field, the same chord closes it
    act(() => { press(getByTestId('field')); });
    expect(seen.open).toBe(false);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement).toBe(clip);
  });

  it('with no clip focused and nothing shown before, it just opens', () => {
    const seen = { open: false, target: null as unknown };
    render(<ClipPropertiesProvider><Probe seen={seen} /></ClipPropertiesProvider>);
    act(() => { press(); });
    expect(seen.open).toBe(true);
    expect(seen.target).toBeNull();
  });
});

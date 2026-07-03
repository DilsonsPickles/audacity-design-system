import { describe, it, expect, vi } from 'vitest';
import { handleEffectsKey } from '../effectsPanelHandlers';
import { initialState } from '../../../contexts/TracksContext';

const keyEvent = (over = {}) =>
  ({ key: 'e', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault: () => {}, target: document.body, ...over } as unknown as KeyboardEvent);

const transportDeps = (setEffectsPanel: any) => ({
  state: initialState,
  handlePlay: () => {}, handleRecord: () => {}, handleStopRecording: () => {},
  setEffectsPanel, toggleLoopRegion: () => {},
});

describe('handleEffectsKey', () => {
  it('opening: captures focus origin and calls setEffectsPanel to open', () => {
    const setEffectsPanel = vi.fn();
    const ref = { current: null as HTMLElement | null };
    handleEffectsKey(keyEvent(), {
      effectsPanel: null, setEffectsPanel, effectsPanelFocusOriginRef: ref,
      transportDeps: transportDeps(setEffectsPanel),
    });
    // handleEffectsToggle(prev=null) opens the panel via the functional updater
    expect(setEffectsPanel).toHaveBeenCalled();
    const updater = setEffectsPanel.mock.calls.at(-1)![0];
    expect(updater(null)).toMatchObject({ isOpen: true });
  });

  it('does nothing in a text input', () => {
    const setEffectsPanel = vi.fn();
    const ref = { current: null as HTMLElement | null };
    handleEffectsKey(keyEvent({ target: { tagName: 'INPUT', getAttribute: () => null } }), {
      effectsPanel: null, setEffectsPanel, effectsPanelFocusOriginRef: ref,
      transportDeps: transportDeps(setEffectsPanel),
    });
    expect(setEffectsPanel).not.toHaveBeenCalled();
  });

  it('closing: calls setEffectsPanel(null)', () => {
    const setEffectsPanel = vi.fn();
    const ref = { current: null as HTMLElement | null };
    handleEffectsKey(keyEvent(), {
      effectsPanel: { isOpen: true, trackIndex: 0, left: 0, top: 0, height: 600, width: 240 } as any,
      setEffectsPanel, effectsPanelFocusOriginRef: ref,
      transportDeps: transportDeps(setEffectsPanel),
    });
    expect(setEffectsPanel).toHaveBeenCalledWith(null);
  });
});

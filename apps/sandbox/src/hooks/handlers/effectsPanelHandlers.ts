import type { EffectsPanelState } from '../useContextMenuState';
import { handleEffectsToggle, type TransportHandlerDeps } from './transportHandlers';

export interface EffectsPanelHandlerDeps {
  effectsPanel: EffectsPanelState | null;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  effectsPanelFocusOriginRef: React.MutableRefObject<HTMLElement | null>;
  transportDeps: TransportHandlerDeps;
}

export function handleEffectsKey(e: KeyboardEvent, deps: EffectsPanelHandlerDeps): void {
  const target = e.target as HTMLElement;
  const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
    target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true';
  if (isTextInput) return;
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
  e.preventDefault();

  if (deps.effectsPanel?.isOpen) {
    const origin = deps.effectsPanelFocusOriginRef.current;
    deps.effectsPanelFocusOriginRef.current = null;
    const fallbackTrackIndex = deps.effectsPanel.trackIndex;
    deps.setEffectsPanel(null);
    setTimeout(() => {
      // Guard against the element being detached (e.g. clip was
      // deleted while the panel was open). Fall back to the
      // track wrapper of the panel's owning track.
      if (origin && document.contains(origin)) {
        origin.focus();
        return;
      }
      const trackEl = document.querySelector<HTMLElement>(
        `.track-wrapper[data-track-index="${fallbackTrackIndex}"] .track`,
      );
      if (trackEl) {
        trackEl.setAttribute('data-focus-from-nav', '1');
        trackEl.focus();
      }
    }, 0);
    return;
  }

  // Capture whatever the user is focused on RIGHT NOW, before
  // the panel takes focus — that's what we restore when E
  // closes it.
  deps.effectsPanelFocusOriginRef.current =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  handleEffectsToggle(deps.transportDeps);
  return;
}

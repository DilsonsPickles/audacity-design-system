/**
 * The clip with DOM focus (2026-10-06, "can it be the focused clip?" —
 * the Clip properties panel follows it). Clip focus lives in the DOM
 * alone: the focused clip wrapper carries `data-clip-id` and
 * `data-track-index` (the split and duplicate handlers read the same),
 * so this listens for focus landing on, or leaving, such a wrapper.
 * Null while no clip has focus — the panel then keeps the last one.
 */
import React from 'react';

export interface FocusedClip {
  trackIndex: number;
  clipId: number;
}

export function clipOfElement(el: Element | null): FocusedClip | null {
  const wrapper = el?.closest<HTMLElement>('[data-clip-id][data-track-index]') ?? null;
  if (!wrapper) return null;
  const clipId = Number(wrapper.dataset.clipId);
  const trackIndex = Number(wrapper.dataset.trackIndex);
  return Number.isFinite(clipId) && Number.isFinite(trackIndex) ? { trackIndex, clipId } : null;
}

export function useFocusedClip(): FocusedClip | null {
  const [focused, setFocused] = React.useState<FocusedClip | null>(() => clipOfElement(typeof document === 'undefined' ? null : document.activeElement));
  React.useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const next = clipOfElement(e.target instanceof Element ? e.target : null);
      setFocused((prev) => (prev && next && prev.trackIndex === next.trackIndex && prev.clipId === next.clipId ? prev : next));
    };
    const onFocusOut = (e: FocusEvent) => {
      // Focus moving within the same clip (to one of its own controls)
      // is not a leave; moving anywhere else is
      const to = e.relatedTarget instanceof Element ? clipOfElement(e.relatedTarget) : null;
      if (!to) setFocused(null);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  return focused;
}

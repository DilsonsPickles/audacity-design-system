/**
 * Smoothly scrolls an element into view only if it's partially or fully
 * outside its scroll container. Does nothing when the element is already
 * fully visible (within a small tolerance for sub-pixel rounding).
 *
 * @param element      The element to scroll into view
 * @param container    The scrollable ancestor. When omitted the function
 *                     walks up to the nearest `.canvas-scroll-container`.
 * @param tolerance    Pixel tolerance for the "fully visible" check (default 2)
 */
export function scrollIntoViewIfNeeded(
  element: HTMLElement,
  container?: HTMLElement | null,
  tolerance = 2,
): void {
  const scrollParent =
    container ?? (element.closest('.canvas-scroll-container') as HTMLElement);
  if (!scrollParent) return;

  const elRect = element.getBoundingClientRect();
  const cRect = scrollParent.getBoundingClientRect();

  const fullyVisible =
    elRect.left >= cRect.left - tolerance &&
    elRect.right <= cRect.right + tolerance &&
    elRect.top >= cRect.top - tolerance &&
    elRect.bottom <= cRect.bottom + tolerance;

  if (!fullyVisible) {
    // `inline: 'nearest'` rather than 'center' — centring the focused
    // clip horizontally forces a large scroll for every Tab arrival,
    // and VoiceOver computes its focus-frame at the moment focus
    // moves, before the smooth scroll catches up. That leaves the
    // frame misaligned from the visible clip. 'nearest' scrolls only
    // enough to bring the clip onto the edge of the viewport, so the
    // frame ends up close to where the clip actually paints.
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

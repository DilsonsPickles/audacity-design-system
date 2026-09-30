// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React, { useRef } from 'react';
import { useGrabToPan } from '../useGrabToPan';

afterEach(cleanup);

function Harness({ onPanning }: { onPanning: (v: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { isPanning } = useGrabToPan({ scrollContainerRef: ref });
  React.useEffect(() => { onPanning(isPanning); });
  return (
    <div ref={ref} data-testid="scroller" style={{ overflow: 'auto', width: 100, height: 100 }}>
      <div style={{ width: 1000, height: 1000 }} />
    </div>
  );
}

function setUp() {
  let panning = false;
  const { container } = render(<Harness onPanning={(v) => { panning = v; }} />);
  const el = container.querySelector('[data-testid="scroller"]') as HTMLElement;
  el.scrollLeft = 200;
  el.scrollTop = 100;
  return { el, isPanning: () => panning };
}

describe('grab-to-pan is the MIDDLE button (2026-09-30)', () => {
  it('a middle-button drag scrolls the container, both axes, and shows the closed hand', () => {
    const { el, isPanning } = setUp();
    act(() => { fireEvent.mouseDown(el, { button: 1, clientX: 50, clientY: 50 }); });
    expect(isPanning()).toBe(true);
    expect(document.documentElement.classList.contains('pan-active')).toBe(true);
    act(() => { fireEvent.mouseMove(document, { clientX: 20, clientY: 80 }); });
    expect(el.scrollLeft).toBe(230); // dragged 30px left → content moves left → scrolled further right
    expect(el.scrollTop).toBe(70);   // dragged 30px down → scrolled up
    act(() => { fireEvent.mouseUp(document, { button: 1 }); });
    expect(isPanning()).toBe(false);
    expect(document.documentElement.classList.contains('pan-active')).toBe(false);
  });

  it('the left button, with or without Cmd, does not pan — Cmd+drag is the marquee now', () => {
    const { el, isPanning } = setUp();
    for (const mods of [{}, { metaKey: true }, { ctrlKey: true }]) {
      act(() => { fireEvent.mouseDown(el, { button: 0, clientX: 50, clientY: 50, ...mods }); });
      expect(isPanning()).toBe(false);
      act(() => { fireEvent.mouseMove(document, { clientX: 20, clientY: 80, ...mods }); });
      expect([el.scrollLeft, el.scrollTop]).toEqual([200, 100]);
      act(() => { fireEvent.mouseUp(document, { button: 0, ...mods }); });
    }
    // …and holding Cmd on its own no longer changes the cursor
    fireEvent.keyDown(document, { key: 'Meta' });
    expect(document.documentElement.classList.contains('pan-modifier-held')).toBe(false);
  });

  it('a middle press is not let through to anything underneath', () => {
    const { el } = setUp();
    let reachedBubble = false;
    el.addEventListener('mousedown', () => { reachedBubble = true; });
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 1, clientX: 50, clientY: 50 });
    act(() => { el.dispatchEvent(ev); });
    expect(reachedBubble).toBe(false);
    expect(ev.defaultPrevented).toBe(true);
    act(() => { fireEvent.mouseUp(document, { button: 1 }); });
  });
});

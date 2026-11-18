import { describe, it, expect, afterEach, vi } from 'vitest';
import { openFloatingWindow } from '../floatingWindow';

afterEach(() => vi.restoreAllMocks());

/** Open a 189 × 319 window at a viewport spot and return the features it asked for */
function featuresFor(viewportX: number, viewportY: number): string {
  const popup = document.implementation.createHTMLDocument('');
  const open = vi.spyOn(window, 'open').mockReturnValue({ document: popup } as unknown as Window);
  vi.spyOn(window, 'screenX', 'get').mockReturnValue(35);
  vi.spyOn(window, 'screenY', 'get').mockReturnValue(33);
  vi.spyOn(window, 'outerHeight', 'get').mockReturnValue(949);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(949);
  vi.spyOn(window.screen, 'availWidth', 'get').mockReturnValue(1512);
  vi.spyOn(window.screen, 'availHeight', 'get').mockReturnValue(982);
  openFloatingWindow(document.body, 'menu', viewportX, viewportY, 189, 319);
  return String(open.mock.calls[open.mock.calls.length - 1][2]);
}

describe('openFloatingWindow — KEPT ON THE SCREEN (2026-11-18, "I can\'t right click in the empty group space")', () => {
  it('a window that would run past the screen\'s right or bottom edge is shifted back onto it', () => {
    // the pointer at x 1452 in a window at screen x 35: the menu's true place is 1487, 164px off a 1512 screen
    expect(featuresFor(1452, 120)).toContain('left=1323');
    // near the bottom: held so its foot is on the screen
    expect(featuresFor(100, 900)).toContain('top=663');
  });

  it('a window with room opens where it was asked', () => {
    const f = featuresFor(100, 100);
    expect(f).toContain('left=135');
    expect(f).toContain('top=133');
  });
});

describe('openFloatingWindow — THE WINDOW GOES WITH ITS PAGE (2026-11-18, "that add tools menu can\'t be dismissed")', () => {
  it('the opener\'s pagehide (a reload) closes the window', () => {
    const popupDoc = document.implementation.createHTMLDocument('');
    const close = vi.fn();
    const popup = { document: popupDoc, closed: false, close } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(popup);
    openFloatingWindow(document.body, 'menu', 10, 10, 100, 100);
    expect(close).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('pagehide'));
    expect(close).toHaveBeenCalledTimes(1);
  });
});

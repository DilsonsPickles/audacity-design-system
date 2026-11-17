import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import React from 'react';
import { Dropdown } from '../Dropdown';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

// THE LIST STAYS INSIDE THE WINDOW (2026-11-17, the popout Plot spectrum
// window's Size list ran past the window's bottom edge): with no room
// below the trigger the list flips ABOVE it; with room, it opens below.

const OPTIONS = ['128', '256', '512'].map((v) => ({ value: v, label: v }));

/** jsdom lays nothing out: the menu is 150px tall, the window 600 */
function mockLayout(triggerTop: number) {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 150 });
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    top: triggerTop, bottom: triggerTop + 28, left: 50, right: 170, width: 120, height: 28, x: 50, y: triggerTop, toJSON: () => ({}),
  }));
  vi.stubGlobal('innerHeight', 600);
  vi.stubGlobal('innerWidth', 1000);
}
afterEach(() => vi.unstubAllGlobals());

function openDropdown() {
  const utils = render(
    <ThemeProvider>
      <Dropdown value="128" options={OPTIONS} onChange={() => {}} />
    </ThemeProvider>,
  );
  fireEvent.click(utils.container.querySelector('.dropdown__trigger') as HTMLElement);
  return document.querySelector('.dropdown__menu') as HTMLElement;
}

beforeEach(() => vi.restoreAllMocks());

describe('Dropdown list stays inside the window', () => {
  it('opens below the trigger when there is room', () => {
    mockLayout(100);
    const menu = openDropdown();
    // below, touching: the trigger's bottom, 128
    expect(menu.style.top).toBe('128px');
  });

  it('flips above the trigger when the room below runs out', () => {
    mockLayout(560); // bottom 588 + 150 runs past 600 − 10
    const menu = openDropdown();
    // above, touching: trigger top 560 − 150
    expect(menu.style.top).toBe('410px');
  });
});

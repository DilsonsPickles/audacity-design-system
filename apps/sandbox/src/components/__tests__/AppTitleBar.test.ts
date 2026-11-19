import { describe, it, expect } from 'vitest';
import { titleBarSlack, TITLE_BAR_DRAG_RESERVE_PX } from '../AppTitleBar';

describe('the title bar keeps room to move the window (2026-11-19, "When the screen is smaller, we need to make sure that there\'s some space in the top bar reserved for moving the application window")', () => {
  it('the reserve is a real strip, wide enough to grab', () => {
    expect(TITLE_BAR_DRAG_RESERVE_PX).toBeGreaterThanOrEqual(64);
  });

  it('the room left counts the drag reserve, so the labels go before the reserve is eaten', () => {
    // 1000 wide: 76 inset, tabs at their least 400, corner 400 → 124 spare,
    // less the reserve
    expect(titleBarSlack({ clientWidth: 1000, inset: 76, tabsLeast: 400, cornerWidth: 400 })).toBe(124 - TITLE_BAR_DRAG_RESERVE_PX);
  });

  it('negative once the bar cannot hold the tabs, the corner and the reserve', () => {
    expect(titleBarSlack({ clientWidth: 900, inset: 76, tabsLeast: 400, cornerWidth: 400 })).toBeLessThan(0);
  });
});

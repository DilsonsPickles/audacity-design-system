import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { lightTheme } from '@audacity-ui/tokens';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { TrackControlSidePanel } from '../TrackControlSidePanel';
import { TrackControlPanel } from '../../TrackControlPanel';

afterEach(cleanup);

describe('side panel blank-area right-click (2026-10-22, the design brief\'s all-tracks menu placement)', () => {
  it('a right-click on the list\'s blank area reports its point; on a row it is the row\'s own menu, not the panel\'s', () => {
    const onPanelContextMenu = vi.fn();
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <TrackControlSidePanel trackHeights={[114, 114]} onPanelContextMenu={onPanelContextMenu}>
            <TrackControlPanel trackName="Track 1" trackIndex={0} />
            <TrackControlPanel trackName="Track 2" trackIndex={1} />
          </TrackControlSidePanel>
        </AccessibilityProfileProvider>
      </ThemeProvider>,
    );
    const list = container.querySelector('.track-control-side-panel__list')!;
    const blank = fireEvent.contextMenu(list, { clientX: 40, clientY: 300 });
    expect(blank).toBe(false); // default prevented: no browser menu
    expect(onPanelContextMenu).toHaveBeenCalledWith(40, 300);

    const row = container.querySelector('.track-control-side-panel__track')!;
    fireEvent.contextMenu(row, { clientX: 40, clientY: 30 });
    expect(onPanelContextMenu).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { TrackContextMenu } from '../TrackContextMenu';

afterEach(cleanup);

describe('track menu — this track\'s height (2026-10-22, the design brief\'s local control)', () => {
  it('offers a Track height parent holding Collapse / Expand / Fit to height, each closing the menu; without handlers it is absent', () => {
    const onCollapseTrack = vi.fn();
    const onExpandTrack = vi.fn();
    const onFitTrackToHeight = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <TrackContextMenu isOpen x={0} y={0} onClose={onClose} onCollapseTrack={onCollapseTrack} onExpandTrack={onExpandTrack} onFitTrackToHeight={onFitTrackToHeight} />
      </ThemeProvider>,
    );
    const items = () => [...container.querySelectorAll('[data-track-height-items] [role="menuitem"]')];
    const byLabel = (label: string) => items().find((i) => i.textContent?.trim().startsWith(label))!;
    expect(items().map((i) => i.textContent?.trim().replace(/▸$/, ''))).toEqual(['Track height']);
    fireEvent.click(byLabel('Track height')); // a click on the parent opens it
    expect(items().slice(1).map((i) => i.querySelector('.context-menu-item-label')?.textContent)).toEqual(['Collapse', 'Expand', 'Fit to height']);
    // Each wears the chord that does the same to the track you are on
    expect(items().slice(1).map((i) => i.querySelector('.context-menu-item-shortcut')?.textContent)).toEqual(['⌥⌘C', '⌥⌘X', '⌥⌘0']);
    fireEvent.click(byLabel('Collapse'));
    expect(onCollapseTrack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(byLabel('Track height'));
    fireEvent.click(byLabel('Fit to height'));
    expect(onFitTrackToHeight).toHaveBeenCalledTimes(1);
    cleanup();

    const bare = render(
      <ThemeProvider>
        <TrackContextMenu isOpen x={0} y={0} onClose={() => {}} />
      </ThemeProvider>,
    );
    expect(bare.container.querySelector('[data-track-height-items]')).toBeNull();
  });
});

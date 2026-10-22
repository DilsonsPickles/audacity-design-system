import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { TrackContextMenu } from '../TrackContextMenu';

afterEach(cleanup);

describe('track menu — this track\'s height (2026-10-22, the design brief\'s local control)', () => {
  it('offers Collapse / Expand / Fit for ONE track, each closing the menu; without handlers the items are absent', () => {
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
    expect(items().map((i) => i.textContent?.trim())).toEqual(['Collapse track', 'Expand track', 'Fit track to height']);
    fireEvent.click(items()[0]);
    expect(onCollapseTrack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(items()[2]);
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

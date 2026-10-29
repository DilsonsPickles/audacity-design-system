import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
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

    // The header strip ("Tracks" + Add new) is the panel's too — the part a fit leaves
    const header = container.querySelector('.track-control-side-panel__header')!;
    expect(fireEvent.contextMenu(header, { clientX: 20, clientY: 10 })).toBe(false);
    expect(onPanelContextMenu).toHaveBeenLastCalledWith(20, 10);
    const addButton = header.querySelector('button')!;
    fireEvent.contextMenu(addButton, { clientX: 150, clientY: 10 });
    expect(onPanelContextMenu).toHaveBeenLastCalledWith(150, 10);
  });
});

describe('the track menu is the real build\'s (2026-10-29, trackcontextmenumodel.cpp)', () => {
  const renderMenu = (props: Partial<React.ComponentProps<typeof TrackControlSidePanel>> = {}) => {
    const onRename = vi.fn();
    const utils = render(
      <ThemeProvider theme={lightTheme}>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <TrackControlSidePanel trackHeights={[114, 114]} onDeleteTrack={vi.fn()} onDuplicateTrack={vi.fn()} {...props}>
            <TrackControlPanel trackName="Track 1" trackIndex={0} trackType="mono" onRename={onRename} />
            <TrackControlPanel trackName="Track 2" trackIndex={1} trackType="mono" onRename={onRename} />
          </TrackControlSidePanel>
        </AccessibilityProfileProvider>
      </ThemeProvider>,
    );
    fireEvent.contextMenu(utils.container.querySelectorAll('.track-control-side-panel__track')[0], { clientX: 40, clientY: 30 });
    const menu = () => utils.container.querySelector('.context-menu') as HTMLElement;
    /** The menu's own items (not a submenu's), by label */
    const top = () => [...menu().querySelectorAll(':scope > .context-menu-item, :scope > * > .context-menu-item')]
      .map((i) => i.querySelector('.context-menu-item-label')!.textContent);
    const item = (label: string) => [...menu().querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((i) => i.querySelector('.context-menu-item-label')?.textContent === label)!;
    return { ...utils, menu, top, item, onRename };
  };

  it('a mono audio track lists the design\'s items in its order — ours (Track height) beside the colour', () => {
    const { top } = renderMenu({ onFitTrackToHeight: vi.fn() });
    expect(top()).toEqual([
      'Rename', 'Duplicate', 'Delete',
      'Move track', 'Track visualization', 'Track color', 'Track height', 'Show vertical rulers', 'Meters & monitoring',
      'Make stereo track',
      'Format: 32-bit Float', 'Rate: 44100 Hz', 'Resample track…',
    ]);
  });

  it('an item the host does not wire is dimmed; Move track holds up, down, top and bottom', () => {
    const onMoveTrackToBottom = vi.fn();
    const { item } = renderMenu({ onMoveTrackUp: vi.fn(), onMoveTrackDown: vi.fn(), onMoveTrackToTop: vi.fn(), onMoveTrackToBottom });
    for (const label of ['Make stereo track', 'Resample track…', 'Show vertical rulers']) {
      expect(item(label).getAttribute('aria-disabled')).toBe('true');
    }
    fireEvent.click(item('Move track'));
    expect(item('Move track up').getAttribute('aria-disabled')).toBe('true'); // the first track
    fireEvent.click(item('Move track to bottom'));
    expect(onMoveTrackToBottom).toHaveBeenCalledWith(0);
  });

  it('Rename starts the row\'s own name editor', () => {
    const { item, container } = renderMenu();
    act(() => { fireEvent.click(item('Rename')); });
    expect(container.querySelector('.track-control-side-panel__track input')).toBeTruthy();
  });

  it('a checkable item keeps its checkmark slot when unchecked, so the list can line its labels up', () => {
    const { item } = renderMenu({ showVerticalRulers: false, onToggleVerticalRulers: vi.fn() });
    const rulers = item('Show vertical rulers');
    expect(rulers.querySelector('.context-menu-item-checkmark')).toBeTruthy();
    expect(rulers.querySelector('.context-menu-item-checkmark svg, .context-menu-item-checkmark span')).toBeNull();
  });
});

import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { computeGroupLayout, GROUP_END_PAD } from '@audacity-ui/core';
import { lightTheme } from '@audacity-ui/tokens';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { TrackControlSidePanel, type TrackControlSidePanelProps } from '../TrackControlSidePanel';
import { TrackControlPanel } from '../../TrackControlPanel';

afterEach(cleanup);

interface Row {
  id: number;
  name: string;
  type?: 'folder';
  folderId?: number;
  collapsed?: boolean;
}

const DEFAULT_HEIGHT = 114;

/**
 *  0  Outside
 *  1  A
 *  2    In A
 *  3    B
 *  4      In B
 *  5      Last of B        closes B only
 *  6    Last of A          closes A
 *  7  After
 */
const nest = (overrides: Record<number, Partial<Row>> = {}): Row[] =>
  ([
    { id: 1, name: 'Outside' },
    { id: 10, name: 'A', type: 'folder' },
    { id: 2, name: 'In A', folderId: 10 },
    { id: 20, name: 'B', type: 'folder', folderId: 10 },
    { id: 3, name: 'In B', folderId: 20 },
    { id: 4, name: 'Last of B', folderId: 20 },
    { id: 5, name: 'Last of A', folderId: 10 },
    { id: 6, name: 'After' },
  ] as Row[]).map((r) => ({ ...r, ...overrides[r.id] }));

/** A and B end on the SAME row. */
const stacked = (): Row[] => [
  { id: 10, name: 'A', type: 'folder' },
  { id: 20, name: 'B', type: 'folder', folderId: 10 },
  { id: 1, name: 'Last of both', folderId: 20 },
  { id: 2, name: 'After' },
];

function renderRows(rows: Row[], extra: Partial<TrackControlSidePanelProps> = {}) {
  const layout = computeGroupLayout(rows, DEFAULT_HEIGHT);
  const utils = render(
    <ThemeProvider theme={lightTheme}>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        <TrackControlSidePanel
          trackHeights={layout.map((r) => r.height)}
          groupLayout={layout}
          {...extra}
        >
          {rows.map((r, i) => (
            <TrackControlPanel
              key={r.id}
              trackName={r.name}
              trackIndex={i}
              trackType={r.type}
              isCollapsed={r.collapsed}
              groupPosition={r.type === 'folder' ? 'header' : undefined}
            />
          ))}
        </TrackControlSidePanel>
      </AccessibilityProfileProvider>
    </ThemeProvider>,
  );
  const wrapperOf = (index: number) =>
    utils.container
      .querySelector(`[data-track-panel-index="${index}"]`)
      ?.closest('.track-control-side-panel__track') as HTMLElement | null;
  const levelsOf = (index: number) =>
    [...(wrapperOf(index)?.querySelectorAll<HTMLElement>('[data-group-level]') ?? [])].map((box) => ({
      level: Number(box.dataset.groupLevel),
      left: box.style.left,
      bottom: box.style.bottom,
      topLeft: box.style.borderTopLeftRadius,
      bottomLeft: box.style.borderBottomLeftRadius,
      background: box.style.background || box.style.backgroundColor,
    }));
  const gutter = () =>
    (utils.container.querySelector('.track-control-side-panel__list') as HTMLElement).style.getPropertyValue(
      '--tcsp-list-gutter',
    );
  return { ...utils, wrapperOf, levelsOf, gutter };
}

describe('TrackControlSidePanel — the gutter is as wide as the deepest nesting', () => {
  it('no groups, and one level of groups, keep the 12px gutter', () => {
    expect(renderRows([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]).gutter()).toBe('12px');
    cleanup();
    const oneLevel: Row[] = [
      { id: 10, name: 'A', type: 'folder' },
      { id: 1, name: 'a', folderId: 10 },
    ];
    expect(renderRows(oneLevel).gutter()).toBe('12px');
  });

  it('each further level adds one strip', () => {
    expect(renderRows(nest()).gutter()).toBe('16px');
    cleanup();
    const three: Row[] = [
      { id: 10, name: 'A', type: 'folder' },
      { id: 20, name: 'B', type: 'folder', folderId: 10 },
      { id: 30, name: 'C', type: 'folder', folderId: 20 },
      { id: 1, name: 'a', folderId: 30 },
    ];
    expect(renderRows(three).gutter()).toBe('20px');
  });

  it('collapsing a group does not narrow the gutter: hidden levels still count', () => {
    expect(renderRows(nest({ 10: { collapsed: true } })).gutter()).toBe('16px');
  });
});

describe('TrackControlSidePanel — grouping never resizes a track', () => {
  it('a grouped row has the height of an ungrouped one, at any depth', () => {
    const { wrapperOf } = renderRows(nest());
    const heights = [0, 2, 4, 5, 6, 7].map((i) => wrapperOf(i)!.style.height);
    expect(new Set(heights)).toEqual(new Set(['114px']));
  });

  it('every grouped row outdents and pads back by the same amount, so content starts on one line', () => {
    const { wrapperOf } = renderRows(nest());
    for (const i of [1, 2, 3, 4, 5, 6]) {
      expect(wrapperOf(i)!.style.marginLeft).toBe('-8px');
      expect(wrapperOf(i)!.style.paddingLeft).toBe('8px');
    }
    for (const i of [0, 7]) {
      expect(wrapperOf(i)!.style.marginLeft).toBe('');
      expect(wrapperOf(i)!.style.paddingLeft).toBe('');
    }
  });

  it('floors are margin, never padding', () => {
    const { wrapperOf } = renderRows(nest());
    expect(wrapperOf(5)!.style.marginBottom).toBe(`${GROUP_END_PAD}px`);
    expect(wrapperOf(6)!.style.marginBottom).toBe(`${GROUP_END_PAD}px`);
    expect(wrapperOf(5)!.style.paddingBottom).toBe('');
    expect(wrapperOf(4)!.style.marginBottom).toBe('');
  });
});

describe('TrackControlSidePanel — one box per level', () => {
  it('ungrouped rows draw nothing', () => {
    const { levelsOf, wrapperOf } = renderRows(nest());
    expect(levelsOf(0)).toEqual([]);
    expect(levelsOf(7)).toEqual([]);
    expect(wrapperOf(0)!.querySelector('[data-group-underlay]')).toBeNull();
  });

  it('each level starts one strip further right than the one around it', () => {
    const { levelsOf } = renderRows(nest());
    expect(levelsOf(2).map((l) => [l.level, l.left])).toEqual([[1, '0px']]);
    expect(levelsOf(4).map((l) => [l.level, l.left])).toEqual([
      [1, '0px'],
      [2, '4px'],
    ]);
    // a header carries its own level on top of the ones around it
    expect(levelsOf(1).map((l) => l.level)).toEqual([1]);
    expect(levelsOf(3).map((l) => l.level)).toEqual([1, 2]);
  });

  it('a level that carries on reaches the next row; one that ends reaches its floor', () => {
    const { levelsOf } = renderRows(nest());
    // mid-family: the row gap
    expect(levelsOf(4).map((l) => l.bottom)).toEqual(['-2px', '-2px']);
    // B ends here, A carries on past B's floor and the gap
    expect(levelsOf(5).map((l) => l.bottom)).toEqual(['-6px', '-4px']);
    // A ends here
    expect(levelsOf(6).map((l) => l.bottom)).toEqual(['-4px']);
  });

  it('groups ending on one row stack their floors, innermost first', () => {
    const { levelsOf, wrapperOf } = renderRows(stacked());
    expect(levelsOf(2).map((l) => [l.level, l.bottom])).toEqual([
      [1, '-8px'],
      [2, '-4px'],
    ]);
    expect(wrapperOf(2)!.style.marginBottom).toBe(`${2 * GROUP_END_PAD}px`);
  });

  it('corners: top-left on a header, bottom-left where a level ends — never on the right', () => {
    const { levelsOf, wrapperOf } = renderRows(nest());
    const header = levelsOf(3);
    expect(header[0].topLeft).toBe(''); // A only passes through B's header row
    expect(header[1].topLeft).toBe('4px');
    expect(header[1].bottomLeft).toBe('');
    const lastOfB = levelsOf(5);
    expect(lastOfB[0].bottomLeft).toBe('');
    expect(lastOfB[1].bottomLeft).toBe('4px');
    for (const box of wrapperOf(5)!.querySelectorAll<HTMLElement>('[data-group-level]')) {
      expect(box.style.borderTopRightRadius).toBe('');
      expect(box.style.borderBottomRightRadius).toBe('');
      expect(box.style.right).toBe('0px');
    }
  });

  it('levels are told apart by colour, stepping from the group tone toward the cards', () => {
    const { levelsOf } = renderRows(nest());
    const [outer, inner] = levelsOf(4);
    // Both must actually be SET — an empty value would differ too
    expect(outer.background).not.toBe('');
    expect(inner.background).not.toBe('');
    expect(inner.background).not.toBe(outer.background);
  });

  it('the boxes never take the pointer', () => {
    const { wrapperOf } = renderRows(nest());
    const underlay = wrapperOf(4)!.querySelector<HTMLElement>('[data-group-underlay]')!;
    expect(underlay.style.pointerEvents).toBe('none');
    expect(underlay.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('TrackControlSidePanel — collapsed groups', () => {
  it('a collapsed header is the whole shape: no reach, no floor, both left corners', () => {
    const { levelsOf, wrapperOf } = renderRows(nest({ 20: { collapsed: true } }));
    const own = levelsOf(3)[1];
    expect(own.bottom).toBe('0px');
    expect(own.topLeft).toBe('4px');
    expect(own.bottomLeft).toBe('4px');
    // ...and it does not END the group around it: A carries on to its next row
    expect(levelsOf(3)[0].bottom).toBe('-2px');
    expect(wrapperOf(3)!.style.marginBottom).toBe('');
  });

  it('a collapsed inner group that is last in its parent carries the PARENT\'s floor', () => {
    const rows: Row[] = [
      { id: 10, name: 'A', type: 'folder' },
      { id: 1, name: 'a', folderId: 10 },
      { id: 20, name: 'B', type: 'folder', folderId: 10, collapsed: true },
      { id: 2, name: 'hidden', folderId: 20 },
      { id: 3, name: 'After' },
    ];
    const { levelsOf, wrapperOf } = renderRows(rows);
    expect(levelsOf(2).map((l) => [l.level, l.bottom, l.bottomLeft])).toEqual([
      [1, '-4px', '4px'],
      [2, '0px', '4px'],
    ]);
    expect(wrapperOf(2)!.style.marginBottom).toBe(`${GROUP_END_PAD}px`);
  });

  it('rows inside a collapsed group render no panel', () => {
    const { container } = renderRows(nest({ 10: { collapsed: true } }));
    const shown = [...container.querySelectorAll('[data-track-panel-index]')].map((e) =>
      Number((e as HTMLElement).dataset.trackPanelIndex),
    );
    expect(shown).toEqual([0, 1, 7]);
  });
});

describe('TrackControlSidePanel — reorder preview', () => {
  it('marks the header of a collapsed group the drag would land in', () => {
    const rows = nest({ 20: { collapsed: true } });
    const { wrapperOf } = renderRows(rows, {
      dragPreview: {
        order: rows.map((_r, i) => i),
        ghostIndices: [7],
        indented: true,
        intoCollapsed: 3,
      },
    });
    const marked = wrapperOf(3)!.querySelector<HTMLElement>('[data-group-header-box]')!;
    expect(marked.style.boxShadow).toContain('inset 0 0 0 2px');
    const unmarked = wrapperOf(1)!.querySelector<HTMLElement>('[data-group-header-box]')!;
    expect(unmarked.style.boxShadow).not.toContain('2px');
  });
});

describe('TrackControlSidePanel — a group row can join and leave groups', () => {
  const groupMenu = (over: Partial<NonNullable<TrackControlSidePanelProps['groupMenu']>> = {}) => ({
    groups: [
      { folderId: 10, name: 'A' },
      { folderId: 20, name: 'A ▸ B' },
    ],
    joinableFor: (i: number) => (i === 3 ? [] : [{ folderId: 20, name: 'A ▸ B' }]),
    groupOf: (i: number) => nest()[i]?.folderId,
    isFolderRow: (i: number) => nest()[i]?.type === 'folder',
    onCreateGroup: vi.fn(),
    onDuplicateGroup: vi.fn(),
    onDeleteGroupAndTracks: vi.fn(),
    onAddToGroup: vi.fn(),
    onRemoveFromGroup: vi.fn(),
    onUngroup: vi.fn(),
    ...over,
  });
  const menuLabels = (container: HTMLElement) =>
    [...container.querySelectorAll('[role="menuitem"]')].map((i) =>
      (i.textContent ?? '').replace(/[-]/g, '').trim(),
    );

  it('a nested group row offers Remove from group; a top-level one does not', () => {
    const { container, wrapperOf } = renderRows(nest(), { groupMenu: groupMenu() });
    fireEvent.contextMenu(wrapperOf(3)!, { clientX: 10, clientY: 10 });
    expect(menuLabels(container)).toContain('Remove from group');
    cleanup();
    const again = renderRows(nest(), { groupMenu: groupMenu() });
    fireEvent.contextMenu(again.wrapperOf(1)!, { clientX: 10, clientY: 10 });
    expect(menuLabels(again.container)).not.toContain('Remove from group');
  });

  it('offers only the groups the host says this row may join', () => {
    const menu = groupMenu();
    const { container, wrapperOf } = renderRows(nest(), { groupMenu: menu });
    fireEvent.contextMenu(wrapperOf(1)!, { clientX: 10, clientY: 10 });
    expect(menuLabels(container).filter((l) => l.startsWith('Add to'))).toEqual(['Add to A ▸ B']);
    const item = [...container.querySelectorAll('[role="menuitem"]')].find((i) =>
      (i.textContent ?? '').includes('Add to A ▸ B'),
    ) as HTMLElement;
    fireEvent.click(item);
    expect(menu.onAddToGroup).toHaveBeenCalledWith(1, 20);
  });

  it('a row with nothing to join is offered nothing', () => {
    const { container, wrapperOf } = renderRows(nest(), { groupMenu: groupMenu() });
    fireEvent.contextMenu(wrapperOf(3)!, { clientX: 10, clientY: 10 });
    expect(menuLabels(container).filter((l) => l.startsWith('Add to'))).toEqual([]);
  });
});

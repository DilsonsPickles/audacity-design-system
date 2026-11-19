import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { ToolbarDock, type ToolbarDockProps } from '../ToolbarDock';

afterEach(cleanup);

const ROWS = [[
  { id: 'a', tools: ['one', 'two'] },
  { id: 'b', tools: ['three'] },
  { id: 'hidden', tools: ['gone'] },
]];
/** Three rows: [a b] / [hidden] / [c] — the middle one draws nothing */
const THREE_ROWS = [
  [{ id: 'a', tools: ['one', 'two'] }, { id: 'b', tools: ['three'] }],
  [{ id: 'hidden', tools: ['gone'] }],
  [{ id: 'c', tools: ['four'] }],
];

function renderDock(props: Partial<ToolbarDockProps> = {}) {
  return render(
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        <ToolbarDock
          region="top"
          rows={ROWS}
          renderTool={(id) => (id === 'gone' ? null : <button aria-label={id}>{id}</button>)}
          {...props}
        />
      </AccessibilityProfileProvider>
    </ThemeProvider>,
  );
}

describe('ToolbarDock (2026-11-09, custom toolbars)', () => {
  it('draws each bar with its gutter — the grip — and its tools; the gutter of a bar after another carries the divider line; nothing for a bar whose tools all draw nothing', () => {
    const { container } = renderDock();
    const bars = Array.from(container.querySelectorAll('[data-toolbar-bar]'));
    expect(bars.map((b) => b.getAttribute('data-toolbar-bar'))).toEqual(['a', 'b']);
    expect(bars[0].querySelector('.toolbar-dock__grip')).toBeTruthy();
    expect(Array.from(bars[0].querySelectorAll('[data-toolbar-tool]')).map((t) => t.getAttribute('data-toolbar-tool'))).toEqual(['one', 'two']);
    // THE GAP IS THE GRIP (2026-11-10): the first bar's gutter has no line, the second's does
    expect(bars[0].querySelector('.toolbar-dock__grip')!.classList.contains('toolbar-dock__grip--leading')).toBe(true);
    expect(bars[0].querySelector('.toolbar-dock__grip-line')).toBeNull();
    expect(bars[1].querySelector('.toolbar-dock__grip > .toolbar-dock__grip-line')).toBeTruthy();
    expect(bars[1].firstElementChild!.classList.contains('toolbar-dock__grip')).toBe(true);
    expect(container.querySelector('.toolbar-dock__divider')).toBeNull();
    // At rest the tools are live: not inert, and a press on one is the tool's own
    expect(container.querySelector('[data-toolbar-tool="one"] .toolbar-dock__tool-body')!.hasAttribute('inert')).toBe(false);
  });

  it('a grip press reports the bar; an empty dock draws no bars and no zone', () => {
    const onGripMouseDown = vi.fn();
    const { container, rerender } = renderDock({ onGripMouseDown });
    fireEvent.mouseDown(container.querySelector('[data-toolbar-bar="b"] .toolbar-dock__grip')!, { button: 0 });
    expect(onGripMouseDown).toHaveBeenCalledWith('b', expect.anything(), expect.anything());
    rerender(
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <ToolbarDock region="left" rows={[]} renderTool={() => null} draggingBarId="a" insert={{ region: 'left', row: 0, beforeBarId: null }} />
        </AccessibilityProfileProvider>
      </ThemeProvider>,
    );
    const dock = container.querySelector('[data-toolbar-dock="left"]') as HTMLElement;
    expect(dock.classList.contains('toolbar-dock--empty')).toBe(true);
    expect(dock.querySelector('[data-toolbar-bar]')).toBeNull();
    expect(dock.textContent).toBe('');
  });

  it('EDIT MODE: the tools go inert and a press on one reports the tool, not the bar\'s own handlers', () => {
    const onToolMouseDown = vi.fn();
    const { container } = renderDock({ editing: true, onToolMouseDown });
    expect(container.querySelector('[data-toolbar-dock]')!.classList.contains('toolbar-dock--editing')).toBe(true);
    for (const body of Array.from(container.querySelectorAll('.toolbar-dock__tool-body'))) {
      expect(body.hasAttribute('inert')).toBe(true);
    }
    fireEvent.mouseDown(container.querySelector('[data-toolbar-tool="two"]')!, { button: 0 });
    expect(onToolMouseDown).toHaveBeenCalledWith('two', 'a', expect.anything(), expect.anything());
    // A LIVE tool (the cog, Done in this mode) is neither inert nor picked up
    const { container: c2 } = renderDock({ editing: true, onToolMouseDown, toolMeta: (id) => (id === 'three' ? { live: true } : undefined) });
    expect(c2.querySelector('[data-toolbar-tool="three"] .toolbar-dock__tool-body')!.hasAttribute('inert')).toBe(false);
    expect(c2.querySelector('[data-toolbar-tool="one"] .toolbar-dock__tool-body')!.hasAttribute('inert')).toBe(true);
    onToolMouseDown.mockClear();
    fireEvent.mouseDown(c2.querySelector('[data-toolbar-tool="three"]')!, { button: 0 });
    expect(onToolMouseDown).not.toHaveBeenCalled();
    // The right button picks nothing up
    onToolMouseDown.mockClear();
    fireEvent.mouseDown(container.querySelector('[data-toolbar-tool="two"]')!, { button: 2 });
    expect(onToolMouseDown).not.toHaveBeenCalled();
  });

  it('a tool JOINING a bar shows the short caret among its tools; a NEW container shows the full-height line between bars', () => {
    // before tool "two" of bar a
    const { container, rerender } = renderDock({ editing: true, toolInsert: { barId: 'a', beforeToolId: 'two' } });
    const tools = container.querySelector('[data-toolbar-bar="a"] .toolbar-dock__tools')!;
    expect(Array.from(tools.children).map((c) => c.className.split(' ')[0])).toEqual(['toolbar-dock__tool', 'toolbar-dock__caret', 'toolbar-dock__tool']);
    expect(container.querySelector('.toolbar-dock__insert')).toBeNull();
    // at the bar's end
    const wrap = (props: Partial<ToolbarDockProps>) => (
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <ToolbarDock region="top" rows={ROWS} renderTool={(id) => (id === 'gone' ? null : <button aria-label={id}>{id}</button>)} {...props} />
        </AccessibilityProfileProvider>
      </ThemeProvider>
    );
    rerender(wrap({ editing: true, toolInsert: { barId: 'b', beforeToolId: null } }));
    expect(container.querySelector('[data-toolbar-bar="b"] .toolbar-dock__tools')!.lastElementChild!.className).toBe('toolbar-dock__caret');
    // a new container before bar b: the line takes the place of b's gutter line
    rerender(wrap({ editing: true, insert: { region: 'top', row: 0, beforeBarId: 'b' } }));
    const line = container.querySelector('.toolbar-dock__insert') as HTMLElement;
    expect(line.parentElement).toBe(container.querySelector('[data-toolbar-bar="b"] .toolbar-dock__grip'));
    expect(container.querySelector('.toolbar-dock__caret')).toBeNull();
    // …and at the row's end (before a bar that draws nothing is the end too)
    rerender(wrap({ editing: true, insert: { region: 'top', row: 0, beforeBarId: 'hidden' } }));
    expect((container.querySelector('.toolbar-dock__insert--end') as HTMLElement).previousElementSibling!.getAttribute('data-toolbar-bar')).toBe('b');
    rerender(wrap({ editing: true, insert: { region: 'top', row: 0, beforeBarId: null }, insertRefused: true }));
    const last = container.querySelector('.toolbar-dock__insert') as HTMLElement;
    expect(last.classList.contains('toolbar-dock__insert--refused')).toBe(true);
    expect(last.previousElementSibling!.getAttribute('data-toolbar-bar')).toBe('b');
  });

  it('ROWS (2026-11-10): each row is its own line with a line between rows; a row whose bars draw nothing draws no line; a NEW ROW shows the horizontal line across the dock', () => {
    const wrap = (props: Partial<ToolbarDockProps>) => (
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <ToolbarDock region="top" rows={THREE_ROWS} renderTool={(id) => (id === 'gone' ? null : <button aria-label={id}>{id}</button>)} {...props} />
        </AccessibilityProfileProvider>
      </ThemeProvider>
    );
    const { container, rerender } = render(wrap({}));
    const lines = () => Array.from(container.querySelectorAll('.toolbar-dock__row'));
    // two lines drawn, each carrying its ROW's index in the model
    expect(lines().map((l) => l.getAttribute('data-toolbar-row'))).toEqual(['0', '2']);
    expect(lines().map((l) => Array.from(l.querySelectorAll('[data-toolbar-bar]')).map((b) => b.getAttribute('data-toolbar-bar')))).toEqual([['a', 'b'], ['c']]);
    expect(container.querySelectorAll('.toolbar-dock__row-divider')).toHaveLength(1);
    expect(container.querySelector('.toolbar-dock__row-insert')).toBeNull();
    // a new row above everything: the line is the dock's first child
    rerender(wrap({ insert: { region: 'top', newRowAt: 0 } }));
    let line = container.querySelector('.toolbar-dock__row-insert') as HTMLElement;
    expect(line.classList.contains('toolbar-dock__row-insert--start')).toBe(true);
    expect(line.nextElementSibling).toBe(lines()[0]);
    expect(container.querySelector('.toolbar-dock__insert')).toBeNull();
    // between the rows (before row 1, which draws nothing, or row 2): above the last line
    for (const at of [1, 2]) {
      rerender(wrap({ insert: { region: 'top', newRowAt: at } }));
      line = container.querySelector('.toolbar-dock__row-insert') as HTMLElement;
      expect(line.previousElementSibling).toBe(lines()[0]);
      expect(line.getAttribute('data-row-insert')).toBe(String(at));
    }
    // after the last row
    rerender(wrap({ insert: { region: 'top', newRowAt: 3 } }));
    line = container.querySelector('.toolbar-dock__row-insert') as HTMLElement;
    expect(line.classList.contains('toolbar-dock__row-insert--end')).toBe(true);
    expect(line.previousElementSibling).toBe(lines()[1]);
    // beside a bar of the LAST row: the full-height line sits in that bar's gutter, in that row's line
    rerender(wrap({ insert: { region: 'top', row: 2, beforeBarId: 'c' } }));
    expect(lines()[1].contains(container.querySelector('.toolbar-dock__insert'))).toBe(true);
    // at the end of the first row, and after a named bar (a wrapped line's end)
    rerender(wrap({ insert: { region: 'top', row: 0, beforeBarId: null } }));
    expect((container.querySelector('.toolbar-dock__insert') as HTMLElement).previousElementSibling!.getAttribute('data-toolbar-bar')).toBe('b');
    rerender(wrap({ insert: { region: 'top', row: 0, beforeBarId: 'b' }, insertAfterBarId: 'a' }));
    expect((container.querySelector('.toolbar-dock__insert') as HTMLElement).previousElementSibling!.getAttribute('data-toolbar-bar')).toBe('a');
  });

  it('a SIDE dock draws each row as a COLUMN, side by side, with a line between; a new column shows the vertical line (2026-11-10)', () => {
    const wrapLeft = (props: Partial<ToolbarDockProps>) => (
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <ToolbarDock region="left" rows={THREE_ROWS} renderTool={(id) => (id === 'gone' ? null : <button aria-label={id}>{id}</button>)} {...props} />
        </AccessibilityProfileProvider>
      </ThemeProvider>
    );
    const { container, rerender } = render(wrapLeft({ insert: { region: 'left', row: 2, beforeBarId: 'c' } }));
    const columns = () => Array.from(container.querySelectorAll('.toolbar-dock__row'));
    // rows 0 and 2 draw (row 1's only bar draws nothing)
    expect(columns().map((c) => c.getAttribute('data-toolbar-row'))).toEqual(['0', '2']);
    expect(columns().map((c) => Array.from(c.querySelectorAll('[data-toolbar-bar]')).map((b) => b.getAttribute('data-toolbar-bar')))).toEqual([['a', 'b'], ['c']]);
    expect(container.querySelectorAll('.toolbar-dock__row-divider')).toHaveLength(1);
    // beside a bar: the line in that bar's gutter, in its column
    expect((container.querySelector('.toolbar-dock__insert') as HTMLElement).parentElement).toBe(container.querySelector('[data-toolbar-bar="c"] .toolbar-dock__grip'));
    // a new column between the two
    rerender(wrapLeft({ insert: { region: 'left', newRowAt: 1 } }));
    const line = container.querySelector('.toolbar-dock__row-insert') as HTMLElement;
    expect(line.previousElementSibling).toBe(columns()[0]);
  });

  describe('SIZING (2026-11-10): a bar\'s width in a horizontal dock, height in a vertical one', () => {
    // jsdom measures nothing: every tool is 28px along the dock, everything else 0
    const measured = () => {
      const w = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
        if (this.hasAttribute('data-toolbar-tool')) return 28;
        if (this.hasAttribute('data-toolbar-bar')) return parseFloat(this.style.width) || 0;
        return 0;
      });
      const h = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
        if (this.hasAttribute('data-toolbar-tool')) return 28;
        if (this.hasAttribute('data-toolbar-bar')) return parseFloat(this.style.height) || 0;
        return 0;
      });
      return () => { w.mockRestore(); h.mockRestore(); };
    };
    // a toolbar AFTER the sized one: the row's last has no size (2026-11-18)
    const AFTER = { id: 'z', tools: ['z1'] };
    const FIVE = [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'] }, AFTER]];
    const wrap = (props: Partial<ToolbarDockProps>) => (
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <ToolbarDock region="top" rows={FIVE} renderTool={(id) => <button aria-label={id}>{id}</button>} {...props} />
        </AccessibilityProfileProvider>
      </ThemeProvider>
    );
    const inline = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-toolbar-bar="e"] [data-toolbar-tool]')).map((t) => t.getAttribute('data-toolbar-tool'));

    it('a bar narrower than its tools keeps what fits and puts the rest behind the overflow button, which opens them in a flyout', () => {
      const restore = measured();
      try {
        // natural: 17 + 5×28 + 4×8 = 189 — everything inline, no button
        const { container, rerender } = render(wrap({}));
        expect(inline(container)).toEqual(['t1', 't2', 't3', 't4', 't5']);
        expect(container.querySelector('.toolbar-dock__overflow')).toBeNull();
        // 117 wide: 100 of room; less the button and its gap, 64 → two tools
        rerender(wrap({ rows: [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'], width: 117 }, AFTER]] }));
        expect((container.querySelector('[data-toolbar-bar="e"]') as HTMLElement).style.width).toBe('117px');
        expect(inline(container)).toEqual(['t1', 't2']);
        const button = container.querySelector('[data-toolbar-overflow-button="e"]') as HTMLElement;
        expect(button.getAttribute('aria-label')).toBe('3 more tools');
        fireEvent.click(button);
        expect(Array.from(document.body.querySelectorAll('[data-toolbar-overflow-tool]')).map((t) => t.getAttribute('data-toolbar-overflow-tool'))).toEqual(['t3', 't4', 't5']);
        // wide enough again: the button goes, and its flyout with it
        rerender(wrap({ rows: [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'], width: 400 }, AFTER]] }));
        expect(inline(container)).toHaveLength(5);
        expect(container.querySelector('.toolbar-dock__overflow')).toBeNull();
      } finally { restore(); }
    });

    // ONLY RESIZABLE ELEMENTS RESIZE (2026-11-19, "Drop the ability to resize
    // groups, save that for resizable elements only (meters)"): the host says
    // which groups may be sized; the rest draw no edge and ignore a stored size
    it('isResizable: a group the host refuses has no resize edge and its stored size is ignored', () => {
      const restore = measured();
      try {
        const { container } = render(wrap({
          onBarResize: vi.fn(),
          isResizable: (bar) => bar.id === 'z',
          rows: [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'], width: 117 }, AFTER]],
        }));
        expect(container.querySelector('[data-toolbar-resize="e"]')).toBeNull();
        expect((container.querySelector('[data-toolbar-bar="e"]') as HTMLElement).style.width).toBe('');
        expect(inline(container)).toHaveLength(5);
        expect(container.querySelector('[data-toolbar-resize="z"]')).not.toBeNull();
      } finally { restore(); }
    });

    it('a vertical dock sizes by HEIGHT and ignores the width', () => {
      const restore = measured();
      try {
        // (with a second toolbar in its column — one alone has no size, 2026-11-16)
        const { container } = render(wrap({ region: 'left', rows: [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'], width: 50, height: 117 }, { id: 'f', tools: ['t9'] }]] }));
        const bar = container.querySelector('[data-toolbar-bar="e"]') as HTMLElement;
        expect(bar.style.height).toBe('117px');
        expect(bar.style.width).toBe('');
        expect(inline(container)).toEqual(['t1', 't2']);
      } finally { restore(); }
    });

    it('the resize edge: a drag reports the new size once, at the release; a release on the natural size and a double-click report null', () => {
      const restore = measured();
      const onBarResize = vi.fn();
      try {
        const { container } = render(wrap({ onBarResize }));
        const edge = container.querySelector('[data-toolbar-resize="e"]') as HTMLElement;
        // natural 189 (jsdom: the bar measures 0, so the drag starts from 0)
        fireEvent.mouseDown(edge, { button: 0, clientX: 0 });
        fireEvent.mouseMove(document, { clientX: 100 });
        expect(onBarResize).not.toHaveBeenCalled();
        expect((container.querySelector('[data-toolbar-bar="e"]') as HTMLElement).style.width).toBe('100px'); // live
        fireEvent.mouseUp(document, { clientX: 100 });
        expect(onBarResize).toHaveBeenLastCalledWith('e', 'width', 100);
        // never below the gutter + the overflow button
        fireEvent.mouseDown(edge, { button: 0, clientX: 0 });
        fireEvent.mouseUp(document, { clientX: 5 });
        expect(onBarResize).toHaveBeenLastCalledWith('e', 'width', 45);
        // within 6px of the natural size: back to natural
        fireEvent.mouseDown(edge, { button: 0, clientX: 0 });
        fireEvent.mouseUp(document, { clientX: 186 });
        expect(onBarResize).toHaveBeenLastCalledWith('e', 'width', null);
        fireEvent.doubleClick(edge);
        expect(onBarResize).toHaveBeenLastCalledWith('e', 'width', null);
      } finally { restore(); }
    });

    it('a STRETCH tool in a sized bar carries its minSize and is what gives way first', () => {
      const restore = measured();
      try {
        const meta = (id: string) => (id === 'm' ? { stretch: true, minSize: 60 } : undefined);
        const rows = (width?: number) => [[{ id: 'e', tools: ['t1', 'm', 't2'], ...(width ? { width } : {}) }, AFTER]];
        const { container, rerender } = render(wrap({ rows: rows(), toolMeta: meta }));
        expect((container.querySelector('[data-toolbar-tool="m"]') as HTMLElement).style.minWidth).toBe('');
        // 17 + 28 + 8 + 60 + 8 + 28 = 149: at that width all three fit, the meter at its least
        rerender(wrap({ rows: rows(149), toolMeta: meta }));
        expect(inline(container)).toEqual(['t1', 'm', 't2']);
        expect((container.querySelector('[data-toolbar-tool="m"]') as HTMLElement).style.minWidth).toBe('60px');
        // a pixel less and the overflow button needs its own room (28 + 8):
        // the meter, at its least already, goes behind it with the last tool
        rerender(wrap({ rows: rows(148), toolMeta: meta }));
        expect(inline(container)).toEqual(['t1']);
        expect(container.querySelector('[data-toolbar-overflow-button="e"]')!.getAttribute('aria-label')).toBe('2 more tools');
      } finally { restore(); }
    });
  });

  it('THE COG IS PINNED to the dock\'s end, outside every line, so no bar can push it off (2026-11-10)', () => {
    const { container } = renderDock({ trailing: <button aria-label="cog">cog</button> });
    const cog = container.querySelector('[aria-label="cog"]')!;
    expect(cog.closest('.toolbar-dock__trailing--pinned')).toBeTruthy();
    expect(cog.closest('.toolbar-dock__row')).toBeNull();
  });

  it('a measure that flips on every read no longer re-renders until React aborts: the dock settles and warns (2026-11-10)', () => {
    let flip = false;
    const w = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      if (this.hasAttribute('data-toolbar-tool')) { flip = !flip; return flip ? 28 : 40; }
      return 0;
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(() => renderDock({})).not.toThrow();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('did not settle'));
    } finally { w.mockRestore(); warn.mockRestore(); }
  });

  it('EVERY GROUP\'S END RESIZES (2026-11-18, "the end of each group should be able to be resized… it feels natural"): the last, a lone, an empty and a side column\'s group alike', () => {
    const lone = renderDock({ region: 'right', rows: [[{ id: 'meters', tools: ['one'] }]], onBarResize: vi.fn() });
    expect(lone.container.querySelector('[data-toolbar-resize="meters"]')).not.toBeNull();
    cleanup();
    const empty = renderDock({ rows: [[{ id: 'lonely', tools: [] }], [{ id: 'full', tools: ['one'] }]], onBarResize: vi.fn() });
    expect(empty.container.querySelector('[data-toolbar-resize="lonely"]')).not.toBeNull();
    expect(empty.container.querySelector('[data-toolbar-resize="full"]')).not.toBeNull();
  });

  it('THE LAST GROUP FILLS UNTIL IT IS SIZED: unsized it fills (its meter taking the room); given a size it keeps it and stops filling', () => {
    const meta = (id: string) => (id === 'meter' ? { stretch: true } : undefined);
    const { container } = renderDock({
      rows: [
        [{ id: 'p', tools: ['one'], width: 200 }, { id: 'q', tools: ['two'] }],
        // (no meter here: a sized METER group fills from its size since 2026-11-19)
        [{ id: 'r', tools: ['three'] }, { id: 's', tools: ['four'], width: 300 }],
      ],
      onBarResize: vi.fn(),
      toolMeta: meta,
    });
    const bar = (id: string) => container.querySelector(`[data-toolbar-bar="${id}"]`) as HTMLElement;
    expect(bar('p').style.width).toBe('200px');
    expect(bar('p').classList.contains('toolbar-dock__bar--fill')).toBe(false);
    // unsized last: fills, with an edge
    expect(bar('q').classList.contains('toolbar-dock__bar--fill')).toBe(true);
    expect(container.querySelector('[data-toolbar-resize="q"]')).not.toBeNull();
    // sized last: its size, no fill
    expect(bar('s').classList.contains('toolbar-dock__bar--fill')).toBe(false);
    expect(bar('s').classList.contains('toolbar-dock__bar--sized')).toBe(true);
    expect(bar('s').style.width).toBe('300px');
  });

  it('A HORIZONTAL METER\'S GROUP TAKES THE ROW\'S SPARE ROOM (2026-11-19, "they should be flex to take up all remaining space"): every meter group fills, the last group keeps its natural size; a sized one fills from its size, never below it; in a column it does not', () => {
    const meta = (id: string) => (id === 'meter' ? { stretch: true } : undefined);
    const { container } = renderDock({
      rows: [[{ id: 'rec', tools: ['meter'] }, { id: 'mid', tools: ['one'] }, { id: 'play', tools: ['meter'] }, { id: 'end', tools: ['two'] }]],
      toolMeta: meta,
    });
    const fills = (id: string) => (container.querySelector(`[data-toolbar-bar="${id}"]`) as HTMLElement).classList.contains('toolbar-dock__bar--fill');
    expect(fills('rec')).toBe(true);
    expect(fills('play')).toBe(true);
    expect(fills('mid')).toBe(false);
    expect(fills('end')).toBe(false);
    cleanup();
    const sized = renderDock({ rows: [[{ id: 'rec', tools: ['meter'], width: 240 }, { id: 'end', tools: ['two'] }]], toolMeta: meta });
    const rec = sized.container.querySelector('[data-toolbar-bar="rec"]') as HTMLElement;
    expect(rec.classList.contains('toolbar-dock__bar--fill')).toBe(true);
    expect(rec.style.minWidth).toBe('240px');
    expect((sized.container.querySelector('[data-toolbar-bar="end"]') as HTMLElement).classList.contains('toolbar-dock__bar--fill')).toBe(false);
    cleanup();
    const column = renderDock({ region: 'right', rows: [[{ id: 'rec', tools: ['meter'] }, { id: 'end', tools: ['two'] }]], toolMeta: meta });
    expect((column.container.querySelector('[data-toolbar-bar="rec"]') as HTMLElement).classList.contains('toolbar-dock__bar--fill')).toBe(false);
  });

  it('a row with a GROWING group (the info line) leaves the room to it: the last group keeps its natural size, with an edge', () => {
    const { container } = renderDock({
      region: 'bottom',
      rows: [[{ id: 'status', tools: ['cue', 'info'] }, { id: 'selection', tools: ['times'] }]],
      onBarResize: vi.fn(),
      toolMeta: (id) => (id === 'info' ? { grow: true } : undefined),
    });
    const selection = container.querySelector('[data-toolbar-bar="selection"]') as HTMLElement;
    expect(selection.classList.contains('toolbar-dock__bar--fill')).toBe(false);
    expect(selection.querySelector('[data-toolbar-resize]')).not.toBeNull();
    expect(container.querySelector('[data-toolbar-bar="status"]')!.classList.contains('toolbar-dock__bar--grow')).toBe(true);
  });

  it('A FLEXIBLE SPACE draws an empty spacer the dock owns, and a right-click on it names it to the menu (2026-11-18)', () => {
    const onBarMenu = vi.fn();
    const renderTool = vi.fn((id: string) => <button aria-label={id}>{id}</button>);
    const { container } = renderDock({ rows: [[{ id: 'a', tools: ['one', 'spacer-1', 'two'] }]], onBarMenu, renderTool });
    const space = container.querySelector('[data-toolbar-tool="spacer-1"]') as HTMLElement;
    expect(space.classList.contains('toolbar-dock__tool--spacer')).toBe(true);
    expect(space.querySelector('[data-toolbar-spacer="spacer-1"]')).not.toBeNull();
    expect(renderTool.mock.calls.map((c) => c[0])).not.toContain('spacer-1');
    fireEvent.contextMenu(space.querySelector('[data-toolbar-spacer]')!, { clientX: 5, clientY: 6 });
    expect(onBarMenu).toHaveBeenLastCalledWith('a', { x: 5, y: 6 }, 'top', 'spacer-1', null, 0);
    fireEvent.contextMenu(container.querySelector('button[aria-label="two"]')!, { clientX: 7, clientY: 8 });
    expect(onBarMenu).toHaveBeenLastCalledWith('a', { x: 7, y: 8 }, 'top', 'two', null, 0);
  });

  it('a toolbar holding a flexible space FILLS the row, wherever it is in it, and the last toolbar keeps its natural size (2026-11-18, "I still can\'t drop it between tools")', () => {
    const renderTool = (id: string) => <button aria-label={id}>{id}</button>;
    const bar = (c: HTMLElement, id: string) => c.querySelector(`[data-toolbar-bar="${id}"]`) as HTMLElement;
    const { container } = renderDock({
      rows: [[{ id: 'a', tools: ['one'] }, { id: 'b', tools: ['two', 'spacer-1', 'three'] }, { id: 'c', tools: ['four'] }]],
      renderTool, onBarResize: vi.fn(),
    });
    expect(bar(container, 'b').classList.contains('toolbar-dock__bar--fill')).toBe(true);
    expect(bar(container, 'c').classList.contains('toolbar-dock__bar--fill')).toBe(false);
    expect(bar(container, 'a').classList.contains('toolbar-dock__bar--fill')).toBe(false);
    // the toolbar with the space keeps its resize edge; a stored size wins over the fill
    expect(container.querySelector('[data-toolbar-resize="b"]')).not.toBeNull();
    cleanup();
    const sized = renderDock({
      rows: [[{ id: 'b', tools: ['two', 'spacer-1', 'three'], width: 300 }, { id: 'c', tools: ['four'] }]],
      renderTool, onBarResize: vi.fn(),
    });
    expect(bar(sized.container, 'b').classList.contains('toolbar-dock__bar--fill')).toBe(false);
    expect(bar(sized.container, 'c').classList.contains('toolbar-dock__bar--fill')).toBe(false);
  });

  it('a right-click names the GAP nearest the pointer along the toolbar — before the first tool whose middle is past it, else the end (2026-11-18, "add the flexible space anywhere")', () => {
    const onBarMenu = vi.fn();
    const { container } = renderDock({ rows: [[{ id: 'a', tools: ['one', 'two', 'three'] }]], onBarMenu });
    // lay the three tools out at 0–28, 36–64, 72–100
    const lefts: Record<string, number> = { one: 0, two: 36, three: 72 };
    const restore = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const id = this.getAttribute('data-toolbar-tool');
      const left = id && id in lefts ? lefts[id] : 0;
      return { left, right: left + 28, width: id && id in lefts ? 28 : 0, top: 0, bottom: 28, height: 28, x: left, y: 0, toJSON: () => ({}) } as DOMRect;
    });
    try {
      const bar = container.querySelector('[data-toolbar-bar="a"]') as HTMLElement;
      const at = (x: number) => { fireEvent.contextMenu(bar, { clientX: x, clientY: 10 }); return onBarMenu.mock.calls[onBarMenu.mock.calls.length - 1][4]; };
      expect(at(5)).toBe('one');     // left half of the first: before it
      expect(at(20)).toBe('two');    // right half of the first: after it
      expect(at(66)).toBe('three');  // the gap between two and three
      expect(at(95)).toBeNull();     // past the last: the end
    } finally { restore.mockRestore(); }
  });

  it('TOOL GROUPS (2026-11-11): a separator draws a line between groups, never at a toolbar\'s ends nor doubled; an EMPTY toolbar draws its slot; one whose tools are all hidden draws nothing', () => {
    const { container } = renderDock({
      rows: [[
        { id: 'a', tools: ['separator-1', 'one', 'separator-2', 'gone', 'separator-3', 'two', 'separator-4'] },
        { id: 'empty', tools: [] },
        { id: 'hidden', tools: ['gone', 'separator-5'] },
      ]],
      onBarResize: vi.fn(),
    });
    const a = container.querySelector('[data-toolbar-bar="a"]')!;
    const tools = Array.from(a.querySelectorAll('[data-toolbar-tool]')).map((t) => t.getAttribute('data-toolbar-tool'));
    expect(tools).toEqual(['one', 'separator-2', 'two']);
    expect(a.querySelectorAll('.toolbar-dock__separator')).toHaveLength(1);
    const slot = container.querySelector('[data-toolbar-bar="empty"] [data-toolbar-empty="empty"]');
    // every group's end resizes, the last drawn too (2026-11-18)
    expect(container.querySelector('[data-toolbar-bar="empty"] [data-toolbar-resize="empty"]')).not.toBeNull();
    expect(a.querySelector('[data-toolbar-resize="a"]')).not.toBeNull();
    // no words drawn (2026-11-16) — the name is for screen readers
    expect(slot?.textContent).toBe('');
    expect(slot?.getAttribute('aria-label')).toBe('Empty group');
    expect(container.querySelector('[data-toolbar-bar="hidden"]')).toBeNull();
  });

  it('a right-click names the ROW it is in (the empty space\'s New group goes there), and hiddenBarIds keep a group in the rows without drawing it (2026-11-18)', () => {
    const onBarMenu = vi.fn();
    const { container } = renderDock({
      rows: [[{ id: 'hidden', tools: ['one'] }], [{ id: 'a', tools: ['two'] }], [{ id: 'b', tools: ['three'] }]],
      hiddenBarIds: ['hidden'],
      onBarMenu,
    });
    expect(container.querySelector('[data-toolbar-bar="hidden"]')).toBeNull();
    // the row numbers stay the layout's own: 'b' is row 2, not 1
    const lineOfB = container.querySelector('[data-toolbar-bar="b"]')!.closest('[data-toolbar-row]')!;
    expect(lineOfB.getAttribute('data-toolbar-row')).toBe('2');
    fireEvent.contextMenu(lineOfB, { clientX: 3, clientY: 4 });
    expect(onBarMenu.mock.calls[onBarMenu.mock.calls.length - 1][5]).toBe(2);
  });

  it('GROUPS AS ISLANDS (2026-11-18, "floating islands"): groupStyle="islands" marks the dock; lines by default', () => {
    const rows = [[{ id: 'a', tools: ['one'] }, { id: 'b', tools: ['two'] }]];
    const lines = renderDock({ rows });
    expect(lines.container.querySelector('[data-toolbar-dock]')!.classList.contains('toolbar-dock--islands')).toBe(false);
    cleanup();
    const islands = renderDock({ rows, groupStyle: 'islands' });
    expect(islands.container.querySelector('[data-toolbar-dock]')!.classList.contains('toolbar-dock--islands')).toBe(true);
    expect(islands.container.querySelectorAll('[data-toolbar-bar]').length).toBe(2);
  });

  describe('THE TOOLBAR\'S MENU ON ITS GRIP (2026-11-16)', () => {
    const rows = [[{ id: 'a', tools: ['one', 'two'], name: 'Main toolbar' }, { id: 'b', tools: ['three'] }]];

    it('a grip is named "<name> group", never "Group 1 group" (2026-11-18, the groups wording)', () => {
      const name = (n: string) => {
        const { container } = renderDock({ rows: [[{ id: 'x', tools: ['one'], name: n }, { id: 'y', tools: ['two'] }]], onBarMenu: vi.fn(), tabGroupId: 'tool-toolbar' });
        const label = container.querySelector('[data-toolbar-grip="x"]')!.getAttribute('aria-label');
        cleanup();
        return label;
      };
      expect(name('Group 1')).toBe('Group 1');
      expect(name('Drums')).toBe('Drums group');
      expect(name('Title bar')).toBe('Title bar');
    });

    it('a right-click on a grip asks for the bar\'s menu at the pointer', () => {
      const onBarMenu = vi.fn();
      const { container } = renderDock({ rows, onBarMenu, tabGroupId: 'tool-toolbar' });
      const grip = container.querySelector('[data-toolbar-grip="b"]') as HTMLElement;
      fireEvent.contextMenu(grip, { clientX: 40, clientY: 12 });
      expect(onBarMenu).toHaveBeenCalledWith('b', { x: 40, y: 12 }, 'top');
    });

    it('the grip is a button named for its toolbar, and Shift+F10 / the Menu key / Enter open the menu', () => {
      const onBarMenu = vi.fn();
      const { container } = renderDock({ rows, onBarMenu, tabGroupId: 'tool-toolbar' });
      const a = container.querySelector('[data-toolbar-grip="a"]') as HTMLElement;
      const b = container.querySelector('[data-toolbar-grip="b"]') as HTMLElement;
      expect(a.getAttribute('role')).toBe('button');
      expect(a.getAttribute('aria-label')).toBe('Main toolbar');
      expect(b.getAttribute('aria-label')).toBe('Group');
      fireEvent.keyDown(b, { key: 'F10', shiftKey: true });
      fireEvent.keyDown(b, { key: 'ContextMenu' });
      fireEvent.keyDown(b, { key: 'Enter' });
      expect(onBarMenu).toHaveBeenCalledTimes(3);
      expect(onBarMenu.mock.calls[0][0]).toBe('b');
    });

    it('a right-click ANYWHERE on a toolbar opens its menu; a tool with its own menu keeps it; the dock\'s empty space asks with no toolbar (2026-11-16)', () => {
      const onBarMenu = vi.fn();
      const { container } = renderDock({
        rows,
        onBarMenu,
        renderTool: (id) => (id === 'two'
          ? <button aria-label="two" onContextMenu={(e) => e.preventDefault()}>two</button>
          : <button aria-label={id}>{id}</button>),
      });
      fireEvent.contextMenu(container.querySelector('button[aria-label="three"]')!, { clientX: 5, clientY: 6 });
      expect(onBarMenu).toHaveBeenLastCalledWith('b', { x: 5, y: 6 }, 'top', 'three', null, 0);
      onBarMenu.mockClear();
      fireEvent.contextMenu(container.querySelector('button[aria-label="two"]')!);
      expect(onBarMenu).not.toHaveBeenCalled();
      fireEvent.contextMenu(container.querySelector('.toolbar-dock__row')!, { clientX: 1, clientY: 2 });
      expect(onBarMenu).toHaveBeenLastCalledWith(null, { x: 1, y: 2 }, 'top', undefined, undefined, 0);
    });

    it('Tab enters on the first TOOL, never a grip; without a menu the grips are not buttons', () => {
      const { container } = renderDock({ rows, onBarMenu: vi.fn(), tabGroupId: 'tool-toolbar' });
      // the one roving stop (its index is the profile's tabOrder, not always 0)
      const entry = container.querySelector('[data-toolbar-dock] [tabindex]:not([tabindex="-1"])') as HTMLElement;
      expect(entry.hasAttribute('data-toolbar-grip')).toBe(false);
      expect(entry.getAttribute('aria-label')).toBe('one');
      cleanup();
      const plain = renderDock({ rows });
      expect(plain.container.querySelector('[data-toolbar-grip]')).toBeNull();
    });
  });

  describe('⌘-DRAG A TOOL, NO MODE (2026-11-16)', () => {
    const rows = [[{ id: 'a', tools: ['one', 'two'] }]];

    it('a ⌘ press on a tool starts its move, before the tool sees the press, and the click it ends in presses nothing', () => {
      const onToolMouseDown = vi.fn();
      const pressed = vi.fn();
      const clicked = vi.fn();
      const { container } = renderDock({
        rows,
        onToolMouseDown,
        renderTool: (id) => <button aria-label={id} onMouseDown={pressed} onClick={clicked}>{id}</button>,
      });
      const two = container.querySelector('button[aria-label="two"]') as HTMLElement;
      fireEvent.mouseDown(two, { button: 0, metaKey: true, ctrlKey: true });
      expect(onToolMouseDown).toHaveBeenCalledTimes(1);
      expect(onToolMouseDown.mock.calls[0][0]).toBe('two');
      expect(onToolMouseDown.mock.calls[0][1]).toBe('a');
      expect(pressed).not.toHaveBeenCalled();
      fireEvent.click(two, { metaKey: true });
      expect(clicked).not.toHaveBeenCalled();
    });

    it('an OPTION press starts the move too (2026-11-18, "if I alt drag an icon…")', () => {
      const onToolMouseDown = vi.fn();
      const pressed = vi.fn();
      const { container } = renderDock({
        rows,
        onToolMouseDown,
        renderTool: (id) => <button aria-label={id} onMouseDown={pressed}>{id}</button>,
      });
      fireEvent.mouseDown(container.querySelector('button[aria-label="one"]') as HTMLElement, { button: 0, altKey: true });
      expect(onToolMouseDown).toHaveBeenCalledTimes(1);
      expect(onToolMouseDown.mock.calls[0][0]).toBe('one');
      expect(pressed).not.toHaveBeenCalled();
    });

    it('a plain press is the tool\'s own', () => {
      const onToolMouseDown = vi.fn();
      const clicked = vi.fn();
      const { container } = renderDock({
        rows,
        onToolMouseDown,
        renderTool: (id) => <button aria-label={id} onClick={clicked}>{id}</button>,
      });
      const one = container.querySelector('button[aria-label="one"]') as HTMLElement;
      fireEvent.mouseDown(one, { button: 0 });
      fireEvent.click(one);
      expect(onToolMouseDown).not.toHaveBeenCalled();
      expect(clicked).toHaveBeenCalledTimes(1);
    });
  });
});

describe('STROKED ISLANDS (2026-11-19, "make sure dark mode has a stroked island option too")', () => {
  it('the stroked style draws the islands with the stroked class', () => {
    const { container } = renderDock({ groupStyle: 'stroked' });
    const root = container.querySelector('.toolbar-dock') as HTMLElement;
    expect(root.classList.contains('toolbar-dock--islands')).toBe(true);
    expect(root.classList.contains('toolbar-dock--stroked')).toBe(true);
  });
});

describe('A GROUP WITHOUT DIVIDERS STILL BREAKS (2026-11-19, "they not breaking or wrapping right now")', () => {
  // jsdom measures nothing: a 150px dock, 28px tools, a bar its tools plus the gutter and gaps
  const measured = () => {
    const w = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      if (this.hasAttribute('data-toolbar-tool')) return 28;
      if (this.hasAttribute('data-toolbar-bar') || this.hasAttribute('data-toolbar-bar-continued')) {
        const n = this.querySelectorAll('[data-toolbar-tool]').length;
        return 17 + n * 28 + Math.max(0, n - 1) * 8;
      }
      return 0;
    });
    const cw = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-toolbar-dock') ? 150 : 0;
    });
    return () => { w.mockRestore(); cw.mockRestore(); };
  };

  it('a group wider than a line with no dividers breaks between its tools, every piece fitting the line, no tool lost', () => {
    const restore = measured();
    try {
      const tools = ['t1', 't2', 't3', 't4', 't5', 't6'];
      const { container } = render(
        <ThemeProvider>
          <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
            <ToolbarDock region="top" rows={[[{ id: 'g', tools }]]} renderTool={(id) => <button aria-label={id}>{id}</button>} />
          </AccessibilityProfileProvider>
        </ThemeProvider>,
      );
      // natural 17 + 6×28 + 5×8 = 225 against 142 of room
      expect(container.querySelectorAll('[data-toolbar-bar-continued="g"]').length).toBeGreaterThan(0);
      const pieces = Array.from(container.querySelectorAll<HTMLElement>('[data-toolbar-bar="g"], [data-toolbar-bar-continued="g"]'));
      for (const p of pieces) expect(p.offsetWidth).toBeLessThanOrEqual(142);
      expect(Array.from(container.querySelectorAll('[data-toolbar-tool]')).map((t) => t.getAttribute('data-toolbar-tool'))).toEqual(tools);
    } finally { restore(); }
  });

  it('a broken group READS AS ONE: every piece but the last runs to its line\'s end and is marked as continuing; the last is not', () => {
    const restore = measured();
    try {
      const { container } = render(
        <ThemeProvider>
          <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
            <ToolbarDock region="top" groupStyle="islands" rows={[[{ id: 'g', tools: ['t1', 't2', 't3', 't4', 't5', 't6'] }]]} renderTool={(id) => <button aria-label={id}>{id}</button>} />
          </AccessibilityProfileProvider>
        </ThemeProvider>,
      );
      const pieces = Array.from(container.querySelectorAll<HTMLElement>('[data-toolbar-bar="g"], [data-toolbar-bar-continued="g"]'));
      expect(pieces.length).toBeGreaterThan(1);
      pieces.slice(0, -1).forEach((p) => expect(p.hasAttribute('data-toolbar-continues')).toBe(true));
      expect(pieces[pieces.length - 1].hasAttribute('data-toolbar-continues')).toBe(false);
    } finally { restore(); }
  });

  it('with joinBrokenGroups off (a Debug option) the pieces keep their own width and closed edges', () => {
    const restore = measured();
    try {
      const { container } = render(
        <ThemeProvider>
          <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
            <ToolbarDock region="top" groupStyle="islands" joinBrokenGroups={false} rows={[[{ id: 'g', tools: ['t1', 't2', 't3', 't4', 't5', 't6'] }]]} renderTool={(id) => <button aria-label={id}>{id}</button>} />
          </AccessibilityProfileProvider>
        </ThemeProvider>,
      );
      expect(container.querySelectorAll('[data-toolbar-bar-continued="g"]').length).toBeGreaterThan(0);
      expect(container.querySelector('[data-toolbar-continues]')).toBeNull();
      expect(container.querySelector('.toolbar-dock__bar--continues')).toBeNull();
    } finally { restore(); }
  });
});

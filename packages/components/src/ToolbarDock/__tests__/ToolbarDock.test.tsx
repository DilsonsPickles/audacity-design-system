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

  it('a SIDE dock stacks every row\'s bars in one column', () => {
    const { container } = render(
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <ToolbarDock region="left" rows={THREE_ROWS} renderTool={(id) => (id === 'gone' ? null : <button aria-label={id}>{id}</button>)} insert={{ region: 'left', row: 2, beforeBarId: 'c' }} />
        </AccessibilityProfileProvider>
      </ThemeProvider>,
    );
    expect(container.querySelectorAll('.toolbar-dock__row')).toHaveLength(1);
    expect(Array.from(container.querySelectorAll('[data-toolbar-bar]')).map((b) => b.getAttribute('data-toolbar-bar'))).toEqual(['a', 'b', 'c']);
    expect((container.querySelector('.toolbar-dock__insert') as HTMLElement).parentElement).toBe(container.querySelector('[data-toolbar-bar="c"] .toolbar-dock__grip'));
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
    const FIVE = [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'] }]];
    const wrap = (props: Partial<ToolbarDockProps>) => (
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <ToolbarDock region="top" rows={FIVE} renderTool={(id) => <button aria-label={id}>{id}</button>} {...props} />
        </AccessibilityProfileProvider>
      </ThemeProvider>
    );
    const inline = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-toolbar-bar] [data-toolbar-tool]')).map((t) => t.getAttribute('data-toolbar-tool'));

    it('a bar narrower than its tools keeps what fits and puts the rest behind the overflow button, which opens them in a flyout', () => {
      const restore = measured();
      try {
        // natural: 17 + 5×28 + 4×8 = 189 — everything inline, no button
        const { container, rerender } = render(wrap({}));
        expect(inline(container)).toEqual(['t1', 't2', 't3', 't4', 't5']);
        expect(container.querySelector('.toolbar-dock__overflow')).toBeNull();
        // 117 wide: 100 of room; less the button and its gap, 64 → two tools
        rerender(wrap({ rows: [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'], width: 117 }]] }));
        expect((container.querySelector('[data-toolbar-bar="e"]') as HTMLElement).style.width).toBe('117px');
        expect(inline(container)).toEqual(['t1', 't2']);
        const button = container.querySelector('[data-toolbar-overflow-button="e"]') as HTMLElement;
        expect(button.getAttribute('aria-label')).toBe('3 more tools');
        fireEvent.click(button);
        expect(Array.from(document.body.querySelectorAll('[data-toolbar-overflow-tool]')).map((t) => t.getAttribute('data-toolbar-overflow-tool'))).toEqual(['t3', 't4', 't5']);
        // wide enough again: the button goes, and its flyout with it
        rerender(wrap({ rows: [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'], width: 400 }]] }));
        expect(inline(container)).toHaveLength(5);
        expect(container.querySelector('.toolbar-dock__overflow')).toBeNull();
      } finally { restore(); }
    });

    it('a vertical dock sizes by HEIGHT and ignores the width', () => {
      const restore = measured();
      try {
        const { container } = render(wrap({ region: 'left', rows: [[{ id: 'e', tools: ['t1', 't2', 't3', 't4', 't5'], width: 50, height: 117 }]] }));
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
        const rows = (width?: number) => [[{ id: 'e', tools: ['t1', 'm', 't2'], ...(width ? { width } : {}) }]];
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
});

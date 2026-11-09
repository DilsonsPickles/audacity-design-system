import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { ToolbarDock, type ToolbarDockProps } from '../ToolbarDock';

afterEach(cleanup);

const BARS = [
  { id: 'a', tools: ['one', 'two'] },
  { id: 'b', tools: ['three'] },
  { id: 'hidden', tools: ['gone'] },
];

function renderDock(props: Partial<ToolbarDockProps> = {}) {
  return render(
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        <ToolbarDock
          region="top"
          bars={BARS}
          renderTool={(id) => (id === 'gone' ? null : <button aria-label={id}>{id}</button>)}
          {...props}
        />
      </AccessibilityProfileProvider>
    </ThemeProvider>,
  );
}

describe('ToolbarDock (2026-11-09, custom toolbars)', () => {
  it('draws each bar with a grip and its tools, a divider between bars, and nothing for a bar whose tools all draw nothing', () => {
    const { container } = renderDock();
    const bars = Array.from(container.querySelectorAll('[data-toolbar-bar]'));
    expect(bars.map((b) => b.getAttribute('data-toolbar-bar'))).toEqual(['a', 'b']);
    expect(bars[0].querySelector('.toolbar-dock__grip')).toBeTruthy();
    expect(Array.from(bars[0].querySelectorAll('[data-toolbar-tool]')).map((t) => t.getAttribute('data-toolbar-tool'))).toEqual(['one', 'two']);
    expect(container.querySelectorAll('.toolbar-dock__divider')).toHaveLength(1);
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
          <ToolbarDock region="left" bars={[]} renderTool={() => null} draggingBarId="a" insertAt={0} />
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
          <ToolbarDock region="top" bars={BARS} renderTool={(id) => (id === 'gone' ? null : <button aria-label={id}>{id}</button>)} {...props} />
        </AccessibilityProfileProvider>
      </ThemeProvider>
    );
    rerender(wrap({ editing: true, toolInsert: { barId: 'b', beforeToolId: null } }));
    expect(container.querySelector('[data-toolbar-bar="b"] .toolbar-dock__tools')!.lastElementChild!.className).toBe('toolbar-dock__caret');
    // a new container before bar b: the line sits in the ROW, not in a bar
    rerender(wrap({ editing: true, insertAt: 1 }));
    const line = container.querySelector('.toolbar-dock__insert') as HTMLElement;
    expect(line.parentElement!.classList.contains('toolbar-dock__row')).toBe(true);
    expect(line.nextElementSibling!.className).toBe('toolbar-dock__divider');
    expect(container.querySelector('.toolbar-dock__caret')).toBeNull();
    // …and at the dock's end
    rerender(wrap({ editing: true, insertAt: 3, insertRefused: true }));
    const last = container.querySelector('.toolbar-dock__insert') as HTMLElement;
    expect(last.classList.contains('toolbar-dock__insert--refused')).toBe(true);
    expect(last.previousElementSibling!.getAttribute('data-toolbar-bar')).toBe('b');
  });
});

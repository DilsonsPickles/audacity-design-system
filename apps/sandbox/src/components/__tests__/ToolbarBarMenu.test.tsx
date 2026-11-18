import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PreferencesProvider, ThemeProvider, type ToolbarLayout } from '@audacity-ui/components';
import { ToolbarBarMenu } from '../ToolbarBarMenu';

afterEach(cleanup);

// The toolbar's menu on its grip (2026-11-16)
const LAYOUT: ToolbarLayout = {
  top: [[{ id: 'title', tools: ['project-tabs'] }], [{ id: 'main', tools: ['play', 'timecode'], name: 'Main toolbar', width: 400 }]],
  bottom: [],
  left: [],
  right: [],
};

function renderMenu(barId: string, opts: { fits?: boolean; addOnly?: boolean; layout?: ToolbarLayout; toolId?: string; beforeToolId?: string | null } = {}) {
  const start = opts.layout ?? LAYOUT;
  let layout = start;
  const editLayout = vi.fn((change: (base: ToolbarLayout) => ToolbarLayout) => { layout = change(layout); });
  const onEditToolbars = vi.fn();
  const utils = render(
    <PreferencesProvider>
    <ThemeProvider>
      <ToolbarBarMenu
        menu={{ barId, x: 10, y: 10, addOnly: opts.addOnly, toolId: opts.toolId, beforeToolId: opts.beforeToolId }}
        onClose={() => {}}
        layout={start}
        editLayout={editLayout}
        fitsVertical={() => opts.fits ?? true}
        onEditToolbars={onEditToolbars}
      />
    </ThemeProvider>
    </PreferencesProvider>,
  );
  const labels = () => Array.from(document.querySelectorAll('.context-menu-item-label')).map((e) => e.textContent);
  const item = (label: string) => Array.from(document.querySelectorAll('.context-menu-item')).find((e) => e.querySelector('.context-menu-item-label')?.textContent === label) as HTMLElement;
  return { ...utils, labels, item, editLayout, onEditToolbars, layout: () => layout };
}

describe('ToolbarBarMenu', () => {
  afterEach(() => localStorage.clear());

  // A FLEXIBLE SPACE (2026-11-18): placed by the right-click
  it('Add flexible space goes before the tool right-clicked, or at the toolbar\'s START (pushing its tools to the far end — at the end it pushed nothing); on a space the item removes it', () => {
    const onTool = renderMenu('main', { toolId: 'timecode' });
    expect(onTool.labels()).toContain('Add flexible space before Timecode');
    fireEvent.click(onTool.item('Add flexible space before Timecode'));
    expect(onTool.layout().top[1][0].tools).toEqual(['play', 'spacer-1', 'timecode']);
    cleanup();
    const onBar = renderMenu('main');
    fireEvent.click(onBar.item('Add flexible space at the start'));
    expect(onBar.layout().top[1][0].tools).toEqual(['spacer-1', 'play', 'timecode']);
    cleanup();
    // THE GAP THE DOCK NAMES (2026-11-18, "anywhere"): a space goes there;
    // a gap at the end goes to the start
    const atGap = renderMenu('main', { toolId: 'play', beforeToolId: 'timecode' });
    fireEvent.click(atGap.item('Add flexible space before Timecode'));
    expect(atGap.layout().top[1][0].tools).toEqual(['play', 'spacer-1', 'timecode']);
    cleanup();
    const atEnd = renderMenu('main', { toolId: 'timecode', beforeToolId: null });
    fireEvent.click(atEnd.item('Add flexible space at the start'));
    expect(atEnd.layout().top[1][0].tools).toEqual(['spacer-1', 'play', 'timecode']);
    cleanup();
    const spaced: ToolbarLayout = { ...LAYOUT, top: [LAYOUT.top[0], [{ id: 'main', tools: ['play', 'spacer-1', 'timecode'] }]] };
    const onSpace = renderMenu('main', { layout: spaced, toolId: 'spacer-1' });
    expect(onSpace.labels()).not.toContain('Add flexible space at the start');
    fireEvent.click(onSpace.item('Remove flexible space'));
    expect(onSpace.layout().top[1][0].tools).toEqual(['play', 'timecode']);
  });

  // ADD TOOL (2026-11-17): the tools not on a toolbar, then this
  // workspace's hidden ones; a pick puts the tool at this toolbar's end,
  // shown — the + on an empty toolbar opens the same list alone
  it('Add tool lists the tools off the toolbars and the hidden ones, and adds a pick at the end', () => {
    localStorage.setItem('audacity-preferences', JSON.stringify({ activeWorkspace: 'classic', workspaceHiddenTools: { classic: ['timecode'] } }));
    const { labels, item, layout } = renderMenu('main', { addOnly: true });
    expect(labels()).toContain('Stop');
    expect(labels()).toContain('Timecode');
    expect(labels()).not.toContain('Play');
    expect(Array.from(document.querySelectorAll('[data-menu-heading]')).map((e) => e.textContent)).toEqual(['Not in a group', 'Hidden']);
    fireEvent.click(item('Stop'));
    expect(layout().top[1][0].tools).toEqual(['play', 'timecode', 'stop']);
  });

  it('the search field filters the list by name, and Enter adds the first match (2026-11-17)', () => {
    const { labels, layout } = renderMenu('main', { addOnly: true });
    const field = document.querySelector('[data-add-tool-search] input') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'stop' } });
    expect(labels()).toEqual(['Stop']);
    fireEvent.change(field, { target: { value: 'zzz' } });
    expect(labels()).toEqual(['No tools match']);
    fireEvent.change(field, { target: { value: 'stop' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(layout().top[1][0].tools).toEqual(['play', 'timecode', 'stop']);
  });

  it('picking a hidden tool shows it again — in this workspace only', () => {
    localStorage.setItem('audacity-preferences', JSON.stringify({ activeWorkspace: 'classic', workspaceHiddenTools: { classic: ['timecode'], music: ['timecode'] } }));
    const { item } = renderMenu('main', { addOnly: true });
    fireEvent.click(item('Timecode'));
    const stored = JSON.parse(localStorage.getItem('audacity-preferences') ?? '{}');
    expect(stored.workspaceHiddenTools.classic).toEqual([]);
    expect(stored.workspaceHiddenTools.music).toEqual(['timecode']);
  });

  it('Move to lists the other toolbars by name; a pick puts this one right after it (2026-11-17)', () => {
    const two: ToolbarLayout = { ...LAYOUT, bottom: [[{ id: 'mine', tools: ['stop'], name: 'Podcast tools' }]] };
    const { item, layout } = renderMenu('mine', { layout: two });
    fireEvent.mouseEnter(item('Move to'));
    expect(Array.from(document.querySelectorAll('[data-menu-heading]')).map((e) => e.textContent)).toContain('After group');
    // the Title bar is never a target
    expect(item('Main toolbar')).toBeTruthy();
    fireEvent.click(item('Main toolbar'));
    expect(layout().top[1].map((b) => b.id)).toEqual(['main', 'mine']);
    expect(layout().bottom).toEqual([]);
  });

  it('heads the menu with the toolbar\'s name, read-only, then its items', () => {
    const { labels } = renderMenu('main');
    expect(document.querySelector('[data-toolbar-menu-name]')?.textContent).toBe('Main toolbar');
    expect(labels()).toEqual(['Rename…', 'Move to', 'Add tool', 'Add divider', 'Add flexible space at the start', 'Reset width', 'New group', 'Edit toolbars…', 'Remove group']);
  });

  it('the Title bar is the app\'s corner: a checklist of its app-level items, then Edit toolbars… (2026-11-16)', () => {
    const { labels, item, layout } = renderMenu('title');
    expect(labels()).toEqual(['Debug', 'Audio setup', 'Workspace', 'Share audio', 'Get effects', 'Mixer', 'Edit toolbars…']);
    // a tick adds an item at the corner's end
    fireEvent.click(item('Share audio'));
    expect(layout().top[0][0].tools).toEqual(['project-tabs', 'share-audio']);
  });

  it('Reset width clears the width; Edit toolbars… asks for the builder on this toolbar', () => {
    const { item, layout, onEditToolbars } = renderMenu('main');
    fireEvent.click(item('Reset width'));
    expect(layout().top[1][0].width).toBeUndefined();
    fireEvent.click(item('Edit toolbars…'));
    expect(onEditToolbars).toHaveBeenCalledWith('main');
  });

  it('Remove toolbar takes it off the layout, silently (2026-11-18, "I hate the \'Toolbar removed\' toast")', () => {
    const { item, layout } = renderMenu('main');
    fireEvent.click(item('Remove group'));
    expect(layout().top.flat().map((b) => b.id)).toEqual(['title']);
    expect(document.body.textContent).not.toContain('Toolbar removed');
  });
});

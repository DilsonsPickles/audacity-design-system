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

function renderMenu(barId: string, opts: { fits?: boolean } = {}) {
  let layout = LAYOUT;
  const editLayout = vi.fn((change: (base: ToolbarLayout) => ToolbarLayout) => { layout = change(layout); });
  const onEditToolbars = vi.fn();
  const utils = render(
    <PreferencesProvider>
    <ThemeProvider>
      <ToolbarBarMenu
        menu={{ barId, x: 10, y: 10 }}
        onClose={() => {}}
        layout={LAYOUT}
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
  it('heads the menu with the toolbar\'s name, read-only, then its items', () => {
    const { labels } = renderMenu('main');
    expect(document.querySelector('[data-toolbar-menu-name]')?.textContent).toBe('Main toolbar');
    expect(labels()).toEqual(['Rename…', 'Move to', 'Add separator', 'Reset width', 'Edit toolbars…', 'Remove toolbar']);
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

  it('Remove toolbar takes it off the layout', () => {
    const { item, layout } = renderMenu('main');
    fireEvent.click(item('Remove toolbar'));
    expect(layout().top.flat().map((b) => b.id)).toEqual(['title']);
  });
});

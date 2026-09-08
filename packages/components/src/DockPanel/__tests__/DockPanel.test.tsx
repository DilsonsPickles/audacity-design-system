import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { DockPanel } from '../DockPanel';
import type { PanelHeaderTab } from '../../PanelHeader';

afterEach(cleanup);

const TABS: PanelHeaderTab[] = [
  { id: 'effects', label: 'Effects', hasMenu: false },
  { id: 'macros', label: 'Macros' },
];

function renderDock(props: Partial<React.ComponentProps<typeof DockPanel>> = {}) {
  return render(
    <ThemeProvider>
      <DockPanel position="left" tabs={TABS} activeTabId="effects" {...props}>
        <div data-testid="dock-content">content</div>
      </DockPanel>
    </ThemeProvider>,
  );
}

describe('DockPanel', () => {
  it('renders tabs and the active tab content', () => {
    const { container } = renderDock();
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="dock-content"]')).not.toBeNull();
  });

  it('reports tab changes', () => {
    const onTabChange = vi.fn();
    const { container } = renderDock({ onTabChange });
    const macrosTab = Array.from(container.querySelectorAll('[role="tab"]'))
      .find((el) => el.textContent?.includes('Macros'));
    fireEvent.click(macrosTab!);
    expect(onTabChange).toHaveBeenCalledWith('macros');
  });

  it('reports close from the header close button', () => {
    const onClose = vi.fn();
    const { container } = renderDock({ onClose });
    fireEvent.click(container.querySelector('button[aria-label="Close panel"]')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('hides the ellipsis menu on tabs with hasMenu: false and shows it otherwise', () => {
    const onMenuClick = vi.fn();
    // Active tab "effects" has hasMenu: false — no menu button rendered
    const { container, unmount } = renderDock({ onMenuClick });
    expect(container.querySelector('button[aria-label="Effects menu"]')).toBeNull();
    unmount();

    // Active tab "macros" has a menu
    const { container: c2 } = renderDock({ activeTabId: 'macros', onMenuClick });
    const menuButton = c2.querySelector('button[aria-label="Macros menu"]');
    expect(menuButton).not.toBeNull();
    fireEvent.click(menuButton!);
    expect(onMenuClick).toHaveBeenCalled();
  });

  it('renders on the requested side', () => {
    const { container } = renderDock({ position: 'right', activeTabId: 'macros' });
    expect(container.querySelector('.side-panel--right')).not.toBeNull();
  });
});

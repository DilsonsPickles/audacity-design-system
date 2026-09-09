import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { FloatingPanel } from '../FloatingPanel';
import type { PanelHeaderTab } from '../../PanelHeader';

afterEach(cleanup);

const TABS: PanelHeaderTab[] = [
  { id: 'macros', label: 'Macros' },
];

function renderPanel(props: Partial<React.ComponentProps<typeof FloatingPanel>> = {}) {
  return render(
    <ThemeProvider>
      <FloatingPanel tabs={TABS} activeTabId="macros" {...props}>
        <div data-testid="floating-content">content</div>
      </FloatingPanel>
    </ThemeProvider>,
  );
}

describe('FloatingPanel', () => {
  it('renders the tab and content in a fixed, non-modal panel', () => {
    const { container } = renderPanel();
    const panel = container.querySelector('.floating-panel') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-modal')).toBe('false');
    expect(panel.getAttribute('aria-label')).toBe('Macros');
    expect(container.querySelector('[data-testid="floating-content"]')).not.toBeNull();
    expect(container.querySelector('[role="tab"]')?.textContent).toContain('Macros');
  });

  it('honors an explicit initial position and size', () => {
    const { container } = renderPanel({ initialPosition: { x: 120, y: 60 }, width: 300, height: 400 });
    const panel = container.querySelector('.floating-panel') as HTMLElement;
    expect(panel.style.left).toBe('120px');
    expect(panel.style.top).toBe('60px');
    expect(panel.style.width).toBe('300px');
    expect(panel.style.height).toBe('400px');
  });

  it('reports close from the header close button', () => {
    const onClose = vi.fn();
    const { container } = renderPanel({ onClose });
    fireEvent.click(container.querySelector('button[aria-label="Close panel"]')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('reports menu clicks from the active tab kebab', () => {
    const onMenuClick = vi.fn();
    const { container } = renderPanel({ onMenuClick });
    fireEvent.click(container.querySelector('button[aria-label="Macros menu"]')!);
    expect(onMenuClick).toHaveBeenCalled();
  });

  it('drags by the header', () => {
    const { container } = renderPanel({ initialPosition: { x: 100, y: 100 } });
    const header = container.querySelector('.floating-panel__header') as HTMLElement;
    const panel = container.querySelector('.floating-panel') as HTMLElement;

    fireEvent.mouseDown(header, { button: 0, clientX: 150, clientY: 110 });
    fireEvent.mouseMove(document, { clientX: 190, clientY: 140 });
    expect(panel.style.left).toBe('140px');
    expect(panel.style.top).toBe('130px');

    // After mouseup, further moves must not drag (listeners self-clean)
    fireEvent.mouseUp(document);
    fireEvent.mouseMove(document, { clientX: 300, clientY: 300 });
    expect(panel.style.left).toBe('140px');
    expect(panel.style.top).toBe('130px');
  });

  it('resizes from the south-east corner, clamped to min size', () => {
    const { container } = renderPanel({
      initialPosition: { x: 100, y: 100 }, width: 300, height: 400, minWidth: 220, minHeight: 240,
    });
    const panel = container.querySelector('.floating-panel') as HTMLElement;
    const se = container.querySelector('.floating-panel__resize--se') as HTMLElement;

    fireEvent.mouseDown(se, { button: 0, clientX: 400, clientY: 500 });
    fireEvent.mouseMove(document, { clientX: 450, clientY: 560 });
    expect(panel.style.width).toBe('350px');
    expect(panel.style.height).toBe('460px');

    // Shrink far past the minimum — clamps
    fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
    expect(panel.style.width).toBe('220px');
    expect(panel.style.height).toBe('240px');
    fireEvent.mouseUp(document);
  });

  it('resizing from the west edge keeps the right edge in place', () => {
    const { container } = renderPanel({ initialPosition: { x: 100, y: 100 }, width: 300, height: 400 });
    const panel = container.querySelector('.floating-panel') as HTMLElement;
    const w = container.querySelector('.floating-panel__resize--w') as HTMLElement;

    fireEvent.mouseDown(w, { button: 0, clientX: 100, clientY: 300 });
    fireEvent.mouseMove(document, { clientX: 60, clientY: 300 });
    // 40px wider, x moved 40px left — right edge (x + width) unchanged at 400
    expect(panel.style.width).toBe('340px');
    expect(panel.style.left).toBe('60px');
    fireEvent.mouseUp(document);
  });

  it('renders no resize handles when resizable is false', () => {
    const { container } = renderPanel({ resizable: false });
    expect(container.querySelector('.floating-panel__resize')).toBeNull();
  });

  it('does not start a drag from the header buttons', () => {
    const { container } = renderPanel({ initialPosition: { x: 100, y: 100 }, onClose: vi.fn() });
    const closeButton = container.querySelector('button[aria-label="Close panel"]') as HTMLElement;
    const panel = container.querySelector('.floating-panel') as HTMLElement;

    fireEvent.mouseDown(closeButton, { button: 0, clientX: 150, clientY: 110 });
    fireEvent.mouseMove(document, { clientX: 200, clientY: 160 });
    expect(panel.style.left).toBe('100px');
    expect(panel.style.top).toBe('100px');
  });
});

import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { SidePanel } from '../SidePanel';

afterEach(cleanup);

// jsdom's getBoundingClientRect returns all-zeros, so for a left panel
// newWidth = clientX - rect.left = clientX. The drag helpers below rely
// on that: the clientX we move to IS the resulting (clamped) width.
function mount(props: Partial<React.ComponentProps<typeof SidePanel>> = {}) {
  const onResize = vi.fn();
  const onResizeEnd = vi.fn();
  const utils = render(
    <SidePanel
      position="left"
      width={280}
      resizable
      minWidth={200}
      maxWidth={480}
      onResize={onResize}
      onResizeEnd={onResizeEnd}
      {...props}
    >
      <div>content</div>
    </SidePanel>,
  );
  const panel = utils.container.querySelector('.side-panel') as HTMLElement;
  const handle = utils.container.querySelector('.side-panel__resize-handle') as HTMLElement;
  return { ...utils, panel, handle, onResize, onResizeEnd };
}

describe('SidePanel (2026-11-10, drag-to-resize + double-click reset)', () => {
  it('starts at the given width', () => {
    expect(mount().panel.style.width).toBe('280px');
  });

  it('a drag updates the width live and commits once on mouse-up', () => {
    const { panel, handle, onResize, onResizeEnd } = mount();
    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(document, { clientX: 360 });
    expect(panel.style.width).toBe('360px');
    expect(onResize).toHaveBeenLastCalledWith(360);
    expect(onResizeEnd).not.toHaveBeenCalled();
    fireEvent.mouseUp(document, { clientX: 360 });
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd).toHaveBeenLastCalledWith(360);
  });

  it('clamps the drag between min and max', () => {
    const { panel, handle } = mount();
    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(document, { clientX: 999 }); // > max 480
    expect(panel.style.width).toBe('480px');
    fireEvent.mouseMove(document, { clientX: 10 }); // < min 200
    expect(panel.style.width).toBe('200px');
    fireEvent.mouseUp(document, { clientX: 10 });
  });

  it('double-clicking the handle restores defaultWidth and commits it', () => {
    const { panel, handle, onResizeEnd } = mount({ width: 420, defaultWidth: 280 });
    expect(panel.style.width).toBe('420px');
    fireEvent.doubleClick(handle);
    expect(panel.style.width).toBe('280px');
    expect(onResizeEnd).toHaveBeenLastCalledWith(280);
  });

  it('without defaultWidth the handle has no reset (double-click is a no-op)', () => {
    const { panel, handle, onResizeEnd } = mount({ width: 300 });
    expect(handle.getAttribute('title')).toBeNull();
    fireEvent.doubleClick(handle);
    expect(panel.style.width).toBe('300px');
    expect(onResizeEnd).not.toHaveBeenCalled();
  });

  it('adopts an externally-changed width prop while not resizing', () => {
    const { panel, rerender } = mount();
    rerender(
      <SidePanel position="left" width={340} resizable minWidth={200} maxWidth={480}>
        <div>content</div>
      </SidePanel>,
    );
    expect(panel.style.width).toBe('340px');
  });
});

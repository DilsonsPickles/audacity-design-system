import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { FadeMenuItems } from '../FadeMenuItems';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('FadeMenuItems — the fade handle\'s menu', () => {
  it('"Edit fade-in…" opens the host\'s dialog on that side and closes; "Remove fade-in" removes; no presets given, none listed', () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const onClose = vi.fn();
    const { getByText, queryByText, container } = render(
      <ThemeProvider>
        <FadeMenuItems side="in" state={{ hasFade: true }} onEdit={onEdit} onRemove={onRemove} onClose={onClose} />
      </ThemeProvider>,
    );
    expect(Array.from(container.querySelectorAll('.context-menu-item-label')).map((el) => el.textContent)).toEqual(['Edit fade-in…', 'Remove fade-in']);
    for (const gone of ['Fade-in length…']) expect(queryByText(gone), gone).toBeNull();
    fireEvent.click(getByText('Edit fade-in…'));
    expect(onEdit).toHaveBeenCalledWith('in');
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText('Remove fade-in'));
    expect(onRemove).toHaveBeenCalledWith('in');
  });

  it('Remove shows the key a focused handle takes for it — ⌫ on macOS, Delete on Windows (2026-10-29)', () => {
    const shortcutOf = (os: 'macos' | 'windows') => {
      const { getByText, unmount } = render(
        <ThemeProvider>
          <FadeMenuItems side="in" state={{ hasFade: true }} os={os} />
        </ThemeProvider>,
      );
      const text = getByText('Remove fade-in').closest('.context-menu-item')!.querySelector('.context-menu-item-shortcut')?.textContent;
      unmount();
      return text;
    };
    expect(shortcutOf('macos')).toBe('⌫');
    expect(shortcutOf('windows')).toBe('Delete');
  });

  it('names the other side, and dims Remove while there is no fade', () => {
    const onRemove = vi.fn();
    const { getByText } = render(
      <ThemeProvider>
        <FadeMenuItems side="out" state={{ hasFade: false }} onRemove={onRemove} />
      </ThemeProvider>,
    );
    expect(getByText('Edit fade-out…')).toBeTruthy();
    const remove = getByText('Remove fade-out').closest('.context-menu-item') as HTMLElement;
    expect(remove.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(getByText('Remove fade-out'));
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('lists the curve types first (2026-10-28): each with its curve, the current one checked, its 1–5 key, a pick applies and closes', () => {
    const onShape = vi.fn();
    const onClose = vi.fn();
    const presets = [
      { id: 'default', label: 'S-curve', shape: 2 },
      { id: 'linear', label: 'Linear', shape: 'linear' as const },
      { id: 'equal-power', label: 'Equal power', shape: 1 },
    ];
    const { getByText, container } = render(
      <ThemeProvider>
        <FadeMenuItems side="out" presets={presets} state={{ presetId: 'linear', hasFade: true }} onShape={onShape} onClose={onClose} />
      </ThemeProvider>,
    );
    const labels = Array.from(container.querySelectorAll('.context-menu-item-label')).map((el) => el.textContent);
    expect(labels).toEqual(['S-curve', 'Linear', 'Equal power', 'Edit fade-out…', 'Remove fade-out']);
    expect(container.querySelectorAll('[data-fade-preset-glyph="out"]').length).toBe(3);
    const row = (label: string) => getByText(label).closest('.context-menu-item') as HTMLElement;
    expect(row('Linear').querySelector('.context-menu-item-checkmark svg, .context-menu-item-checkmark [class*="icon"]')).not.toBeNull();
    expect(row('S-curve').querySelector('.context-menu-item-checkmark')?.childElementCount).toBe(0);
    expect(row('Equal power').querySelector('.context-menu-item-shortcut')?.textContent).toBe('3');
    fireEvent.click(getByText('Equal power'));
    expect(onShape).toHaveBeenCalledWith('out', 'equal-power');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

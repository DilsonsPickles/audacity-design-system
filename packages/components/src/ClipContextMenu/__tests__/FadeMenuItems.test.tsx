import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { FadeMenuItems } from '../FadeMenuItems';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

describe('FadeMenuItems — the fade handle\'s menu is two items (2026-10-14)', () => {
  it('"Edit fade-in…" opens the host\'s dialog on that side and closes; "Remove fade-in" removes; no presets, no length item', () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const onClose = vi.fn();
    const { getByText, queryByText, container } = render(
      <ThemeProvider>
        <FadeMenuItems side="in" state={{ hasFade: true }} onEdit={onEdit} onRemove={onRemove} onClose={onClose} />
      </ThemeProvider>,
    );
    expect(Array.from(container.querySelectorAll('.context-menu-item-label')).map((el) => el.textContent)).toEqual(['Edit fade-in…', 'Remove fade-in']);
    for (const gone of ['S-curve', 'Linear', 'Fade-in length…']) expect(queryByText(gone), gone).toBeNull();
    fireEvent.click(getByText('Edit fade-in…'));
    expect(onEdit).toHaveBeenCalledWith('in');
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText('Remove fade-in'));
    expect(onRemove).toHaveBeenCalledWith('in');
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
});

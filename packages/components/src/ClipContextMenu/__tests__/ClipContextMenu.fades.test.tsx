import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { ClipContextMenu } from '../ClipContextMenu';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

const presets = [{ id: 'default', label: 'S-curve' }, { id: 'linear', label: 'Linear' }, { id: 'fast', label: 'Fast' }];

describe('ClipContextMenu › Fade-in ▸ / Fade-out ▸ parents — the handle menu\'s list (2026-10-06; the nouns, at the top level, 2026-10-07)', () => {
  it('each side lists the presets with the current one checked, then length… and remove (dimmed without a fade)', () => {
    const onFadeShape = vi.fn();
    const onFadeIn = vi.fn();
    const onRemoveFade = vi.fn();
    const onClose = vi.fn();
    const { getByText, queryByText } = render(
      <ThemeProvider>
        <ClipContextMenu
          isOpen x={0} y={0} onClose={onClose}
          fadePresets={presets}
          fadeInState={{ presetId: 'linear', hasFade: true }}
          fadeOutState={{ hasFade: false }}
          onFadeShape={onFadeShape} onFadeIn={onFadeIn} onRemoveFade={onRemoveFade}
        />
      </ThemeProvider>,
    );
    // No Fade ▸ parent any more: the two nouns are parents themselves
    expect(queryByText('Fade')).toBeNull();
    fireEvent.mouseEnter(getByText('Fade-in'));
    const linear = getByText('Linear').closest('[role="menuitem"], .context-menu-item') as HTMLElement;
    expect(linear.getAttribute('aria-checked') ?? linear.querySelector('[class*="check"]') ? 'checked' : null).toBeTruthy();
    expect(getByText('Fade-in length…')).toBeTruthy();
    fireEvent.click(getByText('Fast'));
    expect(onFadeShape).toHaveBeenCalledWith('in', 'fast');
    fireEvent.click(getByText('Remove fade-in'));
    expect(onRemoveFade).toHaveBeenCalledWith('in');
    fireEvent.click(getByText('Fade-in length…'));
    expect(onFadeIn).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(getByText('Fade-out'));
    const remove = getByText('Remove fade-out').closest('[role="menuitem"], .context-menu-item') as HTMLElement;
    expect(remove.getAttribute('aria-disabled') === 'true' || remove.classList.toString().includes('disabled')).toBe(true);
    // The old bare pair is gone with presets wired
    expect(queryByText('Fade in…')).toBeNull();
  });

  it('without presets, the old pair of verbs as plain items', () => {
    const onFadeOut = vi.fn();
    const { getByText } = render(
      <ThemeProvider>
        <ClipContextMenu isOpen x={0} y={0} onClose={vi.fn()} onFadeOut={onFadeOut} />
      </ThemeProvider>,
    );
    fireEvent.click(getByText('Fade out…'));
    expect(onFadeOut).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { EffectsPanel, type EffectsPanelProps } from '../EffectsPanel';

afterEach(cleanup);

const renderPanel = (props: Partial<EffectsPanelProps>) => render(
  <ThemeProvider>
    <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
      <EffectsPanel
        mode="embedded"
        trackSection={{ trackName: 'Audio 1', allEnabled: true, effects: [{ id: 'a', name: 'Reverb', enabled: true }, { id: 'b', name: 'Echo', enabled: true }] }}
        masterSection={{ allEnabled: true, effects: [{ id: 'c', name: 'Limiter', enabled: true }] }}
        {...props}
      />
    </AccessibilityProfileProvider>
  </ThemeProvider>,
);

describe('EffectsPanel layout (2026-11-10, the panel docked in the bottom drawer)', () => {
  it('stacked (the default, a side dock): the master section under the track section with the resize handle between, at its own height', () => {
    const { container } = renderPanel({});
    expect(container.querySelector('.effects-panel--columns')).toBeNull();
    expect(container.querySelector('.effects-panel__vertical-resize-handle')).toBeTruthy();
    expect((container.querySelector('.effects-panel__content > .effects-panel__master-section') as HTMLElement).style.height).toBe('230px');
  });

  it('columns (the bottom drawer): the sections side by side — no resize handle, no fixed master height — every slot still drawn', () => {
    const { container } = renderPanel({ layout: 'columns' });
    expect(container.querySelector('.effects-panel--columns')).toBeTruthy();
    expect(container.querySelector('.effects-panel__vertical-resize-handle')).toBeNull();
    expect((container.querySelector('.effects-panel__content > .effects-panel__master-section') as HTMLElement).style.height).toBe('');
    expect(container.querySelectorAll('.effect-slot')).toHaveLength(3);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { SelectionToolbar } from '../SelectionToolbar';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          {children}
        </AccessibilityProfileProvider>
      </ThemeProvider>
    </PreferencesProvider>
  );
}

describe('SelectionToolbar — the live state slot (2026-11-05)', () => {
  it('shows the state text at the start of the right-hand group, before the Selection label, and nothing when there is none', () => {
    const { container, rerender } = render(
      <Providers><SelectionToolbar selectionStart={null} selectionEnd={null} stateText="Speed 110%" /></Providers>,
    );
    const state = container.querySelector('[data-status-state]') as HTMLElement;
    expect(state.textContent).toBe('Speed 110%');
    const right = container.querySelector('.selection-toolbar__right') as HTMLElement;
    expect(right.firstElementChild).toBe(state);
    // The left side is untouched: status, then the instruction
    expect(container.querySelector('.selection-toolbar__status-text')?.textContent).toBe('Stopped');
    rerender(<Providers><SelectionToolbar selectionStart={null} selectionEnd={null} /></Providers>);
    expect(container.querySelector('[data-status-state]')).toBeNull();
  });
});

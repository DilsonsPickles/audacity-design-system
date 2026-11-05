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

describe('SelectionToolbar — the two slots of the Status/Info bar spec (2026-11-05)', () => {
  it('slot one is the playback cue and slot two the info line, each the host\'s text; the defaults are Stopped and the select hint', () => {
    const { container, rerender } = render(
      <Providers><SelectionToolbar selectionStart={null} selectionEnd={null} /></Providers>,
    );
    const cue = () => container.querySelector('.selection-toolbar__status-text')?.textContent;
    const info = () => container.querySelector('.selection-toolbar__instruction-text')?.textContent;
    expect(cue()).toBe('Stopped');
    expect(info()).toBe('Click and drag to select audio');
    rerender(
      <Providers><SelectionToolbar selectionStart={null} selectionEnd={null} status="Playing at 110%" instructionText="Playback speed: 110%" /></Providers>,
    );
    expect(cue()).toBe('Playing at 110%');
    expect(info()).toBe('Playback speed: 110%');
    // The cue sits before the info line, a divider between them
    const left = container.querySelector('.selection-toolbar__left') as HTMLElement;
    expect(Array.from(left.children).map((c) => c.className)).toEqual([
      'selection-toolbar__status', 'selection-toolbar__divider', 'selection-toolbar__instruction',
    ]);
  });
});

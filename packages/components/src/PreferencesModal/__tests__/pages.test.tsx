import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { EditingPage } from '../pages/EditingPage';
import { ShortcutsPage } from '../pages/ShortcutsPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { GeneralPage } from '../pages/GeneralPage';
import { AppearancePage } from '../pages/AppearancePage';
import { PluginsPage } from '../pages/PluginsPage';
import { CloudPage } from '../pages/CloudPage';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <ThemeProvider>
        <AccessibilityProfileProvider>{children}</AccessibilityProfileProvider>
      </ThemeProvider>
    </PreferencesProvider>
  );
}

describe('preferences pages render', () => {
  it('EditingPage renders', () => {
    const { container } = render(
      <Providers>
        <EditingPage />
      </Providers>
    );
    expect(container.querySelector('.preferences-page')).toBeTruthy();
  });

  it('ShortcutsPage renders', () => {
    const { container } = render(
      <Providers>
        <ShortcutsPage />
      </Providers>
    );
    expect(container.querySelector('.preferences-page')).toBeTruthy();
  });

  it('PlaceholderPage renders', () => {
    const { container } = render(
      <Providers>
        <PlaceholderPage title="Test Page" />
      </Providers>
    );
    expect(container.querySelector('.preferences-page')).toBeTruthy();
    expect(container.textContent).toContain('Test Page');
  });

  it('GeneralPage renders', () => {
    const { container } = render(
      <Providers>
        <GeneralPage />
      </Providers>
    );
    expect(container.querySelector('.preferences-page')).toBeTruthy();
  });

  it('AppearancePage renders', () => {
    const { container } = render(
      <Providers>
        <AppearancePage />
      </Providers>
    );
    expect(container.querySelector('.preferences-page')).toBeTruthy();
  });

  it('PluginsPage renders', () => {
    const { container } = render(
      <Providers>
        <PluginsPage />
      </Providers>
    );
    expect(container.querySelector('.preferences-page')).toBeTruthy();
  });

  it('CloudPage renders', () => {
    const { container } = render(
      <Providers>
        <CloudPage />
      </Providers>
    );
    expect(container.querySelector('.preferences-page')).toBeTruthy();
  });
});

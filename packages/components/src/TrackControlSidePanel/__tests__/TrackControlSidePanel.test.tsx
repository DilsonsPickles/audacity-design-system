import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { lightTheme, darkTheme, type ThemeTokens } from '@audacity-ui/tokens';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { TrackControlSidePanel } from '../TrackControlSidePanel';
import { TrackControlPanel } from '../../TrackControlPanel';

afterEach(cleanup);

function renderPanel(theme: ThemeTokens) {
  return render(
    <ThemeProvider theme={theme}>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        <TrackControlSidePanel>{[]}</TrackControlSidePanel>
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

describe('TrackControlSidePanel — Add-new button rail override', () => {
  // The header's Add-new button carries a scoped !important background
  // (TrackControlSidePanel.css) because the shared secondary button token
  // has no contrast against the recessed rail. Those CSS rules read
  // --tcsp-add-btn-bg-* vars; if the component stops wiring them from the
  // theme, the hardcoded light-grey CSS fallbacks win in EVERY theme —
  // which is exactly the dark-mode bug this suite pins down.
  it('wires --tcsp-add-btn-bg-* from the dark theme tokens', () => {
    const { container } = renderPanel(darkTheme);
    const panel = container.querySelector('.track-control-side-panel') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.style.getPropertyValue('--tcsp-add-btn-bg-idle')).toBe(
      darkTheme.background.trackHeader.addButton.idle,
    );
    expect(panel.style.getPropertyValue('--tcsp-add-btn-bg-hover')).toBe(
      darkTheme.background.trackHeader.addButton.hover,
    );
    expect(panel.style.getPropertyValue('--tcsp-add-btn-bg-active')).toBe(
      darkTheme.background.trackHeader.addButton.active,
    );
  });

  it('wires --tcsp-add-btn-bg-* from the light theme tokens', () => {
    const { container } = renderPanel(lightTheme);
    const panel = container.querySelector('.track-control-side-panel') as HTMLElement;
    expect(panel.style.getPropertyValue('--tcsp-add-btn-bg-idle')).toBe(
      lightTheme.background.trackHeader.addButton.idle,
    );
  });

  // Locks the approved light-mode design: the token values must equal the
  // hexes that used to live only as CSS fallbacks.
  it('light addButton tokens preserve the original approved greys', () => {
    expect(lightTheme.background.trackHeader.addButton).toEqual({
      idle: '#C0C1C9',
      hover: '#B4B5BE',
      active: '#A8AAB3',
    });
  });

  it('dark addButton tokens differ from the light greys', () => {
    expect(darkTheme.background.trackHeader.addButton.idle).not.toBe(
      lightTheme.background.trackHeader.addButton.idle,
    );
  });
});

describe('TrackControlSidePanel — right-click opens the row menu', () => {
  function renderRows(onDeleteTrack = () => {}) {
    return render(
      <ThemeProvider theme={lightTheme}>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <TrackControlSidePanel trackHeights={[114, 114]} onDeleteTrack={onDeleteTrack}>
            <TrackControlPanel trackName="Vocals" trackIndex={0} />
            <TrackControlPanel trackName="Guitar" trackIndex={1} />
          </TrackControlSidePanel>
        </AccessibilityProfileProvider>
      </ThemeProvider>,
    );
  }

  it('right-clicking a row opens the same menu the kebab does, at the pointer', () => {
    const { container } = renderRows();
    expect(container.querySelector('[role="menu"]')).toBeNull();
    const row = container.querySelectorAll('.track-control-side-panel__track')[1] as HTMLElement;
    fireEvent.contextMenu(row, { clientX: 140, clientY: 260 });
    const menu = container.querySelector('[role="menu"]') as HTMLElement | null;
    expect(menu).not.toBeNull();
    expect(menu!.textContent).toContain('Delete');
    expect(menu!.style.left).toBe('140px');
    expect(menu!.style.top).toBe('260px');
  });

  it('the menu acts on the row that was right-clicked', () => {
    const onDeleteTrack = vi.fn();
    const { container } = renderRows(onDeleteTrack);
    const row = container.querySelectorAll('.track-control-side-panel__track')[1] as HTMLElement;
    fireEvent.contextMenu(row, { clientX: 100, clientY: 100 });
    const del = Array.from(container.querySelectorAll('[role="menuitem"]')).find((el) => el.textContent?.trim() === 'Delete');
    expect(del).toBeDefined();
    fireEvent.click(del!);
    expect(onDeleteTrack).toHaveBeenCalledWith(1);
  });

  it('a right-click inside an editable field keeps the browser menu', () => {
    const { container } = renderRows();
    const row = container.querySelectorAll('.track-control-side-panel__track')[0] as HTMLElement;
    const input = document.createElement('input');
    row.appendChild(input);
    const ev = fireEvent.contextMenu(input, { clientX: 10, clientY: 10 });
    expect(ev).toBe(true); // not preventDefault'ed
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });
});

// Integration seam suite — renders the real App tree end-to-end (full
// provider stack, real reducer, real DOM) instead of a single unit in
// isolation. See docs/superpowers/specs/2026-07-11-integration-net-design.md
// (§2) for the seams this suite is meant to cover; this file lands the
// boot test only (Task 1) — later tasks add the rest.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

// audioMockFactory MUST come from './audioMock' (not './integrationHarness')
// — see audioMock.ts's header comment for the circular-import deadlock this
// avoids.
import { audioMockFactory } from './audioMock';
import { renderApp } from './integrationHarness';

vi.mock('@audacity-ui/audio', () => audioMockFactory());

// useRecording (apps/sandbox/src/hooks/useRecording.ts) constructs its own
// sandbox-local RecordingManager (apps/sandbox/src/utils/RecordingManager.ts)
// on mount and calls startMonitoring() — this is a SEPARATE boundary from
// '@audacity-ui/audio' above (RecordingManager imports the real 'tone'
// package directly, it isn't reached through the audio package), so mocking
// '@audacity-ui/audio' alone doesn't stop it. Left unmocked, every renderApp()
// in this file makes a real `new Tone.UserMedia()` call, which throws
// synchronously in jsdom ("param must be an AudioParam" — jsdom has no
// AudioParam) deep inside Tone's Gain/Volume construction; useRecording's
// try/catch swallows it, so tests still pass, but every render dumps a full
// Tone.js stack trace to stderr. That's noise today, but it's also a latent
// footgun: the tests are only "safe" because Tone happens to fail fast and
// synchronously in this environment — if a future Tone.js version changes
// that (e.g. starts failing async, or succeeds and spins up a real
// setInterval-driven meter loop), these tests would start leaking timers or
// hanging. Mocking the class at the RecordingManager module boundary (rather
// than mocking 'tone' itself) is the narrower, more robust fix: it matches
// the audioMock.ts pattern (mock at the boundary the app calls, not the
// third-party internals), and it only needs to satisfy the handful of
// methods useRecording/usePlaybackControls/useAudioDeviceMenu actually call
// on the instance, not Tone's entire Recorder/Meter/UserMedia/Waveform
// surface.
vi.mock('../utils/RecordingManager', () => ({
  RecordingManager: class RecordingManagerMock {
    async startMonitoring(): Promise<void> {}
    async startRecording(): Promise<void> {}
    async stopRecording(): Promise<void> {}
    getIsMonitoring(): boolean {
      return false;
    }
    dispose(): void {}
    static async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
      return [];
    }
    static async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
      return [];
    }
  },
}));

afterEach(cleanup);

describe('App boot', () => {
  it('boots: renders project chrome without crashing', async () => {
    const { container, findByLabelText, getByText } = renderApp();

    // App boots on the Home tab. TransportToolbar (packages/components)
    // early-returns null while activeMenuItem === 'home', so Play/Stop and
    // the rest of the project chrome (timeline ruler, tracks panel) only
    // exist once the user navigates to Project via the real nav button.
    fireEvent.click(getByText('Project'));

    await findByLabelText('Play');
    await findByLabelText('Stop');

    await waitFor(() => {
      expect(container.querySelector('.timeline-ruler')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Preferences: Cmd+, opens the modal; every nav page renders
// Seam: Modal page split (Phase 4) — PreferencesModal.tsx's page switch
// (packages/components/src/PreferencesModal/PreferencesModal.tsx) wired
// end-to-end through the real Cmd+, listener in useKeyboardShortcuts.ts.
// ---------------------------------------------------------------------------

describe('Preferences modal', () => {
  it('opens via Cmd+, and every nav page renders (Music/Advanced options render empty by design)', async () => {
    const { container, getByText } = renderApp();
    fireEvent.click(getByText('Project'));
    await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());

    // The Cmd+, listener lives on `document` (useKeyboardShortcuts.ts), not
    // a focused element — fire directly on document per the task brief.
    fireEvent.keyDown(document, { key: ',', metaKey: true });
    await waitFor(() => expect(container.querySelector('.preferences-modal')).toBeTruthy());

    const sidenav = container.querySelector('.dialog-sidenav');
    expect(sidenav).toBeTruthy();
    const tabs = Array.from(sidenav!.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    const labelOf = (tab: HTMLElement) =>
      tab.querySelector('.dialog-sidenav__label')?.textContent?.trim();

    // Exact order from menuItems.ts — asserting it here also guards against
    // a page silently going missing from the sidenav.
    expect(tabs.map(labelOf)).toEqual([
      'General', 'Accounts', 'Appearance', 'Audio settings', 'Playback/Recording',
      'Audio editing', 'Spectral display', 'Plugins', 'Music', 'Cloud', 'Shortcuts',
      'Advanced options',
    ]);

    const clickTab = (label: string) => {
      const tab = tabs.find((t) => labelOf(t) === label);
      if (!tab) throw new Error(`Preferences nav tab not found: ${label}`);
      fireEvent.click(tab);
    };
    const body = () => container.querySelector('.preferences-modal__body') as HTMLElement;

    // One distinguishing control per real page — proves each page component
    // actually mounts, not just that the tab is selectable.
    const realPages: Array<[label: string, distinguishingText: string]> = [
      ['General', 'Language'],
      ['Accounts', 'MuseHub'], // sandbox's accountsContent slot: MuseHubAccountSection
      ['Appearance', 'Theme'],
      ['Audio settings', 'Host'],
      ['Playback/Recording', 'Playback quality'],
      ['Audio editing', 'Effect behavior'],
      ['Spectral display', 'Selection'],
      ['Plugins', 'Group effects in menus'],
      ['Cloud', 'Generate mixdown for audio.com playback'],
    ];
    for (const [label, text] of realPages) {
      clickTab(label);
      expect(within(body()).getByText(text)).toBeTruthy();
    }

    // Shortcuts page has a search input rather than static text worth
    // matching on — assert its distinguishing control instead.
    clickTab('Shortcuts');
    expect(body().querySelector('input[placeholder="Search"]')).toBeTruthy();

    // Documented quirk (see task brief / PreferencesModal.tsx page switch):
    // 'music' and 'advanced-options' have no case in the page switch, so
    // selecting them renders nothing inside the scroll container. Assert
    // the emptiness as the contract rather than fighting it.
    for (const label of ['Music', 'Advanced options']) {
      clickTab(label);
      const scrollContainer = body().querySelector('.preferences-modal__scroll-container');
      expect(scrollContainer?.children.length).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Theme: switching to Dark re-themes the tree and persists
// Seam: Appearance slice + ThemedApp gate + persistence blob.
// ThemeProvider (packages/components/src/ThemeProvider) carries no
// class/data-theme attribute — it only injects theme tokens as CSS custom
// properties on an inline `style` (see ThemeProvider.tsx). `--focus-color`
// differs between light (#84B5FF) and dark (#60a5fa) themes (see
// packages/tokens/src/themes/{light,dark}.v2.ts), so it's used here as the
// "app itself re-themed" signal instead of a class-name check.
// ---------------------------------------------------------------------------

describe('Theme', () => {
  it('switching to Dark via Appearance re-themes the tree and persists to localStorage', async () => {
    const { container, getByText } = renderApp();
    fireEvent.click(getByText('Project'));
    await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());

    fireEvent.keyDown(document, { key: ',', metaKey: true });
    await waitFor(() => expect(container.querySelector('.preferences-modal')).toBeTruthy());

    const sidenav = container.querySelector('.dialog-sidenav')!;
    const appearanceTab = Array.from(sidenav.querySelectorAll('[role="tab"]')).find(
      (t) => t.querySelector('.dialog-sidenav__label')?.textContent?.trim() === 'Appearance',
    ) as HTMLElement;
    fireEvent.click(appearanceTab);

    // ThemeProvider's wrapper div is identified by carrying --focus-color,
    // not by a stable class name — walk the tree to find it rather than
    // hardcoding a selector that doesn't exist in the source.
    const findThemeWrapper = (): HTMLElement => {
      const divs = Array.from(container.querySelectorAll('div')) as HTMLElement[];
      const found = divs.find((d) => d.style.getPropertyValue('--focus-color') !== '');
      if (!found) throw new Error('ThemeProvider wrapper div (--focus-color) not found');
      return found;
    };

    expect(findThemeWrapper().style.getPropertyValue('--focus-color')).toBe('#84B5FF'); // light default

    const body = container.querySelector('.preferences-modal__body') as HTMLElement;
    const darkLabel = within(body).getByText('Dark');
    const darkRadio = darkLabel.closest('.labeled-radio')?.querySelector('[role="radio"]');
    expect(darkRadio).toBeTruthy();
    fireEvent.click(darkRadio!);

    await waitFor(() => {
      expect(findThemeWrapper().style.getPropertyValue('--focus-color')).toBe('#60a5fa');
    });
    expect(JSON.parse(window.localStorage.getItem('audacity-preferences')!).theme).toBe('dark');
  });
});

// ---------------------------------------------------------------------------
// Loop: toggling Loop drives the audio stub and reflects on the button
// Seam: LoopRegionContext value-provider + consumers (useLoopRegion.ts,
// TransportToolbarContainer.tsx, TransportToolbar.tsx).
//
// The literal "timeline shows the loop band" DOM signature does not exist:
// TimelineRuler (packages/components/src/TimelineRuler/TimelineRuler.tsx)
// paints the loop region with raw Canvas 2D calls (ctx.fillRect with
// loopRegionFill/loopRegionFillInactive colors) — there is no DOM
// element/class that flips. Per this repo's own non-goal ("Canvas pixel
// output verification ... stays visual/manual" —
// docs/superpowers/specs/2026-07-11-integration-net-design.md) and the
// flakiness policy ("drop with a comment naming the manual check"), this
// test uses the Loop button's `transport-button--active` class (a real DOM
// signature reflecting the same loopRegionEnabled state TimelineRuler reads)
// as the primary assertion, with the audio-stub calls as corroborating
// evidence. Manual check: toggle Loop in the running app and confirm the
// timeline ruler's top band highlights across 0..8s.
// ---------------------------------------------------------------------------

describe('Loop', () => {
  it('toggling Loop enables the audio stub loop region (0..8s) and marks the button active', async () => {
    const { container, getByText, audioSpies } = renderApp();
    fireEvent.click(getByText('Project'));
    await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());

    const loopButton = container.querySelector('button[aria-label="Loop"]') as HTMLButtonElement;
    expect(loopButton).toBeTruthy();
    expect(loopButton.className).not.toContain('transport-button--active');

    fireEvent.click(loopButton);

    // Primary: the button reflects the new loopRegionEnabled state.
    await waitFor(() => {
      expect(loopButton.className).toContain('transport-button--active');
    });

    // Secondary: the audio stub saw the default 4-measure region at the
    // app's 120bpm/4-beats-per-measure defaults (characterized in
    // useLoopRegion.test.ts: 0..8s).
    expect(audioSpies.setLoopEnabled).toHaveBeenCalledWith(true);
    expect(audioSpies.setLoopRegion).toHaveBeenCalledWith(0, 8);
  });
});

// ---------------------------------------------------------------------------
// Transport toolbar positions: docked-top (default), floating, docked-bottom
// Seam: TransportToolbarContainer 3-slot seam + useDraggableToolbar.
//
// useDraggableToolbar.ts's zone decision on mouseup depends only on the
// event's clientY vs window.innerHeight (SNAP_PX = 72) — NOT on
// getBoundingClientRect (that's only used to compute the floating drag
// offset), so this is fully drivable in jsdom despite the zero-rect gap;
// no flakiness-policy fallback needed here.
// ---------------------------------------------------------------------------

describe('Transport toolbar positions', () => {
  it('drives toolbarPosition via gripper drag through top -> floating -> bottom -> top', async () => {
    const { container, getByText } = renderApp();
    fireEvent.click(getByText('Project'));
    await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());

    const transportToolbar = () => container.querySelector('.transport-toolbar') as HTMLElement | null;
    const selectionToolbar = () => container.querySelector('.selection-toolbar') as HTMLElement | null;
    const gripper = () => container.querySelector('.toolbar__gripper') as HTMLElement | null;
    // a precedes b in document order (a is earlier).
    const precedes = (a: Element, b: Element) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    // Default slot: docked top. Toolbar renders before the selection
    // toolbar and isn't wrapped in the floating position:fixed container.
    expect(transportToolbar()).toBeTruthy();
    expect(selectionToolbar()).toBeTruthy();
    expect(precedes(transportToolbar()!, selectionToolbar()!)).toBe(true);
    expect(transportToolbar()!.parentElement?.style.position).not.toBe('fixed');

    // Drag to floating: mousedown flips to floating immediately (at the
    // gripper's — zeroed in jsdom — rect); releasing mid-viewport (outside
    // both SNAP_PX=72 edge zones) leaves it floating.
    fireEvent.mouseDown(gripper()!, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(document, { clientX: 100, clientY: Math.round(window.innerHeight / 2) });
    await waitFor(() => {
      expect(transportToolbar()!.parentElement?.style.position).toBe('fixed');
    });

    // Drag to bottom: release within SNAP_PX of the bottom edge.
    fireEvent.mouseDown(gripper()!, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(document, { clientX: 100, clientY: window.innerHeight - 10 });
    await waitFor(() => {
      expect(precedes(selectionToolbar()!, transportToolbar()!)).toBe(true);
    });
    expect(transportToolbar()!.parentElement?.style.position).not.toBe('fixed');

    // Drag back to top: release within SNAP_PX of the top edge.
    fireEvent.mouseDown(gripper()!, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(document, { clientX: 100, clientY: 10 });
    await waitFor(() => {
      expect(precedes(transportToolbar()!, selectionToolbar()!)).toBe(true);
    });
    expect(transportToolbar()!.parentElement?.style.position).not.toBe('fixed');
  });
});

// ---------------------------------------------------------------------------
// Home tab — My accounts: Muse ID is the umbrella identity, not a peer of
// MuseHub/audio.com (Task 3.2d, design review). Muse ID renders full width
// on its own row; MuseHub + audio.com are grouped beneath it under a
// "Connected services" subheading. "Create account" was removed from both
// service cards — with Muse ID SSO, account creation happens once on the
// Muse ID card, so the per-service CTA is redundant.
// ---------------------------------------------------------------------------

describe('Home tab — My accounts', () => {
  it('groups MuseHub + audio.com under "Connected services" beneath the full-width Muse ID card, with no "Create account" CTAs', async () => {
    const { getByText } = renderApp();

    fireEvent.click(getByText('My accounts'));

    const museIdHeading = await screen.findByRole('heading', { name: 'Muse ID' });
    const servicesHeading = screen.getByRole('heading', { name: 'Connected services' });
    const museHubHeading = screen.getByRole('heading', { name: 'MuseHub' });
    const audioComHeading = screen.getByRole('heading', { name: 'audio.com' });

    // Muse ID renders full width, on top, via the --primary modifier.
    expect(museIdHeading.closest('.home-tab__accounts-section--primary')).toBeTruthy();

    // MuseHub + audio.com are nested inside the "Connected services" group,
    // AFTER the Muse ID card in document order.
    const servicesGroup = servicesHeading.closest('.home-tab__accounts-services');
    expect(servicesGroup).toBeTruthy();
    expect(servicesGroup!.contains(museHubHeading)).toBe(true);
    expect(servicesGroup!.contains(audioComHeading)).toBe(true);
    expect(
      !!(museIdHeading.compareDocumentPosition(servicesHeading) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);

    // Sane heading hierarchy: the group's members are subordinate (h3) to
    // the group heading (h2), matching Muse ID's own (h2) level.
    expect(museIdHeading.tagName).toBe('H2');
    expect(servicesHeading.tagName).toBe('H2');
    expect(museHubHeading.tagName).toBe('H3');
    expect(audioComHeading.tagName).toBe('H3');

    // Every service card offers "Sign in" but never "Create account" — the
    // Muse ID card above is the only place an account gets created. Three
    // "Sign in" buttons: Muse ID's own secondary CTA + MuseHub + audio.com.
    expect(screen.queryByText('Create account')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Sign in' })).toHaveLength(3);
  });
});

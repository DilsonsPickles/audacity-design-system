// Integration seam suite — renders the real App tree end-to-end (full
// provider stack, real reducer, real DOM) instead of a single unit in
// isolation. See docs/superpowers/specs/2026-07-11-integration-net-design.md
// (§2) for the seams this suite is meant to cover; this file lands the
// boot test only (Task 1) — later tasks add the rest.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

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
    getInputLevelDb(): number | null {
      return null;
    }
    static setInputGain(): void {}
    static setInputDevice(): void {}
    static getInputDevice(): string | null {
      return null;
    }
    static describeMicError(): string {
      return '';
    }
    static setInputMonitoring(): void {}
    static setIdleMetering(): void {}
    static setMonitoringCutHandler(): void {}
    static async outputIsSpeakers(): Promise<boolean> { return false; }
    static getInputGain(): number {
      return 1;
    }
    static async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
      return [];
    }
    static async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
      return [];
    }
  },
}));

// Clicking 'Project' with no current project fires an unawaited async chain
// (ProjectToolbarContainer.tsx onMenuItemClick -> createNewProject ->
// getProjects -> setIndexedDBProjects) — the same pre-existing app-side
// hazard documented on gotoProject() in EditorLayout.integration.test.tsx
// and tracked in docs/backlog.md ("Async race in createNewProject"). The
// timeline-ruler waitFor the tests use does NOT cover it: the ruler appears
// synchronously from setActiveMenuItem, independent of that chain. If the
// chain is still pending when this file's jsdom environment is torn down
// (load-dependent — only bites under a full-suite run), the late setState
// crashes react-dom with an unhandled "ReferenceError: window is not
// defined". The fake-indexeddb chain needs event-loop turns, not wall time,
// so yielding real macrotasks here lets it settle while `window` still
// exists. Remove alongside EditorLayout's settle helpers once the backlog
// item fixes the ordering in product code.
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  cleanup();
});

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
// Toolbar docks: a bar moves between the four docks by its grip (2026-11-09,
// custom toolbars). Seam: useToolbarBarDrag + useToolbarLayout.
//
// useToolbarBarDrag's drop resolution falls back to the window's edges
// (EDGE_SNAP_PX = 72) when no dock is under the pointer — jsdom has no
// elementsFromPoint and measures every rect as zero — so a release near
// the top or bottom edge is fully drivable here.
// ---------------------------------------------------------------------------

describe('Toolbar docks (2026-11-09, custom toolbars)', () => {
  it('moves a bar between docks by its grip: top -> bottom -> top, and keeps the layout in the preferences', async () => {
    const { container, getByText } = renderApp();
    fireEvent.click(getByText('Project'));
    await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());

    const dock = (region: string) => container.querySelector(`[data-toolbar-dock="${region}"]`) as HTMLElement;
    const bar = () => container.querySelector('[data-toolbar-bar="transport"]') as HTMLElement;
    const grip = () => bar().querySelector('.toolbar-dock__grip') as HTMLElement;

    // The seed: the transport bar on the top dock (the old toolbar's
    // class and tab group kept), the status bar as the bottom dock with
    // its own two bars
    expect(dock('top').classList.contains('transport-toolbar')).toBe(true);
    expect(dock('top').contains(bar())).toBe(true);
    expect(dock('bottom').classList.contains('selection-toolbar')).toBe(true);
    expect(dock('bottom').querySelector('[data-toolbar-bar="status"] .selection-toolbar__status-text')?.textContent).toBe('Stopped');
    expect(dock('bottom').querySelector('[data-toolbar-bar="selection"] [aria-label="Selection start"]')).toBeTruthy();

    // Drag to the bottom edge: jsdom measures nothing, so the window's
    // edge stands in for the dock under the pointer (the old gripper's snap)
    fireEvent.mouseDown(grip(), { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(document, { clientX: 100, clientY: window.innerHeight - 10 });
    fireEvent.mouseUp(document, { clientX: 100, clientY: window.innerHeight - 10 });
    await waitFor(() => expect(dock('bottom').contains(bar())).toBe(true));
    expect(dock('top').contains(bar())).toBe(false);
    // …and its tools came with it
    expect(dock('bottom').querySelector('[aria-label="Play"]')).toBeTruthy();
    const stored = () => JSON.parse(window.localStorage.getItem('audacity-preferences')!).toolbarLayouts.classic;
    expect(stored().bottom.flat().map((b: { id: string }) => b.id)).toContain('transport');

    // Released in the middle of the window, away from every dock: nothing moves
    fireEvent.mouseDown(grip(), { clientX: 300, clientY: 300, button: 0 });
    fireEvent.mouseUp(document, { clientX: 400, clientY: Math.round(window.innerHeight / 2) });
    expect(dock('bottom').contains(bar())).toBe(true);

    // Back to the top edge
    fireEvent.mouseDown(grip(), { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseUp(document, { clientX: 100, clientY: 10 });
    await waitFor(() => expect(dock('top').contains(bar())).toBe(true));
    expect(stored().top.flat().map((b: { id: string }) => b.id)).toContain('transport');

    // The status bar's bars draw wherever they go: the Selection bar to the top dock
    const selectionGrip = dock('bottom').querySelector('[data-toolbar-bar="selection"] .toolbar-dock__grip') as HTMLElement;
    fireEvent.mouseDown(selectionGrip, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseUp(document, { clientX: 100, clientY: 10 });
    await waitFor(() => expect(dock('top').querySelector('[data-toolbar-bar="selection"] [aria-label="Selection start"]')).toBeTruthy());
    expect(dock('bottom').querySelector('[data-toolbar-bar="selection"]')).toBeNull();
  });

  it('A NEW ROW (2026-11-10): a bar dropped on a row\'s edge gets a row of its own, the horizontal line saying so; the row goes when its last bar leaves; a flat stored layout is read as one row', async () => {
    // The first cut stored each dock as a flat list of bars
    const { container, getByText } = renderApp({
      toolbarLayouts: { classic: {
        top: [{ id: 'transport', tools: ['play', 'stop', 'record'] }, { id: 'zoom', tools: ['zoom-in', 'zoom-out'] }],
        // (the cog in the status bar, so the top rows are the two bars alone)
        bottom: [{ id: 'status', tools: ['status-cue', 'status-info'] }, { id: 'customise', tools: ['customise'] }], left: [], right: [],
      } },
    });
    fireEvent.click(getByText('Project'));
    await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());
    const dock = (region: string) => container.querySelector(`[data-toolbar-dock="${region}"]`) as HTMLElement;
    const lines = () => Array.from(dock('top').querySelectorAll('.toolbar-dock__row')).map((l) =>
      Array.from(l.querySelectorAll('[data-toolbar-bar]')).map((b) => b.getAttribute('data-toolbar-bar')));
    const grip = (id: string) => container.querySelector(`[data-toolbar-bar="${id}"] .toolbar-dock__grip`) as HTMLElement;
    expect(lines()).toEqual([['transport', 'zoom']]);

    // jsdom measures nothing: give the top dock's one line its 56px, and
    // the document a dock under the pointer there
    const rectOf = (top: number, height: number) => ({ left: 0, top, width: 1000, height, right: 1000, bottom: top + height, x: 0, y: top, toJSON() { return {}; } }) as DOMRect;
    const firstLine = dock('top').querySelector('.toolbar-dock__row') as HTMLElement;
    firstLine.getBoundingClientRect = () => rectOf(0, 56);
    const doc = document as Document & { elementsFromPoint?: (x: number, y: number) => Element[] };
    doc.elementsFromPoint = (_x, y) => (y <= 56 ? [dock('top')] : []);
    try {
      // The zoom bar, to the row's bottom edge: the line across the dock, then a second row
      fireEvent.mouseDown(grip('zoom'), { clientX: 200, clientY: 28, button: 0 });
      fireEvent.mouseMove(document, { clientX: 200, clientY: 52 });
      expect(dock('top').querySelector('.toolbar-dock__row-insert')).toBeTruthy();
      expect(dock('top').querySelector('.toolbar-dock__insert')).toBeNull();
      fireEvent.mouseUp(document, { clientX: 200, clientY: 52 });
      await waitFor(() => expect(lines()).toEqual([['transport'], ['zoom']]));
      expect(dock('top').querySelector('.toolbar-dock__row-insert')).toBeNull();
      expect(dock('top').querySelectorAll('.toolbar-dock__row-divider')).toHaveLength(1);
      const stored = () => JSON.parse(window.localStorage.getItem('audacity-preferences')!).toolbarLayouts.classic;
      expect(stored().top.map((row: Array<{ id: string }>) => row.map((b) => b.id))).toEqual([['transport'], ['zoom']]);

      // …and above everything: the transport bar to the dock's top edge
      fireEvent.mouseDown(grip('zoom'), { clientX: 200, clientY: 28, button: 0 });
      fireEvent.mouseUp(document, { clientX: 200, clientY: 4 });
      await waitFor(() => expect(lines()).toEqual([['zoom'], ['transport']]));

      // Back into the other row (its middle): the row it left is gone
      fireEvent.mouseDown(grip('transport'), { clientX: 200, clientY: 28, button: 0 });
      fireEvent.mouseUp(document, { clientX: 200, clientY: 28 });
      await waitFor(() => expect(lines()).toEqual([['zoom', 'transport']]));
      expect(stored().top).toHaveLength(1);
    } finally {
      delete doc.elementsFromPoint;
    }
  });

  it('THE COG IS A TOOL (2026-11-10): its own toolbar at the top row\'s end, moved by its grip like any bar; a layout saved without it gets it back', async () => {
    // A layout saved before the cog was a tool
    const { container, getByText } = renderApp({
      toolbarLayouts: { classic: { top: [[{ id: 'transport', tools: ['play', 'stop'] }]], bottom: [[{ id: 'status', tools: ['status-cue', 'status-info'] }]], left: [], right: [] } },
    });
    fireEvent.click(getByText('Project'));
    await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());
    const dock = (region: string) => container.querySelector(`[data-toolbar-dock="${region}"]`) as HTMLElement;
    const cogBar = () => container.querySelector('[data-toolbar-bar="customise"]') as HTMLElement;
    expect(dock('top').contains(cogBar())).toBe(true);
    expect(cogBar().querySelector('[data-customise-toolbar-cog] button[aria-label="Customise toolbar"]')).toBeTruthy();
    expect(dock('top').querySelector('.toolbar-dock__trailing--pinned')).toBeNull(); // no longer pinned
    // By its grip to the bottom edge: the status bar takes it, and it still opens the menu there
    fireEvent.mouseDown(cogBar().querySelector('.toolbar-dock__grip')!, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseUp(document, { clientX: 100, clientY: window.innerHeight - 10 });
    await waitFor(() => expect(dock('bottom').contains(cogBar())).toBe(true));
    fireEvent.click(container.querySelector('[data-customise-toolbar-cog] button') as HTMLElement);
    await waitFor(() => expect(document.body.querySelector('[data-customise-toolbar]')).toBeTruthy());
  });

  it('EDIT MODE: the cog\'s "Rearrange tools…" makes the tools inert and draggable; a tool pulled beside a bar gets a toolbar of its own; Escape leaves; Reset layout restores (2026-11-10)', async () => {
    const { container, getByText } = renderApp();
    fireEvent.click(getByText('Project'));
    await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());
    const dock = (region: string) => container.querySelector(`[data-toolbar-dock="${region}"]`) as HTMLElement;
    const tool = (id: string) => container.querySelector(`[data-toolbar-tool="${id}"]`) as HTMLElement;
    const barIds = (region: string) => Array.from(dock(region).querySelectorAll('[data-toolbar-bar]')).map((b) => b.getAttribute('data-toolbar-bar'));
    const openCog = async () => {
      fireEvent.click(container.querySelector('[data-customise-toolbar-cog] button') as HTMLElement);
      return waitFor(() => {
        const menu = document.body.querySelector<HTMLElement>('[data-customise-toolbar]');
        if (!menu) throw new Error('not yet');
        return menu;
      });
    };

    // At rest: live tools, Reset dimmed (nothing rearranged)
    expect(tool('record').querySelector('.toolbar-dock__tool-body')!.hasAttribute('inert')).toBe(false);
    let menu = await openCog();
    expect((menu.querySelector('[data-customise-reset]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(menu.querySelector('[data-customise-rearrange]') as HTMLElement);
    await waitFor(() => expect(dock('top').classList.contains('toolbar-dock--editing')).toBe(true));
    // Every dock is in the mode, the tools are inert, the cog gave way to Done
    expect(dock('bottom').classList.contains('toolbar-dock--editing')).toBe(true);
    expect(tool('record').querySelector('.toolbar-dock__tool-body')!.hasAttribute('inert')).toBe(true);
    expect(container.querySelector('[data-customise-toolbar-cog]')).toBeNull();
    expect(container.querySelector('.selection-toolbar__instruction-text')?.textContent).toMatch(/^Drag a tool onto a toolbar/);

    // A press that never travels is a click: nothing moves
    fireEvent.mouseDown(tool('record'), { clientX: 200, clientY: 30, button: 0 });
    fireEvent.mouseUp(document, { clientX: 201, clientY: 30 });
    expect(barIds('top')[0]).toBe('transport');
    expect(tool('record').closest('[data-toolbar-bar]')!.getAttribute('data-toolbar-bar')).toBe('transport');

    // Pulled BESIDE the first bar (its grip's strip — jsdom measures every
    // rect as zero, so x < 24 is "beside"): Record gets a bar of its own
    fireEvent.mouseDown(tool('record'), { clientX: 200, clientY: 30, button: 0 });
    fireEvent.mouseMove(document, { clientX: 10, clientY: 10 });
    expect(dock('top').querySelector('.toolbar-dock__insert')).toBeTruthy(); // the new container's line
    expect(container.querySelector('.selection-toolbar__instruction-text')?.textContent).toBe('Release to give it a toolbar of its own');
    fireEvent.mouseUp(document, { clientX: 10, clientY: 10 });
    await waitFor(() => expect(barIds('top').slice(0, 2)).toEqual(['bar-1', 'transport']));
    expect(tool('record').closest('[data-toolbar-bar]')!.getAttribute('data-toolbar-bar')).toBe('bar-1');
    expect(dock('top').querySelector('[data-toolbar-bar="transport"] [data-toolbar-tool="record"]')).toBeNull();
    const stored = () => JSON.parse(window.localStorage.getItem('audacity-preferences')!).toolbarLayouts?.classic;
    expect(stored().top[0][0]).toEqual({ id: 'bar-1', tools: ['record'] });

    // …and another, to the bottom dock: as many containers as wanted
    fireEvent.mouseDown(tool('loop'), { clientX: 200, clientY: 30, button: 0 });
    fireEvent.mouseMove(document, { clientX: 300, clientY: window.innerHeight - 10 });
    fireEvent.mouseUp(document, { clientX: 300, clientY: window.innerHeight - 10 });
    await waitFor(() => expect(barIds('bottom')).toContain('bar-2'));

    // Escape leaves the mode; the tools are live again
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(dock('top').classList.contains('toolbar-dock--editing')).toBe(false));
    expect(tool('record').querySelector('.toolbar-dock__tool-body')!.hasAttribute('inert')).toBe(false);
    // outside the mode a press on a tool picks nothing up
    fireEvent.mouseDown(tool('record'), { clientX: 200, clientY: 30, button: 0 });
    fireEvent.mouseMove(document, { clientX: 300, clientY: window.innerHeight - 10 });
    fireEvent.mouseUp(document, { clientX: 300, clientY: window.innerHeight - 10 });
    expect(tool('record').closest('[data-toolbar-dock]')!.getAttribute('data-toolbar-dock')).toBe('top');

    // Reset layout: the workspace's own bars again
    menu = await openCog();
    const reset = menu.querySelector('[data-customise-reset]') as HTMLButtonElement;
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    await waitFor(() => expect(barIds('top')[0]).toBe('transport'));
    expect(tool('record').closest('[data-toolbar-bar]')!.getAttribute('data-toolbar-bar')).toBe('transport');
    expect(barIds('bottom')).toEqual(['status', 'selection']);
    expect(stored()).toBeUndefined();
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

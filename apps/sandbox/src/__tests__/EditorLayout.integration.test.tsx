// EditorLayout characterization suite — extends the integration net to cover
// the drawer / timeline-ruler / track-management blocks EditorLayout.tsx
// owns BEFORE the decomposition (docs/superpowers/specs/2026-07-11-editor-layout-decomposition-design.md,
// Phase 0). Renders the real App tree via renderApp() (same harness as
// App.integration.test.tsx). These are characterization tests: expectations
// bend to the observed behavior of the current source, not the other way
// around — preserve-not-fix quirks (e.g. the `close-mixer-panel` window
// CustomEvent, the dual mixer-open flags) are asserted as contract.
//
// audioMockFactory MUST come from './audioMock' (not './integrationHarness')
// — see audioMock.ts's header comment for the circular-import deadlock this
// avoids.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

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

// AudioEngineContext.tsx constructs real Tone.js audio nodes at two call
// sites: updateEffectChains's `new Tone.Reverb(...)` (a plain useEffect with
// no try/catch, reached whenever Generate Tracks' fixed seed data — track
// index 0's enabled Reverb effect — is present) and createSynth's
// `new Tone.PolySynth(...)`/`new Tone.PluckSynth(...)` (reached by
// onPlayNote, e.g. clicking in the piano-roll grid). Both build a real
// Gain/Param graph that needs a working Web Audio AudioParam, which jsdom
// doesn't provide (same root incompatibility as the RecordingManager/
// Tone.UserMedia gap documented above).
//
// playMidiNote's own try/catch swallows the synth path's failure, so it
// doesn't fail a test outright — but createSynth's catch block ALSO retries
// `new Tone.PolySynth(Tone.Synth, ...)` on failure, so every failed call
// attempts real Tone construction twice, and each attempt starts Tone's
// global Transport/context machinery (setInterval-driven ticking) before
// failing partway through — machinery that's never torn down (construction
// never completed, so .dispose() never runs) and keeps ticking for the rest
// of this test FILE's run, degrading every subsequent test's timing and
// producing exactly the kind of "occasionally too slow to settle within a
// waitFor" flakiness this suite was chasing before both call sites were
// stubbed. Reverb was uncaught-fatal; the synths were "only" a slow leak —
// both get the same narrow fix (stub the specific export, not all of
// 'tone'), in the same spirit as the RecordingManager mock above.
vi.mock('tone', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tone')>();
  class ReverbStub {
    decay = 1.5;
    preDelay = 0.01;
    wet = { value: 1 };
    toDestination(): this {
      return this;
    }
    connect(): this {
      return this;
    }
    disconnect(): this {
      return this;
    }
    dispose(): this {
      return this;
    }
    generate(): Promise<this> {
      return Promise.resolve(this);
    }
  }
  class SynthStub {
    volume = { value: 0 };
    // PolySynth's real constructor takes a voice class + options
    // (`new Tone.PolySynth(Tone.AMSynth, {...})`) — accept and ignore both.
    constructor(..._args: unknown[]) {
      void _args;
    }
    toDestination(): this {
      return this;
    }
    triggerAttackRelease(): this {
      return this;
    }
    dispose(): this {
      return this;
    }
  }
  return {
    ...actual,
    Reverb: ReverbStub,
    PolySynth: SynthStub,
    PluckSynth: SynthStub,
    // Voice-type markers passed as PolySynth's first constructor arg —
    // AMSynth/FMSynth/DuoSynth/MembraneSynth/MetalSynth/Synth are never
    // instantiated directly in AudioEngineContext, only referenced by
    // identity, so stubbing them to the same no-op class is safe.
    AMSynth: SynthStub,
    FMSynth: SynthStub,
    DuoSynth: SynthStub,
    MembraneSynth: SynthStub,
    MetalSynth: SynthStub,
    Synth: SynthStub,
  };
});

afterEach(cleanup);

// This suite renders the full App tree (real canvas/waveform painting,
// real reducer, 4-5 real tracks) and drives multi-step UI sequences
// (open drawer -> add track -> focus -> switch tabs -> close x2, or
// duplicate-track -> group -> ungroup x3) — measured 2-8s per test even on
// a healthy run. The Vitest default 5000ms test timeout is tight enough to
// occasionally trip on slower/loaded machines despite every test settling
// correctly; give the whole file real headroom rather than fight it
// per-test.
vi.setConfig({ testTimeout: 20000 });

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Runs `fn` up to `attempts` times, swallowing thrown errors on all but the
 * last attempt. Used to wrap the multi-step "seed tracks" flows below
 * against the async createNewProject() -> RESET_STATE race documented on
 * gotoProject() — a race whose window varies enough that even a single
 * settle-and-recheck isn't always enough for the FIRST attempt's own
 * waitFor calls to succeed within their default timeout.
 */
async function retrying(fn: () => Promise<void>, attempts = 3): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fn();
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
    }
  }
}

/**
 * Boots the app straight to the Project tab, past the point every seam
 * below needs (timeline ruler + track panel rendered). Mirrors the
 * `fireEvent.click(getByText('Project')); await waitFor(...)` sequence
 * repeated in App.integration.test.tsx.
 */
async function gotoProject(rendered: ReturnType<typeof renderApp>): Promise<void> {
  const { container, getByText } = rendered;
  fireEvent.click(getByText('Project'));
  await waitFor(() => expect(container.querySelector('.timeline-ruler')).toBeTruthy());

  // Navigating to Project with no currentProjectId fires an ASYNC chain
  // (ProjectToolbarContainer.tsx onMenuItemClick -> App.tsx's
  // createNewProject -> `await saveProject(...)` then
  // `dispatch({ type: 'RESET_STATE' })`) that the ruler's appearance does
  // NOT wait for — EditorLayout renders as soon as activeMenuItem
  // !== 'home', independent of that promise settling. Every test in this
  // file that seeds tracks right after gotoProject() races this: if
  // RESET_STATE lands after the seed, it silently wipes the tracks back
  // to empty (observed as intermittent `trackPanelNames(container) ===
  // []` failures). Yielding a real macrotask here lets the pending
  // IndexedDB write + RESET_STATE dispatch settle before any test
  // proceeds — this is a pre-existing async hazard in the app's own
  // project-bootstrap code, not something specific to the actions this
  // suite drives.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
}

/**
 * Drives the real Debug -> "Generate Tracks" -> Close flow (same UI path
 * App's own DebugPanel exposes) to seed N deterministic tracks: 4 audio
 * tracks named "Track 1".."Track 4" with ids 1..4, one clip each with ids
 * 1, 11, 21, 31 (clip id = trackIterationIndex*10+1 — see AppDialogs.tsx
 * onGenerateTracks). Clip start/duration are Math.random()-seeded in the
 * source (deliberately not characterized here — only the deterministic ids
 * and names are relied on), so no test in this file asserts exact clip
 * pixel geometry from generated tracks.
 */
async function generateTracks(container: HTMLElement, getByText: (text: string) => HTMLElement): Promise<void> {
  await retrying(async () => {
    fireEvent.click(getByText('Debug'));
    const overlay = await waitFor(() => {
      const el = container.querySelector('.dialog-overlay');
      if (!el) throw new Error('Debug dialog did not open');
      return el as HTMLElement;
    });
    fireEvent.click(within(overlay).getByText('Generate Tracks'));
    fireEvent.click(within(overlay).getByText('Close'));
    await waitFor(() => expect(container.querySelector('.dialog-overlay')).toBeFalsy());
    await waitFor(() => expect(trackPanelNames(container).length).toBeGreaterThan(0));

    // Defends against the async createNewProject() -> RESET_STATE race
    // documented on gotoProject(): if that dispatch lands AFTER the
    // SET_TRACKS above (rather than before, which gotoProject's
    // settle-wait is meant to prevent but doesn't 100% guarantee under
    // load), it silently wipes the tracks back to [] a moment later.
    // Re-check after a further real-time settle.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    if (trackPanelNames(container).length === 0) {
      throw new Error('tracks vanished after Generate Tracks (createNewProject race) — retrying');
    }
  });
}

function trackPanels(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.track-control-panel')) as HTMLElement[];
}

function trackPanelNames(container: HTMLElement): string[] {
  return trackPanels(container).map(
    (p) => p.querySelector('.track-control-panel__track-name-text')?.textContent ?? '',
  );
}

function trackMenuButton(container: HTMLElement, index: number): HTMLButtonElement {
  const panel = trackPanels(container)[index];
  if (!panel) throw new Error(`track panel ${index} not found`);
  const btn = panel.querySelector('[aria-label="Track menu"]');
  if (!btn) throw new Error(`Track menu button not found on panel ${index}`);
  return btn as HTMLButtonElement;
}

/** Finds an open ContextMenu's item by its exact visible label. Every
 *  context menu in this app (clip / track / ruler) renders items with
 *  role="menuitem", and only one menu is ever open at a time in these
 *  tests (each interaction below closes its menu before opening another). */
function menuItem(container: HTMLElement, label: string): HTMLElement {
  const item = Array.from(container.querySelectorAll('[role="menuitem"]')).find(
    (el) => el.textContent?.trim() === label,
  );
  if (!item) throw new Error(`menu item "${label}" not found`);
  return item as HTMLElement;
}

/** Closes whichever ContextMenu is currently open (Escape is bound on
 *  `document` with capture — see ContextMenu.tsx). */
function closeOpenMenu(): void {
  fireEvent.keyDown(document, { key: 'Escape' });
}

/**
 * Clicks whatever `getEl()` resolves to, retrying (via waitFor) until it
 * stops throwing. Element getters like clipMenuButton/menuItem throw
 * synchronously when their target isn't in the DOM yet — on this app's full
 * tree (5 tracks, real canvas/waveform rendering) a menu open/close occasionally
 * needs an extra tick to settle between one interaction and the next, so a
 * bare `fireEvent.click(getEl())` is intermittently flaky. This is the
 * retry-safe equivalent used everywhere this file drives a menu.
 */
async function clickWhenReady(getEl: () => HTMLElement): Promise<void> {
  await waitFor(() => {
    fireEvent.click(getEl());
  });
}

function clipEl(container: HTMLElement, clipId: number): HTMLElement {
  const el = container.querySelector(`[data-clip-id="${clipId}"]`);
  if (!el) throw new Error(`clip element ${clipId} not found`);
  return el as HTMLElement;
}

function clipHeaderEl(container: HTMLElement, clipId: number): HTMLElement {
  const el = container.querySelector(`[data-clip-id="${clipId}"] .clip-header`);
  if (!el) throw new Error(`.clip-header for clip ${clipId} not found`);
  return el as HTMLElement;
}

function clipMenuButton(container: HTMLElement, clipId: number): HTMLButtonElement {
  const el = container.querySelector(`[data-clip-id="${clipId}"] button[aria-label="Clip menu"]`);
  if (!el) throw new Error(`Clip menu button for clip ${clipId} not found`);
  return el as HTMLButtonElement;
}

/** Reads whether the "Ungroup clips" item is enabled for the clip whose
 *  menu is CURRENTLY open — the only DOM-observable signal of
 *  `clip.groupId` (no groupId is ever stamped into the DOM directly). */
function isUngroupEnabled(container: HTMLElement): boolean {
  return menuItem(container, 'Ungroup clips').getAttribute('aria-disabled') !== 'true';
}

async function addTrackType(
  container: HTMLElement,
  type: 'Mono' | 'Stereo' | 'Label' | 'MIDI',
): Promise<void> {
  const countBefore = trackPanels(container).length;
  await retrying(async () => {
    // AddTrackFlyout stays open after a selection (its own comment:
    // "Don't close flyout - let user click outside or press Escape" —
    // lets a user add several tracks in a row without reopening the
    // menu). The "Add new" button's click handler TOGGLES
    // `addTrackFlyoutOpen`, so calling this helper a second time (or
    // retrying) while it's still open from a previous call would close
    // it instead of reopening it — Escape first so every attempt starts
    // from the same (closed) state.
    fireEvent.keyDown(document, { key: 'Escape' });

    const addButton = container.querySelector('.track-control-side-panel__header button');
    if (!addButton) throw new Error('"Add new" button not found');
    fireEvent.click(addButton);
    const flyout = await waitFor(() => {
      const el = container.querySelector('.add-track-flyout__body');
      if (!el) throw new Error('Add-track flyout did not open');
      return el as HTMLElement;
    });
    fireEvent.click(within(flyout).getByText(type));
    await waitFor(() => expect(trackPanels(container).length).toBeGreaterThan(countBefore));

    // Same async createNewProject() -> RESET_STATE race documented on
    // gotoProject() can wipe a track added here too (observed
    // empirically — this isn't specific to Generate Tracks). Re-check
    // after a further real-time settle.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    if (trackPanels(container).length <= countBefore) {
      throw new Error('added track vanished (createNewProject race) — retrying');
    }
  });
}

// ---------------------------------------------------------------------------
// Bottom drawer (EditorLayout.tsx ~1709-2055)
// Seam: mixer-open flag (mixerPanelOpen, driven by the "Mixer" toolbar
// button + the `close-mixer-panel` window CustomEvent contract), piano-roll
// auto-open (useAutoOpenPianoRoll firing off TrackControlPanel focus on a
// MIDI track), tab switching/auto-switch (useDrawerTabAutoSwitch), and the
// two independent close paths.
// ---------------------------------------------------------------------------

describe('Bottom drawer', () => {
  it('opens with one mixer channel per non-label track; a MIDI track focus opens Piano roll as a second tab; both close paths remove the drawer', async () => {
    const rendered = renderApp();
    const { container, getByText, findByLabelText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);

    // --- Open Mixer via the real toolbar button ---
    const mixerButton = await findByLabelText('Mixer');
    fireEvent.click(mixerButton);

    const panelHeader = await waitFor(() => {
      const el = container.querySelector('.panel-header');
      if (!el) throw new Error('drawer did not open');
      return el as HTMLElement;
    });

    const tabLabels = () =>
      Array.from(panelHeader.querySelectorAll('.panel-header__tab-label')).map((el) => el.textContent);
    const activeTabLabel = () =>
      panelHeader.querySelector('[role="tab"][aria-selected="true"] .panel-header__tab-label')?.textContent;

    expect(tabLabels()).toEqual(['Mixer']);
    expect(activeTabLabel()).toBe('Mixer');

    // One channel per non-label generated track (4) + the always-present
    // Master channel — MixerPanel.tsx appends Master last.
    await waitFor(() => {
      const names = Array.from(container.querySelectorAll('.mixer-channel__track-name-text')).map(
        (el) => el.textContent,
      );
      expect(names).toEqual(['Track 1', 'Track 2', 'Track 3', 'Track 4', 'Master']);
    });

    // --- Add a MIDI track and focus its control panel — the auto-open
    // path (useAutoOpenPianoRoll fires off SET_FOCUSED_TRACK landing on a
    // 'midi' track; no MIDI clip is required for the drawer to open). ---
    await addTrackType(container, 'MIDI');
    await waitFor(() => expect(trackPanelNames(container)).toContain('MIDI 1'));

    const midiPanel = container.querySelector('[aria-label="MIDI 1 track controls"]') as HTMLElement;
    expect(midiPanel).toBeTruthy();
    act(() => {
      midiPanel.focus();
    });

    // useDrawerTabAutoSwitch: piano-roll "just opened" wins the tab race
    // and becomes active even though Mixer is still open underneath it.
    await waitFor(() => {
      expect(tabLabels()).toEqual(['Mixer', 'Piano roll']);
      expect(activeTabLabel()).toBe('Piano roll');
    });

    // --- Tab switching: click back to Mixer, then forward to Piano roll ---
    const mixerTab = Array.from(panelHeader.querySelectorAll('[role="tab"]')).find(
      (t) => t.querySelector('.panel-header__tab-label')?.textContent === 'Mixer',
    ) as HTMLElement;
    fireEvent.click(mixerTab);
    expect(activeTabLabel()).toBe('Mixer');

    const pianoRollTab = Array.from(panelHeader.querySelectorAll('[role="tab"]')).find(
      (t) => t.querySelector('.panel-header__tab-label')?.textContent === 'Piano roll',
    ) as HTMLElement;
    fireEvent.click(pianoRollTab);
    expect(activeTabLabel()).toBe('Piano roll');

    // --- Close path 1: Piano roll's "Close panel" dispatches
    // SET_PIANO_ROLL_OPEN(false) directly — no CustomEvent involved.
    // useDrawerTabAutoSwitch then falls the active tab back to Mixer
    // since it's still open. ---
    fireEvent.click(container.querySelector('[aria-label="Close panel"]')!);
    await waitFor(() => {
      expect(tabLabels()).toEqual(['Mixer']);
      expect(activeTabLabel()).toBe('Mixer');
    });

    // --- Close path 2: Mixer's "Close panel" dispatches the
    // `close-mixer-panel` window CustomEvent (EditorLayout.tsx
    // handleTabClose) — App's useMixerPanelListener is the only thing
    // that turns that into mixerPanelOpen=false. Asserting the drawer
    // actually disappears proves that listener is wired end-to-end,
    // not just that the event was dispatched. ---
    fireEvent.click(container.querySelector('[aria-label="Close panel"]')!);
    await waitFor(() => expect(container.querySelector('.panel-header')).toBeFalsy());
  });

  it('resizes via PanelHeader top-edge drag (document mousemove/mouseup), clamped to the 144px floor', async () => {
    const rendered = renderApp();
    const { container, getByText, findByLabelText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);

    fireEvent.click(await findByLabelText('Mixer'));
    const panelHeader = await waitFor(() => {
      const el = container.querySelector('.panel-header');
      if (!el) throw new Error('drawer did not open');
      return el as HTMLElement;
    });
    const drawer = panelHeader.parentElement as HTMLElement;

    // Default drawerHeight is 376 (EditorLayout.tsx useState) — jsdom's
    // getBoundingClientRect defaults to an all-zero rect, so a mousemove at
    // clientY<=4 (RESIZE_ZONE) primes `inResizeZone`, and the following
    // mousedown at the same point starts the drag (PanelHeader.tsx).
    expect(drawer.style.height).toBe('376px');
    fireEvent.mouseMove(panelHeader, { clientY: 2 });
    fireEvent.mouseDown(panelHeader, { clientY: 2 });

    // Drag DOWN (increasing clientY) shrinks the drawer — delta = startY -
    // clientY is negative — staying well inside the [144, innerHeight*0.5]
    // clamp so the math is unambiguous (moving up by the same amount would
    // hit the 50vh ceiling in jsdom's default 768px innerHeight).
    fireEvent.mouseMove(document, { clientY: 52 });
    expect(drawer.style.height).toBe('326px');

    fireEvent.mouseUp(document);

    // Listener lifecycle: a further document mousemove after mouseup must
    // NOT keep resizing (onUp removes both listeners).
    fireEvent.mouseMove(document, { clientY: 300 });
    expect(drawer.style.height).toBe('326px');
  });

  it('adding a note to a selected (empty) MIDI clip renders it in the grid', async () => {
    // PianoRollPanel.tsx only mounts NoteGrid when a clip is selected
    // (`{clip ? <NoteGrid /> : <div>Select a MIDI clip to edit</div>}`) —
    // EditorLayout's onAddNote "no selected clip, create one at beat 0"
    // branch is therefore dead from this UI (nothing reaches it without a
    // clip already selected, and selecting one is a prerequisite for the
    // grid to exist at all). The real path to a first MIDI clip is: make a
    // time selection on the MIDI track, right-click it, "Create Empty MIDI
    // Clip" (App.tsx's Time Selection Context Menu, ADD_MIDI_CLIP) — then
    // click the clip to select it. Once selected, adding a note exercises
    // onAddNote's "selectedClip" branch (ADD_MIDI_NOTE), not the dead one.
    const rendered = renderApp();
    const { container } = rendered;
    await gotoProject(rendered);

    await addTrackType(container, 'MIDI');
    await waitFor(() => expect(trackPanelNames(container)).toContain('MIDI 1'));

    // Drag a time selection on the (single, index-0) MIDI track's empty
    // canvas row. Pointer container identified the same way
    // Canvas.integration.test.tsx's getPointerContainer() does (cursor:text
    // + userSelect:none is the combination unique to Canvas's own
    // pointer-handler div — an ancestor scroll wrapper also has
    // cursor:text alone).
    const pointerContainer = Array.from(container.querySelectorAll('div')).find(
      (d) => (d as HTMLElement).style.cursor === 'text' && (d as HTMLElement).style.userSelect === 'none',
    ) as HTMLElement | undefined;
    if (!pointerContainer) throw new Error('Canvas pointer-handler container not found');
    pointerContainer.getBoundingClientRect = () => ({
      top: 0, left: 0, right: 2000, bottom: 2000, width: 2000, height: 2000, x: 0, y: 0,
      toJSON() { return {}; },
    });

    fireEvent.mouseDown(pointerContainer, { clientX: 100, clientY: 50, button: 0 });
    fireEvent.mouseMove(document, { clientX: 300, clientY: 50 });
    fireEvent.mouseUp(document, { clientX: 300, clientY: 50 });

    // Right-click within the now-finalized time selection opens the Time
    // Selection Context Menu (useCanvasPointerHandlers.ts onContextMenu:
    // requires lastMouseButtonRef===2 + an existing timeSelection).
    fireEvent.mouseDown(pointerContainer, { clientX: 200, clientY: 50, button: 2 });
    fireEvent.contextMenu(pointerContainer, { clientX: 200, clientY: 50 });

    await clickWhenReady(() => menuItem(container, 'Create Empty MIDI Clip'));

    const midiClip = await waitFor(() => {
      const el = container.querySelector('[data-clip-id]');
      if (!el) throw new Error('MIDI clip was not created');
      return el as HTMLElement;
    });
    const midiClipId = Number(midiClip.getAttribute('data-clip-id'));

    // Select it — PianoRollPanel only mounts NoteGrid once a clip is
    // selected (see comment above).
    fireEvent.click(clipHeaderEl(container, midiClipId));

    const grid = await waitFor(() => {
      // NoteGrid's root carries no class/testid — identified (same
      // precedent as the Canvas pointer div above) by its distinguishing
      // inline style: cursor:'crosshair' is NoteGrid's default gridCursor
      // before any drag/hover state.
      const el = Array.from(container.querySelectorAll('div')).find(
        (d) => (d as HTMLElement).style.cursor === 'crosshair',
      );
      if (!el) throw new Error('piano-roll NoteGrid container (style cursor:crosshair) not found');
      return el as HTMLElement;
    });

    expect(container.querySelectorAll('[data-note-id]').length).toBe(0);

    // clientY=0 -> yToPitch(0) = 127 - floor(DEFAULT_SCROLL_Y/16) = a
    // mid-keyboard pitch (DEFAULT_SCROLL_Y=928 in the source) — comfortably
    // inside the valid [0,127] range so the click isn't swallowed.
    fireEvent.mouseDown(grid, { clientX: 50, clientY: 0, button: 0 });
    fireEvent.mouseUp(document);

    await waitFor(() => expect(container.querySelectorAll('[data-note-id]').length).toBe(1));
  });
});

// ---------------------------------------------------------------------------
// Timeline ruler (EditorLayout.tsx ~963-1082)
// Seam: ArrowLeft/ArrowRight playhead nudge (snap currently OFF by
// App.tsx's default — characterized as observed, not the snapped branch),
// and the async click-to-play path gated behind
// clickRulerToStartPlayback (default false; enabled here via the ruler's
// own right-click context menu, the only real UI path to it).
// DOM evidence: `.playhead-cursor` (rendered inside the ruler region)
// style.left, which is `12 + position*pixelsPerSecond - scrollX` — pure
// CSS, no canvas-paint non-goal collision. Audio-spy calls are secondary
// corroboration for the click-to-play half only, per the task brief.
// ---------------------------------------------------------------------------

describe('Timeline ruler', () => {
  it('ArrowRight/ArrowLeft nudge the playhead; Shift accelerates the step (snap off, the current default)', async () => {
    const rendered = renderApp();
    await gotoProject(rendered);
    const { container } = rendered;

    const ruler = container.querySelector('[aria-label="Timeline ruler"]') as HTMLElement;
    expect(ruler).toBeTruthy();
    const playhead = () => ruler.querySelector('.playhead-cursor') as HTMLElement;
    // Floating-point 0.1-per-step arithmetic (SET_PLAYHEAD_POSITION stores
    // raw floats) lands style.left a fraction of a px off an exact integer
    // (e.g. "122.00000000000001px") — parse + toBeCloseTo instead of an
    // exact string match.
    const leftPx = () => parseFloat(playhead().style.left);

    act(() => {
      ruler.focus();
    });
    expect(leftPx()).toBeCloseTo(12); // position 0

    fireEvent.keyDown(ruler, { key: 'ArrowRight' });
    expect(leftPx()).toBeCloseTo(22); // 0 -> 0.1s * 100px/s + 12

    fireEvent.keyDown(ruler, { key: 'ArrowRight', shiftKey: true });
    expect(leftPx()).toBeCloseTo(122); // 0.1 -> 1.1s (Shift step = 1s)

    fireEvent.keyDown(ruler, { key: 'ArrowLeft' });
    expect(leftPx()).toBeCloseTo(112); // 1.1 -> 1.0s
  });

  it('click-to-play (enabled via the ruler context menu) moves the playhead and drives the audio stub', async () => {
    const rendered = renderApp();
    const { container, audioSpies } = rendered;
    await gotoProject(rendered);

    const ruler = container.querySelector('[aria-label="Timeline ruler"]') as HTMLElement;

    // clickRulerToStartPlayback defaults to false (App.tsx) — the ruler's
    // own right-click context menu is the only real UI path to flip it.
    fireEvent.contextMenu(ruler, { clientX: 10, clientY: 10 });
    await clickWhenReady(() => menuItem(container, 'Click ruler to start playback'));

    fireEvent.click(ruler, { clientX: 112, clientY: 20 });

    // Primary: playhead moves to (112-12)/100 = 1.0s -> 112px.
    await waitFor(() => {
      expect((ruler.querySelector('.playhead-cursor') as HTMLElement).style.left).toBe('112px');
    });

    // Secondary corroboration: the audio stub was driven at the same time.
    expect(audioSpies.loadClips).toHaveBeenCalled();
    expect(audioSpies.play).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// Track management (TrackControlSidePanel wiring, EditorLayout.tsx ~487-620)
// Seam: onAddTrackType (id/name allocation via Math.max(...)+1, immune to
// gaps left by deletes), onDuplicateTrack (group-copy invariant: fresh
// group iff the WHOLE source group was duplicated), onDeleteTrack (routes
// through confirmTrackDelete's real Dialog when the track has content).
// ---------------------------------------------------------------------------

describe('Track management', () => {
  it('Add new -> Mono allocates the next name number from existing names, not track count', async () => {
    const rendered = renderApp();
    const { container } = rendered;
    await gotoProject(rendered);

    expect(trackPanelNames(container)).toEqual([]);

    await addTrackType(container, 'Mono');
    await waitFor(() => expect(trackPanelNames(container)).toEqual(['Mono 1']));

    await addTrackType(container, 'Mono');
    await waitFor(() => expect(trackPanelNames(container)).toEqual(['Mono 1', 'Mono 2']));
  });

  it('duplicating a track with a fully-grouped clip pair mints a fresh group untethered from the source', async () => {
    const rendered = renderApp();
    const { container, getByText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);
    // Generate Tracks seeds clip ids 1, 11, 21, 31 (track index*10+1) on
    // tracks 1..4 — track index 0 ("Track 1") holds clip id 1.

    // --- Build a second clip on track 0 via the real Cmd+D clip-duplicate
    // path (a different EditorLayout-adjacent handler than the one under
    // test, but the only real-UI way to get 2 clips on one generated
    // track without relying on the same random geometry Generate Tracks
    // produces). nextClipId is allocated as max(all clip ids)+1 = 32. ---
    act(() => {
      clipEl(container, 1).focus();
    });
    fireEvent.keyDown(document, { key: 'd', metaKey: true });
    await waitFor(() => expect(clipEl(container, 32)).toBeTruthy());

    // --- Select both clips on track 0 (clip 32 is already selected by the
    // duplicate; Cmd+click clip 1's header toggles it INTO the selection
    // without dropping clip 32 — TOGGLE_CLIP_SELECTION leaves other
    // clips' `selected` alone, per selectionReducer.ts). ---
    fireEvent.click(clipHeaderEl(container, 1), { metaKey: true });

    // --- Group them via the real Clip menu -> "Group clips" path
    // (enabled once >=2 clips are selected). ---
    await clickWhenReady(() => clipMenuButton(container, 1));
    await waitFor(() => expect(menuItem(container, 'Group clips').getAttribute('aria-disabled')).not.toBe('true'));
    await clickWhenReady(() => menuItem(container, 'Group clips'));

    // Sanity: both clips are now grouped (Ungroup enabled on each).
    await clickWhenReady(() => clipMenuButton(container, 1));
    await waitFor(() => expect(isUngroupEnabled(container)).toBe(true));
    closeOpenMenu();
    await clickWhenReady(() => clipMenuButton(container, 32));
    await waitFor(() => expect(isUngroupEnabled(container)).toBe(true));
    closeOpenMenu();

    // --- Duplicate track 0 via the real TrackControlSidePanel "Duplicate"
    // path (the block under test). nextClipId is now
    // max(1,11,21,31,32)+1=33, so the clones land at ids 33 (clone of 1)
    // and 34 (clone of 32). ---
    await clickWhenReady(() => trackMenuButton(container, 0));
    await clickWhenReady(() => menuItem(container, 'Duplicate'));

    // Dropped adjacent to its source (insertAt: idx+1), per EditorLayout's
    // onDuplicateTrack comment.
    await waitFor(() => {
      expect(clipEl(container, 33)).toBeTruthy();
      expect(clipEl(container, 34)).toBeTruthy();
      expect(trackPanelNames(container)[1]).toBe('Track 1 (copy)');
    });

    // --- Group-copy invariant, proven entirely through DOM-observable
    // Ungroup-enabled state (no groupId is ever stamped into the DOM):
    // the whole source group (clips 1+32) was copied whole, so the clones
    // (33+34) come out grouped together in a FRESH group — never sharing
    // the source's group. ---
    await clickWhenReady(() => clipMenuButton(container, 33));
    await waitFor(() => expect(isUngroupEnabled(container)).toBe(true)); // clone has *a* group
    await clickWhenReady(() => menuItem(container, 'Ungroup clips')); // ungroups whatever group clip 33 is in

    // If 33 and 34 shared the clone group, ungrouping via 33 cleared 34's
    // groupId too.
    await clickWhenReady(() => clipMenuButton(container, 34));
    await waitFor(() => expect(isUngroupEnabled(container)).toBe(false));
    closeOpenMenu();

    // The SOURCE group (clips 1+32) must be untouched — proving the
    // clones' group was a distinct, fresh id, not a reference to the
    // source's.
    await clickWhenReady(() => clipMenuButton(container, 1));
    await waitFor(() => expect(isUngroupEnabled(container)).toBe(true));
    closeOpenMenu();
  });

  it('deleting a track with content routes through the confirm dialog and reindexes the remaining tracks', async () => {
    const rendered = renderApp();
    const { container, getByText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);

    expect(trackPanelNames(container)).toEqual(['Track 1', 'Track 2', 'Track 3', 'Track 4']);

    await clickWhenReady(() => trackMenuButton(container, 1)); // "Track 2"
    await clickWhenReady(() => menuItem(container, 'Delete'));

    const overlay = await waitFor(() => {
      const el = container.querySelector('.dialog-overlay');
      if (!el) throw new Error('delete-confirm dialog did not open');
      return el as HTMLElement;
    });
    // Dialog.tsx always appends a live "(${currentWidth}px)" suffix to its
    // title (0px here — jsdom never lays out a real width) — match the
    // prefix rather than the exact title text.
    expect(within(overlay).getByText(/^Delete track\?/)).toBeTruthy();
    fireEvent.click(within(overlay).getByText('Delete'));

    await waitFor(() => {
      expect(trackPanelNames(container)).toEqual(['Track 1', 'Track 3', 'Track 4']);
    });
  });
});

// ---------------------------------------------------------------------------
// Focus routing (EditorLayout.tsx onTabOut/onShiftTabOut ~906-947,
// onShiftTabFromTrack ~1338-1374, onTabFromLastClip ~1375-1420,
// onRulerNavigateVertical ~1579-1617, onTabFromRuler/onShiftTabFromRuler
// ~1527-1578). These are the manual `document.querySelector` focus walks
// Task 1.1 will extract to utils — this net protects their DOM-query
// selector strings (`[aria-label*="track controls"]`, `[data-track-index]`,
// `[data-track-ruler-index]`, `[data-first-clip="true"]`, `[data-clip-id]`)
// and the cross-block `timelineRulerRef` hand-off between the track-panel
// column and the ruler column.
//
// Default accessibility profile is 'au4' (hierarchical tab nav, not flat),
// so these handlers are live — see AccessibilityProfileProvider's
// initialProfileId default and AU4_TAB_GROUPS_PROFILE's
// tabNavigation: 'hierarchical' (packages/core/src/accessibility/profiles.ts).
// showVerticalRulers defaults to true (App.tsx), so `[data-track-ruler-index]`
// elements are focusable throughout.
//
// Generate Tracks seeds 4 audio tracks (ids 1-4, clip ids 1/11/21/31 — see
// generateTracks()'s comment above), one clip per track, each clip being
// that track's [data-first-clip="true"].
// ---------------------------------------------------------------------------

describe('Focus routing', () => {
  it('Tab off a track-control-panel child (not the panel itself) jumps straight to that track\'s first clip — TrackControlPanel.onTabOut', async () => {
    const rendered = renderApp();
    const { container, getByText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);

    // Focus a child control INSIDE track 0's panel via direct .focus() (not
    // a mouse click) — TrackControlPanel's childTabIndex is -1 in the
    // default (non-flat) profile, so children are only reachable
    // programmatically or via arrow-key roving, never native Tab. Using
    // .focus() (rather than fireEvent.click, which would set
    // focusFromMouseRef and reroute the very next Tab into an "outline
    // reveal" no-op per TrackControlPanel.tsx ~473) lands on the
    // `!isPanelFocused` branch that calls onTabOut directly.
    const menuButton = trackMenuButton(container, 0);
    act(() => {
      menuButton.focus();
    });
    expect(document.activeElement).toBe(menuButton);

    fireEvent.keyDown(menuButton, { key: 'Tab' });

    // Track 0 has one clip (id 1) — its only clip is data-first-clip="true"
    // — onTabOut's has-clips branch fires before the ruler/next-track
    // fallbacks are ever reached.
    expect(document.activeElement).toBe(clipEl(container, 1));
  });

  it('Shift+Tab from the FIRST track container focuses the timeline ruler via the shared timelineRulerRef — onShiftTabFromTrack', async () => {
    const rendered = renderApp();
    const { container, getByText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);

    const track0 = container.querySelector('.track-wrapper[data-track-index="0"] .track') as HTMLElement;
    expect(track0).toBeTruthy();
    act(() => {
      track0.focus();
    });
    expect(document.activeElement).toBe(track0);

    fireEvent.keyDown(track0, { key: 'Tab', shiftKey: true });

    // trackIndex 0 - 1 = -1 < 0 → onShiftTabFromTrack's "first track" branch
    // focuses timelineRulerRef.current directly — the cross-block ref
    // hand-off from the track-panel column to the ruler column.
    const ruler = container.querySelector('[aria-label="Timeline ruler"]');
    expect(document.activeElement).toBe(ruler);
  });

  it('ArrowDown on track 0\'s vertical ruler moves focus to track 1\'s ruler and scrolls the canvas container — onRulerNavigateVertical', async () => {
    const rendered = renderApp();
    const { container, getByText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);

    const ruler0 = container.querySelector('[data-track-ruler-index="0"]') as HTMLElement;
    expect(ruler0).toBeTruthy();
    act(() => {
      ruler0.focus();
    });
    expect(document.activeElement).toBe(ruler0);

    // jsdom never lays out real geometry — the scroll container's
    // clientHeight is always 0, so the "track bottom below viewport
    // bottom" branch (trackTop + trackHeight > viewportBottom) is always
    // taken, making the scrollTop write deterministic rather than
    // incidental. `.canvas-scroll-container` is scrollContainerRef's own
    // className (EditorLayout.tsx ~1211) — same element the handler writes
    // scrollTop on.
    const scrollEl = container.querySelector('.canvas-scroll-container') as HTMLElement;
    expect(scrollEl).toBeTruthy();
    expect(scrollEl.scrollTop).toBe(0);

    fireEvent.keyDown(ruler0, { key: 'ArrowDown' });

    const ruler1 = container.querySelector('[data-track-ruler-index="1"]') as HTMLElement;
    expect(document.activeElement).toBe(ruler1);
    expect(scrollEl.scrollTop).toBeGreaterThan(0);
  });

  it('Tab off the ruler focuses the NEXT track\'s container; Shift+Tab from the ruler returns to THIS track\'s last clip — onTabFromRuler / onShiftTabFromRuler', async () => {
    const rendered = renderApp();
    const { container, getByText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);

    const ruler0 = container.querySelector('[data-track-ruler-index="0"]') as HTMLElement;
    act(() => {
      ruler0.focus();
    });

    fireEvent.keyDown(ruler0, { key: 'Tab' });
    const track1 = container.querySelector('.track-wrapper[data-track-index="1"] .track');
    expect(document.activeElement).toBe(track1);

    // Shift+Tab back from ruler 0 lands on track 0's only clip (id 1) —
    // its own last (and only) clip, not track 1's.
    act(() => {
      ruler0.focus();
    });
    fireEvent.keyDown(ruler0, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(clipEl(container, 1));
  });

  it('Tab off the last clip on a track focuses that SAME track\'s ruler (not the next track) — onTabFromLastClip', async () => {
    const rendered = renderApp();
    const { container, getByText } = rendered;
    await gotoProject(rendered);
    await generateTracks(container, getByText);

    // Clip 1 is track 0's only (and therefore last) clip.
    act(() => {
      clipEl(container, 1).focus();
    });
    expect(document.activeElement).toBe(clipEl(container, 1));

    fireEvent.keyDown(clipEl(container, 1), { key: 'Tab' });

    const ruler0 = container.querySelector('[data-track-ruler-index="0"]');
    expect(document.activeElement).toBe(ruler0);
  });
});

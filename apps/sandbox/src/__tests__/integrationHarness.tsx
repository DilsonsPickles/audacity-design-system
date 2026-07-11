// Integration test harness — the place fakes live for tests that render the
// real component tree (full App or Canvas-down) instead of an isolated
// unit. See docs/superpowers/specs/2026-07-11-integration-net-design.md
// (Architecture §1) for the design this implements.
//
// The audio-mock factory lives in the sibling `./audioMock.ts`, NOT in this
// file — see that file's header comment for why (circular-import deadlock
// between this file's `import App from '../App'` and a same-file mock
// factory). Test files must `vi.mock('@audacity-ui/audio', () =>
// audioMockFactory())` with `audioMockFactory` imported from `./audioMock`.
// It's re-exported here too for convenience in non-mock contexts, but the
// vi.mock call itself must use the `./audioMock` specifier directly.
//
// Import 'fake-indexeddb/auto' HERE ONLY — this registers a global
// indexedDB shim for whichever test file imports this harness. It is
// deliberately NOT added to the shared vitest setupFiles list so unit
// tests (which don't touch IndexedDB) stay unaffected.
import 'fake-indexeddb/auto';

import { render, type RenderResult } from '@testing-library/react';
import {
  PreferencesProvider,
  ThemeProvider,
  AccessibilityProfileProvider,
} from '@dilsonspickles/components';
import App from '../App';
import { Canvas, type CanvasProps } from '../components/Canvas';
import { TracksProvider } from '../contexts/TracksContext';
import type { Track } from '../contexts/TracksContext';
import { SpectralSelectionProvider } from '../contexts/SpectralSelectionContext';
import { getLastAudioManager, type AudioSpies } from './audioMock';

export { audioMockFactory, type AudioSpies } from './audioMock';

// ---------------------------------------------------------------------------
// jsdom gaps
// ---------------------------------------------------------------------------

/**
 * Stubs browser APIs jsdom doesn't implement that the app touches during a
 * render. Extend ONLY when a render error demands it — each stub below
 * notes the render-time error it fixes.
 */
export function installJsdomStubs(): void {
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // jsdom has no ResizeObserver implementation — without this, any
    // component that calls `new ResizeObserver(...)` (e.g. size-tracking
    // hooks in TrackNew/EditorLayout) throws "ResizeObserver is not
    // defined" during render.
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  }

  if (!window.matchMedia) {
    // jsdom has no matchMedia implementation — without this, code that
    // queries prefers-color-scheme / prefers-reduced-motion (theme +
    // accessibility profile detection) throws "window.matchMedia is not a
    // function" during render.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  if (!Element.prototype.scrollTo) {
    // jsdom elements have no scrollTo — without this, code that scrolls
    // the canvas/track panel into view on navigation throws
    // "element.scrollTo is not a function".
    Element.prototype.scrollTo = () => {};
  }

  if (!Element.prototype.scrollIntoView) {
    // jsdom elements have no scrollIntoView — without this, focus-driven
    // scroll (e.g. keyboard track/clip navigation) throws
    // "element.scrollIntoView is not a function".
    Element.prototype.scrollIntoView = () => {};
  }
}

// ---------------------------------------------------------------------------
// renderApp / renderCanvas
// ---------------------------------------------------------------------------

// PreferencesContext merges `{ ...defaults, ...stored }` on load (see
// CLAUDE.md "Preferences persistence"), so seeding just this one key is
// safe — it doesn't need to be a complete preferences blob. Without this,
// every renderApp() call shows the WelcomeDialog (showWelcomeDialog
// defaults to true), which sits on top of the chrome tests need to reach
// (e.g. the "Project" nav button) and adds an unrelated dismiss step to
// every test. Chosen over dismissing the dialog per-test since welcome-dialog
// visibility isn't what most seam tests are about.
const PREFERENCES_STORAGE_KEY = 'audacity-preferences';

/**
 * Renders the real App tree (default URL path: PreferencesProvider →
 * ThemedApp → ... → CanvasDemoContent). Clears localStorage first so the
 * preferences blob doesn't bleed between tests, then seeds
 * `showWelcomeDialog: false` so the WelcomeDialog doesn't cover the chrome
 * most tests need to interact with.
 *
 * Callers must `vi.mock('@audacity-ui/audio', () => audioMockFactory())`
 * at the top of their test file BEFORE importing this function.
 */
export function renderApp(): RenderResult & { audioSpies: AudioSpies } {
  window.localStorage.clear();
  window.localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ showWelcomeDialog: false }),
  );
  installJsdomStubs();
  const manager = getLastAudioManager();
  if (!manager) {
    throw new Error(
      "renderApp(): no audio manager mock found — did you forget vi.mock('@audacity-ui/audio', () => audioMockFactory())?",
    );
  }
  manager.clearAll();

  const result = render(<App />);

  return { ...result, audioSpies: manager.proxy };
}

interface CanvasHarnessProps {
  tracks: Track[];
  canvasProps?: Partial<CanvasProps>;
}

function CanvasHarness({ tracks, canvasProps }: CanvasHarnessProps) {
  return (
    <PreferencesProvider>
      <ThemeProvider>
        <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
          <TracksProvider initialTracks={tracks}>
            <SpectralSelectionProvider>
              <Canvas
                onTimeSelectionMenuClick={() => {}}
                // Canvas's OWN default ('default') isn't a key in
                // ENVELOPE_POINT_STYLES (packages/core) — only
                // 'solidGreenSimple' exists, which is what App.tsx always
                // passes explicitly in production, masking the bad
                // default. Rendering bare <Canvas /> (as this harness does)
                // hits it: deriveEnvelopePointSizes throws reading
                // `.outerRadius` off an undefined profile. Overriding here
                // rather than touching Canvas.tsx's default (out of scope —
                // zero product-code changes for this task).
                controlPointStyle="solidGreenSimple"
                {...canvasProps}
              />
            </SpectralSelectionProvider>
          </TracksProvider>
        </AccessibilityProfileProvider>
      </ThemeProvider>
    </PreferencesProvider>
  );
}

/**
 * Renders `Canvas` inside a real provider stack (Preferences, Theme,
 * Accessibility with the real 'au4-tab-groups' profile, Tracks seeded via
 * `TracksProvider`'s `initialTracks`, SpectralSelection). Tracks/clips
 * appear as `[data-clip-id]` elements once rendered.
 *
 * Clears localStorage first, same as `renderApp()` — `PreferencesProvider`
 * is in this harness's tree too, so without this a preferences blob
 * written by an earlier test in the same file would bleed in here.
 */
export function renderCanvas(tracks: Track[], canvasProps?: Partial<CanvasProps>): RenderResult {
  window.localStorage.clear();
  installJsdomStubs();
  return render(<CanvasHarness tracks={tracks} canvasProps={canvasProps} />);
}

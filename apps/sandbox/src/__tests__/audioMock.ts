// Audio boundary mock for integration tests — DELIBERATELY standalone (no
// import of App/Canvas/anything that transitively imports '@audacity-ui/audio').
//
// Why this file is separate from integrationHarness.tsx: `vi.mock('@audacity-ui/audio', factory)`
// is hoisted to the top of each test file, above that file's own imports.
// The factory only actually RUNS later — lazily, the first time something
// imports '@audacity-ui/audio' — but that first import happens while App
// (imported by integrationHarness.tsx) is being loaded. If this module lived
// in integrationHarness.tsx alongside the `import App from '../App'` line,
// the factory closure's reference to `audioMockFactory` would resolve to a
// module (integrationHarness.tsx) that is ITSELF still mid-evaluation at
// that point (stuck loading App, which is what triggered the mock lookup in
// the first place) — a genuine circular-import deadlock that surfaces as
// "Cannot access '__vi_import_N__' before initialization". Keeping the
// factory in a module with zero dependency on App breaks the cycle: this
// file always finishes evaluating on its own, independent of App's load
// order, so the vi.mock factory can safely reference it no matter when it's
// invoked.
//
// Test files: `vi.mock('@audacity-ui/audio', () => audioMockFactory())` with
// `audioMockFactory` imported from THIS file (`./audioMock`), not from
// `./integrationHarness`.
import { vi, type Mock } from 'vitest';

export type AudioSpies = Record<string, Mock>;

interface AudioManagerMock {
  proxy: AudioSpies;
  clearAll: () => void;
}

// Call sites (grepped across apps/sandbox/src) whose return value is
// consumed rather than ignored — these need a sane primitive/shape, not a
// bare vi.fn() (which returns undefined and would break destructuring or
// truthiness checks):
//   - getIsPlaying / getIsPaused: read in `if (...)` transport guards
//     (usePlaybackControls, useRecording, EditorLayout)
//   - getClipBuffer: assigned then may be passed on (clipboardHandlers)
//   - exportBuffersAsWav: iterated with `for (const [id, wav] of exported)`
//     (useProjectManagement, saveCloudProject, AppDialogs)
//   - mixdown / generateTone: destructured (`const { blob, ... } = await ...`)
//   - importBuffersFromWav / setAudioOutputDevice: awaited (fine to resolve
//     undefined, but explicit for clarity)
function requiredReturns(): Record<string, (...args: unknown[]) => unknown> {
  return {
    getIsPlaying: () => false,
    getIsPaused: () => false,
    getClipBuffer: () => undefined,
    exportBuffersAsWav: () => new Map<string, ArrayBuffer>(),
    mixdown: async () => ({ blob: new Blob(), duration: 0, waveformData: [] as number[] }),
    generateTone: async () => ({
      buffer: {} as AudioBuffer,
      waveformData: [] as number[],
    }),
    importBuffersFromWav: async () => undefined,
    setAudioOutputDevice: async () => undefined,
  };
}

function createAudioManagerMock(): AudioManagerMock {
  const registry: Mock[] = [];
  const target: AudioSpies = {};

  for (const [method, impl] of Object.entries(requiredReturns())) {
    const fn = vi.fn(impl);
    registry.push(fn);
    target[method] = fn;
  }

  // Self-populating: any method not explicitly seeded above appears as a
  // bare vi.fn() on first access, so the mock surface can't silently drift
  // out of sync with what the app actually calls.
  const proxy = new Proxy(target, {
    get(obj, prop: string | symbol) {
      if (typeof prop !== 'string') return Reflect.get(obj, prop);
      if (!(prop in obj)) {
        const fn = vi.fn();
        registry.push(fn);
        obj[prop] = fn;
      }
      return obj[prop];
    },
  });

  return { proxy, clearAll: () => registry.forEach((fn) => fn.mockClear()) };
}

// The manager most recently created by audioMockFactory() — module-scoped so
// integrationHarness's renderApp()/renderCanvas() can hand back the SAME spy
// object the mocked `getAudioPlaybackManager()` singleton returns to app
// code (real AudioPlaybackManager is a module-level singleton too; the mock
// mirrors that so a test can both drive the app and assert on the manager
// it drove).
let lastAudioManager: AudioManagerMock | null = null;

/** Internal accessor for integrationHarness.tsx — not part of the public interface. */
export function getLastAudioManager(): AudioManagerMock | null {
  return lastAudioManager;
}

/**
 * Factory for `vi.mock('@audacity-ui/audio', () => audioMockFactory())`.
 * Call this from inside a `vi.mock` factory at the top of each integration
 * test file, importing `audioMockFactory` from THIS module (`./audioMock`)
 * — see the file-level comment for why not `./integrationHarness`.
 */
export function audioMockFactory(): Record<string, unknown> {
  const manager = createAudioManagerMock();
  lastAudioManager = manager;
  return {
    // Referenced by app code only as a TS type (`AudioPlaybackManager`
    // instances always come from `getAudioPlaybackManager()`, never `new`),
    // but exported as a real value so the mocked module shape matches the
    // real module's named exports.
    AudioPlaybackManager: class {},
    getAudioPlaybackManager: () => manager.proxy,
  };
}

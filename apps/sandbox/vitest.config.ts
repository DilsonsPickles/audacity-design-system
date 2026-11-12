import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Force a single React/ReactDOM copy across the module graph. The
    // sandbox app depends on react@18, but @audacity-ui/components also
    // carries react@19 as a devDependency (used for its own local tests);
    // pnpm gives workspace packages one physical node_modules (no
    // peer-dependency virtual-store dedup like it does for registry
    // packages), so without this alias, importing anything from
    // @audacity-ui/components' built dist pulls in react@19 alongside
    // sandbox's react@18 — two copies in the same tree — and React throws
    // "Invalid hook call" / "Cannot read properties of null (reading
    // 'useState')" the first time a components-package component with
    // hooks (e.g. PreferencesProvider) renders under a sandbox test. This
    // only surfaces once a test renders real components from the package
    // (integration tests are the first to do so — no unit test exercised
    // this path before).
    alias: {
      react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    // The integration tests boot the whole app, seed tracks through the
    // real Debug dialog and wait on the project bootstrap's IndexedDB
    // write; on GitHub's runner they take 3–6 s each (the file ~5 min),
    // against Vitest's 5 s default — "Focus routing" tests failed there
    // at exactly that line (2026-10-25). The budget is the runner's, not
    // a hidden bug's: a test that hangs still fails, later.
    testTimeout: 30000,
    // THE FORK WORKERS NEED A RAISED HEAP (2026-11-12): the integration
    // file boots the whole app ~58 times in one fork worker, and that
    // crossed V8's default old-space limit — the worker died with
    // "Ineffective mark-compacts near heap limit" (an OOM abort),
    // surfacing as NONDETERMINISTIC 20 s test timeouts (the GC death
    // spiral slows everything first) and a "Timeout terminating forks
    // worker" note on every run. The raise lives in the test script as
    // NODE_OPTIONS=--max-old-space-size=8192 (package.json) — a
    // poolOptions.forks.execArgv here was verified NOT to reach the
    // workers on vitest 4, while NODE_OPTIONS does (zero OOM, every
    // test ran). V8 flags are legal in NODE_OPTIONS on Node 20; the
    // storage flags CLAUDE.md warns about are not V8 flags. A limit,
    // not a reservation. The real follow-up (hunt the retention /
    // split the file) is in docs/backlog.md.
  },
});

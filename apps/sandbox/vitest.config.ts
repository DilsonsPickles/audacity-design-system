import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Force a single React/ReactDOM copy across the module graph. The
    // sandbox app depends on react@18, but @dilsonspickles/components also
    // carries react@19 as a devDependency (used for its own local tests);
    // pnpm gives workspace packages one physical node_modules (no
    // peer-dependency virtual-store dedup like it does for registry
    // packages), so without this alias, importing anything from
    // @dilsonspickles/components' built dist pulls in react@19 alongside
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
  },
});

import { defineConfig } from 'vitest/config';

// Vitest 4 removed `vitest.workspace.ts` / `defineWorkspace`; multi-package
// runs are configured here instead, via `test.projects`. Each entry points at
// a directory whose own `vitest.config.ts` supplies that project's
// environment and setup files.
//
// This matters more than it looks: without it, a root `vitest run` silently
// collapses all four packages into ONE default project (environment: 'node',
// no setup files), so every jsdom-dependent test fails at once — ~163 of them,
// with `setup 0ms` as the giveaway. CI never caught this because it runs the
// two `pnpm --filter ... test` gates, which load each package's config
// directly and never go through this file.
export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'packages/tokens',
      'packages/components',
      'apps/sandbox',
    ],
  },
});

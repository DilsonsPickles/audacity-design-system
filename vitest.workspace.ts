import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core',
  'packages/tokens',
  'packages/components',
  'apps/sandbox',
]);

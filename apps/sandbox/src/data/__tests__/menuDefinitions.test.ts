import { describe, it, expect } from 'vitest';
import { createMenuDefinitions, type MenuDefinitionDeps } from '../menuDefinitions';

// Every dep a no-op handler (or a truthy flag): only the menus' shape is read here
const deps = new Proxy({}, { get: () => () => {} }) as unknown as MenuDefinitionDeps;

describe('the menus (2026-11-19)', () => {
  it('Edit has Set selection… directly below Go to…', () => {
    const labels = createMenuDefinitions(deps).Edit.map((item) => item.label);
    const goTo = labels.indexOf('Go to...');
    expect(goTo).toBeGreaterThanOrEqual(0);
    expect(labels[goTo + 1]).toBe('Set selection...');
  });
});

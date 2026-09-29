import { render, act, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import type { Command } from '@audacity-ui/components';
import { MacrosProvider, useMacros } from '../MacrosContext';

afterEach(cleanup);
beforeEach(() => {
  try { localStorage.clear(); } catch { /* no storage */ }
});

const cmd = (name: string): Command => ({ id: name.toLowerCase(), name, category: 'Test' });

function setUp() {
  let api!: ReturnType<typeof useMacros>;
  function Probe() {
    api = useMacros();
    return null;
  }
  render(<MacrosProvider><Probe /></MacrosProvider>);
  let id = '';
  act(() => { id = api.addMacro('Test macro'); });
  const add = (name: string, atIndex?: number) => act(() => {
    api.addCommandToMacro(id, cmd(name), '', atIndex);
  });
  const steps = () => api.macros.find((m) => m.id === id)!.steps.map((s) => s.command);
  return { add, steps };
}

describe('MacrosContext — addCommandToMacro at a place', () => {
  it('appends when no place is given', () => {
    const { add, steps } = setUp();
    add('A');
    add('B');
    expect(steps()).toEqual(['A', 'B']);
  });

  it('inserts in front of the step at the index', () => {
    const { add, steps } = setUp();
    add('A');
    add('B');
    add('C');
    add('X', 1);
    expect(steps()).toEqual(['A', 'X', 'B', 'C']);
    add('Y', 0);
    expect(steps()).toEqual(['Y', 'A', 'X', 'B', 'C']);
  });

  it('an index at or past the end appends; a negative one goes to the top', () => {
    const { add, steps } = setUp();
    add('A');
    add('B');
    add('End', 2);
    add('Far', 99);
    add('Top', -3);
    expect(steps()).toEqual(['Top', 'A', 'B', 'End', 'Far']);
  });

  it('into an empty macro', () => {
    const { add, steps } = setUp();
    add('Only', 0);
    expect(steps()).toEqual(['Only']);
  });
});

import { describe, it, expect } from 'vitest';
import { newProjectTitle } from '../useProjectManagement';

describe('newProjectTitle (2026-11-19, "does time need seconds in project name?" — no)', () => {
  it('names a new project by its date and time to the minute', () => {
    expect(newProjectTitle(new Date(2026, 10, 19, 13, 3, 37))).toBe('New Project 11/19/2026, 13:03');
  });
});

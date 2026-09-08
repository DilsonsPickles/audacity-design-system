import { describe, it, expect } from 'vitest';
import { parseMacroParameters } from '@audacity-ui/components';
import { availableCommands } from '../commands';
import { getCommandParameters, getDefaultParameters } from '../commandParameters';

describe('commandParameters', () => {
  it('produces a valid schema for every command in the catalog', () => {
    for (const command of availableCommands) {
      const params = getCommandParameters(command.name);
      expect(Array.isArray(params), command.name).toBe(true);
      for (const param of params) {
        expect(typeof param.key, `${command.name} → key`).toBe('string');
        expect(param.key.length, `${command.name} → key`).toBeGreaterThan(0);
        expect(typeof param.label, `${command.name} → label`).toBe('string');
        expect(typeof param.defaultValue, `${command.name} → defaultValue`).toBe('string');
        if (param.type === 'enum') {
          expect(param.options?.length, `${command.name} → ${param.key} options`).toBeGreaterThan(0);
          // The default must be an actual option value, or the dropdown
          // renders its placeholder instead of the current value
          expect(
            param.options?.some((o) => o.value === param.defaultValue),
            `${command.name} → ${param.key} default "${param.defaultValue}" not in options`,
          ).toBe(true);
        }
      }
      // No duplicate keys — the serialized string would silently drop one
      const keys = params.map((p) => p.key);
      expect(new Set(keys).size, `${command.name} → duplicate keys`).toBe(keys.length);
    }
  });

  it('serializes parseable default parameters for every command', () => {
    for (const command of availableCommands) {
      const defaults = getDefaultParameters(command.name);
      const parsed = parseMacroParameters(defaults);
      expect(Object.keys(parsed).length, command.name)
        .toBe(getCommandParameters(command.name).length);
    }
  });

  it('is deterministic — the same command always gets the same schema', () => {
    for (const name of ['AUDelay', 'Add Label at Selection', 'Zoom In']) {
      expect(getCommandParameters(name)).toEqual(getCommandParameters(name));
    }
  });

  it('hand-authored schemas cover the wireframe Select command', () => {
    const select = getCommandParameters('Select');
    expect(select.map((p) => p.key)).toContain('Start');
    expect(select.find((p) => p.key === 'Mode')?.optional).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { markMissing, buildEffectIdSets } from '../TrackEffectsPanel';

describe('buildEffectIdSets', () => {
  it('includes built-in effect ids regardless of installedEffects', () => {
    const { builtInIds } = buildEffectIdSets([]);
    expect(builtInIds.has('compressor')).toBe(true);
    expect(builtInIds.has('reverb')).toBe(true);
  });

  it('collects installed effect ids from the given list', () => {
    const { installedIds } = buildEffectIdSets([{ id: 'acme-verb' }, { id: 'acme-delay' }]);
    expect(installedIds).toEqual(new Set(['acme-verb', 'acme-delay']));
  });
});

describe('markMissing', () => {
  const builtInIds = new Set(['compressor', 'reverb']);
  const installedIds = new Set(['acme-verb']);

  it('leaves a built-in effect untouched', () => {
    const effect = { id: 'compressor', name: 'Compressor', enabled: true };
    const result = markMissing(effect, builtInIds, installedIds, true);
    expect(result).toBe(effect); // same reference — no annotation applied
    expect(result.name).toBe('Compressor');
  });

  it('leaves an installed (non-built-in) effect untouched', () => {
    const effect = { id: 'acme-verb', name: 'Acme Verb', enabled: true };
    const result = markMissing(effect, builtInIds, installedIds, true);
    expect(result).toBe(effect);
    expect(result.name).toBe('Acme Verb');
  });

  it('annotates a missing effect with "(missing)" when signed in', () => {
    const effect = { id: 'ghost-fx', name: 'Ghost FX', enabled: true };
    const result = markMissing(effect, builtInIds, installedIds, true);
    expect(result.name).toBe('⚠ Ghost FX (missing)');
  });

  it('annotates a missing effect with "(sign in to use)" when signed out', () => {
    const effect = { id: 'ghost-fx', name: 'Ghost FX', enabled: true };
    const result = markMissing(effect, builtInIds, installedIds, false);
    expect(result.name).toBe('⚠ Ghost FX (sign in to use)');
  });

  it('never mutates the input effect object', () => {
    const effect = { id: 'ghost-fx', name: 'Ghost FX', enabled: true };
    const snapshot = { ...effect };
    const result = markMissing(effect, builtInIds, installedIds, true);
    expect(effect).toEqual(snapshot); // input untouched
    expect(result).not.toBe(effect); // a distinct object was returned
  });

  it('preserves extra fields (e.g. enabled: false) on the annotated copy', () => {
    const effect = { id: 'ghost-fx', name: 'Ghost FX', enabled: false };
    const result = markMissing(effect, builtInIds, installedIds, true);
    expect(result.enabled).toBe(false);
  });
});

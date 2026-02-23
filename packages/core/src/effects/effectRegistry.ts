/**
 * Effect Registry
 * Central registry of all available audio effects in Audacity
 */

export type EffectCategory = 'Audacity' | 'AudioUnit' | 'VST3';

export interface EffectDefinition {
  id: string;
  name: string;
  category: EffectCategory;
  description?: string;
  // Future: Add parameter schemas, presets, etc.
}

/**
 * Registry of all available effects grouped by category
 */
export const EFFECT_REGISTRY: Record<EffectCategory, EffectDefinition[]> = {
  Audacity: [
    { id: 'reverb', name: 'Reverb', category: 'Audacity' },
    { id: 'compressor', name: 'Compressor', category: 'Audacity' },
    { id: 'eq', name: 'EQ', category: 'Audacity' },
    { id: 'delay', name: 'Delay', category: 'Audacity' },
  ],
  AudioUnit: [
    { id: 'chorus', name: 'Chorus', category: 'AudioUnit' },
    { id: 'limiter', name: 'Limiter', category: 'AudioUnit' },
    { id: 'distortion', name: 'Distortion', category: 'AudioUnit' },
  ],
  VST3: [
    { id: 'phaser', name: 'Phaser', category: 'VST3' },
    { id: 'flanger', name: 'Flanger', category: 'VST3' },
    { id: 'tremolo', name: 'Tremolo', category: 'VST3' },
  ],
};

/**
 * Get all effect categories
 */
export function getEffectCategories(): EffectCategory[] {
  return Object.keys(EFFECT_REGISTRY) as EffectCategory[];
}

/**
 * Get all effects in a specific category
 */
export function getEffectsByCategory(category: EffectCategory): EffectDefinition[] {
  return EFFECT_REGISTRY[category] || [];
}

/**
 * Get all effects as a flat list
 */
export function getAllEffects(): EffectDefinition[] {
  return Object.values(EFFECT_REGISTRY).flat();
}

/**
 * Find an effect by ID
 */
export function getEffectById(id: string): EffectDefinition | undefined {
  return getAllEffects().find((effect) => effect.id === id);
}

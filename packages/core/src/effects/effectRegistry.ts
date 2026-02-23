/**
 * Effect Registry
 * Central registry of all available audio effects in Audacity
 */

export type EffectCategory = 'Audacity';

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
    { id: 'compressor', name: 'Compressor', category: 'Audacity' },
    { id: 'limiter', name: 'Limiter', category: 'Audacity' },
    { id: 'reverb', name: 'Reverb', category: 'Audacity' },
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

/**
 * Effect Registry
 * Central registry of all available audio effects in Audacity
 */

export type EffectCategory = 'Audacity' | 'DAWson';

export type EffectProvider = 'Audacity' | 'DAWson';

export interface EffectDefinition {
  id: string;
  name: string;
  category: EffectCategory;
  provider: EffectProvider;
  description?: string;
  version?: string;
  type?: 'Built-in' | 'VST' | 'AU' | 'LV2';
}

/**
 * Registry of all available effects grouped by category
 */
export const EFFECT_REGISTRY: Record<EffectCategory, EffectDefinition[]> = {
  Audacity: [
    { id: 'compressor', name: 'Compressor', category: 'Audacity', provider: 'Audacity', description: 'Reduces "dynamic range", or differences between loud and quiet parts.' },
    { id: 'limiter', name: 'Limiter', category: 'Audacity', provider: 'Audacity', description: 'Limits the level of audio to a specified threshold.' },
    { id: 'reverb', name: 'Reverb', category: 'Audacity', provider: 'Audacity', description: 'Adds reverberation to simulate room acoustics.' },
  ],
  DAWson: [
    { id: 'dawson-delay', name: 'Delay', category: 'DAWson', provider: 'DAWson', description: 'Adds echo and delay effects to the audio signal.' },
    { id: 'dawson-chorus', name: 'Chorus', category: 'DAWson', provider: 'DAWson', description: 'Creates a richer sound by layering slightly detuned copies.' },
    { id: 'dawson-eq', name: '3-Band EQ', category: 'DAWson', provider: 'DAWson', description: 'Adjusts the balance of low, mid, and high frequencies.' },
    { id: 'dawson-phaser', name: 'Phaser', category: 'DAWson', provider: 'DAWson', description: 'Creates sweeping phase-shifted effects.' },
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

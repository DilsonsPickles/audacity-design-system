import type { Plugin } from '@audacity-ui/components';
import { EFFECT_REGISTRY } from '@audacity-ui/core';

export function createInitialPlugins(): Plugin[] {
  const allEffects = Object.values(EFFECT_REGISTRY).flat();
  return allEffects.map((effect) => ({
    id: effect.id,
    name: effect.name,
    type: effect.provider === 'Audacity' ? 'Internal effect' : 'VST3',
    category: 'Effect',
    path: effect.provider === 'Audacity'
      ? `/Applications/Audacity.app/Contents/PlugIns/${effect.id.toLowerCase()}`
      : `/Library/Audio/Plug-Ins/VST3/DAWson/${effect.name}.vst3`,
    enabled: true,
  }));
}

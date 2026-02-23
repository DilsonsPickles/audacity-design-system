import React, { createContext, useContext, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { getAudioPlaybackManager } from '@audacity-ui/audio';

interface AudioEngineContextValue {
  /**
   * Get or create a Tone.Reverb instance for a specific effect
   */
  getReverbEffect: (effectId: string) => Tone.Reverb;

  /**
   * Update reverb parameters
   */
  updateReverbParams: (effectId: string, params: { decay?: number; preDelay?: number; wet?: number }) => void;

  /**
   * Remove an effect instance
   */
  removeEffect: (effectId: string) => void;

  /**
   * Start audio context (required for playback)
   */
  startAudio: () => Promise<void>;

  /**
   * Update effect chains for playback (called when effects change)
   */
  updateEffectChains: (tracks: any[], masterEffects: any[]) => void;
}

const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reverbEffectsRef = useRef<Map<string, Tone.Reverb>>(new Map());

  // Cleanup all effects on unmount
  useEffect(() => {
    return () => {
      reverbEffectsRef.current.forEach(reverb => {
        reverb.disconnect();
        reverb.dispose();
      });
      reverbEffectsRef.current.clear();
    };
  }, []);

  const getReverbEffect = (effectId: string): Tone.Reverb => {
    let reverb = reverbEffectsRef.current.get(effectId);

    if (!reverb) {
      // Create new Reverb instance with default parameters
      reverb = new Tone.Reverb({
        decay: 1.5,
        preDelay: 0.01,
        wet: 1
      });

      // Connect to destination
      reverb.toDestination();

      // Store reference
      reverbEffectsRef.current.set(effectId, reverb);

      // Generate impulse response asynchronously
      reverb.generate().then(() => {
        console.log(`Reverb ${effectId} impulse response generated`);
      });
    }

    return reverb;
  };

  const updateReverbParams = (effectId: string, params: { decay?: number; preDelay?: number; wet?: number }) => {
    const reverb = reverbEffectsRef.current.get(effectId);
    if (!reverb) return;

    if (params.decay !== undefined) {
      reverb.decay = params.decay;
      // Regenerate impulse response when decay changes
      reverb.generate().catch(err => console.error('Failed to generate reverb IR:', err));
    }

    if (params.preDelay !== undefined) {
      reverb.preDelay = params.preDelay;
    }

    if (params.wet !== undefined) {
      reverb.wet.value = params.wet;
    }
  };

  const removeEffect = (effectId: string) => {
    const effect = reverbEffectsRef.current.get(effectId);
    if (effect) {
      effect.disconnect();
      effect.dispose();
      reverbEffectsRef.current.delete(effectId);
    }
  };

  const startAudio = async () => {
    await Tone.start();
    console.log('Audio context started');
  };

  const updateEffectChains = (tracks: any[], masterEffects: any[]) => {
    const playbackManager = getAudioPlaybackManager();

    // Update master effect chain
    const masterChain: Tone.ToneAudioNode[] = [];
    masterEffects.forEach((effect, index) => {
      if (effect.enabled && effect.name === 'Reverb') {
        const effectId = `master-effect-${index}`;
        const reverb = getReverbEffect(effectId);
        masterChain.push(reverb);
      }
    });
    playbackManager.setMasterEffectChain(masterChain);

    // Update track effect chains
    tracks.forEach((track, trackIndex) => {
      const trackChain: Tone.ToneAudioNode[] = [];
      (track.effects || []).forEach((effect: any, effectIndex: number) => {
        if (effect.enabled && effect.name === 'Reverb') {
          const effectId = `track-${trackIndex}-effect-${effectIndex}`;
          const reverb = getReverbEffect(effectId);
          trackChain.push(reverb);
        }
      });
      playbackManager.setTrackEffectChain(trackIndex, trackChain);
    });

    console.log('Effect chains updated', { masterChain: masterChain.length, trackCount: tracks.length });
  };

  const value: AudioEngineContextValue = {
    getReverbEffect,
    updateReverbParams,
    removeEffect,
    startAudio,
    updateEffectChains,
  };

  return (
    <AudioEngineContext.Provider value={value}>
      {children}
    </AudioEngineContext.Provider>
  );
};

export const useAudioEngine = () => {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error('useAudioEngine must be used within AudioEngineProvider');
  }
  return context;
};

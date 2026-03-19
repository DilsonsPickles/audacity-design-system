import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { getAudioPlaybackManager } from '@audacity-ui/audio';

// Use any for Tone types that may not be exported in all versions
type ToneReverb = any;
type ToneAudioNode = any;

export interface MidiInstrumentDef {
  id: string;
  label: string;
}

export const MIDI_INSTRUMENTS: MidiInstrumentDef[] = [
  { id: 'synth', label: 'Synth' },
  { id: 'am-synth', label: 'AM Synth' },
  { id: 'fm-synth', label: 'FM Synth' },
  { id: 'duo-synth', label: 'Duo Synth' },
  { id: 'membrane', label: 'Membrane' },
  { id: 'pluck', label: 'Pluck' },
  { id: 'metal', label: 'Metal' },
];

interface AudioEngineContextValue {
  getReverbEffect: (effectId: string) => ToneReverb;
  updateReverbParams: (effectId: string, params: { decay?: number; preDelay?: number; wet?: number }) => void;
  removeEffect: (effectId: string) => void;
  startAudio: () => Promise<void>;
  updateEffectChains: (tracks: any[], masterEffects: any[]) => void;
  /** Play a MIDI note by pitch number (0-127), with optional duration and instrument */
  playMidiNote: (pitch: number, duration?: number, instrumentId?: string) => void;
  /** Current MIDI instrument id */
  midiInstrument: string;
  /** Change the MIDI instrument */
  setMidiInstrument: (id: string) => void;
}

const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);

/** Convert MIDI pitch (0-127) to frequency string like "C4" */
function midiToNoteName(pitch: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(pitch / 12) - 1;
  return `${names[pitch % 12]}${octave}`;
}

function createSynth(instrumentId: string): any {
  let synth: any;
  try {
    switch (instrumentId) {
      case 'am-synth':
        synth = new (Tone as any).PolySynth((Tone as any).AMSynth, {
          harmonicity: 3,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 },
          modulation: { type: 'square' },
          modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 },
        }).toDestination();
        break;
      case 'fm-synth':
        synth = new (Tone as any).PolySynth((Tone as any).FMSynth, {
          harmonicity: 5,
          modulationIndex: 10,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 },
          modulation: { type: 'triangle' },
          modulationEnvelope: { attack: 0.2, decay: 0.3, sustain: 0.3, release: 0.5 },
        }).toDestination();
        break;
      case 'duo-synth':
        synth = new (Tone as any).PolySynth((Tone as any).DuoSynth, {
          vibratoAmount: 0.5,
          vibratoRate: 5,
          harmonicity: 1.5,
          voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 } },
          voice1: { oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.4, sustain: 0.3, release: 1.0 } },
        }).toDestination();
        break;
      case 'membrane':
        synth = new (Tone as any).PolySynth((Tone as any).MembraneSynth, {
          pitchDecay: 0.05,
          octaves: 4,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
        }).toDestination();
        break;
      case 'pluck':
        synth = new (Tone as any).PluckSynth({
          attackNoise: 1,
          dampening: 4000,
          resonance: 0.98,
        }).toDestination();
        break;
      case 'metal':
        synth = new (Tone as any).PolySynth((Tone as any).MetalSynth, {
          frequency: 200,
          envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5,
        }).toDestination();
        break;
      default:
        synth = new (Tone as any).PolySynth((Tone as any).Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.4 },
        }).toDestination();
        break;
    }
  } catch (e) {
    console.warn(`Failed to create synth "${instrumentId}", falling back to default:`, e);
    synth = new (Tone as any).PolySynth((Tone as any).Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.4 },
    }).toDestination();
  }
  synth.volume.value = -12;
  return synth;
}

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reverbEffectsRef = useRef<Map<string, ToneReverb>>(new Map());
  const synthMapRef = useRef<Map<string, any>>(new Map());
  const [midiInstrument, setMidiInstrumentState] = useState('synth');
  const instrumentIdRef = useRef(midiInstrument);

  const getSynth = useCallback((instrumentId: string) => {
    let synth = synthMapRef.current.get(instrumentId);
    if (!synth) {
      synth = createSynth(instrumentId);
      synthMapRef.current.set(instrumentId, synth);
    }
    return synth;
  }, []);

  const setMidiInstrument = useCallback((id: string) => {
    setMidiInstrumentState(id);
    instrumentIdRef.current = id;
  }, []);

  // Cleanup all effects and synths on unmount
  useEffect(() => {
    return () => {
      reverbEffectsRef.current.forEach(reverb => {
        reverb.disconnect();
        reverb.dispose();
      });
      reverbEffectsRef.current.clear();
      synthMapRef.current.forEach(synth => synth.dispose());
      synthMapRef.current.clear();
    };
  }, []);

  const getReverbEffect = (effectId: string): ToneReverb => {
    let reverb = reverbEffectsRef.current.get(effectId);

    if (!reverb) {
      // Create new Reverb instance with default parameters
      reverb = new (Tone as any).Reverb({
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
    const masterChain: ToneAudioNode[] = [];
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
      const trackChain: ToneAudioNode[] = [];
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

  const playMidiNote = useCallback((pitch: number, duration = 0.3, instrumentId?: string) => {
    try {
      const id = instrumentId ?? instrumentIdRef.current;
      const synth = getSynth(id);
      const note = midiToNoteName(pitch);
      synth.triggerAttackRelease(note, duration);
    } catch (e) {
      console.warn('Failed to play MIDI note:', e);
    }
  }, [getSynth]);

  const value: AudioEngineContextValue = {
    getReverbEffect,
    updateReverbParams,
    removeEffect,
    startAudio,
    updateEffectChains,
    playMidiNote,
    midiInstrument,
    setMidiInstrument,
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

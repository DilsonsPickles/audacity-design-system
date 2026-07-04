import { useEffect, useRef } from 'react';

export interface UseDrawerTabAutoSwitchDeps {
  showMixer: boolean | undefined;
  pianoRollOpen: boolean;
  drawerActiveTab: 'mixer' | 'piano-roll';
  setDrawerActiveTab: React.Dispatch<React.SetStateAction<'mixer' | 'piano-roll'>>;
}

export function useDrawerTabAutoSwitch(deps: UseDrawerTabAutoSwitchDeps): void {
  const { showMixer, pianoRollOpen, drawerActiveTab, setDrawerActiveTab } = deps;

  // Auto-switch drawer active tab when panels open/close
  const prevMixerRef = useRef(showMixer);
  const prevPianoRollRef = useRef(pianoRollOpen);
  useEffect(() => {
    const mixerJustOpened = showMixer && !prevMixerRef.current;
    const pianoRollJustOpened = pianoRollOpen && !prevPianoRollRef.current;
    if (pianoRollJustOpened) {
      setDrawerActiveTab('piano-roll');
    } else if (mixerJustOpened) {
      setDrawerActiveTab('mixer');
    } else if (!showMixer && drawerActiveTab === 'mixer' && pianoRollOpen) {
      setDrawerActiveTab('piano-roll');
    } else if (!pianoRollOpen && drawerActiveTab === 'piano-roll' && showMixer) {
      setDrawerActiveTab('mixer');
    }
    prevMixerRef.current = showMixer;
    prevPianoRollRef.current = pianoRollOpen;
  }, [showMixer, pianoRollOpen]); // eslint-disable-line react-hooks/exhaustive-deps
}

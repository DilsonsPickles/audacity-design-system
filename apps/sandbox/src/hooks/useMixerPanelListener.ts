import { useState, useEffect } from 'react';

export interface UseMixerPanelListenerReturn {
  mixerPanelOpen: boolean;
  setMixerPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useMixerPanelListener(): UseMixerPanelListenerReturn {
  const [mixerPanelOpen, setMixerPanelOpen] = useState(false);

  // Listen for close-mixer-panel events from the bottom drawer
  useEffect(() => {
    const handler = () => setMixerPanelOpen(false);
    window.addEventListener('close-mixer-panel', handler);
    return () => window.removeEventListener('close-mixer-panel', handler);
  }, []);

  return { mixerPanelOpen, setMixerPanelOpen };
}

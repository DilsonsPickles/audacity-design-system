import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@audacity-ui/components';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { RecordingManager } from '../utils/RecordingManager';

export interface UseAudioDeviceMenuReturn {
  audioSetupMenuAnchor: { x: number; y: number } | null;
  setAudioSetupMenuAnchor: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  /** The chosen device's label, for the menu — "System default" until one is picked */
  selectedRecordingDevice: string;
  selectedPlaybackDevice: string;
  /** The chosen device's id; null = the system default */
  selectedRecordingDeviceId: string | null;
  selectedPlaybackDeviceId: string | null;
  /** Pick a device: the recording one reopens the mic on it, the playback one re-routes the output */
  selectRecordingDevice: (device: MediaDeviceInfo) => void;
  selectPlaybackDevice: (device: MediaDeviceInfo) => Promise<void>;
  availableAudioInputs: MediaDeviceInfo[];
  availableAudioOutputs: MediaDeviceInfo[];
  /** Audio setup ▸ Rescan audio devices */
  rescanAudioDevices: () => Promise<void>;
}

const SYSTEM_DEFAULT = 'System default';

/**
 * Hook for the "Audio setup" menu: the menu's anchor, the chosen
 * recording and playback devices, and the lists of what the machine has.
 *
 * THE CHOICE IS REAL (2026-11-04, "make sure that the demo can actually
 * pick up machine's input/outputs"): until then the recording device was a
 * label the menu showed — defaulting to a made-up "MacBook Pro Microphone"
 * — and nothing read it; the mic always opened on the OS default. A pick
 * now hands `RecordingManager` the device id (which reopens the mic on it)
 * and the playback pick re-routes the output through `setSinkId`. The
 * lists load when the menu opens and on Rescan; a device that goes away
 * while chosen falls back to the system default.
 */
export function useAudioDeviceMenu(
  audioManagerRef?: React.MutableRefObject<AudioPlaybackManager>,
): UseAudioDeviceMenuReturn {
  const [audioSetupMenuAnchor, setAudioSetupMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [selectedRecordingDevice, setSelectedRecordingDevice] = useState(SYSTEM_DEFAULT);
  const [selectedPlaybackDevice, setSelectedPlaybackDevice] = useState(SYSTEM_DEFAULT);
  const [selectedRecordingDeviceId, setSelectedRecordingDeviceId] = useState<string | null>(RecordingManager.getInputDevice());
  const [selectedPlaybackDeviceId, setSelectedPlaybackDeviceId] = useState<string | null>(null);
  const [availableAudioInputs, setAvailableAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [availableAudioOutputs, setAvailableAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const audioManager = useRef(audioManagerRef);
  audioManager.current = audioManagerRef;

  const rescanAudioDevices = useCallback(async () => {
    const [inputs, outputs] = await Promise.all([
      RecordingManager.getAudioInputDevices(),
      RecordingManager.getAudioOutputDevices(),
    ]);
    setAvailableAudioInputs(inputs);
    setAvailableAudioOutputs(outputs);
    // A chosen device that is gone: back to the system default
    setSelectedRecordingDeviceId((id) => {
      if (id !== null && !inputs.some((d) => d.deviceId === id)) {
        RecordingManager.setInputDevice(null);
        setSelectedRecordingDevice(SYSTEM_DEFAULT);
        return null;
      }
      return id;
    });
    setSelectedPlaybackDeviceId((id) => {
      if (id !== null && !outputs.some((d) => d.deviceId === id)) {
        void audioManager.current?.current.setAudioOutputDevice(null).catch(() => {});
        setSelectedPlaybackDevice(SYSTEM_DEFAULT);
        return null;
      }
      return id;
    });
  }, []);

  // Load the lists when the menu opens
  useEffect(() => {
    if (audioSetupMenuAnchor) void rescanAudioDevices();
  }, [audioSetupMenuAnchor, rescanAudioDevices]);

  const selectRecordingDevice = useCallback((device: MediaDeviceInfo) => {
    const isDefault = device.deviceId === 'default' || device.deviceId === '';
    const id = isDefault ? null : device.deviceId;
    setSelectedRecordingDeviceId(id);
    setSelectedRecordingDevice(isDefault ? SYSTEM_DEFAULT : (device.label || 'Unknown device'));
    RecordingManager.setInputDevice(id);
  }, []);

  const selectPlaybackDevice = useCallback(async (device: MediaDeviceInfo) => {
    const isDefault = device.deviceId === 'default' || device.deviceId === '';
    const id = isDefault ? null : device.deviceId;
    const label = isDefault ? SYSTEM_DEFAULT : (device.label || 'Unknown device');
    try {
      await audioManager.current?.current.setAudioOutputDevice(id);
      setSelectedPlaybackDeviceId(id);
      setSelectedPlaybackDevice(label);
    } catch (error) {
      toast.error('Playback device not changed', error instanceof Error ? error.message : 'Try again');
    }
  }, []);

  return {
    audioSetupMenuAnchor,
    setAudioSetupMenuAnchor,
    selectedRecordingDevice,
    selectedPlaybackDevice,
    selectedRecordingDeviceId,
    selectedPlaybackDeviceId,
    selectRecordingDevice,
    selectPlaybackDevice,
    availableAudioInputs,
    availableAudioOutputs,
    rescanAudioDevices,
  };
}

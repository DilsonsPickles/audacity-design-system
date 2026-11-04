/**
 * The Electron shell's bridge (apps/desktop/src/preload.cjs), absent in the
 * browser. Keep in step with the preload.
 */
export type MicrophoneAccessStatus = 'granted' | 'denied' | 'restricted' | 'not-determined' | 'unknown';

declare global {
  interface Window {
    electronShell?: {
      openNewWindow: () => void;
      /** The microphone's OS permission (2026-11-04) */
      microphoneAccessStatus?: () => Promise<MicrophoneAccessStatus>;
      /** Prompts while undetermined; resolves to whether access was granted */
      requestMicrophoneAccess?: () => Promise<boolean>;
      /** Opens the OS's microphone privacy pane */
      openMicrophoneSettings?: () => Promise<void>;
    };
  }
}

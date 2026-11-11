/**
 * The Electron shell's bridge (apps/desktop/src/preload.cjs), absent in the
 * browser. Keep in step with the preload.
 */
export type MicrophoneAccessStatus = 'granted' | 'denied' | 'restricted' | 'not-determined' | 'unknown';

declare global {
  interface Window {
    electronShell?: {
      openNewWindow: () => void;
      /** The window has no native title bar: the app draws one, with the
       *  traffic lights inset over its left end (macOS, 2026-11-11) */
      customTitleBar?: boolean;
      /** The window has macOS vibrancy behind the title bar: the bar is
       *  drawn translucent, the rest of the page solid (2026-11-11) */
      titleBarVibrancy?: boolean;
      /** Draw the window's native parts (vibrancy, traffic lights, menus)
       *  in the app's theme rather than the OS appearance (2026-11-11) */
      setAppearance?: (mode: 'light' | 'dark' | 'system') => void;
      /** The microphone's OS permission (2026-11-04) */
      microphoneAccessStatus?: () => Promise<MicrophoneAccessStatus>;
      /** Prompts while undetermined; resolves to whether access was granted */
      requestMicrophoneAccess?: () => Promise<boolean>;
      /** Opens the OS's microphone privacy pane */
      openMicrophoneSettings?: () => Promise<void>;
    };
  }
}

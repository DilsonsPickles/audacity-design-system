/**
 * THE STATUS BAR'S FIRST SLOT FOLLOWS THE TRANSPORT (2026-11-05, "always
 * says stopped"): Recording, Playing or Stopped. Recording wins — a
 * recording may run with playback under it. There is no paused state in
 * the prototype: P and X stop with the cursor left where playback was.
 */
export type TransportStatus = 'Recording' | 'Playing' | 'Stopped';

export function transportStatusText(transport: { isRecording: boolean; isPlaying: boolean }): TransportStatus {
  if (transport.isRecording) return 'Recording';
  return transport.isPlaying ? 'Playing' : 'Stopped';
}

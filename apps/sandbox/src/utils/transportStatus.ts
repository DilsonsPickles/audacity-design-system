import { formatVarispeedPercent } from '@audacity-ui/components';

/**
 * THE STATUS BAR'S TWO SLOTS, for the transport (2026-11-05; the Figma
 * "Status/Info bar" spec, 41 - Bottom toolbar 6431:26297 — Audacity 3's
 * status bar: slot one is the PLAYBACK CUE, slot two says what the
 * pointer is over, a slider's VALUE included: "Volume: -8.0 dB").
 *
 * Slot one: Recording, Playing or Stopped ("always says stopped" — it
 * was the component's default until then). Recording wins — a recording
 * may run with playback under it. There is no paused state in the
 * prototype (the spec's "Stopped paused"): P and X stop with the cursor
 * left where playback was; nor scrubbing.
 *
 * A PLAYBACK SPEED THAT IS ON IS PART OF THE CUE ("if I'm a shortcut
 * user and I ONLY want to see what speed I'm at…"): "Playing at 110%",
 * and "Stopped · 110%" while stopped — the standing state, visible
 * whatever the toolbar shows. Nothing at 100%, which is off. A recording
 * is not played at speed, so its cue stays bare.
 */
export function transportStatusText(transport: { isRecording: boolean; isPlaying: boolean; speed?: number }): string {
  if (transport.isRecording) return 'Recording';
  const speed = transport.speed ?? 1;
  const atSpeed = Math.abs(speed - 1) >= 0.0005;
  if (transport.isPlaying) return atSpeed ? `Playing at ${formatVarispeedPercent(speed)}` : 'Playing';
  return atSpeed ? `Stopped · ${formatVarispeedPercent(speed)}` : 'Stopped';
}

/** Slot two's line for the speed, the spec's slider pattern
 *  ("Volume: +0.0 dB") */
export function speedInfoText(speed: number): string {
  return `Playback speed: ${formatVarispeedPercent(speed)}`;
}

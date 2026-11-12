/**
 * Clip merge — the paste matrix's alwaysPasteAsNewClip OFF half
 * (2026-11-12 spec): pasted audio is written INTO the recipient clip
 * rather than landing as a clip of its own. The result stays ONE clip:
 * its visible waveform is spliced in canvas time and its audio buffer
 * is recomposed from slices of the source buffers, with the source
 * rebuilt flat (trimStart 0, fullDuration = the new duration) so every
 * later edit sees an ordinary clip.
 *
 * WHAT MERGES: plain audio on both sides. A recipient or content piece
 * that is stretched, pitched, reversed, or carries deletedRegions
 * falls back to the new-clip paste (canMergeClip) — merging those
 * means offline-rendering, which is exportClip territory, not v1's.
 * The content's own envelope and fades are NOT carried into the
 * recipient (its audio is taken as recorded); the recipient keeps its
 * envelope with times remapped and its fades refit to the new length.
 */

import type { Clip } from '../contexts/TracksContext';

/** A fade shorter than this is no fade (the reducers' MIN_FADE_SECONDS) */
const MIN_FADE = 0.02;

/** Only plain audio merges; everything else pastes as a new clip. */
export function canMergeClip(clip: Clip): boolean {
  if ((clip.stretchFactor ?? 1) !== 1) return false;
  if (clip.pitchSemitones) return false;
  if (clip.reversed) return false;
  if (clip.deletedRegions && clip.deletedRegions.length > 0) return false;
  return true;
}

export interface MergeContentPiece {
  /** The landed clip data (already truncated to the destination) */
  clip: Clip;
  /** Canvas-absolute landing start */
  start: number;
  /** The id whose stored buffer plays this content (the copy's source) */
  bufferKey: number;
}

export interface MergeContent {
  /** Canvas-absolute start of the whole content span */
  start: number;
  /** The span's length — silence where no piece covers it */
  duration: number;
  pieces: MergeContentPiece[];
}

export type MergeOp =
  /** Overlap mode at a point: replace [start, start+duration] in place,
   *  extending the clip's end when the content runs past it */
  | { kind: 'overwrite' }
  /** Push mode at a point: open a hole at `start` — the clip grows */
  | { kind: 'insert' }
  /** A range destination: [start, rangeEnd] is replaced by the content
   *  (longer range → the clip shrinks; equal → length holds) */
  | { kind: 'replace'; rangeEnd: number };

/** One slice of the recomposed audio: a stored buffer's span, or silence */
export interface BufferSegment {
  key?: number | string;
  /** Seconds into the SOURCE buffer (absent for silence) */
  offset?: number;
  duration: number;
}

export interface MergeResult {
  /** The merged clip — id/start/selected are the caller's to set */
  clip: Clip;
  /** The new clip's canvas start (unchanged: the recipient's) */
  start: number;
  /** Recipe for the recomposed audio buffer, in result order */
  segments: BufferSegment[];
}

const WAVE_FIELDS = [
  'waveform', 'waveformLeft', 'waveformRight',
  'waveformRms', 'waveformLeftRms', 'waveformRightRms',
] as const;
type WaveField = (typeof WAVE_FIELDS)[number];

/** Nearest-sample read with edge clamping */
function sampleAt(arr: number[], index: number): number {
  const i = Math.max(0, Math.min(arr.length - 1, Math.floor(index)));
  return arr[i] ?? 0;
}

export function mergePasteIntoClip(
  recipient: Clip,
  recipientStart: number,
  recipientBufferKey: number | string,
  content: MergeContent,
  op: MergeOp
): MergeResult | null {
  if (!canMergeClip(recipient) || !content.pieces.every((p) => canMergeClip(p.clip))) return null;

  const rs = recipientStart;
  const re = rs + recipient.duration;
  const ps = content.start;
  const d = content.duration;
  if (ps < rs - 1e-6 || ps > re + 1e-6) return null; // the anchor must be on the clip

  // The result, as spans of the RECIPIENT around the content span
  let headEnd = ps;            // recipient [rs, headEnd] survives in front
  let tailStart: number;       // recipient [tailStart, re] survives behind
  if (op.kind === 'overwrite') tailStart = ps + d;
  else if (op.kind === 'insert') tailStart = ps;
  else tailStart = Math.min(op.rangeEnd, re);
  headEnd = Math.max(rs, Math.min(headEnd, re));
  tailStart = Math.max(headEnd, Math.min(tailStart, re));

  const headLen = headEnd - rs;
  const tailLen = re - tailStart;
  const newDur = headLen + d + tailLen;

  const trim = recipient.trimStart ?? 0;

  // ——— Waveform splice, per field the recipient carries ———
  const fields: Partial<Record<WaveField, number[]>> = {};
  for (const field of WAVE_FIELDS) {
    const arr = recipient[field];
    if (!arr || arr.length === 0) continue;
    const srcDur = recipient.fullDuration ?? recipient.duration; // stretch is 1 by the guard
    const density = arr.length / srcDur; // samples per second
    const out: number[] = new Array(Math.max(1, Math.round(newDur * density)));
    for (let i = 0; i < out.length; i++) {
      const t = i / density; // seconds into the RESULT
      if (t < headLen) {
        out[i] = sampleAt(arr, (trim + t) * density);
      } else if (t < headLen + d) {
        // inside the content span: a piece's audio, or silence
        const abs = ps + (t - headLen);
        const piece = content.pieces.find((p) => abs >= p.start - 1e-9 && abs < p.start + p.clip.duration);
        if (!piece) { out[i] = 0; continue; }
        const pArr = piece.clip[field] ?? piece.clip.waveform;
        if (!pArr || pArr.length === 0) { out[i] = 0; continue; }
        const pSrcDur = piece.clip.fullDuration ?? piece.clip.duration;
        const pDensity = pArr.length / pSrcDur;
        out[i] = sampleAt(pArr, ((piece.clip.trimStart ?? 0) + (abs - piece.start)) * pDensity);
      } else {
        out[i] = sampleAt(arr, (trim + (tailStart - rs) + (t - headLen - d)) * density);
      }
    }
    fields[field] = out;
  }

  // ——— Envelope: the recipient's, times remapped; the span's dropped ———
  const removedLen = tailStart - headEnd; // what the content span consumed
  const shift = d - removedLen;           // how much the tail moved
  const envelopePoints = recipient.envelopePoints
    .filter((p) => p.time < headLen || p.time >= tailStart - rs)
    .map((p) => (p.time < headLen ? p : { ...p, time: p.time + shift }))
    .filter((p) => p.time >= 0 && p.time <= newDur);

  // ——— Fades refit to the new length (fade-belongs-to-its-edge) ———
  const fadeIn = Math.min(recipient.fadeIn ?? 0, newDur);
  const fadeOut = Math.min(recipient.fadeOut ?? 0, Math.max(0, newDur - fadeIn));

  const clip: Clip = {
    ...recipient,
    duration: newDur,
    trimStart: 0,
    fullDuration: newDur,
    stretchFactor: undefined,
    deletedRegions: undefined,
    sourceClipId: undefined, // the merged audio is its own, composed below
    envelopePoints,
    fadeIn: fadeIn >= MIN_FADE ? fadeIn : undefined,
    fadeOut: fadeOut >= MIN_FADE ? fadeOut : undefined,
    ...fields,
  };

  // ——— The audio recipe, in result order ———
  const segments: BufferSegment[] = [];
  if (headLen > 1e-9) segments.push({ key: recipientBufferKey, offset: trim, duration: headLen });
  const sorted = [...content.pieces].sort((a, b) => a.start - b.start);
  let cursor = ps;
  for (const p of sorted) {
    if (p.start > cursor + 1e-9) segments.push({ duration: p.start - cursor }); // silence
    segments.push({ key: p.bufferKey, offset: p.clip.trimStart ?? 0, duration: p.clip.duration });
    cursor = p.start + p.clip.duration;
  }
  if (cursor < ps + d - 1e-9) segments.push({ duration: ps + d - cursor }); // trailing silence
  if (tailLen > 1e-9) segments.push({ key: recipientBufferKey, offset: trim + (tailStart - rs), duration: tailLen });

  return { clip, start: rs, segments };
}

/**
 * Build the merged clip's audio buffer from the recipe. Returns null —
 * and the merge stays visual-only — when a needed buffer is missing
 * (the debug placeholder clips carry none), sample rates disagree, or
 * the AudioBuffer constructor isn't available (jsdom).
 */
export function composeMergedBuffer(
  getBuffer: (key: number | string) => AudioBuffer | undefined,
  segments: BufferSegment[]
): AudioBuffer | null {
  if (typeof AudioBuffer === 'undefined') return null;

  let sampleRate = 0;
  let channels = 1;
  for (const seg of segments) {
    if (seg.key === undefined) continue;
    const buf = getBuffer(seg.key);
    if (!buf) return null;
    if (sampleRate === 0) sampleRate = buf.sampleRate;
    else if (buf.sampleRate !== sampleRate) return null;
    channels = Math.max(channels, buf.numberOfChannels);
  }
  if (sampleRate === 0) return null; // nothing but silence

  const totalSec = segments.reduce((s, seg) => s + seg.duration, 0);
  const length = Math.max(1, Math.round(totalSec * sampleRate));
  const out = new AudioBuffer({ length, sampleRate, numberOfChannels: channels });

  let writeFrame = 0;
  for (const seg of segments) {
    const segFrames = Math.round(seg.duration * sampleRate);
    if (seg.key !== undefined) {
      const buf = getBuffer(seg.key)!;
      const from = Math.round((seg.offset ?? 0) * sampleRate);
      for (let ch = 0; ch < channels; ch++) {
        const src = buf.getChannelData(Math.min(ch, buf.numberOfChannels - 1));
        const slice = src.subarray(
          Math.min(from, src.length),
          Math.min(from + segFrames, src.length)
        );
        out.copyToChannel(new Float32Array(slice), ch, Math.min(writeFrame, length - 1));
      }
    }
    writeFrame += segFrames;
  }
  return out;
}

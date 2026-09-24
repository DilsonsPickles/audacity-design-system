import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '../contexts/TracksContext';
import { calculateTrackYOffset } from '../utils/trackLayout';
import { effectiveTrackHeight } from '../utils/trackFolders';

/** Right-drag "marquee" selection: hold right mouse button and drag
 *  across the canvas to lasso every clip the rectangle covers. Only
 *  selects clips — the time selection, track selection, and playhead
 *  are all left alone. */
export interface UseMarqueeSelectionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  tracks: Track[];
  pixelsPerSecond: number;
  clipContentOffset: number;
  topGap: number;
  trackGap: number;
  defaultTrackHeight: number;
  /** Called when the user releases the right button — receives the
   *  full set of clip / track pairs the marquee covered. Consumer
   *  usually dispatches `SELECT_CLIPS`. When the array is empty the
   *  caller can decide whether to clear or preserve the previous
   *  clip selection. */
  onSelectionCommit: (
    picks: Array<{ trackIndex: number; clipId: number }>,
    modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
  ) => void;
  /** Called once, the moment the right-drag crosses the threshold into
   *  marquee mode — NOT on the raw mousedown, which may still turn out
   *  to be a right-click on a selected clip wanting its context menu.
   *  The consumer clears the existing selection here (unless Shift is
   *  held, which makes the marquee additive). */
  onMarqueeStart?: (modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
}

export interface MarqueeRect {
  /** Container-local left / top / width / height for the rectangle
   *  overlay. Always non-negative width / height (normalised from
   *  the raw start / end even when the user drags up-left). */
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Everything the hit test needs to turn a rectangle into clip picks.
 *  Passed explicitly so the test is pure and callable from both the
 *  live preview and the commit. */
export interface MarqueeHitContext {
  tracks: Track[];
  pixelsPerSecond: number;
  clipContentOffset: number;
  topGap: number;
  trackGap: number;
  defaultTrackHeight: number;
}

export type MarqueePick = { trackIndex: number; clipId: number };

/** THE hit test. Every clip (audio + MIDI) whose time span overlaps
 *  the rectangle's horizontal span, on every track whose drawn band
 *  overlaps its vertical span. Pure, so the highlight the user sees
 *  mid-drag and the selection committed on release are the same
 *  computation — they can never disagree.
 *
 *  Vertical bands use the FOLDER-AWARE height: a collapsed folder's
 *  children draw nothing and so can't be lassoed (they used to claim
 *  a full-height band each and got swept invisibly). */
export function clipsInMarquee(rect: MarqueeRect, ctx: MarqueeHitContext): MarqueePick[] {
  const { tracks, pixelsPerSecond, clipContentOffset, topGap, trackGap, defaultTrackHeight } = ctx;
  const timeStart = Math.max(0, (rect.left - clipContentOffset) / pixelsPerSecond);
  const timeEnd = Math.max(0, (rect.left + rect.width - clipContentOffset) / pixelsPerSecond);
  const yTop = rect.top;
  const yBottom = rect.top + rect.height;

  const picks: MarqueePick[] = [];
  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    const track = tracks[trackIndex];
    const trackH = effectiveTrackHeight(tracks, trackIndex, defaultTrackHeight);
    if (trackH === 0) continue; // hidden inside a collapsed folder
    const trackTop = calculateTrackYOffset(trackIndex, tracks, topGap, trackGap, defaultTrackHeight);
    const trackBottom = trackTop + trackH;
    // Track vertical overlap test (any pixel of the track band
    // covered by the marquee rectangle counts).
    if (trackBottom <= yTop || trackTop >= yBottom) continue;

    const allClips = [...(track.clips || []), ...(track.midiClips || [])];
    for (const clip of allClips) {
      const cStart = clip.start;
      const cEnd = clip.start + clip.duration;
      // Time overlap: any portion of the clip covered by the
      // marquee's horizontal span.
      if (cEnd <= timeStart || cStart >= timeEnd) continue;
      picks.push({ trackIndex, clipId: clip.id });
    }
  }
  return picks;
}

/** Picks grouped for rendering: trackIndex -> clip ids under the
 *  rectangle right now. */
export type MarqueePickMap = ReadonlyMap<number, ReadonlySet<number>>;

function groupPicks(picks: readonly MarqueePick[]): Map<number, Set<number>> {
  const byTrack = new Map<number, Set<number>>();
  for (const p of picks) {
    const set = byTrack.get(p.trackIndex);
    if (set) set.add(p.clipId);
    else byTrack.set(p.trackIndex, new Set([p.clipId]));
  }
  return byTrack;
}

/** Stable identity key for a pick set, so the preview only re-renders
 *  when MEMBERSHIP changes — not on every pixel of pointer travel. */
function picksSignature(picks: readonly MarqueePick[]): string {
  return picks.map((p) => `${p.trackIndex}:${p.clipId}`).join(',');
}

export interface UseMarqueeSelectionReturn {
  /** Current marquee rectangle (in container-local pixels). Null
   *  when no drag is in progress. Consumers render an overlay from
   *  this. */
  marqueeRect: MarqueeRect | null;
  /** Live preview of what release would select: the clips the
   *  rectangle currently covers, grouped by track. Null when no
   *  marquee is in progress. Identity is stable while the covered
   *  set is unchanged. */
  marqueePicks: MarqueePickMap | null;
  /** The modifiers the gesture started with — the consumer needs
   *  them to preview additive (Shift) vs replacing drags. */
  marqueeModifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean } | null;
  /** True from the moment the right-button drag has moved far enough
   *  to distinguish it from a plain right-click (which should still
   *  open the existing context menu). */
  isMarqueeing: boolean;
  /** Attach to the canvas container as `onMouseDownCapture` so we
   *  beat the built-in context-menu / clip-drag handlers. */
  onMouseDownCapture: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** True on the exact tick the marquee committed — consumer's
   *  `onContextMenu` handler should skip its menu when this is set,
   *  so a right-drag doesn't also pop the menu on release. */
  wasMarqueeing: () => boolean;
}

const MARQUEE_MOVE_THRESHOLD = 4; // px — below this we treat the gesture as a right-click.

export function useMarqueeSelection({
  containerRef,
  tracks,
  pixelsPerSecond,
  clipContentOffset,
  topGap,
  trackGap,
  defaultTrackHeight,
  onSelectionCommit,
  onMarqueeStart,
}: UseMarqueeSelectionOptions): UseMarqueeSelectionReturn {
  // `tracks` (and everything derived from it) changes on every clip
  // edit. Keep it in refs so the document-level move / up listeners
  // register once instead of churning every dispatch (same fix we
  // applied to trim / stretch).
  const tracksRef = useRef(tracks);
  const pixelsPerSecondRef = useRef(pixelsPerSecond);
  const clipContentOffsetRef = useRef(clipContentOffset);
  const topGapRef = useRef(topGap);
  const trackGapRef = useRef(trackGap);
  const defaultTrackHeightRef = useRef(defaultTrackHeight);
  const onSelectionCommitRef = useRef(onSelectionCommit);
  const onMarqueeStartRef = useRef(onMarqueeStart);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { pixelsPerSecondRef.current = pixelsPerSecond; }, [pixelsPerSecond]);
  useEffect(() => { clipContentOffsetRef.current = clipContentOffset; }, [clipContentOffset]);
  useEffect(() => { topGapRef.current = topGap; }, [topGap]);
  useEffect(() => { trackGapRef.current = trackGap; }, [trackGap]);
  useEffect(() => { defaultTrackHeightRef.current = defaultTrackHeight; }, [defaultTrackHeight]);
  useEffect(() => { onSelectionCommitRef.current = onSelectionCommit; }, [onSelectionCommit]);
  useEffect(() => { onMarqueeStartRef.current = onMarqueeStart; }, [onMarqueeStart]);

  const dragStartRef = useRef<
    | {
        startX: number;
        startY: number;
        modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean };
      }
    | null
  >(null);
  const justMarqueedRef = useRef(false);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [isMarqueeing, setIsMarqueeing] = useState(false);
  // The live picks feed BOTH the highlight and the commit: computed
  // once per move tick, read again on mouseup. `picksRef` is the
  // authority; the state copy exists only to re-render the preview,
  // and is skipped when membership is unchanged.
  const picksRef = useRef<MarqueePick[]>([]);
  const picksSignatureRef = useRef('');
  const [marqueePicks, setMarqueePicks] = useState<MarqueePickMap | null>(null);
  const [marqueeModifiers, setMarqueeModifiers] = useState<
    { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean } | null
  >(null);

  const onMouseDownCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 2) return; // right button only
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      dragStartRef.current = {
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        modifiers: {
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
        },
      };
      // Don't stopPropagation yet — the user might just be
      // right-clicking, in which case existing context-menu paths
      // (and the browser's own) should still see the event. We
      // gate the marquee on actual movement in handleMouseMove.
    },
    [containerRef],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const dx = currentX - start.startX;
      const dy = currentY - start.startY;
      const moved = Math.hypot(dx, dy) > MARQUEE_MOVE_THRESHOLD;

      if (!moved && !isMarqueeing) return;

      if (!isMarqueeing) {
        // Cross the threshold — commit to marquee mode. Now we can
        // block the context menu that would otherwise fire on the
        // upcoming mouseup.
        setIsMarqueeing(true);
        setMarqueeModifiers(start.modifiers);
        onMarqueeStartRef.current?.(start.modifiers);
      }

      const left = Math.min(start.startX, currentX);
      const top = Math.min(start.startY, currentY);
      const width = Math.abs(dx);
      const height = Math.abs(dy);
      const nextRect = { left, top, width, height };
      setMarqueeRect(nextRect);

      // Hit-test every tick so the covered clips light up as the
      // rectangle sweeps them. Re-rendering is gated on membership,
      // not on pointer travel.
      const picks = clipsInMarquee(nextRect, {
        tracks: tracksRef.current,
        pixelsPerSecond: pixelsPerSecondRef.current,
        clipContentOffset: clipContentOffsetRef.current,
        topGap: topGapRef.current,
        trackGap: trackGapRef.current,
        defaultTrackHeight: defaultTrackHeightRef.current,
      });
      picksRef.current = picks;
      const signature = picksSignature(picks);
      if (signature !== picksSignatureRef.current) {
        picksSignatureRef.current = signature;
        setMarqueePicks(groupPicks(picks));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      // Only care about the right button coming up. If a left-button
      // release happens mid-right-drag (unlikely) we leave the drag
      // alive.
      if (e.button !== 2) return;

      const marqueed = isMarqueeing;
      dragStartRef.current = null;

      const clearPreview = () => {
        picksRef.current = [];
        picksSignatureRef.current = '';
        setMarqueePicks(null);
        setMarqueeModifiers(null);
      };

      if (!marqueed) {
        // Below threshold — treat as a plain right-click. Leave the
        // context-menu path to Canvas.
        setMarqueeRect(null);
        clearPreview();
        return;
      }

      // Commit exactly what the highlight promised: the picks the
      // last move tick computed, not a fresh hit test. The user
      // released on what they could see.
      if (marqueeRect) {
        onSelectionCommitRef.current(picksRef.current, start.modifiers);
      }

      // Prevent the follow-up contextmenu event so a right-drag
      // finishing over a clip doesn't also open a menu. The
      // consumer's onContextMenu should check `wasMarqueeing()`.
      justMarqueedRef.current = true;
      setTimeout(() => {
        justMarqueedRef.current = false;
      }, 0);

      setIsMarqueeing(false);
      setMarqueeRect(null);
      // The real selection has landed — drop the preview so clips go
      // back to reading their own `selected` flag.
      clearPreview();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    // isMarqueeing / marqueeRect intentionally in deps: without them
    // the closure would see stale flag values and never emit the
    // "committed" branch after the first tick.
  }, [containerRef, isMarqueeing, marqueeRect]);

  return {
    marqueeRect,
    marqueePicks,
    marqueeModifiers,
    isMarqueeing,
    onMouseDownCapture,
    wasMarqueeing: () => justMarqueedRef.current,
  };
}

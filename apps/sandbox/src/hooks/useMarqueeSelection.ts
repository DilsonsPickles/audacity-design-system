import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '../contexts/TracksContext';
import { calculateTrackYOffset } from '../utils/trackLayout';

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

export interface UseMarqueeSelectionReturn {
  /** Current marquee rectangle (in container-local pixels). Null
   *  when no drag is in progress. Consumers render an overlay from
   *  this. */
  marqueeRect: MarqueeRect | null;
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
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { pixelsPerSecondRef.current = pixelsPerSecond; }, [pixelsPerSecond]);
  useEffect(() => { clipContentOffsetRef.current = clipContentOffset; }, [clipContentOffset]);
  useEffect(() => { topGapRef.current = topGap; }, [topGap]);
  useEffect(() => { trackGapRef.current = trackGap; }, [trackGap]);
  useEffect(() => { defaultTrackHeightRef.current = defaultTrackHeight; }, [defaultTrackHeight]);
  useEffect(() => { onSelectionCommitRef.current = onSelectionCommit; }, [onSelectionCommit]);

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
      }

      const left = Math.min(start.startX, currentX);
      const top = Math.min(start.startY, currentY);
      const width = Math.abs(dx);
      const height = Math.abs(dy);
      setMarqueeRect({ left, top, width, height });
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

      if (!marqueed) {
        // Below threshold — treat as a plain right-click. Leave the
        // context-menu path to Canvas.
        setMarqueeRect(null);
        return;
      }

      // Compute the selection from the rectangle. Uses live values
      // from the refs above so we're always operating on the
      // current tracks / zoom / layout.
      const tracks = tracksRef.current;
      const pixelsPerSecond = pixelsPerSecondRef.current;
      const clipContentOffset = clipContentOffsetRef.current;
      const topGap = topGapRef.current;
      const trackGap = trackGapRef.current;
      const defaultTrackHeight = defaultTrackHeightRef.current;

      const rectEl = marqueeRect;
      if (rectEl) {
        const timeStart = Math.max(0, (rectEl.left - clipContentOffset) / pixelsPerSecond);
        const timeEnd = Math.max(0, (rectEl.left + rectEl.width - clipContentOffset) / pixelsPerSecond);
        const yTop = rectEl.top;
        const yBottom = rectEl.top + rectEl.height;

        const picks: Array<{ trackIndex: number; clipId: number }> = [];
        for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
          const track = tracks[trackIndex] as any;
          const yOff = calculateTrackYOffset(trackIndex, tracks, topGap, trackGap, defaultTrackHeight);
          const trackH = track.height || defaultTrackHeight;
          const trackTop = yOff;
          const trackBottom = yOff + trackH;
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

        onSelectionCommitRef.current(picks, start.modifiers);
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
    isMarqueeing,
    onMouseDownCapture,
    wasMarqueeing: () => justMarqueedRef.current,
  };
}

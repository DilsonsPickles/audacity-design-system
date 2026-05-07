// apps/sandbox/src/utils/resolveOverlap.ts

export interface ResolverClip {
  id: number;
  start: number;
  duration: number;
  trimStart?: number;
  fullDuration?: number;
}

export interface ResolverTrack {
  clips: ResolverClip[];
}

export interface ClipPlacement {
  clipId: number;
  trackIndex: number;
  start: number;
  duration: number;
}

export type ClipMutation =
  | {
      type: 'trim';
      clipId: number;
      trackIndex: number;
      newStart: number;
      newDuration: number;
      newTrimStart: number;
    }
  | {
      type: 'split';
      clipId: number;
      trackIndex: number;
      // Left segment runs original.start → leftEnd (duration = leftEnd - original.start).
      // Right segment runs rightStart → original.start + original.duration.
      leftEnd: number;
      rightStart: number;
    }
  | {
      type: 'delete';
      clipId: number;
      trackIndex: number;
    };

export interface OverlapResolution {
  placements: ClipPlacement[];
  mutations: ClipMutation[];
}

/**
 * Pure resolver: given current tracks and the proposed final positions of moving clips,
 * compute the diff (placements + mutations) needed to apply the spec's overlap rule.
 * The moving clip(s) always win; underlying clips on the destination tracks are
 * non-destructively trimmed, split, or deleted depending on geometry.
 */
export function resolveOverlap(
  tracks: ResolverTrack[],
  intent: ClipPlacement[],
  movingClipIds: ReadonlySet<number>,
): OverlapResolution {
  const mutations: ClipMutation[] = [];

  for (const placement of intent) {
    const destTrack = tracks[placement.trackIndex];
    if (!destTrack) continue;

    const mStart = placement.start;
    const mEnd = placement.start + placement.duration;

    for (const underlying of destTrack.clips) {
      if (movingClipIds.has(underlying.id)) continue;

      const uStart = underlying.start;
      const uEnd = underlying.start + underlying.duration;

      // No overlap (strict): mEnd <= uStart or mStart >= uEnd
      if (mEnd <= uStart || mStart >= uEnd) continue;

      // Geometry classification will go here in later tasks.
    }
  }

  return { placements: intent, mutations };
}

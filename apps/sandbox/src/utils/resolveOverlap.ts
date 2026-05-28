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

      const fullyObscured = mStart <= uStart && mEnd >= uEnd;
      const fullyInside = mStart > uStart && mEnd < uEnd;
      const overlapsRight = mStart > uStart && mEnd >= uEnd; // moving covers underlying's right portion
      const overlapsLeft = mStart <= uStart && mEnd < uEnd && mEnd > uStart; // moving covers underlying's left portion

      if (fullyObscured) {
        mutations.push({
          type: 'delete',
          clipId: underlying.id,
          trackIndex: placement.trackIndex,
        });
      } else if (fullyInside) {
        mutations.push({
          type: 'split',
          clipId: underlying.id,
          trackIndex: placement.trackIndex,
          leftEnd: mStart,
          rightStart: mEnd,
        });
      } else if (overlapsRight) {
        mutations.push({
          type: 'trim',
          clipId: underlying.id,
          trackIndex: placement.trackIndex,
          newStart: underlying.start,
          newDuration: mStart - underlying.start,
          newTrimStart: underlying.trimStart ?? 0,
        });
      } else if (overlapsLeft) {
        const overlapAmount = mEnd - uStart;
        mutations.push({
          type: 'trim',
          clipId: underlying.id,
          trackIndex: placement.trackIndex,
          newStart: mEnd,
          newDuration: uEnd - mEnd,
          newTrimStart: (underlying.trimStart ?? 0) + overlapAmount,
        });
      }
    }
  }

  return { placements: intent, mutations };
}

import { useEffect, useReducer, useRef } from 'react';
import { GROUP_COLLAPSE_MS } from '@audacity-ui/core';

export interface CollapseTransition {
  /** Rows that were visible last render and are hidden now: keep them
   *  mounted and tween them to zero. */
  hiding: ReadonlySet<number>;
  /** Rows that were hidden last render and are visible now: they mount
   *  fresh, so they grow from zero via a keyframe. */
  revealing: ReadonlySet<number>;
  /** True for the tween's duration after any toggle — rows below the
   *  group slide while this is set. */
  animating: boolean;
}

const EMPTY: { hiding: Set<number>; revealing: Set<number> } = {
  hiding: new Set(),
  revealing: new Set(),
};

/**
 * Which rows are mid-way through a group collapse or expand.
 *
 * The sets are captured DURING the render in which the hidden flags
 * change — not in an effect afterwards — so the very same commit that
 * hides a row can render it mounted-at-zero with a transition. An effect
 * would be a frame late: the row would already have unmounted, and a row
 * that remounts at zero has nothing to tween from.
 *
 * Rows are matched by id, so a delete that shifts indices does not read
 * as a row hiding or appearing. The sets clear themselves after
 * GROUP_COLLAPSE_MS (plus slack for the last frame) and the hook
 * re-renders its owner so the transition styles come off; a second
 * toggle inside that window replaces the sets and restarts the clock.
 */
export function useCollapseTransition(
  hidden: readonly boolean[],
  ids: readonly (string | number | null | undefined)[],
): CollapseTransition {
  const prevRef = useRef<{ hidden: readonly boolean[]; ids: readonly (string | number | null | undefined)[] }>({ hidden, ids });
  const setsRef = useRef(EMPTY);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const prev = prevRef.current;
  if (prev.hidden !== hidden) {
    const hiding = new Set<number>();
    const revealing = new Set<number>();
    for (let i = 0; i < hidden.length; i++) {
      if (prev.ids[i] === undefined || prev.ids[i] !== ids[i]) continue; // not the same row
      const was = prev.hidden[i];
      if (was === undefined) continue;
      if (!was && hidden[i]) hiding.add(i);
      else if (was && !hidden[i]) revealing.add(i);
    }
    if (hiding.size > 0 || revealing.size > 0) setsRef.current = { hiding, revealing };
    prevRef.current = { hidden, ids };
  }

  const sets = setsRef.current;
  const animating = sets !== EMPTY;
  useEffect(() => {
    if (!animating) return;
    const t = setTimeout(() => {
      setsRef.current = EMPTY;
      rerender();
    }, GROUP_COLLAPSE_MS + 40);
    return () => clearTimeout(t);
  }, [sets, animating]);

  return { hiding: sets.hiding, revealing: sets.revealing, animating };
}

/**
 * Snap guideline coalescing utilities
 */

export type SnapKind = 'grid' | 'alignment' | null;

export interface SnapGuidelineInput {
  time: number | null;
  kind: SnapKind;
}

export interface SnapGuideline {
  time: number | null;
  kind: SnapKind;
}

/**
 * Resolve which snap guideline to render when clip dragging, trimming, and
 * stretching can each report their own snap target. Only one guideline is
 * ever drawn at a time.
 *
 * Mirrors Canvas.tsx's inline coalescing verbatim: `time` and `kind` are
 * each resolved independently via a drag ?? trim ?? stretch chain (not as
 * a single paired source), so drag wins over trim which wins over stretch,
 * per field.
 */
export function resolveSnapGuideline(
  drag: SnapGuidelineInput,
  trim: SnapGuidelineInput,
  stretch: SnapGuidelineInput
): SnapGuideline {
  return {
    time: drag.time ?? trim.time ?? stretch.time,
    kind: drag.kind ?? trim.kind ?? stretch.kind,
  };
}

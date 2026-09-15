// Label track overlay — coordinator for the per-label pieces (rewritten
// 2026-09-15, labels-rewrite). Computes the size-derived metrics ONCE from
// the label-text-size preference, packs labels into rows, and maps each to
// a LabelItem (ears + stalks + banner + inline editor — see
// components/labels/LabelItem.tsx for the drawing and interaction detail).
//
// Editing state lives here: one label at a time may be editing, keyed by
// `${trackIndex}-${label.id}`. A label ADDED while this renderer is
// mounted with empty text opens its editor immediately, so "Add label"
// flows straight into typing — labels loaded with a project never
// self-open (first render seeds the known-id set).
//
// Hit-testing in useClipMouseDown derives the SAME metrics — keep them in
// lockstep or clicks land beside the pixels.

import React, { useEffect, useRef, useState } from 'react';
import { useAppearancePrefs } from '@audacity-ui/components';
import type { Label, TracksAction } from '../contexts/TracksContext';
import { calculateLabelRows, calculatePointLabelWidth, getLabelMetrics, labelPtToPx } from '../utils/labelLayout';
import { LabelItem } from './labels/LabelItem';

interface LabelRendererProps {
  labels: Label[];
  /** The label track's palette color — labels render in it (default blue,
   *  the classic label hue). */
  trackColor?: string;
  trackIndex: number;
  trackHeight: number;
  pixelsPerSecond: number;
  clipContentOffset: number;
  selectedLabelIds: string[];
  hoveredEar: string | null;
  hoveredBanner: string | null;
  /** Number of tracks in the project — used by label expansion to build
   *  the all-tracks scope. (Only the count is needed; taking the full
   *  array would couple this row to every tracks-array identity change
   *  and defeat CanvasTrack's memo.) */
  trackCount: number;
  selectedTrackIndices: number[];
  setHoveredEar: (id: string | null) => void;
  setHoveredBanner: (id: string | null) => void;
  dispatch: React.Dispatch<TracksAction>;
}

export const LabelRenderer: React.FC<LabelRendererProps> = ({
  labels,
  trackColor,
  trackIndex,
  trackHeight,
  pixelsPerSecond,
  clipContentOffset,
  selectedLabelIds,
  hoveredEar,
  hoveredBanner,
  trackCount,
  selectedTrackIndices,
  setHoveredEar,
  setHoveredBanner,
  dispatch,
}) => {
  const { labelTextSizePt } = useAppearancePrefs();
  const metrics = getLabelMetrics(labelPtToPx(labelTextSizePt));

  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

  // Auto-edit newly created labels: ids seen on the FIRST render are
  // seeded silently (project load); after that, a new id with empty text
  // is a fresh "Add label" and opens its editor.
  const knownIdsRef = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (knownIdsRef.current === null) {
      knownIdsRef.current = new Set(labels.map((l) => l.id));
      return;
    }
    const known = knownIdsRef.current;
    for (const label of labels) {
      if (!known.has(label.id)) {
        known.add(label.id);
        if (!label.text || label.text.trim() === '') {
          setEditingLabelId(`${trackIndex}-${label.id}`);
        }
      }
    }
    // Forget removed ids so undo/redo of an add re-opens the editor.
    const liveIds = new Set(labels.map((l) => l.id));
    for (const id of Array.from(known)) {
      if (!liveIds.has(id)) known.delete(id);
    }
  }, [labels, trackIndex]);

  const labelRows = calculateLabelRows(labels, pixelsPerSecond, clipContentOffset, metrics);

  // Perfectly-adjacent region labels on the same row share their boundary:
  // the junction renders ONE stalk (owned by the right-hand label) and no
  // ears, and dragging it moves both labels' shared edge together.
  const EDGE_EPS = 1e-6;
  const isRegion = (l: Label) => l.endTime !== undefined && l.endTime - l.startTime > EDGE_EPS;
  const leftNeighborOf = (l: Label): Label | undefined =>
    isRegion(l)
      ? labels.find(
          (o) =>
            o.id !== l.id
            && isRegion(o)
            && Math.abs(o.endTime! - l.startTime) < EDGE_EPS
            && labelRows.get(o.id) === labelRows.get(l.id),
        )
      : undefined;
  const rightNeighborOf = (l: Label): Label | undefined =>
    isRegion(l)
      ? labels.find(
          (o) =>
            o.id !== l.id
            && isRegion(o)
            && Math.abs(l.endTime! - o.startTime) < EDGE_EPS
            && labelRows.get(o.id) === labelRows.get(l.id),
        )
      : undefined;

  // Magnetic edges: every OTHER label's start/end (and point time) on
  // this track is a snap target, so drags can actually reach perfect
  // adjacency (and the shared stalk) by mouse.
  const snapTargetsFor = (l: Label): number[] => {
    const targets: number[] = [];
    labels.forEach((o) => {
      if (o.id === l.id) return;
      targets.push(o.startTime);
      if (o.endTime !== undefined && o.endTime !== o.startTime) targets.push(o.endTime);
    });
    return targets;
  };

  return (
    <>
      {labels.map((label) => {
        const x = clipContentOffset + label.startTime * pixelsPerSecond;
        const isPointLabel = label.startTime === label.endTime;
        const width = isPointLabel
          ? calculatePointLabelWidth(label.text, metrics)
          : (label.endTime! - label.startTime) * pixelsPerSecond;
        const labelKeyId = `${trackIndex}-${label.id}`;
        const row = labelRows.get(label.id) ?? 0;
        const topOffset = row * metrics.rowHeight;

        return (
          <LabelItem
            key={label.id}
            label={label}
            leftNeighbor={leftNeighborOf(label)}
            rightNeighbor={rightNeighborOf(label)}
            snapTargets={snapTargetsFor(label)}
            trackColor={trackColor}
            trackIndex={trackIndex}
            x={x}
            width={width}
            topOffset={topOffset}
            stalkHeight={trackHeight - topOffset}
            metrics={metrics}
            clipContentOffset={clipContentOffset}
            pixelsPerSecond={pixelsPerSecond}
            trackCount={trackCount}
            selectedTrackIndices={selectedTrackIndices}
            selectedLabelIds={selectedLabelIds}
            isSelected={selectedLabelIds.includes(labelKeyId)}
            hoveredEar={hoveredEar}
            hoveredBanner={hoveredBanner}
            isEditing={editingLabelId === labelKeyId}
            setHoveredEar={setHoveredEar}
            setHoveredBanner={setHoveredBanner}
            onStartEditing={setEditingLabelId}
            onStopEditing={() => setEditingLabelId(null)}
            dispatch={dispatch}
          />
        );
      })}
    </>
  );
};

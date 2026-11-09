import { useCallback, useRef, useState } from 'react';
import type { ToolbarLayout, ToolbarRegion } from '@audacity-ui/components';
import { resolveToolDrop, type ToolDropTarget } from '../utils/toolbarToolDrop';

export interface UseToolbarToolDragDeps {
  layout: ToolbarLayout;
  toolFitsVertical: (toolId: string) => boolean;
  onMoveInto: (toolId: string, barId: string, beforeToolId: string | null) => void;
  onMoveToNewBar: (toolId: string, region: ToolbarRegion, beforeBarId: string | null) => void;
}

export interface UseToolbarToolDragReturn {
  draggingToolId: string | null;
  target: ToolDropTarget | null;
  ghost: { x: number; y: number; width: number; height: number } | null;
  /** The editor row's rect at the press — the side bands' frame */
  rowRect: DOMRect | null;
  fitsVertical: boolean;
  onToolMouseDown: (toolId: string, barId: string, e: React.MouseEvent, toolRect: DOMRect) => void;
}

/** A press that travels less than this is a click, and moves nothing */
const DRAG_THRESHOLD_PX = 4;

/**
 * A TOOL'S DRAG, in the layout's edit mode (2026-11-10, custom toolbars):
 * a press on a tool lifts it; a ghost of its size follows the pointer;
 * `resolveToolDrop` says whether the release would JOIN a bar or make a
 * NEW one beside it; the release does that. Self-cleaning document
 * listeners, as the bar's grip drag.
 */
export function useToolbarToolDrag({ layout, toolFitsVertical, onMoveInto, onMoveToNewBar }: UseToolbarToolDragDeps): UseToolbarToolDragReturn {
  const [draggingToolId, setDraggingToolId] = useState<string | null>(null);
  const [target, setTarget] = useState<ToolDropTarget | null>(null);
  const [ghost, setGhost] = useState<UseToolbarToolDragReturn['ghost']>(null);
  const [rowRect, setRowRect] = useState<DOMRect | null>(null);
  const [fitsVertical, setFitsVertical] = useState(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const fitsRef = useRef(toolFitsVertical);
  fitsRef.current = toolFitsVertical;
  const intoRef = useRef(onMoveInto);
  intoRef.current = onMoveInto;
  const newRef = useRef(onMoveToNewBar);
  newRef.current = onMoveToNewBar;

  const onToolMouseDown = useCallback((toolId: string, _barId: string, e: React.MouseEvent, toolRect: DOMRect) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = startX - toolRect.left;
    const offsetY = startY - toolRect.top;
    const fits = fitsRef.current(toolId);
    const row = document.querySelector<HTMLElement>('[data-editor-row]')?.getBoundingClientRect() ?? null;
    let moved = false;
    let last: ToolDropTarget | null = null;

    const begin = () => {
      moved = true;
      setDraggingToolId(toolId);
      setFitsVertical(fits);
      setRowRect(row);
    };
    const onMove = (ev: MouseEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
        begin();
      }
      setGhost({ x: ev.clientX - offsetX, y: ev.clientY - offsetY, width: toolRect.width, height: toolRect.height });
      last = resolveToolDrop(ev.clientX, ev.clientY, layoutRef.current, row, fits);
      setTarget(last);
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const travelled = moved || Math.hypot(ev.clientX - startX, ev.clientY - startY) >= DRAG_THRESHOLD_PX;
      const final = travelled ? (resolveToolDrop(ev.clientX, ev.clientY, layoutRef.current, row, fits) ?? last) : null;
      setDraggingToolId(null);
      setTarget(null);
      setGhost(null);
      setRowRect(null);
      if (!final || final.refused) return;
      if (final.kind === 'into') intoRef.current(toolId, final.barId, final.beforeToolId);
      else newRef.current(toolId, final.region, final.beforeBarId);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return { draggingToolId, target, ghost, rowRect, fitsVertical, onToolMouseDown };
}

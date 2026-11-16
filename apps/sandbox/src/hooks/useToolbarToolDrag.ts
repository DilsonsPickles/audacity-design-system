import { useCallback, useRef, useState } from 'react';
import { TITLE_BAR_ALLOWED, TITLE_BAR_ID, TITLE_BAR_ONLY, type BarPlacement, type ToolbarLayout } from '@audacity-ui/components';
import { resolveToolDrop, type ToolDropTarget } from '../utils/toolbarToolDrop';

export interface UseToolbarToolDragDeps {
  layout: ToolbarLayout;
  toolFitsVertical: (toolId: string) => boolean;
  onMoveInto: (toolId: string, barId: string, beforeToolId: string | null) => void;
  onMoveToNewBar: (toolId: string, placement: BarPlacement) => void;
  /** Released OFF the toolbars (2026-11-16, ⌘-drag): the tool comes off
   *  them — to Not on a toolbar. Absent = such a release moves nothing */
  onRemove?: (toolId: string) => void;
  /** Tools that never come off the toolbars (the project tabs) */
  unremovable?: ReadonlySet<string>;
}

export interface UseToolbarToolDragReturn {
  draggingToolId: string | null;
  target: ToolDropTarget | null;
  ghost: { x: number; y: number; width: number; height: number } | null;
  /** The editor row's rect at the press — the side bands' frame */
  rowRect: DOMRect | null;
  fitsVertical: boolean;
  /** In hand and over no toolbar: a release takes the tool off them */
  removing: boolean;
  onToolMouseDown: (toolId: string, barId: string, e: React.MouseEvent, toolRect: DOMRect) => void;
}

/** A press that travels less than this is a click, and moves nothing */
const DRAG_THRESHOLD_PX = 4;

/**
 * A TOOL'S DRAG — a ⌘-press on any tool since 2026-11-16 (it was the layout's
 * edit mode's, 2026-11-10, custom toolbars):
 * a press on a tool lifts it; a ghost of its size follows the pointer;
 * `resolveToolDrop` says whether the release would JOIN a bar, make a
 * NEW one beside it, or make one on a NEW ROW; the release does that, and a
 * release over NO toolbar takes the tool off them (`onRemove`). Self-cleaning document
 * listeners, as the bar's grip drag.
 */
export function useToolbarToolDrag({ layout, toolFitsVertical, onMoveInto, onMoveToNewBar, onRemove, unremovable }: UseToolbarToolDragDeps): UseToolbarToolDragReturn {
  const [draggingToolId, setDraggingToolId] = useState<string | null>(null);
  const [target, setTarget] = useState<ToolDropTarget | null>(null);
  const [ghost, setGhost] = useState<UseToolbarToolDragReturn['ghost']>(null);
  const [rowRect, setRowRect] = useState<DOMRect | null>(null);
  const [fitsVertical, setFitsVertical] = useState(false);
  const [removing, setRemoving] = useState(false);
  const removeRef = useRef(onRemove);
  removeRef.current = onRemove;
  const unremovableRef = useRef(unremovable);
  unremovableRef.current = unremovable;
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

    const canRemove = !!removeRef.current && !unremovableRef.current?.has(toolId);
    // THE TITLE BAR TAKES APP-LEVEL ITEMS ONLY (2026-11-16): a tool joining it
    // that is not one is refused, as a side dock refuses a tool with no
    // vertical form
    const resolve = (x: number, y: number): ToolDropTarget | null => {
      const t = resolveToolDrop(x, y, layoutRef.current, row, fits);
      if (t && t.kind === 'into' && t.barId === TITLE_BAR_ID && !TITLE_BAR_ALLOWED.includes(toolId)) return { ...t, refused: true };
      // …and a title-bar-only item (Get effects, Mixer) goes nowhere else
      if (t && TITLE_BAR_ONLY.includes(toolId) && !(t.kind === 'into' && t.barId === TITLE_BAR_ID)) return { ...t, refused: true };
      return t;
    };
    const begin = () => {
      moved = true;
      setDraggingToolId(toolId);
      setFitsVertical(fits);
      setRowRect(row);
      document.body.setAttribute('data-toolbar-tool-drag', '');
    };
    const onMove = (ev: MouseEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
        begin();
      }
      setGhost({ x: ev.clientX - offsetX, y: ev.clientY - offsetY, width: toolRect.width, height: toolRect.height });
      last = resolve(ev.clientX, ev.clientY);
      setTarget(last);
      setRemoving(!last && canRemove);
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.removeAttribute('data-toolbar-tool-drag');
      const travelled = moved || Math.hypot(ev.clientX - startX, ev.clientY - startY) >= DRAG_THRESHOLD_PX;
      const final = travelled ? resolve(ev.clientX, ev.clientY) : null;
      setDraggingToolId(null);
      setTarget(null);
      setGhost(null);
      setRowRect(null);
      setRemoving(false);
      if (!travelled) return;
      // Released over no toolbar: off the toolbars (2026-11-16)
      if (!final) {
        if (canRemove) removeRef.current?.(toolId);
        return;
      }
      if (final.refused) return;
      if (final.kind === 'into') intoRef.current(toolId, final.barId, final.beforeToolId);
      else newRef.current(toolId, final.placement);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return { draggingToolId, target, ghost, rowRect, fitsVertical, removing, onToolMouseDown };
}

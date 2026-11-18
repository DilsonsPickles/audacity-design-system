import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '../ThemeProvider';
import { useContainerTabGroup } from '../hooks/useContainerTabGroup';
import { barDisplayName, isVerticalRegion, regionSide, type BarPlacement, type ToolbarBar, type ToolbarBarAxis, type ToolbarOrientation, type ToolbarRegion, isToolSeparator, isToolSpacer } from '../utils/toolbarLayout';
import { Flyout } from '../Flyout';
import { Icon } from '../Icon';
import '../assets/fonts/musescore-icon.css';
import './ToolbarDock.css';

export interface ToolMeta {
  /** The tool has a vertical form, so it may sit in a left / right dock */
  vertical?: boolean;
  /** The tool stretches to fill its row (the status bar's info line) */
  grow?: boolean;
  /** In a bar the user has SIZED, the tool takes the room the bar has
   *  beyond its natural size, and gives it back down to `minSize` before
   *  any tool overflows (the meters, 2026-11-10) */
  stretch?: boolean;
  /** The least a `grow` / `stretch` tool may shrink to, px along the dock */
  minSize?: number;
  /** The tool stays LIVE in the edit mode — not inert, not picked up by a
   *  press (the cog, which becomes the mode's Done button) */
  live?: boolean;
}

export interface ToolbarDockProps {
  region: ToolbarRegion;
  /** The dock's ROWS, each a list of bars (2026-11-10: rows are the
   *  user's — a row too wide for the window still wraps on screen) */
  rows: ReadonlyArray<ReadonlyArray<ToolbarBar>>;
  /** The tool with this id, drawn for this orientation — null for a tool
   *  that is hidden or unknown (a bar whose every tool is null draws
   *  nothing) */
  renderTool: (id: string, orientation: ToolbarOrientation) => React.ReactNode;
  /** A tool's meta in THIS dock's orientation (a meter grows in a column
   *  and stretches in a row) */
  toolMeta?: (id: string, orientation: ToolbarOrientation) => ToolMeta | undefined;
  /** A press on a bar's GRIP: the host owns the drag (self-cleaning
   *  document listeners), as the old toolbar gripper did */
  onGripMouseDown?: (barId: string, event: React.MouseEvent, barRect: DOMRect) => void;
  /** THE TOOLBAR'S MENU (2026-11-16): a right-click on a bar's grip, or
   *  Shift+F10 / the Menu key / Enter / Space on it from the keyboard — the
   *  grip is then a button in the dock's arrow-key ring (Tab still enters on
   *  the first tool). The anchor is the pointer, or under the grip. A
   *  right-click ANYWHERE ELSE on a toolbar opens the same menu, and on the
   *  dock's empty space asks with a null bar (2026-11-16, "I hate having to
   *  rely on the cog") — a tool with its own right-click menu prevents the
   *  default first and keeps it. `toolId` is the tool (or flexible space)
   *  the right-click landed on, and `beforeToolId` the GAP nearest the
   *  pointer along the toolbar — the tool it comes before, null = the
   *  toolbar's end — for items placed by the click (2026-11-18) */
  onBarMenu?: (barId: string | null, anchor: { x: number; y: number }, region?: ToolbarRegion, toolId?: string, beforeToolId?: string | null, row?: number) => void;
  /** AN EMPTY TOOLBAR'S "+" (2026-11-17, the flyout to add tools the empty
   *  toolbar was waiting for): given, an empty toolbar draws a + button that
   *  asks the host for its Add tool list under it */
  onEmptyBarAdd?: (barId: string, anchor: { x: number; y: number }) => void;
  /** The bar in hand, drawn faint in place */
  draggingBarId?: string | null;
  /** Where a CONTAINER would land (a bar by its grip, or a new bar for a
   *  tool): beside a bar of a row — the full-height line — or on a NEW
   *  ROW — the horizontal line across the dock; null = no indicator */
  insert?: BarPlacement | null;
  /** The drop is at a wrapped line's END: draw the line after this bar
   *  (rather than before the bar that starts the next line) */
  insertAfterBarId?: string | null;
  /** The drop would be refused (a bar with no vertical form over a side dock) */
  insertRefused?: boolean;
  /** EDIT MODE (2026-11-10): the tools are inert and each can be picked
   *  up — a press on one reports here instead of acting */
  editing?: boolean;
  onToolMouseDown?: (toolId: string, barId: string, event: React.MouseEvent, toolRect: DOMRect) => void;
  /** The tool in hand, drawn faint in place */
  draggingToolId?: string | null;
  /** Where a dragged tool would JOIN a bar: before this tool (null = the
   *  bar's end) — the short caret among the bar's tools. A drop that
   *  makes a NEW bar shows `insertAt`'s full-height line instead. */
  toolInsert?: { barId: string; beforeToolId: string | null } | null;
  /** A bar's resize edge was dragged (or double-clicked: null = natural
   *  size again). `axis` is 'width' in a horizontal dock, 'height' in a
   *  vertical one. Absent = bars cannot be resized. */
  onBarResize?: (barId: string, axis: ToolbarBarAxis, size: number | null) => void;
  /** Drawn at the end of the last row, right-aligned (the top bar's cog) */
  trailing?: React.ReactNode;
  className?: string;
  /** Roving-tabindex group for the whole dock; absent = no tab group */
  tabGroupId?: string;
  ariaLabel?: string;
  /** Extra data attributes on the dock's root */
  dataAttrs?: Record<string, string | undefined>;
  /** Extra styles on the root (a host's own tokens for its tools) */
  style?: React.CSSProperties;
  /** Whether a row's last toolbar fills the row (default true). False for a
   *  PREVIEW of one toolbar (the toolbar editor's, 2026-11-18): it keeps
   *  the size it has in its own row, a stored size included */
  lastFillsRow?: boolean;
  /** How a group (a bar) is drawn: 'lines' — flat, a full-height line
   *  between groups (the default) — or 'islands', each group a contained,
   *  rounded card on a slightly darker strip (2026-11-18, "I wonder if we
   *  made the groups a bit more contained. Like floating islands") */
  groupStyle?: 'lines' | 'islands';
  /** Groups kept in `rows` but NOT DRAWN here (2026-11-18): the desktop
   *  window's title bar draws the Title bar group, so the top dock passes
   *  every row — the row numbers it reports stay the layout's own — and
   *  hides that group, rather than taking its row out (which shifted every
   *  row number after it: drops and New group landed one row off) */
  hiddenBarIds?: ReadonlyArray<string>;
}

const GRIP_GLYPH = '';

/** A bar's gutter (its grip), the gap between tools, and the overflow
 *  button — the numbers the dock's sizing is made of (ToolbarDock.css) */
// The grip's width for the SIZING maths, an approximation: a toolbar that
// starts its line has a 16px grip, one that follows another 25 (8 clear,
// the 1px line between toolbars, 16 for the dots — 2026-11-16), and which
// one a bar is is only known once the line is packed. Packing itself reads
// the bars' MEASURED widths, so it is exact.
const GUTTER = 17;
const TOOL_GAP = 8;
const OVERFLOW_BUTTON = 28;
/** A sized bar is never smaller than its gutter and the overflow button */
const MIN_BAR_SIZE = GUTTER + OVERFLOW_BUTTON;
/** A resize lands on the bar's natural size within this distance */
const RESIZE_SNAP_PX = 6;
/** What a grow / stretch tool needs when it states no minSize */
const DEFAULT_MIN_STRETCH = 80;
/** A row's padding at its end, and above / below (ToolbarDock.css) */
const ROW_END_PAD = 8;
/** The most the dock re-lays itself out in one frame; past it the layout
 *  is left as it is rather than looping (a measure that flips between two
 *  values would otherwise re-render until React aborts — a crash) */
const MAX_RELAYOUTS_PER_FRAME = 8;

/** The natural width a growing bar is packed at (its content stretches after) */
const GROW_BAR_PACK_WIDTH = 160;

/**
 * A DOCK: rows of toolbars with persistent grips, in one of the four
 * regions (2026-11-09, the custom toolbars design). A HORIZONTAL dock
 * draws each of its ROWS as a line of bars — a row too wide for the
 * window WRAPS onto further lines by measured width (Audacity 3's dock) —
 * with a divider between bars on a line (each bar's GRIP: the divider's
 * gutter shows the dots on hover) and a line between rows
 * ("division lines between cols and rows"); a VERTICAL dock draws each of
 * its rows as a COLUMN, side by side ("allow me to have multiple vertical
 * toolbars like we do in horizontal", 2026-11-10), each bar's tools in a
 * column. The host renders the tools by
 * id and owns the layout and the drag; the dock only draws, measures and
 * reports a grip press. An empty dock draws nothing — the host's overlay
 * marks where a drop would land.
 */
export function ToolbarDock({
  region, rows, renderTool, toolMeta, onBarResize,
  onGripMouseDown, onBarMenu, onEmptyBarAdd, draggingBarId = null, insert = null, insertAfterBarId = null, insertRefused = false,
  editing = false, onToolMouseDown, draggingToolId = null, toolInsert = null,
  trailing, className = '', tabGroupId, ariaLabel, dataAttrs, style: styleProp, lastFillsRow = true, groupStyle = 'lines', hiddenBarIds,
}: ToolbarDockProps) {
  const { theme } = useTheme();
  const vertical = isVerticalRegion(region);
  const orientation: ToolbarOrientation = vertical ? 'vertical' : 'horizontal';
  const rootRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef(new Map<string, HTMLDivElement>());

  // SIZING (2026-11-10, "adjust the width of the toolbars when docked
  // horizontally and height when docked vertically"): a bar may carry a
  // size along the dock — its `width` in a horizontal dock, its `height`
  // in a vertical one. Wider than its tools, the stretch / grow tools take
  // the room (else it is empty space); narrower, they give it back down to
  // their minSize, and then the tools that still do not fit move behind
  // an overflow button, last first.
  const axis: ToolbarBarAxis = vertical ? 'height' : 'width';
  const [liveSize, setLiveSize] = useState<{ barId: string; size: number } | null>(null);
  const sizeOf = (bar: ToolbarBar): number | undefined => (liveSize?.barId === bar.id ? liveSize.size : bar[axis]);
  // Each tool's natural size along the dock, measured whenever it is drawn
  // unstretched (a tool behind the overflow button keeps its last)
  const toolSizes = useRef(new Map<string, number>());
  const [, setMeasureTick] = useState(0);
  // THE RELAYOUT GUARD: every self-triggered re-render (a measure, a pack,
  // the cog's width) counts against a per-frame budget
  const relayouts = useRef({ count: 0, resetQueued: false, warned: false });
  const mayRelayout = () => {
    const r = relayouts.current;
    // (reset on the next TASK, not the next frame: a hidden or backgrounded
    // window runs no animation frames, and the budget never came back — the
    // dock stopped laying out. A runaway loop is synchronous, inside one
    // commit, so a task boundary still catches it.)
    if (!r.resetQueued) {
      r.resetQueued = true;
      setTimeout(() => { r.count = 0; r.resetQueued = false; }, 0);
    }
    r.count += 1;
    if (r.count <= MAX_RELAYOUTS_PER_FRAME) return true;
    if (!r.warned) { r.warned = true; console.warn(`ToolbarDock (${region}): the layout did not settle; left as it is`); }
    return false;
  };
  // THE COG HAS A PLACE OF ITS OWN (2026-11-10, "if I enlarge a toolbar so
  // that it nudges the cog off the screen, the app crashes"): pinned to the
  // dock's end beside the last line, its width reserved at the end of every
  // line, so no bar can push it off
  const trailingRef = useRef<HTMLDivElement>(null);
  const [trailingWidth, setTrailingWidth] = useState(0);
  const endPadRef = useRef(ROW_END_PAD);
  // The room a line has, from the last pack (a sized bar never exceeds it)
  const availableRef = useRef(0);
  // …and as state, for a toolbar that wraps at its separators to re-split
  // when the dock's width changes
  const [lineRoom, setLineRoom] = useState(0);
  const [overflowOpen, setOverflowOpen] = useState<{ barId: string; x: number; y: number } | null>(null);
  const sizeKey = (id: string) => `${orientation}:${id}`;
  const stretchy = (id: string) => { const m = toolMeta?.(id, orientation); return !!(m?.grow || m?.stretch); };
  const minOf = (id: string) => toolMeta?.(id, orientation)?.minSize ?? DEFAULT_MIN_STRETCH;
  // a FLEXIBLE SPACE is nothing at its natural size: it never wraps a row
  const naturalOfTool = (id: string) => (isToolSpacer(id) ? 0 : toolSizes.current.get(sizeKey(id)) ?? (stretchy(id) ? minOf(id) : 0));
  const naturalOf = (ids: string[]) => GUTTER + ids.reduce((sum, id, i) => sum + (i ? TOOL_GAP : 0) + naturalOfTool(id), 0);

  /** The tools of a sized bar that do not fit, in order */
  const overflowOf = (ids: string[], size: number | undefined): Set<string> => {
    const out = new Set<string>();
    if (size === undefined) return out;
    const room = Math.min(size, availableRef.current > 0 ? availableRef.current : Infinity) - GUTTER;
    const need = (id: string) => (stretchy(id) ? minOf(id) : naturalOfTool(id));
    const total = ids.reduce((sum, id, i) => sum + (i ? TOOL_GAP : 0) + need(id), 0);
    if (total <= room) return out;
    const budget = room - OVERFLOW_BUTTON - TOOL_GAP;
    let used = 0;
    let full = false;
    ids.forEach((id, i) => {
      const next = used + (i ? TOOL_GAP : 0) + need(id);
      if (full || next > budget) { full = true; out.add(id); } else used = next;
    });
    return out;
  };

  // Draw each bar's tools once; a bar with nothing to draw is skipped
  // A SEPARATOR is the dock's own (a thin line between groups): none at a
  // toolbar's ends, none doubled where the tools between are hidden. An
  // EMPTY toolbar draws a small slot, so it can be seen and moved; one
  // whose tools are all hidden draws nothing (2026-11-11)
  const drawn = rows.flatMap((row, rowIndex) => {
    const toolNodes = row.map((bar) => {
      if (hiddenBarIds?.includes(bar.id)) return [];
      const raw = bar.tools.map((id) => ({
        id,
        node: isToolSeparator(id)
          ? <span className="toolbar-dock__separator" data-toolbar-separator={id} aria-hidden="true" />
          : isToolSpacer(id)
            ? <span className="toolbar-dock__spacer" data-toolbar-spacer={id} aria-hidden="true" />
            : renderTool(id, orientation),
      })).filter((t) => t.node !== null && t.node !== undefined && t.node !== false);
      return raw.filter((t, i) => !isToolSeparator(t.id) || (
        i > 0 && !isToolSeparator(raw[i - 1].id) && raw.slice(i + 1).some((n) => !isToolSeparator(n.id))
      ));
    });
    // the row's LAST DRAWN toolbar (one whose tools are all hidden draws
    // nothing, so the toolbar before it is the row's end)
    let lastDrawn = -1;
    toolNodes.forEach((n, i) => { if (row[i].tools.length === 0 || n.length > 0) lastDrawn = i; });
    // a row with a GROWING toolbar (the status bar's info line) is already
    // full: that toolbar keeps the room, and the last does not compete
    const growsAt = toolNodes.findIndex((n) => n.some((t) => toolMeta?.(t.id, orientation)?.grow));
    // A TOOLBAR HOLDING A FLEXIBLE SPACE FILLS TOO (2026-11-18, "I still
    // can't drop it between tools" — a space dropped into a toolbar of its
    // natural width had no room to take, so it drew nothing and could not be
    // grabbed again): such a toolbar takes the row's spare room like the
    // last one does, its space pushing the tools after it along; several
    // share the room, and the last toolbar then keeps its natural size
    const spaced = row.map((bar) => bar.tools.some(isToolSpacer));
    const spaceInRow = spaced.some(Boolean);
    return row.map((bar, barIndex) => {
    const nodes = toolNodes[barIndex];
    if (bar.tools.length === 0) {
      // No words in the slot (2026-11-16, "when I have an empty toolbar,
      // can we please not show 'empty toolbar'?", then "lose the dashed
      // line") — a blank space a tool's size after the grip; the name is
      // for screen readers alone
      nodes.push({
        id: EMPTY_SLOT_ID,
        node: onEmptyBarAdd ? (
          <button
            type="button"
            className="toolbar-dock__empty toolbar-dock__empty-add"
            data-toolbar-empty={bar.id}
            aria-label="Add tool to empty group"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onEmptyBarAdd(bar.id, isVerticalRegion(region) ? { x: r.right + 4, y: r.top } : { x: r.left, y: r.bottom + 4 });
            }}
          >
            <Icon name="plus" size={16} />
          </button>
        ) : (
          <span className="toolbar-dock__empty" data-toolbar-empty={bar.id} role="img" aria-label="Empty group" />
        ),
      });
    }
    const grow = nodes.some((t) => toolMeta?.(t.id, orientation)?.grow);
    // AN EMPTY TOOLBAR ALONE IN ITS ROW HAS NO SIZE (2026-11-16, "an empty
    // toolbar shouldn't have a width slider right?", then "if an empty
    // toolbar shares a dock space with another toolbar, it should be
    // resizable. it's only when it's totally on its own"): beside another
    // toolbar its width spaces them apart; alone there is nothing to size,
    // so no resize edge and a stored size is ignored
    // …and IN A SIDE DOCK A TOOLBAR ALONE IN ITS COLUMN HAS NO SIZE either
    // (the same day, "I've got the playback meters in a side tab but it's
    // the only toolbar in that column. So... it shouldn't be resizable
    // right?"): the column is the window's height, so a lone toolbar could
    // only be made shorter, leaving empty space; its growing tools fill it
    // …and THE LAST TOOLBAR IN A ROW FILLS IT and has no size (2026-11-18,
    // "I think the last item in a toolbar shouldn't be resizable", then
    // "the last toolbar in the slot needs to take up all available space"):
    // it runs to the row's end (a column's foot), its stretch tools — a
    // horizontal meter — taking the room, so there is nothing for an edge
    // to set and a stored size is ignored. A toolbar alone in its row is
    // that row's last. Where another toolbar in the row GROWS, that one
    // takes the room and the last keeps its natural size (still no edge)
    // …and EVERY GROUP'S END RESIZES AGAIN (2026-11-18, "I think the end of
    // each group should be able to be resized... I'm not sure why you'd do
    // it, but it feels natural/intuitive" — reversing the three rules above):
    // the last group, a lone group, an empty group alike. The last group
    // still FILLS until it is given a size; sized, it keeps that size and
    // the row's end is left empty; a double-click on the edge clears the
    // size and it fills again
    const isLast = lastFillsRow && barIndex === lastDrawn;
    const resizable = true;
    const size = sizeOf(bar);
    const fill = size === undefined && (spaced[barIndex]
      || (isLast && !spaceInRow && (growsAt < 0 || growsAt === barIndex)));
    const overflow = overflowOf(nodes.map((t) => t.id), size);
    const allIds = nodes.map((t) => t.id);
    const whole = { bar, nodes, grow, fill, row: rowIndex, size, overflow, key: bar.id, continued: false, split: false, last: true, allIds, resizable };
    // A TOOLBAR WRAPS AT ITS SEPARATORS (2026-11-11 — with one toolbar a
    // dock, a narrow window would otherwise cut its end off): wider than a
    // line, its GROUPS are drawn as SEGMENTS, each starting at a group
    // boundary, which the lines then pack like toolbars; the segments after
    // the first carry the toolbar's grip (it moves the whole toolbar) and no
    // resize edge. A sized toolbar keeps its overflow button instead.
    if (vertical || size !== undefined || grow || lineRoom <= 0 || naturalOf(nodes.map((t) => t.id)) <= lineRoom) return [whole];
    const groups: Array<typeof nodes> = [[]];
    for (const t of nodes) {
      if (isToolSeparator(t.id)) groups.push([t]); else groups[groups.length - 1].push(t);
    }
    const segments: Array<typeof nodes> = [];
    for (const g of groups) {
      const last = segments[segments.length - 1];
      if (last && naturalOf([...last, ...g].map((t) => t.id)) <= lineRoom) last.push(...g);
      else segments.push(isToolSeparator(g[0]?.id ?? '') ? g.slice(1) : g);
    }
    const kept = segments.filter((seg) => seg.length > 0);
    return kept.map((seg, i) => ({
      ...whole, nodes: seg, key: i === 0 ? bar.id : `${bar.id}~${i + 1}`, continued: i > 0, split: true, last: i === kept.length - 1,
      // only the segment that ends the row fills it — or, in a toolbar
      // with a flexible space, the segments holding one
      fill: fill && (spaced[barIndex] ? seg.some((t) => isToolSpacer(t.id)) : i === kept.length - 1),
    }));
    }).flat();
  });
  const visible = drawn.filter((d) => d.nodes.length > 0);

  // Measure the tools drawn at their natural size; a change re-renders
  // once, so the overflow split reads the new sizes
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let changed = false;
    root.querySelectorAll<HTMLElement>('[data-toolbar-tool]').forEach((el) => {
      const id = el.getAttribute('data-toolbar-tool');
      if (!id || isToolSpacer(id)) return;
      if (stretchy(id) && el.closest('.toolbar-dock__bar--sized, .toolbar-dock__bar--fill')) return; // stretched, not natural
      const value = vertical ? el.offsetHeight : el.offsetWidth;
      if (toolSizes.current.get(sizeKey(id)) !== value) { toolSizes.current.set(sizeKey(id), value); changed = true; }
    });
    if (changed && mayRelayout()) setMeasureTick((t) => t + 1);
  });

  // The open overflow closes when its bar no longer overflows
  const openBar = overflowOpen ? visible.find((d) => d.bar.id === overflowOpen.barId) : undefined;
  useEffect(() => {
    if (overflowOpen && (!openBar || openBar.overflow.size === 0)) setOverflowOpen(null);
  }, [overflowOpen, openBar]);

  /** A press on a bar's RESIZE EDGE: the size follows the pointer (held in
   *  the dock until the release, then reported once), clamped between the
   *  gutter + overflow button and the dock's room, with a soft landing on
   *  the bar's natural size — which, released there, clears the size */
  const beginResize = (d: (typeof visible)[number], e: React.MouseEvent) => {
    if (e.button !== 0 || !onBarResize) return;
    const el = barRefs.current.get(d.bar.id);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const start = vertical ? e.clientY : e.clientX;
    // A WRAPPED toolbar is resized from its LAST segment's edge (2026-11-16,
    // "there's no affordance for the toolbar resizing" — a toolbar wider
    // than its line had no edge at all): sized, it is one line again,
    // starting where its first segment does, so its size is the pointer's
    // distance from there and its end follows the pointer
    const startSize = d.split
      ? start - el.getBoundingClientRect().left
      : vertical ? el.offsetHeight : el.offsetWidth;
    const natural = naturalOf(d.allIds);
    const root = rootRef.current;
    const roomRaw = root ? (vertical ? root.clientHeight - ROW_END_PAD : root.clientWidth - endPadRef.current) : 0;
    const room = roomRaw > 0 ? roomRaw : Infinity;
    const at = (ev: MouseEvent) => {
      const next = Math.max(MIN_BAR_SIZE, Math.min(room, startSize + ((vertical ? ev.clientY : ev.clientX) - start)));
      return Math.abs(next - natural) <= RESIZE_SNAP_PX ? natural : next;
    };
    document.body.setAttribute('data-toolbar-resize', axis);
    const onMove = (ev: MouseEvent) => setLiveSize({ barId: d.bar.id, size: at(ev) });
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.removeAttribute('data-toolbar-resize');
      const size = at(ev);
      setLiveSize(null);
      onBarResize(d.bar.id, axis, size === natural ? null : Math.round(size));
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // LINES: each row packed from measured widths, wrapping onto further
  // lines; one line a row until measured (jsdom measures nothing, so it
  // always draws one line a row)
  const [lines, setLines] = useState<DockLine[]>([]);
  const pack = useCallback(() => {
    if (vertical) return;
    const root = rootRef.current;
    if (!root) return;
    // The line's room: the dock, less its end padding and the cog's place
    const tw = !vertical && trailing && trailingRef.current ? trailingRef.current.offsetWidth : 0;
    if (tw !== trailingWidth && mayRelayout()) setTrailingWidth(tw);
    const endPad = ROW_END_PAD + (tw ? tw + ROW_END_PAD : 0);
    endPadRef.current = endPad;
    const available = root.clientWidth - endPad;
    availableRef.current = available;
    if (available > 0 && available !== lineRoom && mayRelayout()) setLineRoom(available);
    const result: DockLine[] = [];
    let line: DockLine | null = null;
    let used = 0;
    for (const d of visible) {
      const el = barRefs.current.get(d.key);
      // a FILLING bar packs at its natural width, never the room it fills
      const w = d.grow && d.size === undefined ? GROW_BAR_PACK_WIDTH
        : d.fill ? naturalOf(d.nodes.map((t) => t.id))
        : (el?.offsetWidth ?? 0);
      // (each bar's width carries its gutter: the grip is the gap)
      if (!line || line.row !== d.row || (available > 0 && line.ids.length > 0 && used + w > available)) {
        line = { row: d.row, ids: [] };
        result.push(line);
        used = 0;
      }
      used += w;
      line.ids.push(d.key);
    }
    setLines((prev) => (sameLines(prev, result) || !mayRelayout() ? prev : result));
  }, [vertical, visible, trailing, trailingWidth, lineRoom]);

  useLayoutEffect(() => { pack(); }, [pack]);
  useEffect(() => {
    if (vertical || typeof ResizeObserver === 'undefined' || !rootRef.current) return;
    const ro = new ResizeObserver(() => pack());
    ro.observe(rootRef.current);
    barRefs.current.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [pack, vertical]);

  const { onKeyDown, onBlur, containerProps, initTabIndices } = useContainerTabGroup({
    containerRef: rootRef,
    groupId: tabGroupId ?? `tool-dock-${region}`,
    selector: 'button, select, input, [role="group"], [role="checkbox"], [role="combobox"], [role="spinbutton"], [role="slider"], [data-toolbar-grip]',
    filter: (el) => el.hasAttribute('data-toolbar-grip') || el.getAttribute('role') === 'group' || !el.closest('[role="group"]'),
    // Tab enters on the first TOOL, never a grip (the arrows reach the grips)
    entryFilter: (el) => !el.hasAttribute('data-toolbar-grip'),
    ariaLabel: ariaLabel ?? `${region} toolbar dock`,
  });
  useEffect(() => { if (tabGroupId) initTabIndices(); }, [tabGroupId, rows, initTabIndices]);

  const style = {
    ...styleProp,
    '--toolbar-bg': theme.background.toolbar,
    '--toolbar-border': theme.border.onSurface,
    '--toolbar-divider': theme.border.divider,
    '--toolbar-gripper-color': theme.foreground.text.primary,
    '--toolbar-dock-accent': theme.accent.primary,
    '--toolbar-dock-empty-hover': `color-mix(in srgb, ${theme.foreground.text.primary} 10%, transparent)`,
    '--toolbar-dock-refuse': theme.semantic.error.border,
    '--toolbar-island-border': theme.border.default,
    // The end of every line keeps the cog's place free
    ...(!vertical && trailingWidth ? { '--toolbar-dock-end-pad': `${ROW_END_PAD + trailingWidth + ROW_END_PAD}px` } : null),
  } as React.CSSProperties;

  // A ⌘-press on a tool began a move: the click it ends in presses nothing
  const cmdPressRef = useRef(false);
  useEffect(() => {
    // …and a ⌘-press released elsewhere leaves no stale flag behind
    const clear = () => { window.setTimeout(() => { cmdPressRef.current = false; }, 0); };
    document.addEventListener('mouseup', clear);
    return () => document.removeEventListener('mouseup', clear);
  }, []);

  // Where a dragged tool would JOIN a bar: a short caret among its tools
  const caret = <div className="toolbar-dock__caret" aria-hidden="true" />;

  // A bar: its GUTTER, which is its grip, then its tools. THE GAP BETWEEN
  // TWO BARS IS THE LATER BAR'S GRIP (2026-11-10, "every toolbar has its
  // own gripper… look at how much space we're using"): at rest the gutter
  // shows only the 1px divider (nothing, for the first bar on a line); on
  // hover the dots take the line's place with a grab cursor. No room of
  // its own — 288px back on the default layout.
  const renderBar = (d: (typeof visible)[number], leading: boolean, insertHere: boolean) => (
    <div
      key={d.key}
      ref={(el) => { if (el) barRefs.current.set(d.key, el); else barRefs.current.delete(d.key); }}
      className={`toolbar-dock__bar${d.grow ? ' toolbar-dock__bar--grow' : ''}${d.size !== undefined ? ' toolbar-dock__bar--sized' : ''}${d.fill ? ' toolbar-dock__bar--fill' : ''}${draggingBarId === d.bar.id ? ' toolbar-dock__bar--dragging' : ''}`}
      style={d.size !== undefined ? { [axis]: d.size } : undefined}
      data-toolbar-bar={d.continued ? undefined : d.bar.id}
      data-toolbar-bar-continued={d.continued ? d.bar.id : undefined}
    >
      <span
        className={`toolbar-dock__grip${leading ? ' toolbar-dock__grip--leading' : ''}${d.continued ? ' toolbar-dock__grip--continued' : ''}`}
        {...(onBarMenu && !d.continued ? {
          // A button for the toolbar's menu: the arrows reach it, and
          // Shift+F10 / the Menu key / Enter / Space open the menu under it
          role: 'button',
          tabIndex: -1,
          // "Main group", "Title bar", "Group 1" — never "Group 1 group"
          'aria-label': /\bgroup\b|bar$/i.test(barDisplayName(d.bar)) ? barDisplayName(d.bar) : `${barDisplayName(d.bar)} group`,
          'aria-haspopup': 'menu' as const,
          'data-toolbar-grip': d.bar.id,
          onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => {
            const opens = (e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu' || e.key === 'Enter' || e.key === ' ';
            if (!opens) return;
            e.preventDefault();
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            onBarMenu(d.bar.id, { x: r.left, y: r.bottom + 4 }, region);
          },
        } : { 'aria-hidden': true, role: 'presentation' })}
        onContextMenu={(e) => {
          if (!onBarMenu) return;
          e.preventDefault();
          e.stopPropagation();
          onBarMenu(d.bar.id, { x: e.clientX, y: e.clientY }, region);
        }}
        onMouseDown={(e) => {
          // A wrapped toolbar's later line has no grip (2026-11-16)
          if (!onGripMouseDown || e.button !== 0 || d.continued) return;
          const rect = barRefs.current.get(d.bar.id)?.getBoundingClientRect();
          if (!rect) return;
          e.preventDefault();
          e.stopPropagation();
          onGripMouseDown(d.bar.id, e, rect);
        }}
      >
        {!leading && <span className="toolbar-dock__grip-line" />}
        {/* A WRAPPED TOOLBAR'S LATER LINES HAVE NO GRIP (2026-11-16, "when you
            wrap a toolbar, it shouldn't have a gripper"): the toolbar has one
            grip, on its first line; a later line keeps the gutter's room, so
            its tools line up under the first line's, with nothing in it */}
        {!d.continued && <span className="toolbar-dock__grip-dots musescore-icon">{GRIP_GLYPH}</span>}
        {insertHere && indicator}
      </span>
      <div className="toolbar-dock__tools">
        {d.nodes.filter((t) => !d.overflow.has(t.id)).map((t) => (
          <React.Fragment key={t.id}>
            {toolInsert?.barId === d.bar.id && toolInsert.beforeToolId === t.id && caret}
            <div
              className={`toolbar-dock__tool${toolMeta?.(t.id, orientation)?.grow ? ' toolbar-dock__tool--grow' : ''}${toolMeta?.(t.id, orientation)?.stretch ? ' toolbar-dock__tool--stretch' : ''}${isToolSpacer(t.id) ? ' toolbar-dock__tool--spacer' : ''}${draggingToolId === t.id ? ' toolbar-dock__tool--dragging' : ''}`}
              style={d.size !== undefined && stretchy(t.id) ? { [vertical ? 'minHeight' : 'minWidth']: minOf(t.id) } : undefined}
              data-toolbar-tool={t.id}
              onMouseDown={editing && !toolMeta?.(t.id, orientation)?.live ? (e) => {
                if (e.button !== 0 || !onToolMouseDown) return;
                e.preventDefault();
                e.stopPropagation();
                onToolMouseDown(t.id, d.bar.id, e, e.currentTarget.getBoundingClientRect());
              } : undefined}
              // ⌘-DRAG MOVES A TOOL, NO MODE (2026-11-16, "let's try the Cmd +
              // drag to move things" — the macOS menu bar's gesture): a ⌘ (Ctrl
              // on Windows) press on ANY tool is taken in the capture phase,
              // before the tool sees it, and starts the tool's drag; the click
              // it would end in is swallowed, so a ⌘-click presses nothing
              onMouseDownCapture={!editing && onToolMouseDown ? (e) => {
                if (e.button !== 0 || !isMoveModifier(e)) return;
                e.preventDefault();
                e.stopPropagation();
                cmdPressRef.current = true;
                onToolMouseDown(t.id, d.bar.id, e, e.currentTarget.getBoundingClientRect());
              } : undefined}
              onClickCapture={(e) => {
                if (!cmdPressRef.current) return;
                cmdPressRef.current = false;
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {/* INERT while editing: the tool cannot be pressed, focused
                  or typed into, and the press lands on the wrapper. Set
                  on the element itself — React 18 drops a boolean `inert`
                  and React 19 reads an empty string as false */}
              <div className="toolbar-dock__tool-body" ref={(el) => { el?.toggleAttribute('inert', editing && !toolMeta?.(t.id, orientation)?.live); }}>{t.node}</div>
            </div>
          </React.Fragment>
        ))}
        {toolInsert?.barId === d.bar.id && toolInsert.beforeToolId === null && caret}
      </div>
      {d.overflow.size > 0 && (
        <button
          type="button"
          className="toolbar-dock__overflow"
          data-toolbar-overflow-button={d.bar.id}
          aria-label={`${d.overflow.size} more ${d.overflow.size === 1 ? 'tool' : 'tools'}`}
          aria-haspopup="dialog"
          aria-expanded={overflowOpen?.barId === d.bar.id}
          // (stopped, so the open flyout's outside-press close does not
          // fire before this press toggles it)
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (overflowOpen?.barId === d.bar.id) { setOverflowOpen(null); return; }
            const r = e.currentTarget.getBoundingClientRect();
            setOverflowOpen({
              barId: d.bar.id,
              x: vertical ? (regionSide(region) === 'right' ? r.left : r.right) : r.left + r.width / 2,
              y: vertical ? r.top + r.height / 2 : (region === 'bottom' ? r.top : r.bottom),
            });
          }}
        >
          <span className="musescore-icon" aria-hidden="true">{'\uF39B'}</span>
        </button>
      )}
      {onBarResize && d.last && d.resizable && (
        // THE RESIZE EDGE: the bar's trailing edge (bottom, in a column),
        // over the first 6px of whatever follows — the next bar's gutter,
        // whose line divides "resize the bar before" from "move the bar
        // after". Double-click: the bar's natural size again. A wrapped
        // toolbar has it on its last segment.
        <span
          className={`toolbar-dock__resize${liveSize?.barId === d.bar.id ? ' toolbar-dock__resize--active' : ''}`}
          data-toolbar-resize={d.bar.id}
          aria-hidden="true"
          onMouseDown={(e) => beginResize(d, e)}
          onDoubleClick={(e) => { e.stopPropagation(); onBarResize(d.bar.id, axis, null); }}
        />
      )}
    </div>
  );

  // Before a bar the line takes its gutter's place; at a line's end it
  // sits a gutter's half past the last bar. Neither takes room.
  const indicator = (
    <span className={`toolbar-dock__insert${insertRefused ? ' toolbar-dock__insert--refused' : ''}`} aria-hidden="true" />
  );
  const endIndicator = (
    <span className={`toolbar-dock__insert toolbar-dock__insert--end${insertRefused ? ' toolbar-dock__insert--refused' : ''}`} aria-hidden="true" />
  );

  // The lines to draw: the packed lines when they still name every
  // visible bar in its row, else one line a row (a bar came or went since
  // the pack); a side dock is one column of everything
  const byId = new Map(visible.map((d) => [d.key, d]));
  const oneLineARow: DockLine[] = [];
  for (const d of visible) {
    const last = oneLineARow[oneLineARow.length - 1];
    if (last && last.row === d.row) last.ids.push(d.key);
    else oneLineARow.push({ row: d.row, ids: [d.key] });
  }
  const packed = lines.flatMap((l) => l.ids);
  const usePacked = !vertical && lines.length > 0 && packed.length === visible.length
    && lines.every((l) => l.ids.every((id) => byId.get(id)?.row === l.row))
    && packed.every((id, i) => id === visible[i].key);
  const drawnLines: DockLine[] = usePacked ? lines : oneLineARow;

  // WHERE A CONTAINER WOULD LAND. Beside a bar: the full-height line
  // before the first VISIBLE bar from the named one on, in its row (the
  // host counts every bar; hidden ones draw nothing) — or after the bar
  // that ends a wrapped line — else at the row's end. On a NEW ROW: the
  // horizontal line before that row's first line, or after the last.
  const barInsert = insert && !('newRowAt' in insert) ? insert : null;
  const rowInsert = insert && 'newRowAt' in insert ? insert : null;
  let insertBeforeId: string | null = null;
  let insertAfterId: string | null = null;
  let insertEndOfLine = -1;
  if (barInsert) {
    if (insertAfterBarId && byId.has(insertAfterBarId)) insertAfterId = insertAfterBarId;
    else {
      const order = rows[barInsert.row] ?? [];
      const from = barInsert.beforeBarId === null ? -1 : order.findIndex((b) => b.id === barInsert.beforeBarId);
      insertBeforeId = from < 0 ? null : (order.slice(from).find((b) => byId.has(b.id))?.id ?? null);
      if (insertBeforeId === null) {
        // The end of the row: its last line (the dock's last when the row draws nothing)
        insertEndOfLine = drawnLines.length - 1;
        for (let i = drawnLines.length - 1; i >= 0; i--) if (drawnLines[i].row === barInsert.row) { insertEndOfLine = i; break; }
      }
    }
  }
  const rowInsertBeforeLine = rowInsert ? drawnLines.findIndex((l) => l.row >= rowInsert.newRowAt) : -1;
  const rowInsertAtEnd = rowInsert !== null && rowInsertBeforeLine < 0;

  // An EMPTY dock takes no room and shows nothing of its own — during a
  // drag the host's overlay bands say where a drop would land (the
  // dockable panels' visuals, 2026-11-10: "don't show side panel slot
  // unless they hover over that area")
  const empty = visible.length === 0;
  const classes = [
    'toolbar-dock',
    `toolbar-dock--${region}`,
    groupStyle === 'islands' ? 'toolbar-dock--islands' : '',
    // (an inner dock is styled as the side it faces from)
    region !== regionSide(region) ? `toolbar-dock--${regionSide(region)} toolbar-dock--inner` : '',
    vertical ? 'toolbar-dock--vertical' : 'toolbar-dock--horizontal',
    empty ? 'toolbar-dock--empty' : '',
    editing ? 'toolbar-dock--editing' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={rootRef}
      className={classes}
      style={style}
      data-toolbar-dock={region}
      {...dataAttrs}
      role={tabGroupId ? containerProps.role : undefined}
      aria-label={tabGroupId ? containerProps['aria-label'] : undefined}
      onKeyDown={tabGroupId ? onKeyDown : undefined}
      onBlur={tabGroupId ? onBlur : undefined}
      onContextMenu={onBarMenu ? (e) => {
        // A tool's own menu (timecode, speed, BPM, the meters) came first
        if (e.defaultPrevented) return;
        const target = e.target as HTMLElement;
        if (target.closest('input, textarea, [contenteditable="true"]')) return;
        const barEl = target.closest('[data-toolbar-bar], [data-toolbar-bar-continued]');
        const barId = barEl?.getAttribute('data-toolbar-bar') ?? barEl?.getAttribute('data-toolbar-bar-continued') ?? null;
        const toolId = target.closest('[data-toolbar-tool]')?.getAttribute('data-toolbar-tool') ?? undefined;
        // THE GAP NEAREST THE POINTER (2026-11-18, "I thought I'd be able to
        // add the flexible space anywhere"): before the first tool on this
        // line whose middle is past the pointer; past them all, the tool
        // that follows the line in the toolbar (another segment's), else
        // the end
        let beforeToolId: string | null | undefined;
        if (barId && barEl) {
          const along = (r: DOMRect) => (vertical ? r.top + r.height / 2 : r.left + r.width / 2);
          const pointer = vertical ? e.clientY : e.clientX;
          const onLine = Array.from(barEl.querySelectorAll<HTMLElement>('[data-toolbar-tool]'));
          const past = onLine.find((el) => along(el.getBoundingClientRect()) > pointer);
          if (past) beforeToolId = past.getAttribute('data-toolbar-tool');
          else {
            const tools = rows.flat().find((b) => b.id === barId)?.tools ?? [];
            const lastOnLine = onLine[onLine.length - 1]?.getAttribute('data-toolbar-tool');
            const i = lastOnLine ? tools.indexOf(lastOnLine) : -1;
            beforeToolId = i >= 0 ? tools[i + 1] ?? null : null;
          }
        }
        // the ROW right-clicked, for the empty space's New group (2026-11-18,
        // "pressing new group is adding new row when there's plenty of space")
        const rowAttr = target.closest('[data-toolbar-row]')?.getAttribute('data-toolbar-row');
        const row = rowAttr != null ? Number(rowAttr) : undefined;
        e.preventDefault();
        onBarMenu(barId, { x: e.clientX, y: e.clientY }, region, toolId, beforeToolId, row);
      } : undefined}
    >
      {!empty && drawnLines.map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {rowInsertBeforeLine === lineIndex && (
            <div className={`toolbar-dock__row-insert${lineIndex === 0 ? ' toolbar-dock__row-insert--start' : ''}`} data-row-insert={rowInsert!.newRowAt} aria-hidden="true" />
          )}
          {lineIndex > 0 && <div className="toolbar-dock__row-divider" aria-hidden="true" />}
          <div className="toolbar-dock__row" data-toolbar-row={line.row}>
            {line.ids.map((id, i) => {
              const d = byId.get(id);
              if (!d) return null;
              return (
                <React.Fragment key={id}>
                  {renderBar(d, i === 0, insertBeforeId === id)}
                  {insertAfterId === id && endIndicator}
                </React.Fragment>
              );
            })}
            {insertEndOfLine === lineIndex && endIndicator}
            {vertical && lineIndex === drawnLines.length - 1 && trailing && <div className="toolbar-dock__trailing">{trailing}</div>}
          </div>
        </React.Fragment>
      ))}
      {!empty && rowInsertAtEnd && (
        <div className="toolbar-dock__row-insert toolbar-dock__row-insert--end" data-row-insert={rowInsert!.newRowAt} aria-hidden="true" />
      )}
      {!empty && !vertical && trailing && (
        <div ref={trailingRef} className="toolbar-dock__trailing toolbar-dock__trailing--pinned">{trailing}</div>
      )}
      {empty && trailing && (
        <div className="toolbar-dock__row"><div className="toolbar-dock__trailing">{trailing}</div></div>
      )}
      {overflowOpen && openBar && openBar.overflow.size > 0 && (
        <Flyout
          isOpen
          onClose={() => setOverflowOpen(null)}
          x={overflowOpen.x}
          y={overflowOpen.y}
          direction={region === 'bottom' ? 'up' : regionSide(region) === 'left' ? 'right' : regionSide(region) === 'right' ? 'left' : 'down'}
          ariaLabel="More tools"
          className="toolbar-dock__overflow-flyout"
        >
          <div className="toolbar-dock__overflow-tools" data-toolbar-overflow={openBar.bar.id}>
            {openBar.nodes.filter((t) => openBar.overflow.has(t.id)).map((t) => (
              <div key={t.id} className="toolbar-dock__overflow-tool" data-toolbar-overflow-tool={t.id}>
                {vertical ? renderTool(t.id, 'horizontal') : t.node}
              </div>
            ))}
          </div>
        </Flyout>
      )}
    </div>
  );
}

/** The id an empty toolbar's slot is drawn under */
const EMPTY_SLOT_ID = '__empty-toolbar';

/** The modifier that turns a press on a tool into a move: ⌘ on a Mac, Ctrl
 *  elsewhere (a Mac's Ctrl-click is the secondary click) — and OPTION / ALT
 *  on either (2026-11-18, "if I alt drag an icon…"; no tool takes an
 *  Option-press of its own) */
function isMoveModifier(e: { metaKey: boolean; ctrlKey: boolean; altKey: boolean }): boolean {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  return e.altKey || (mac ? e.metaKey : e.ctrlKey || e.metaKey);
}

/** One drawn line of bars: the row it belongs to, and its bars */
interface DockLine { row: number; ids: string[] }

function sameLines(a: DockLine[], b: DockLine[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((l, i) => l.row === b[i].row && l.ids.length === b[i].ids.length && l.ids.every((id, j) => id === b[i].ids[j]));
}

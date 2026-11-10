import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '../ThemeProvider';
import { useContainerTabGroup } from '../hooks/useContainerTabGroup';
import { isVerticalRegion, type BarPlacement, type ToolbarBar, type ToolbarBarAxis, type ToolbarOrientation, type ToolbarRegion } from '../utils/toolbarLayout';
import { Flyout } from '../Flyout';
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
}

const GRIP_GLYPH = '';

/** A bar's gutter (its grip), the gap between tools, and the overflow
 *  button — the numbers the dock's sizing is made of (ToolbarDock.css) */
const GUTTER = 17;
const TOOL_GAP = 8;
const OVERFLOW_BUTTON = 28;
/** A sized bar is never smaller than its gutter and the overflow button */
const MIN_BAR_SIZE = GUTTER + OVERFLOW_BUTTON;
/** A resize lands on the bar's natural size within this distance */
const RESIZE_SNAP_PX = 6;
/** What a grow / stretch tool needs when it states no minSize */
const DEFAULT_MIN_STRETCH = 80;

/** The natural width a growing bar is packed at (its content stretches after) */
const GROW_BAR_PACK_WIDTH = 160;

/**
 * A DOCK: rows of toolbars with persistent grips, in one of the four
 * regions (2026-11-09, the custom toolbars design). A HORIZONTAL dock
 * draws each of its ROWS as a line of bars — a row too wide for the
 * window WRAPS onto further lines by measured width (Audacity 3's dock) —
 * with a divider between bars on a line (each bar's GRIP: the divider's
 * gutter shows the dots on hover) and a line between rows
 * ("division lines between cols and rows"); a VERTICAL dock stacks every
 * bar in one column, each bar's tools in a column. The host renders the tools by
 * id and owns the layout and the drag; the dock only draws, measures and
 * reports a grip press. An empty dock draws nothing — the host's overlay
 * marks where a drop would land.
 */
export function ToolbarDock({
  region, rows, renderTool, toolMeta, onBarResize,
  onGripMouseDown, draggingBarId = null, insert = null, insertAfterBarId = null, insertRefused = false,
  editing = false, onToolMouseDown, draggingToolId = null, toolInsert = null,
  trailing, className = '', tabGroupId, ariaLabel, dataAttrs, style: styleProp,
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
  // The room a line has, from the last pack (a sized bar never exceeds it)
  const availableRef = useRef(0);
  const [overflowOpen, setOverflowOpen] = useState<{ barId: string; x: number; y: number } | null>(null);
  const sizeKey = (id: string) => `${orientation}:${id}`;
  const stretchy = (id: string) => { const m = toolMeta?.(id, orientation); return !!(m?.grow || m?.stretch); };
  const minOf = (id: string) => toolMeta?.(id, orientation)?.minSize ?? DEFAULT_MIN_STRETCH;
  const naturalOfTool = (id: string) => toolSizes.current.get(sizeKey(id)) ?? (stretchy(id) ? minOf(id) : 0);
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
  const drawn = rows.flatMap((row, rowIndex) => row.map((bar) => {
    const nodes = bar.tools.map((id) => ({ id, node: renderTool(id, orientation) })).filter((t) => t.node !== null && t.node !== undefined && t.node !== false);
    const grow = nodes.some((t) => toolMeta?.(t.id, orientation)?.grow);
    const size = sizeOf(bar);
    const overflow = overflowOf(nodes.map((t) => t.id), size);
    return { bar, nodes, grow, row: rowIndex, size, overflow };
  }));
  const visible = drawn.filter((d) => d.nodes.length > 0);

  // Measure the tools drawn at their natural size; a change re-renders
  // once, so the overflow split reads the new sizes
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let changed = false;
    root.querySelectorAll<HTMLElement>('[data-toolbar-tool]').forEach((el) => {
      const id = el.getAttribute('data-toolbar-tool');
      if (!id) return;
      if (stretchy(id) && el.closest('.toolbar-dock__bar--sized')) return; // stretched, not natural
      const value = vertical ? el.offsetHeight : el.offsetWidth;
      if (toolSizes.current.get(sizeKey(id)) !== value) { toolSizes.current.set(sizeKey(id), value); changed = true; }
    });
    if (changed) setMeasureTick((t) => t + 1);
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
    const startSize = vertical ? el.offsetHeight : el.offsetWidth;
    const natural = naturalOf(d.nodes.map((t) => t.id));
    const root = rootRef.current;
    const roomRaw = root ? (vertical ? root.clientHeight - 10 : root.clientWidth - 12) : 0;
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
    const available = root.clientWidth - 12; // the right padding
    availableRef.current = available;
    const result: DockLine[] = [];
    let line: DockLine | null = null;
    let used = 0;
    for (const d of visible) {
      const el = barRefs.current.get(d.bar.id);
      const w = d.grow && d.size === undefined ? GROW_BAR_PACK_WIDTH : (el?.offsetWidth ?? 0);
      // (each bar's width carries its gutter: the grip is the gap)
      if (!line || line.row !== d.row || (available > 0 && line.ids.length > 0 && used + w > available)) {
        line = { row: d.row, ids: [] };
        result.push(line);
        used = 0;
      }
      used += w;
      line.ids.push(d.bar.id);
    }
    setLines((prev) => (sameLines(prev, result) ? prev : result));
  }, [vertical, visible]);

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
    selector: 'button, select, input, [role="group"], [role="checkbox"], [role="combobox"], [role="spinbutton"], [role="slider"]',
    filter: (el) => el.getAttribute('role') === 'group' || !el.closest('[role="group"]'),
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
    '--toolbar-dock-refuse': theme.semantic.error.border,
  } as React.CSSProperties;

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
      key={d.bar.id}
      ref={(el) => { if (el) barRefs.current.set(d.bar.id, el); else barRefs.current.delete(d.bar.id); }}
      className={`toolbar-dock__bar${d.grow ? ' toolbar-dock__bar--grow' : ''}${d.size !== undefined ? ' toolbar-dock__bar--sized' : ''}${draggingBarId === d.bar.id ? ' toolbar-dock__bar--dragging' : ''}`}
      style={d.size !== undefined ? { [axis]: d.size } : undefined}
      data-toolbar-bar={d.bar.id}
    >
      <span
        className={`toolbar-dock__grip${leading ? ' toolbar-dock__grip--leading' : ''}`}
        aria-hidden="true"
        role="presentation"
        onMouseDown={(e) => {
          if (!onGripMouseDown || e.button !== 0) return;
          const rect = barRefs.current.get(d.bar.id)?.getBoundingClientRect();
          if (!rect) return;
          e.preventDefault();
          e.stopPropagation();
          onGripMouseDown(d.bar.id, e, rect);
        }}
      >
        {!leading && <span className="toolbar-dock__grip-line" />}
        <span className="toolbar-dock__grip-dots musescore-icon">{GRIP_GLYPH}</span>
        {insertHere && indicator}
      </span>
      <div className="toolbar-dock__tools">
        {d.nodes.filter((t) => !d.overflow.has(t.id)).map((t) => (
          <React.Fragment key={t.id}>
            {toolInsert?.barId === d.bar.id && toolInsert.beforeToolId === t.id && caret}
            <div
              className={`toolbar-dock__tool${toolMeta?.(t.id, orientation)?.grow ? ' toolbar-dock__tool--grow' : ''}${toolMeta?.(t.id, orientation)?.stretch ? ' toolbar-dock__tool--stretch' : ''}${draggingToolId === t.id ? ' toolbar-dock__tool--dragging' : ''}`}
              style={d.size !== undefined && stretchy(t.id) ? { [vertical ? 'minHeight' : 'minWidth']: minOf(t.id) } : undefined}
              data-toolbar-tool={t.id}
              onMouseDown={editing ? (e) => {
                if (e.button !== 0 || !onToolMouseDown) return;
                e.preventDefault();
                e.stopPropagation();
                onToolMouseDown(t.id, d.bar.id, e, e.currentTarget.getBoundingClientRect());
              } : undefined}
            >
              {/* INERT while editing: the tool cannot be pressed, focused
                  or typed into, and the press lands on the wrapper. Set
                  on the element itself — React 18 drops a boolean `inert`
                  and React 19 reads an empty string as false */}
              <div className="toolbar-dock__tool-body" ref={(el) => { el?.toggleAttribute('inert', editing); }}>{t.node}</div>
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
              x: vertical ? (region === 'right' ? r.left : r.right) : r.left + r.width / 2,
              y: vertical ? r.top + r.height / 2 : (region === 'bottom' ? r.top : r.bottom),
            });
          }}
        >
          <span className="musescore-icon" aria-hidden="true">{'\uF39B'}</span>
        </button>
      )}
      {onBarResize && (
        // THE RESIZE EDGE: the bar's trailing edge (bottom, in a column),
        // over the first 6px of whatever follows — the next bar's gutter,
        // whose line divides "resize the bar before" from "move the bar
        // after". Double-click: the bar's natural size again.
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
  const byId = new Map(visible.map((d) => [d.bar.id, d]));
  const oneLineARow: DockLine[] = [];
  for (const d of visible) {
    const last = oneLineARow[oneLineARow.length - 1];
    if (last && (vertical || last.row === d.row)) last.ids.push(d.bar.id);
    else oneLineARow.push({ row: vertical ? 0 : d.row, ids: [d.bar.id] });
  }
  const packed = lines.flatMap((l) => l.ids);
  const usePacked = !vertical && lines.length > 0 && packed.length === visible.length
    && lines.every((l) => l.ids.every((id) => byId.get(id)?.row === l.row))
    && packed.every((id, i) => id === visible[i].bar.id);
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
      const order = vertical ? rows.flat() : (rows[barInsert.row] ?? []);
      const from = barInsert.beforeBarId === null ? -1 : order.findIndex((b) => b.id === barInsert.beforeBarId);
      insertBeforeId = from < 0 ? null : (order.slice(from).find((b) => byId.has(b.id))?.id ?? null);
      if (insertBeforeId === null) {
        // The end of the row: its last line (the dock's last when the row draws nothing)
        insertEndOfLine = drawnLines.length - 1;
        if (!vertical) for (let i = drawnLines.length - 1; i >= 0; i--) if (drawnLines[i].row === barInsert.row) { insertEndOfLine = i; break; }
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
            {lineIndex === drawnLines.length - 1 && trailing && <div className="toolbar-dock__trailing">{trailing}</div>}
          </div>
        </React.Fragment>
      ))}
      {!empty && rowInsertAtEnd && (
        <div className="toolbar-dock__row-insert toolbar-dock__row-insert--end" data-row-insert={rowInsert!.newRowAt} aria-hidden="true" />
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
          direction={region === 'bottom' ? 'up' : region === 'left' ? 'right' : region === 'right' ? 'left' : 'down'}
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

/** One drawn line of bars: the row it belongs to, and its bars */
interface DockLine { row: number; ids: string[] }

function sameLines(a: DockLine[], b: DockLine[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((l, i) => l.row === b[i].row && l.ids.length === b[i].ids.length && l.ids.every((id, j) => id === b[i].ids[j]));
}

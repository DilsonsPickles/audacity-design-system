import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '../ThemeProvider';
import { useContainerTabGroup } from '../hooks/useContainerTabGroup';
import { isVerticalRegion, type BarPlacement, type ToolbarBar, type ToolbarOrientation, type ToolbarRegion } from '../utils/toolbarLayout';
import '../assets/fonts/musescore-icon.css';
import './ToolbarDock.css';

export interface ToolMeta {
  /** The tool has a vertical form, so it may sit in a left / right dock */
  vertical?: boolean;
  /** The tool stretches to fill its row (the status bar's info line) */
  grow?: boolean;
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
  toolMeta?: (id: string) => ToolMeta | undefined;
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
  region, rows, renderTool, toolMeta,
  onGripMouseDown, draggingBarId = null, insert = null, insertAfterBarId = null, insertRefused = false,
  editing = false, onToolMouseDown, draggingToolId = null, toolInsert = null,
  trailing, className = '', tabGroupId, ariaLabel, dataAttrs, style: styleProp,
}: ToolbarDockProps) {
  const { theme } = useTheme();
  const vertical = isVerticalRegion(region);
  const orientation: ToolbarOrientation = vertical ? 'vertical' : 'horizontal';
  const rootRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef(new Map<string, HTMLDivElement>());

  // Draw each bar's tools once; a bar with nothing to draw is skipped
  const drawn = rows.flatMap((row, rowIndex) => row.map((bar) => {
    const nodes = bar.tools.map((id) => ({ id, node: renderTool(id, orientation) })).filter((t) => t.node !== null && t.node !== undefined && t.node !== false);
    const grow = nodes.some((t) => toolMeta?.(t.id)?.grow);
    return { bar, nodes, grow, row: rowIndex };
  }));
  const visible = drawn.filter((d) => d.nodes.length > 0);

  // LINES: each row packed from measured widths, wrapping onto further
  // lines; one line a row until measured (jsdom measures nothing, so it
  // always draws one line a row)
  const [lines, setLines] = useState<DockLine[]>([]);
  const pack = useCallback(() => {
    if (vertical) return;
    const root = rootRef.current;
    if (!root) return;
    const available = root.clientWidth - 12; // the right padding
    const result: DockLine[] = [];
    let line: DockLine | null = null;
    let used = 0;
    for (const d of visible) {
      const el = barRefs.current.get(d.bar.id);
      const w = d.grow ? GROW_BAR_PACK_WIDTH : (el?.offsetWidth ?? 0);
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
      className={`toolbar-dock__bar${d.grow ? ' toolbar-dock__bar--grow' : ''}${draggingBarId === d.bar.id ? ' toolbar-dock__bar--dragging' : ''}`}
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
        {d.nodes.map((t) => (
          <React.Fragment key={t.id}>
            {toolInsert?.barId === d.bar.id && toolInsert.beforeToolId === t.id && caret}
            <div
              className={`toolbar-dock__tool${toolMeta?.(t.id)?.grow ? ' toolbar-dock__tool--grow' : ''}${draggingToolId === t.id ? ' toolbar-dock__tool--dragging' : ''}`}
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
    </div>
  );
}

/** One drawn line of bars: the row it belongs to, and its bars */
interface DockLine { row: number; ids: string[] }

function sameLines(a: DockLine[], b: DockLine[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((l, i) => l.row === b[i].row && l.ids.length === b[i].ids.length && l.ids.every((id, j) => id === b[i].ids[j]));
}

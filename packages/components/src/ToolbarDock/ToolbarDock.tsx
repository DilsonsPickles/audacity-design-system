import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '../ThemeProvider';
import { useContainerTabGroup } from '../hooks/useContainerTabGroup';
import { isVerticalRegion, type ToolbarBar, type ToolbarOrientation, type ToolbarRegion } from '../utils/toolbarLayout';
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
  bars: ReadonlyArray<ToolbarBar>;
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
  /** Where a drop would land: before the bar at this index (bars.length =
   *  the end); null = no indicator */
  insertAt?: number | null;
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
 * A DOCK: an ordered list of toolbars with persistent grips, in one of the
 * four regions (2026-11-09, the custom toolbars design). HORIZONTAL docks
 * pack their bars into ROWS by measured width and WRAP a full row
 * (Audacity 3's dock), with a divider between bars on a row and a line
 * between rows ("division lines between cols and rows"); VERTICAL docks
 * stack bars, each bar's tools in a column. The host renders the tools by
 * id and owns the layout and the drag; the dock only draws, measures and
 * reports a grip press. An empty dock draws nothing — the host's overlay
 * marks where a drop would land.
 */
export function ToolbarDock({
  region, bars, renderTool, toolMeta,
  onGripMouseDown, draggingBarId = null, insertAt = null, insertRefused = false,
  editing = false, onToolMouseDown, draggingToolId = null, toolInsert = null,
  trailing, className = '', tabGroupId, ariaLabel, dataAttrs, style: styleProp,
}: ToolbarDockProps) {
  const { theme } = useTheme();
  const vertical = isVerticalRegion(region);
  const orientation: ToolbarOrientation = vertical ? 'vertical' : 'horizontal';
  const rootRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef(new Map<string, HTMLDivElement>());

  // Draw each bar's tools once; a bar with nothing to draw is skipped
  const drawn = bars.map((bar) => {
    const nodes = bar.tools.map((id) => ({ id, node: renderTool(id, orientation) })).filter((t) => t.node !== null && t.node !== undefined && t.node !== false);
    const grow = nodes.some((t) => toolMeta?.(t.id)?.grow);
    return { bar, nodes, grow };
  });
  const visible = drawn.filter((d) => d.nodes.length > 0);

  // ROWS: packed from measured widths; one row until measured (jsdom
  // measures nothing, so it always draws one row)
  const [rows, setRows] = useState<string[][]>([]);
  const pack = useCallback(() => {
    if (vertical) return;
    const root = rootRef.current;
    if (!root) return;
    const available = root.clientWidth - 12; // the right padding
    const result: string[][] = [];
    let row: string[] = [];
    let used = 0;
    for (const d of visible) {
      const el = barRefs.current.get(d.bar.id);
      const w = d.grow ? GROW_BAR_PACK_WIDTH : (el?.offsetWidth ?? 0);
      const gap = row.length ? 17 : 0; // divider 1 + 8 either side
      if (row.length && available > 0 && used + gap + w > available) {
        result.push(row);
        row = [];
        used = 0;
      }
      row.push(d.bar.id);
      used += (row.length > 1 ? 17 : 0) + w;
    }
    if (row.length) result.push(row);
    setRows((prev) => (sameRows(prev, result) ? prev : result));
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
  useEffect(() => { if (tabGroupId) initTabIndices(); }, [tabGroupId, bars, initTabIndices]);

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

  const renderBar = (d: (typeof visible)[number]) => (
    <div
      key={d.bar.id}
      ref={(el) => { if (el) barRefs.current.set(d.bar.id, el); else barRefs.current.delete(d.bar.id); }}
      className={`toolbar-dock__bar${d.grow ? ' toolbar-dock__bar--grow' : ''}${draggingBarId === d.bar.id ? ' toolbar-dock__bar--dragging' : ''}`}
      data-toolbar-bar={d.bar.id}
    >
      <span
        className="toolbar-dock__grip musescore-icon"
        aria-hidden="true"
        role="presentation"
        title="Move toolbar"
        onMouseDown={(e) => {
          if (!onGripMouseDown) return;
          const rect = barRefs.current.get(d.bar.id)?.getBoundingClientRect();
          if (!rect) return;
          e.preventDefault();
          e.stopPropagation();
          onGripMouseDown(d.bar.id, e, rect);
        }}
      >
        {GRIP_GLYPH}
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

  const indicator = (
    <div className={`toolbar-dock__insert${insertRefused ? ' toolbar-dock__insert--refused' : ''}`} aria-hidden="true" />
  );

  // The rows to draw: the packed rows when they still name every visible
  // bar, else one row of everything (a bar came or went since the pack)
  const visibleIds = visible.map((d) => d.bar.id);
  const packedIds = rows.flat();
  const usePacked = !vertical && rows.length > 0 && packedIds.length === visibleIds.length && packedIds.every((id, i) => id === visibleIds[i]);
  const drawnRows: string[][] = vertical ? [visibleIds] : (usePacked ? rows : [visibleIds]);
  const byId = new Map(visible.map((d) => [d.bar.id, d]));

  // Where the insertion indicator goes: before the bar at `insertAt`
  // among the VISIBLE bars (the host counts every bar; hidden ones draw
  // nothing, so the indicator sits before the next visible one)
  const insertBeforeId = insertAt == null ? null : (bars.slice(insertAt).find((b) => byId.has(b.id))?.id ?? null);
  const insertAtEnd = insertAt != null && insertBeforeId === null;

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
      {!empty && drawnRows.map((row, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {rowIndex > 0 && <div className="toolbar-dock__row-divider" aria-hidden="true" />}
          <div className="toolbar-dock__row">
            {row.map((id, i) => {
              const d = byId.get(id);
              if (!d) return null;
              return (
                <React.Fragment key={id}>
                  {insertBeforeId === id && indicator}
                  {i > 0 && <div className="toolbar-dock__divider" aria-hidden="true" />}
                  {renderBar(d)}
                </React.Fragment>
              );
            })}
            {rowIndex === drawnRows.length - 1 && insertAtEnd && indicator}
            {rowIndex === drawnRows.length - 1 && trailing && <div className="toolbar-dock__trailing">{trailing}</div>}
          </div>
        </React.Fragment>
      ))}
      {empty && trailing && (
        <div className="toolbar-dock__row"><div className="toolbar-dock__trailing">{trailing}</div></div>
      )}
    </div>
  );
}

function sameRows(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, i) => row.length === b[i].length && row.every((id, j) => id === b[i][j]));
}

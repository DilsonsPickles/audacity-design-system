import React from 'react';
import { ToolbarDock, useTransportTools, type ToolbarBarAxis, type ToolbarRegion, type ToolbarRow, type ToolMeta, type ToolbarOrientation } from '@audacity-ui/components';
import type { ToolbarDropTarget } from '../hooks/useToolbarBarDrag';
import type { ToolDropTarget } from '../utils/toolbarToolDrop';

/** The two drags' state, the same for every dock */
export interface ToolbarDockDrag {
  draggingBarId: string | null;
  barTarget: ToolbarDropTarget | null;
  onGripMouseDown: (barId: string, e: React.MouseEvent, barRect: DOMRect) => void;
  /** The layout's edit mode: tools are inert and can be picked up */
  editing: boolean;
  draggingToolId: string | null;
  toolTarget: ToolDropTarget | null;
  onToolMouseDown: (toolId: string, barId: string, e: React.MouseEvent, toolRect: DOMRect) => void;
}

export interface AppToolbarDockProps {
  region: ToolbarRegion;
  /** The dock's rows of bars */
  rows: ReadonlyArray<ToolbarRow>;
  /** The host's own tools (the status bar's), asked before the transport's */
  renderExtraTool?: (id: string, orientation: ToolbarOrientation) => React.ReactNode;
  extraToolMeta?: (id: string) => ToolMeta | undefined;
  drag: ToolbarDockDrag;
  /** A bar's resize edge was released (null = natural size) */
  onBarResize?: (barId: string, axis: ToolbarBarAxis, size: number | null) => void;
  trailing?: React.ReactNode;
  /** The Customise toolbar cog at the dock's end (the top dock's) */
  showSettingsCog?: boolean;
  className?: string;
  tabGroupId?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  /** Extra data attributes on the dock (the status bar's backgrounded mark) */
  dataAttrs?: Record<string, string | undefined>;
}

/**
 * One of the app's four docks (2026-11-09, custom toolbars): a ToolbarDock
 * drawing its bars from the TransportTools registry, plus whatever tools
 * the host adds (the status bar's). The drag's target shows here as the
 * insertion line (beside a bar, or across the dock for a new row).
 */
export function AppToolbarDock({
  region, rows, renderExtraTool, extraToolMeta, drag, onBarResize,
  trailing, showSettingsCog = false, className, tabGroupId, ariaLabel, style, dataAttrs,
}: AppToolbarDockProps) {
  const { renderTool, toolMeta, hidden, settingsCog } = useTransportTools();
  if (hidden) return null;
  // A whole bar's landing, or a NEW bar's for a tool pulled beside one or
  // onto a new row: all are a container arriving, and wear the dock's
  // line — full-height beside a bar, horizontal for a new row
  const here = drag.barTarget?.region === region ? drag.barTarget : null;
  const tool = drag.toolTarget?.region === region ? drag.toolTarget : null;
  const arriving = here ?? (tool?.kind === 'new' ? tool : null);
  const dock = (
    <ToolbarDock
      region={region}
      rows={rows}
      renderTool={(id, o) => renderExtraTool?.(id, o) ?? renderTool(id, o)}
      toolMeta={(id, o) => extraToolMeta?.(id) ?? toolMeta(id, o)}
      onGripMouseDown={drag.onGripMouseDown}
      onBarResize={onBarResize}
      draggingBarId={drag.draggingBarId}
      insert={arriving?.placement ?? null}
      insertAfterBarId={arriving?.lineEndAfter ?? null}
      insertRefused={here?.refused ?? tool?.refused ?? false}
      editing={drag.editing}
      onToolMouseDown={drag.onToolMouseDown}
      draggingToolId={drag.draggingToolId}
      toolInsert={tool?.kind === 'into' && !tool.refused ? { barId: tool.barId, beforeToolId: tool.beforeToolId } : null}
      trailing={showSettingsCog ? settingsCog : trailing}
      className={className}
      tabGroupId={tabGroupId}
      ariaLabel={ariaLabel}
      dataAttrs={dataAttrs}
      style={style}
    />
  );
  return dock;
}

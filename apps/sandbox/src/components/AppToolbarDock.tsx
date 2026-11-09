import React from 'react';
import { ToolbarDock, useTransportTools, type ToolbarBar, type ToolbarRegion, type ToolMeta, type ToolbarOrientation } from '@audacity-ui/components';
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
  bars: ReadonlyArray<ToolbarBar>;
  /** The host's own tools (the status bar's), asked before the transport's */
  renderExtraTool?: (id: string, orientation: ToolbarOrientation) => React.ReactNode;
  extraToolMeta?: (id: string) => ToolMeta | undefined;
  drag: ToolbarDockDrag;
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
 * insertion indicator or the empty dock's zone.
 */
export function AppToolbarDock({
  region, bars, renderExtraTool, extraToolMeta, drag,
  trailing, showSettingsCog = false, className, tabGroupId, ariaLabel, style, dataAttrs,
}: AppToolbarDockProps) {
  const { renderTool, toolMeta, hidden, settingsCog } = useTransportTools();
  if (hidden) return null;
  // A whole bar's landing, or a NEW bar's for a tool pulled beside one:
  // both are a container arriving, and wear the full-height line
  const here = drag.barTarget?.region === region ? drag.barTarget : null;
  const tool = drag.toolTarget?.region === region ? drag.toolTarget : null;
  const newBarAt = tool?.kind === 'new'
    ? (tool.beforeBarId === null ? bars.length : Math.max(0, bars.findIndex((b) => b.id === tool.beforeBarId)))
    : null;
  const dock = (
    <ToolbarDock
      region={region}
      bars={bars}
      renderTool={(id, o) => renderExtraTool?.(id, o) ?? renderTool(id, o)}
      toolMeta={(id) => extraToolMeta?.(id) ?? toolMeta(id)}
      onGripMouseDown={drag.onGripMouseDown}
      draggingBarId={drag.draggingBarId}
      insertAt={here ? here.index : newBarAt}
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

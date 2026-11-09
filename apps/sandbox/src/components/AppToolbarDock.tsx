import React from 'react';
import { ToolbarDock, useTransportTools, type ToolbarBar, type ToolbarRegion, type ToolMeta, type ToolbarOrientation } from '@audacity-ui/components';
import type { ToolbarDropTarget } from '../hooks/useToolbarBarDrag';

export interface AppToolbarDockProps {
  region: ToolbarRegion;
  bars: ReadonlyArray<ToolbarBar>;
  /** The host's own tools (the status bar's), asked before the transport's */
  renderExtraTool?: (id: string, orientation: ToolbarOrientation) => React.ReactNode;
  extraToolMeta?: (id: string) => ToolMeta | undefined;
  draggingBarId: string | null;
  dropTarget: ToolbarDropTarget | null;
  onGripMouseDown: (barId: string, e: React.MouseEvent, barRect: DOMRect) => void;
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
  region, bars, renderExtraTool, extraToolMeta, draggingBarId, dropTarget, onGripMouseDown,
  trailing, showSettingsCog = false, className, tabGroupId, ariaLabel, style, dataAttrs,
}: AppToolbarDockProps) {
  const { renderTool, toolMeta, hidden, settingsCog } = useTransportTools();
  if (hidden) return null;
  const here = dropTarget?.region === region ? dropTarget : null;
  const dock = (
    <ToolbarDock
      region={region}
      bars={bars}
      renderTool={(id, o) => renderExtraTool?.(id, o) ?? renderTool(id, o)}
      toolMeta={(id) => extraToolMeta?.(id) ?? toolMeta(id)}
      onGripMouseDown={onGripMouseDown}
      draggingBarId={draggingBarId}
      insertAt={here ? here.index : null}
      insertRefused={here?.refused ?? false}
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

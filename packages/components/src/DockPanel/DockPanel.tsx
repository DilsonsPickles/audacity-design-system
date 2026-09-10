import React from 'react';
import { SidePanel } from '../SidePanel';
import { PanelHeader, type PanelHeaderTab } from '../PanelHeader';
import { useTheme } from '../ThemeProvider';
import './DockPanel.css';

export interface DockPanelProps {
  /** Which side of the editor the panel is docked to */
  position: 'left' | 'right';
  /** Tabs shown in the panel header */
  tabs: PanelHeaderTab[];
  /** ID of the currently active tab */
  activeTabId: string;
  /** Called when a tab is clicked */
  onTabChange?: (tabId: string) => void;
  /** Called when tabs are reordered by drag */
  onTabReorder?: (tabs: PanelHeaderTab[]) => void;
  /** Called when the active tab's ellipsis menu button is clicked */
  onMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Called when the close button is clicked (closes the active tab).
   *  Single-tab title mode's panel-level close, and the active-tab
   *  fallback in tab mode when `onTabClose` isn't provided. */
  onClose?: () => void;
  /** Called when a specific tab's close button is clicked (tab mode) */
  onTabClose?: (tabId: string) => void;
  /** Initial width in pixels */
  width?: number;
  /** Whether the panel is horizontally resizable */
  resizable?: boolean;
  /** Minimum width when resizing (px) */
  minWidth?: number;
  /** Maximum width when resizing (px) */
  maxWidth?: number;
  /** Called when panel is resized */
  onResize?: (width: number) => void;
  /** Additional CSS class */
  className?: string;
  /** Content of the active tab */
  children: React.ReactNode;
}

/**
 * DockPanel — a side-docked, tabbed panel host. Pairs SidePanel (position +
 * resize) with PanelHeader (tabs, ellipsis menu, close) the same way the
 * bottom drawer does, so panels like Effects and Macros can share a dock.
 * The caller owns which tabs exist, which is active, and what content the
 * active tab renders.
 */
export const DockPanel: React.FC<DockPanelProps> = ({
  position,
  tabs,
  activeTabId,
  onTabChange,
  onTabReorder,
  onMenuClick,
  onClose,
  onTabClose,
  width = 240,
  resizable = true,
  minWidth = 200,
  maxWidth = 400,
  onResize,
  className = '',
  children,
}) => {
  const { theme } = useTheme();

  const style = {
    '--dock-bg': theme.background.surface.default,
    '--dock-border': theme.border.default,
  } as React.CSSProperties;

  return (
    <SidePanel
      position={position}
      width={width}
      resizable={resizable}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResize={onResize}
      className={`dock-panel ${className}`}
      style={style}
    >
      <PanelHeader
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        onTabReorder={onTabReorder}
        onMenuClick={onMenuClick}
        onClose={onClose}
        onTabClose={onTabClose}
      />
      <div className="dock-panel__content">
        {children}
      </div>
    </SidePanel>
  );
};

export default DockPanel;

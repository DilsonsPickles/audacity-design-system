import React from 'react';
import { GhostButton } from '../GhostButton';
import { useTheme } from '../ThemeProvider';
import './PanelHeader.css';

export interface PanelHeaderTab {
  /** Unique identifier for the tab */
  id: string;
  /** Display label */
  label: string;
}

export interface PanelHeaderProps {
  /** Array of tab items */
  tabs: PanelHeaderTab[];
  /** ID of the currently active tab */
  activeTabId: string;
  /** Called when a tab is clicked */
  onTabChange?: (tabId: string) => void;
  /** Called when the menu button on the active tab is clicked */
  onMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Additional CSS class names */
  className?: string;
}

/**
 * PanelHeader - Tabbed header for panels.
 * Displays tabs with the active tab highlighted and an ellipsis menu button.
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onMenuClick,
  className = '',
}) => {
  const { theme } = useTheme();

  const style = {
    '--ph-bg': theme.background.surface.elevated,
    '--ph-tab-active-bg': theme.background.surface.default,
    '--ph-tab-hover-bg': theme.background.surface.hover,
    '--ph-border': theme.border.default,
    '--ph-text': theme.foreground.text.primary,
    '--ph-focus': theme.border.focus,
  } as React.CSSProperties;

  return (
    <div
      className={`panel-header ${className}`}
      style={style}
    >
      <div className="panel-header__tab-group" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`panel-header__tab ${
                isActive
                  ? 'panel-header__tab--active'
                  : 'panel-header__tab--inactive'
              }`}
              onClick={() => onTabChange?.(tab.id)}
            >
              <span className="panel-header__tab-label">{tab.label}</span>
              {isActive && (
                <GhostButton
                  icon="menu"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuClick?.(e);
                  }}
                  ariaLabel={`${tab.label} menu`}
                  tabIndex={-1}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PanelHeader;

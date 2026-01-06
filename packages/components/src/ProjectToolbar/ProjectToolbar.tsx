import React, { useRef, useMemo, useState } from 'react';
import { Tab } from '../Tab';
import { useTabGroup } from '../hooks/useTabGroup';
import './ProjectToolbar.css';

export interface ProjectToolbarProps {
  /**
   * Height of the project toolbar in pixels
   * @default 40
   */
  height?: number;
  /**
   * Currently active menu item
   */
  activeItem?: 'home' | 'project' | 'export' | 'debug';
  /**
   * Callback when a menu item is clicked
   */
  onMenuItemClick?: (item: 'home' | 'project' | 'export' | 'debug') => void;
  /**
   * Center content (e.g., "Mixer", "Audio setup")
   */
  centerContent?: React.ReactNode;
  /**
   * Right content (e.g., workspace selector, buttons)
   */
  rightContent?: React.ReactNode;
  /**
   * Whether to show the debug menu item
   */
  showDebugMenu?: boolean;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * ProjectToolbar component - Top-level menu bar with tab groups
 * - Height: 40px (default)
 * - Background: #ffffff
 * - Border bottom: 1px solid #e5e5e5
 * - Contains: Home, Project, Export menus + center/right content
 * - Keyboard navigation: Arrow keys navigate within tab groups
 */
export function ProjectToolbar({
  height = 40,
  activeItem,
  onMenuItemClick,
  centerContent,
  rightContent,
  showDebugMenu = false,
  className = '',
}: ProjectToolbarProps) {
  const leftGroupRef = useRef<(HTMLElement | null)[]>([]);

  // Shared state for roving tabindex
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const totalMenuItems = useMemo(() => {
    return showDebugMenu ? 4 : 3;
  }, [showDebugMenu]);

  // Use tab group hooks for each menu item with shared state
  const homeTab = useTabGroup({
    groupId: 'project-toolbar',
    itemIndex: 0,
    totalItems: totalMenuItems,
    itemRefs: leftGroupRef,
    activeIndex: activeTabIndex,
    onItemActivate: setActiveTabIndex,
    baseTabIndex: 2,
  });

  const projectTab = useTabGroup({
    groupId: 'project-toolbar',
    itemIndex: 1,
    totalItems: totalMenuItems,
    itemRefs: leftGroupRef,
    activeIndex: activeTabIndex,
    onItemActivate: setActiveTabIndex,
    baseTabIndex: 2,
  });

  const exportTab = useTabGroup({
    groupId: 'project-toolbar',
    itemIndex: 2,
    totalItems: totalMenuItems,
    itemRefs: leftGroupRef,
    activeIndex: activeTabIndex,
    onItemActivate: setActiveTabIndex,
    baseTabIndex: 2,
  });

  const debugTab = useTabGroup({
    groupId: 'project-toolbar',
    itemIndex: 3,
    totalItems: totalMenuItems,
    itemRefs: leftGroupRef,
    activeIndex: activeTabIndex,
    onItemActivate: setActiveTabIndex,
    baseTabIndex: 2,
  });

  return (
    <div
      className={`project-toolbar ${className}`}
      style={{ height: `${height}px` }}
      role="toolbar"
      aria-label="Project toolbar"
    >
      <div className="project-toolbar__left" role="group" aria-label="Main menu">
        <Tab
          ref={(el) => (leftGroupRef.current[0] = el)}
          label="Home"
          isActive={activeItem === 'home'}
          onClick={() => onMenuItemClick?.('home')}
          tabIndex={homeTab.tabIndex}
          onKeyDown={homeTab.onKeyDown}
          onFocus={homeTab.onFocus}
          onBlur={homeTab.onBlur}
        />
        <Tab
          ref={(el) => (leftGroupRef.current[1] = el)}
          label="Project"
          isActive={activeItem === 'project'}
          onClick={() => onMenuItemClick?.('project')}
          tabIndex={projectTab.tabIndex}
          onKeyDown={projectTab.onKeyDown}
          onFocus={projectTab.onFocus}
          onBlur={projectTab.onBlur}
        />
        <Tab
          ref={(el) => (leftGroupRef.current[2] = el)}
          label="Export"
          isActive={activeItem === 'export'}
          onClick={() => onMenuItemClick?.('export')}
          tabIndex={exportTab.tabIndex}
          onKeyDown={exportTab.onKeyDown}
          onFocus={exportTab.onFocus}
          onBlur={exportTab.onBlur}
        />
        {showDebugMenu && (
          <Tab
            ref={(el) => (leftGroupRef.current[3] = el)}
            label="Debug"
            isActive={activeItem === 'debug'}
            onClick={() => onMenuItemClick?.('debug')}
            tabIndex={debugTab.tabIndex}
            onKeyDown={debugTab.onKeyDown}
            onFocus={debugTab.onFocus}
            onBlur={debugTab.onBlur}
          />
        )}
      </div>

      {activeItem !== 'home' && centerContent && (
        <div className="project-toolbar__center" role="group" aria-label="Toolbar options">
          {centerContent}
        </div>
      )}

      {activeItem !== 'home' && rightContent && (
        <div className="project-toolbar__right" role="group" aria-label="Workspace controls">
          {rightContent}
        </div>
      )}
    </div>
  );
}

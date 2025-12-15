import React from 'react';
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
 * ProjectToolbar component - Top-level menu bar
 * - Height: 40px (default)
 * - Background: #ffffff
 * - Border bottom: 1px solid #e5e5e5
 * - Contains: Home, Project, Export menus + center/right content
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
  return (
    <div
      className={`project-toolbar ${className}`}
      style={{ height: `${height}px` }}
    >
      <div className="project-toolbar__left">
        <button
          className={`project-toolbar__menu-item ${activeItem === 'home' ? 'project-toolbar__menu-item--active' : ''}`}
          onClick={() => onMenuItemClick?.('home')}
        >
          Home
        </button>
        <button
          className={`project-toolbar__menu-item ${activeItem === 'project' ? 'project-toolbar__menu-item--active' : ''}`}
          onClick={() => onMenuItemClick?.('project')}
        >
          Project
        </button>
        <button
          className={`project-toolbar__menu-item ${activeItem === 'export' ? 'project-toolbar__menu-item--active' : ''}`}
          onClick={() => onMenuItemClick?.('export')}
        >
          Export
        </button>
        {showDebugMenu && (
          <button
            className={`project-toolbar__menu-item ${activeItem === 'debug' ? 'project-toolbar__menu-item--active' : ''}`}
            onClick={() => onMenuItemClick?.('debug')}
          >
            Debug
          </button>
        )}
      </div>

      {centerContent && (
        <div className="project-toolbar__center">
          {centerContent}
        </div>
      )}

      {rightContent && (
        <div className="project-toolbar__right">
          {rightContent}
        </div>
      )}
    </div>
  );
}

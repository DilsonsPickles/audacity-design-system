import React from 'react';
import { Tab } from '../Tab';
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
        <Tab
          label="Home"
          isActive={activeItem === 'home'}
          onClick={() => onMenuItemClick?.('home')}
        />
        <Tab
          label="Project"
          isActive={activeItem === 'project'}
          onClick={() => onMenuItemClick?.('project')}
        />
        <Tab
          label="Export"
          isActive={activeItem === 'export'}
          onClick={() => onMenuItemClick?.('export')}
        />
        {showDebugMenu && (
          <Tab
            label="Debug"
            isActive={activeItem === 'debug'}
            onClick={() => onMenuItemClick?.('debug')}
          />
        )}
      </div>

      {activeItem !== 'home' && centerContent && (
        <div className="project-toolbar__center">
          {centerContent}
        </div>
      )}

      {activeItem !== 'home' && rightContent && (
        <div className="project-toolbar__right">
          {rightContent}
        </div>
      )}
    </div>
  );
}

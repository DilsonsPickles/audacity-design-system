import React, { useRef, useEffect } from 'react';
import { useTheme } from '../ThemeProvider';
import { useContainerTabGroup } from '../hooks/useContainerTabGroup';
import './Toolbar.css';

export interface ToolbarProps {
  /**
   * Height of the toolbar in pixels
   * @default 48
   */
  height?: number;
  /**
   * Main content/left section of the toolbar
   */
  children?: React.ReactNode;
  /**
   * Optional right section content
   */
  rightContent?: React.ReactNode;
  /**
   * Optional className for custom styling
   */
  className?: string;
  /**
   * Enable keyboard navigation as a tab group
   * @default true
   */
  enableTabGroup?: boolean;
  /**
   * Starting tabIndex for the first element in the toolbar (default: 0)
   */
  startTabIndex?: number;
  /**
   * Tab group ID for accessibility profile configuration
   * @default 'transport-toolbar'
   */
  tabGroupId?: string;
}

/**
 * Toolbar component matching Figma design specifications
 * - Height: 48px (default)
 * - Background: #f8f8f9
 * - Border bottom: 1px solid #d4d5d9
 * - Internal padding: 12px horizontal
 * - Keyboard navigation: Arrow keys navigate within toolbar (tab group)
 */
export function Toolbar({
  height = 48,
  children,
  rightContent,
  className = '',
  enableTabGroup = true,
  startTabIndex: _startTabIndexProp,
  tabGroupId = 'transport-toolbar',
}: ToolbarProps) {
  const { theme } = useTheme();
  const toolbarRef = useRef<HTMLDivElement>(null);

  const toolbarFilter = React.useCallback((el: HTMLElement) => {
    // Skip elements inside role="group" (TimeCode internal buttons)
    if (el.getAttribute('role') !== 'group') {
      const parentGroup = el.closest('[role="group"]');
      if (parentGroup) return false;
    }
    return true;
  }, []);

  const { onKeyDown, onBlur, containerProps, initTabIndices } = useContainerTabGroup({
    containerRef: toolbarRef,
    groupId: tabGroupId,
    selector: 'button, select, input, [role="group"]',
    filter: toolbarFilter,
    ariaLabel: 'Tool toolbar',
  });

  // Re-init when children change
  useEffect(() => {
    if (enableTabGroup) {
      initTabIndices();
    }
  }, [enableTabGroup, children, rightContent, initTabIndices]);

  const style = {
    '--toolbar-bg': theme.background.surface.default,
    '--toolbar-border': theme.border.default,
    '--toolbar-divider': theme.border.divider,
  } as React.CSSProperties;

  return (
    <div
      ref={toolbarRef}
      className={`toolbar ${className}`}
      style={{ height: `${height}px`, ...style }}
      role={enableTabGroup ? containerProps.role : undefined}
      aria-label={enableTabGroup ? containerProps['aria-label'] : undefined}
      onKeyDown={enableTabGroup ? onKeyDown : undefined}
      onBlur={enableTabGroup ? onBlur : undefined}
    >
      <div className="toolbar__content">
        {children}
      </div>
      {rightContent && (
        <div className="toolbar__right">
          {rightContent}
        </div>
      )}
    </div>
  );
}

export interface ToolbarDividerProps {
  /**
   * Width of the divider
   * @default 1
   */
  width?: number;
}

/**
 * Vertical divider for separating toolbar button groups
 * - Width: 1px (default)
 */
export function ToolbarDivider({ width = 1 }: ToolbarDividerProps) {
  return (
    <div
      className="toolbar__divider"
      style={{ width: `${width}px` }}
    >
      <div className="toolbar__divider-line" />
    </div>
  );
}

export interface ToolbarButtonGroupProps {
  /**
   * Buttons or other content in the group
   */
  children: React.ReactNode;
  /**
   * Gap between items in the group (in pixels)
   * @default 2
   */
  gap?: number;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * Container for grouping toolbar buttons together
 * - Default gap: 2px (for transport buttons)
 * - Use gap={4} for regular button groups
 */
export function ToolbarButtonGroup({
  children,
  gap = 2,
  className = '',
}: ToolbarButtonGroupProps) {
  return (
    <div
      className={`toolbar__button-group ${className}`}
      style={{ gap: `${gap}px` }}
    >
      {children}
    </div>
  );
}

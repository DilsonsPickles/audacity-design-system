import React from 'react';
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
}

/**
 * Toolbar component matching Figma design specifications
 * - Height: 48px (default)
 * - Background: #f8f8f9
 * - Border bottom: 1px solid #d4d5d9
 * - Internal padding: 12px horizontal
 */
export function Toolbar({
  height = 48,
  children,
  rightContent,
  className = '',
}: ToolbarProps) {
  return (
    <div
      className={`toolbar ${className}`}
      style={{ height: `${height}px` }}
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
   * Width of the divider (includes padding on both sides)
   * @default 17
   */
  width?: number;
}

/**
 * Vertical divider for separating toolbar button groups
 * - Width: 17px (default) with centered 1px line
 */
export function ToolbarDivider({ width = 17 }: ToolbarDividerProps) {
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

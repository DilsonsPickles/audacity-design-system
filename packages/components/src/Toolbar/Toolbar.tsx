import React, { useRef, Children, cloneElement, isValidElement } from 'react';
import { useAccessibilityProfile } from '../contexts/AccessibilityProfileContext';
import { useTheme } from '../ThemeProvider';
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
  startTabIndex = 0,
  tabGroupId = 'transport-toolbar',
}: ToolbarProps) {
  const { theme } = useTheme();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { activeProfile } = useAccessibilityProfile();

  const style = {
    '--toolbar-bg': theme.background.surface.default,
    '--toolbar-border': theme.border.default,
    '--toolbar-divider': theme.border.divider,
  } as React.CSSProperties;

  // Check if this toolbar should use tab groups based on profile
  const groupConfig = activeProfile.config.tabGroups[tabGroupId];
  const useTabGroups = enableTabGroup && groupConfig?.tabindex === 'roving';
  const useArrowNavigation = enableTabGroup && groupConfig?.arrows;

  // Debug logging
  React.useEffect(() => {
    console.log('[Toolbar] Config:', {
      tabGroupId,
      groupConfig,
      useTabGroups,
      useArrowNavigation,
      enableTabGroup,
    });
  }, [tabGroupId, groupConfig, useTabGroups, useArrowNavigation, enableTabGroup]);

  // Set tabIndex on all focusable elements after render
  React.useEffect(() => {
    if (!toolbarRef.current) return;

    const allElements = toolbarRef.current.querySelectorAll('button, select, input, [role="group"]');
    const focusables = Array.from(allElements).filter(el => {
      const element = el as HTMLElement;
      // Skip buttons/inputs inside a role="group" (like TimeCode's internal elements)
      if (element.getAttribute('role') !== 'group') {
        const parentGroup = element.closest('[role="group"]');
        if (parentGroup) return false;
      }
      return true;
    });

    focusables.forEach((element, index) => {
      if (useTabGroups) {
        // Tab group mode: First element gets startTabIndex, all others get -1
        (element as HTMLElement).setAttribute('tabindex', index === 0 ? String(startTabIndex) : '-1');
      } else {
        // Sequential mode: All elements get tabIndex=0 (browser uses DOM order)
        (element as HTMLElement).setAttribute('tabindex', '0');
      }
    });
  }, [useTabGroups, children, rightContent, startTabIndex]);

  // Reset tabIndex to first element when focus leaves the toolbar (only in tab group mode)
  const handleBlur = (e: React.FocusEvent) => {
    if (!useTabGroups) return;

    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!toolbarRef.current?.contains(relatedTarget)) {
      const allElements = toolbarRef.current?.querySelectorAll('button, select, input, [role="group"]');
      if (allElements) {
        const focusables = Array.from(allElements).filter(el => {
          const element = el as HTMLElement;
          // Skip buttons/inputs inside a role="group" (like TimeCode's internal elements)
          if (element.getAttribute('role') !== 'group') {
            const parentGroup = element.closest('[role="group"]');
            if (parentGroup) return false;
          }
          return true;
        });

        focusables.forEach((el, index) => {
          (el as HTMLElement).tabIndex = index === 0 ? startTabIndex : -1;
        });
      }
    }
  };

  // Handle keyboard navigation within the toolbar (only if arrow navigation is enabled)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('[Toolbar] handleKeyDown:', { key: e.key, useArrowNavigation, defaultPrevented: e.defaultPrevented });

    if (!useArrowNavigation) {
      console.log('[Toolbar] Arrow navigation disabled, returning');
      return;
    }

    // Only handle arrow keys - let Tab/Shift+Tab work naturally
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      return;
    }

    // If the event was already handled by a child element (like TimeCode internal navigation),
    // don't intercept it. Check if defaultPrevented or if propagation was stopped.
    if (e.defaultPrevented) {
      console.log('[Toolbar] Event already handled, returning');
      return;
    }

    console.log('[Toolbar] Handling arrow key navigation');
    e.preventDefault();

    // Get all focusable elements in the toolbar (excluding elements with tabindex="-1")
    const allElements = toolbarRef.current?.querySelectorAll('button, select, input, [role="group"]');
    console.log('[Toolbar] All elements found:', allElements?.length);

    if (!allElements || allElements.length === 0) return;

    const focusables = Array.from(allElements).filter(el => {
      const element = el as HTMLElement;
      // Don't filter by tabIndex here - we manage that dynamically
      // Only exclude elements that are inside a role="group" (like TimeCode's internal buttons)
      if (element.getAttribute('role') !== 'group') {
        const parentGroup = element.closest('[role="group"]');
        if (parentGroup) return false;
      }
      return true;
    });

    console.log('[Toolbar] Focusable elements:', focusables.length, focusables.map(el => el.tagName + (el.getAttribute('role') ? `[${el.getAttribute('role')}]` : '')));
    console.log('[Toolbar] Current active element:', document.activeElement);

    const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
    console.log('[Toolbar] Current index:', currentIndex);

    if (currentIndex === -1) {
      console.log('[Toolbar] Active element not in focusables list, aborting');
      return;
    }

    let nextIndex: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % focusables.length;
    } else {
      nextIndex = (currentIndex - 1 + focusables.length) % focusables.length;
    }

    console.log('[Toolbar] Moving from index', currentIndex, 'to', nextIndex);

    // Update tabIndex: current element gets -1, next element gets startTabIndex
    (focusables[currentIndex] as HTMLElement).tabIndex = -1;
    (focusables[nextIndex] as HTMLElement).tabIndex = startTabIndex;
    (focusables[nextIndex] as HTMLElement).focus();

    console.log('[Toolbar] Focus moved to:', focusables[nextIndex]);
  };

  return (
    <div
      ref={toolbarRef}
      className={`toolbar ${className}`}
      style={{ height: `${height}px`, ...style }}
      role={useTabGroups ? "toolbar" : undefined}
      aria-label={useTabGroups ? "Tool toolbar" : undefined}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
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

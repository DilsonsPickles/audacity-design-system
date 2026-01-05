/**
 * Accessibility Profile Types
 *
 * Defines types for configurable accessibility profiles that control
 * keyboard navigation, focus management, and tab order behavior
 */

/**
 * Tab index management strategy
 * - 'roving': Only one element has tabindex="0", others have tabindex="-1"
 * - 'sequential': All elements have tabindex="0"
 */
export type TabIndexStrategy = 'roving' | 'sequential';

/**
 * Focus management strategy
 * - 'roving': Single tab stop per group, arrow keys navigate within
 * - 'sequential': Each element is a tab stop
 */
export type FocusManagementStrategy = 'roving' | 'sequential';

/**
 * Tab navigation pattern
 * - 'hierarchical': Tab moves between groups
 * - 'sequential': Tab moves through all elements in DOM order
 */
export type TabNavigationPattern = 'hierarchical' | 'sequential';

/**
 * Configuration for a tab group (toolbar, sidebar, etc.)
 */
export interface TabGroupConfig {
  /**
   * Strategy for managing tabindex values
   */
  tabindex: TabIndexStrategy;

  /**
   * Whether arrow keys navigate within this group
   */
  arrows: boolean;

  /**
   * Whether navigation wraps from last to first item
   */
  wrap: boolean;
}

/**
 * Complete accessibility profile configuration
 */
export interface AccessibilityProfileConfig {
  /**
   * Overall focus management strategy
   */
  focusManagement: FocusManagementStrategy;

  /**
   * Tab navigation pattern
   */
  tabNavigation: TabNavigationPattern;

  /**
   * Configuration for each tab group in the application
   */
  tabGroups: {
    [groupId: string]: TabGroupConfig;
  };

  /**
   * Order in which tab groups are visited (null for DOM order)
   */
  tabGroupOrder: string[] | null;
}

/**
 * Accessibility profile definition
 */
export interface AccessibilityProfile {
  /**
   * Unique identifier for this profile
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Description of the profile's behavior
   */
  description: string;

  /**
   * Configuration settings
   */
  config: AccessibilityProfileConfig;
}

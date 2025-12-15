/**
 * CloudProjectIndicator Component
 *
 * Displays a cloud icon to indicate that the current project is synced to the cloud
 */

import React from 'react';
import './CloudProjectIndicator.css';

export interface CloudProjectIndicatorProps {
  /**
   * Upload state - when true, shows upload icon (EF25) instead of cloud (F435)
   */
  isUploading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * CloudProjectIndicator - Shows a cloud icon for cloud-synced projects
 */
export function CloudProjectIndicator({
  isUploading = false,
  className = '',
}: CloudProjectIndicatorProps) {
  const icon = isUploading ? '\uEF25' : '\uF435';

  return (
    <div className={`cloud-project-indicator ${className}`}>
      <div className="cloud-project-indicator__icon">{icon}</div>
    </div>
  );
}

export default CloudProjectIndicator;

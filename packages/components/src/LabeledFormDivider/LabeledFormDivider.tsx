/**
 * LabeledFormDivider - Horizontal divider with centered label text
 * Based on Figma design: node-id=10123-3633
 */

import React from 'react';
import './LabeledFormDivider.css';

export interface LabeledFormDividerProps {
  /**
   * Label text to display in the center
   */
  label: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * LabeledFormDivider component - Divider with centered label
 */
export function LabeledFormDivider({
  label,
  className = '',
}: LabeledFormDividerProps) {
  return (
    <div className={`labeled-form-divider ${className}`}>
      <div className="labeled-form-divider__line" />
      <span className="labeled-form-divider__label">{label}</span>
      <div className="labeled-form-divider__line" />
    </div>
  );
}

export default LabeledFormDivider;

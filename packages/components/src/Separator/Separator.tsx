import React from 'react';
import './Separator.css';

export interface SeparatorProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ className = '' }) => {
  return (
    <div className={`separator ${className}`} role="separator" />
  );
};

export default Separator;

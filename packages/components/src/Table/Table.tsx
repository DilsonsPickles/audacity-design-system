/**
 * Table - Generic table component
 */

import React from 'react';
import { useTheme } from '../ThemeProvider';
import './Table.css';

export interface TableProps {
  /**
   * Table content (TableHeader and TableBody)
   */
  children: React.ReactNode;
  /**
   * Optional className
   */
  className?: string;
  /**
   * Minimum height for table body
   */
  minBodyHeight?: string | number;
  /**
   * Maximum height for table body
   */
  maxBodyHeight?: string | number;
}

/**
 * Table component - Container for table structure
 */
export function Table({
  children,
  className = '',
  minBodyHeight,
  maxBodyHeight,
}: TableProps) {
  const { theme } = useTheme();

  const style = {
    '--table-header-bg': theme.background.surface.subtle,
    '--table-header-text': theme.foreground.text.primary,
    '--table-header-border': theme.border.default,
    '--table-row-bg': theme.background.surface.default,
    '--table-row-hover-bg': theme.background.surface.hover,
    '--table-row-text': theme.foreground.text.primary,
    '--table-row-border': theme.border.default,
    '--table-cell-secondary-text': theme.foreground.text.secondary,
    ...(minBodyHeight && { '--table-body-min-height': typeof minBodyHeight === 'number' ? `${minBodyHeight}px` : minBodyHeight }),
    ...(maxBodyHeight && { '--table-body-max-height': typeof maxBodyHeight === 'number' ? `${maxBodyHeight}px` : maxBodyHeight }),
  } as React.CSSProperties;

  return (
    <div className={`table ${className}`} style={style}>
      {children}
    </div>
  );
}

export default Table;

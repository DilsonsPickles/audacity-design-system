/**
 * LabelEditorTableHeader - Table header row for label editor
 * Based on Figma design: node-id=8827-43088
 */

import React from 'react';
import { GhostButton } from '../GhostButton';
import { Icon } from '../Icon';
import { useTheme } from '../ThemeProvider';
import './LabelEditorTableHeader.css';

export interface LabelEditorTableHeaderColumn {
  /**
   * Column label text
   */
  label: string;
  /**
   * Column width (CSS value)
   */
  width?: string;
  /**
   * Whether to show the menu button (ellipsis)
   * @default false
   */
  showMenu?: boolean;
  /**
   * Callback when menu button is clicked
   */
  onMenuClick?: () => void;
}

export interface LabelEditorTableHeaderProps {
  /**
   * Table columns configuration
   */
  columns: LabelEditorTableHeaderColumn[];
}

/**
 * LabelEditorTableHeader component - Sticky table header with column labels
 */
export function LabelEditorTableHeader({
  columns,
}: LabelEditorTableHeaderProps) {
  const { theme } = useTheme();

  const style = {
    '--table-header-bg': '#EBEBEF',
    '--table-header-border': theme.border.default,
    '--table-header-text': theme.foreground.text.primary,
  } as React.CSSProperties;

  return (
    <table className="label-editor-table-header" style={style}>
      <colgroup>
        {columns.map((column, index) => (
          <col key={index} style={{ width: column.width }} />
        ))}
      </colgroup>
      <tbody>
        <tr className="label-editor-table-header__row">
          {columns.map((column, index) => (
            <td key={index} className="label-editor-table-header__cell">
              <div className="label-editor-table-header__cell-content">
                <span className="label-editor-table-header__label">
                  {column.label}
                </span>
                {column.showMenu && (
                  <GhostButton
                    icon="menu"
                    size="tiny"
                    onClick={column.onMenuClick}
                    ariaLabel={`${column.label} menu`}
                  />
                )}
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export default LabelEditorTableHeader;

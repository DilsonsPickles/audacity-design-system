/**
 * PluginManagerDialog - Dialog for managing audio plugins
 */

import React, { useState } from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { useTheme } from '../ThemeProvider';
import './PluginManagerDialog.css';

export type PluginType = 'Nyquist' | 'Audacity' | 'AudioUnit';

export interface Plugin {
  id: string;
  name: string;
  type: PluginType;
  path: string;
  enabled: boolean;
}

export interface PluginManagerDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Plugins to display
   */
  plugins: Plugin[];
  /**
   * Callback when plugins change
   */
  onChange?: (plugins: Plugin[]) => void;
  /**
   * Callback when dialog should close
   */
  onClose?: () => void;
  /**
   * Operating system for platform-specific header controls
   * @default 'macos'
   */
  os?: 'macos' | 'windows';
}

type SortColumn = 'name' | 'type' | null;
type SortDirection = 'asc' | 'desc';

/**
 * PluginManagerDialog component
 */
export function PluginManagerDialog({
  isOpen,
  plugins,
  onChange,
  onClose,
  os = 'macos',
}: PluginManagerDialogProps) {
  const { theme } = useTheme();
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with ascending direction
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleToggleEnabled = (pluginId: string) => {
    if (!onChange) return;

    const newPlugins = plugins.map(plugin =>
      plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin
    );
    onChange(newPlugins);
  };

  // Sort plugins
  const sortedPlugins = [...plugins].sort((a, b) => {
    if (!sortColumn) return 0;

    let comparison = 0;
    if (sortColumn === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortColumn === 'type') {
      comparison = a.type.localeCompare(b.type);
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const style = {
    '--plugin-table-header-bg': theme.background.surface.subtle,
    '--plugin-table-header-text': theme.foreground.text.primary,
    '--plugin-table-header-border': theme.border.default,
    '--plugin-table-row-bg': theme.background.surface.default,
    '--plugin-table-row-hover-bg': theme.background.surface.hover,
    '--plugin-table-row-text': theme.foreground.text.primary,
    '--plugin-table-row-border': theme.border.default,
    '--plugin-table-path-text': theme.foreground.text.secondary,
  } as React.CSSProperties;

  return (
    <Dialog
      isOpen={isOpen}
      title="Manage Plugins"
      onClose={onClose}
      width={800}
      minHeight={0}
      os={os}
      noPadding
      footer={
        <div className="plugin-manager-footer">
          <div className="plugin-manager-footer__left">
            <Button variant="secondary" onClick={() => console.log('Rescan')}>
              Rescan
            </Button>
            <Button variant="secondary" onClick={() => console.log('Get more effects')}>
              Get more effects...
            </Button>
          </div>
          <div className="plugin-manager-footer__right">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onClose}>
              OK
            </Button>
          </div>
        </div>
      }
    >
      <div className="plugin-manager" style={style}>
        <div className="plugin-manager__table">
          {/* Table Header */}
          <div className="plugin-manager__header">
            <div className="plugin-manager__header-row">
              <div
                className={`plugin-manager__header-cell plugin-manager__header-cell--name ${sortColumn === 'name' ? 'plugin-manager__header-cell--sorted' : ''}`}
                onClick={() => handleSort('name')}
              >
                Name
                {sortColumn === 'name' && (
                  <span className="plugin-manager__sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </div>
              <div
                className={`plugin-manager__header-cell plugin-manager__header-cell--type ${sortColumn === 'type' ? 'plugin-manager__header-cell--sorted' : ''}`}
                onClick={() => handleSort('type')}
              >
                Type
                {sortColumn === 'type' && (
                  <span className="plugin-manager__sort-indicator">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </div>
              <div className="plugin-manager__header-cell plugin-manager__header-cell--path">
                Path
              </div>
              <div className="plugin-manager__header-cell plugin-manager__header-cell--enabled">
                Enabled
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="plugin-manager__body">
            {sortedPlugins.map((plugin) => (
              <div key={plugin.id} className="plugin-manager__row">
                <div className="plugin-manager__cell plugin-manager__cell--name">
                  {plugin.name}
                </div>
                <div className="plugin-manager__cell plugin-manager__cell--type">
                  {plugin.type}
                </div>
                <div className="plugin-manager__cell plugin-manager__cell--path">
                  {plugin.path}
                </div>
                <div className="plugin-manager__cell plugin-manager__cell--enabled">
                  <input
                    type="checkbox"
                    checked={plugin.enabled}
                    onChange={() => handleToggleEnabled(plugin.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default PluginManagerDialog;

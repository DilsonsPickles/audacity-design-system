import React from 'react';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';

export interface EffectDialogContextMenuProps {
  /**
   * Whether the menu is open
   */
  isOpen: boolean;

  /**
   * X position for the menu
   */
  x: number;

  /**
   * Y position for the menu
   */
  y: number;

  /**
   * Called when menu should close
   */
  onClose: () => void;

  /**
   * Called when "Save Presets..." is clicked
   */
  onSavePreset?: () => void;

  /**
   * Called when "Delete Presets" is clicked
   */
  onDeletePreset?: () => void;

  /**
   * Whether delete preset is available
   */
  canDelete?: boolean;

  /**
   * Factory presets list for submenu
   */
  factoryPresets?: string[];

  /**
   * Called when a factory preset is selected
   */
  onSelectFactoryPreset?: (preset: string) => void;

  /**
   * Called when "Import..." is clicked
   */
  onImport?: () => void;

  /**
   * Called when "Export..." is clicked
   */
  onExport?: () => void;

  /**
   * Called when "Options..." is clicked
   */
  onOptions?: () => void;

  /**
   * Called when "Show vendor UI" is toggled
   */
  onShowVendorUI?: () => void;

  /**
   * Whether vendor UI is currently shown (for checkbox state)
   * @default false
   */
  showVendorUI?: boolean;

  /**
   * Whether this is a 3rd party effect (enables Options and Show vendor UI menu items)
   * @default false
   */
  isThirdParty?: boolean;
}

/**
 * EffectDialogContextMenu - Context menu for effect dialogs
 * Provides preset management, import/export functionality
 */
export const EffectDialogContextMenu: React.FC<EffectDialogContextMenuProps> = ({
  isOpen,
  x,
  y,
  onClose,
  onSavePreset,
  onDeletePreset,
  canDelete = false,
  factoryPresets = ['Default', 'Heavy', 'Light', 'Room', 'Hall', 'Cathedral'],
  onSelectFactoryPreset,
  onImport,
  onExport,
  onOptions,
  onShowVendorUI,
  showVendorUI = false,
  isThirdParty = false,
}) => {
  const handleSavePreset = () => {
    onSavePreset?.();
    onClose();
  };

  const handleDeletePreset = () => {
    if (canDelete) {
      onDeletePreset?.();
      onClose();
    }
  };

  const handleImport = () => {
    onImport?.();
    onClose();
  };

  const handleExport = () => {
    onExport?.();
    onClose();
  };

  const handleOptions = () => {
    onOptions?.();
    onClose();
  };

  const handleShowVendorUI = () => {
    onShowVendorUI?.();
    // Don't close the menu for checkbox toggle
  };

  const handleFactoryPresetSelect = (preset: string) => {
    onSelectFactoryPreset?.(preset);
    onClose();
  };

  return (
    <ContextMenu isOpen={isOpen} x={x} y={y} onClose={onClose}>
      {/* User Presets (disabled menu item) */}
      <ContextMenuItem
        label="User Presets"
        disabled
        onClose={onClose}
      />

      {/* Save Presets... */}
      <ContextMenuItem
        label="Save Presets..."
        onClick={handleSavePreset}
        shortcut="S"
        onClose={onClose}
      />

      {/* Delete Presets */}
      <ContextMenuItem
        label="Delete Presets"
        onClick={handleDeletePreset}
        disabled={!canDelete}
        onClose={onClose}
      />

      {/* Divider */}
      <ContextMenuItem isDivider />

      {/* Factory Presets (submenu) */}
      <ContextMenuItem
        label="Factory Presets"
        hasSubmenu
        onClose={onClose}
      >
        {factoryPresets.map((preset) => (
          <ContextMenuItem
            key={preset}
            label={preset}
            onClick={() => handleFactoryPresetSelect(preset)}
            onClose={onClose}
          />
        ))}
      </ContextMenuItem>

      {/* Import... */}
      <ContextMenuItem
        label="Import..."
        onClick={handleImport}
        onClose={onClose}
      />

      {/* Export... */}
      <ContextMenuItem
        label="Export..."
        onClick={handleExport}
        onClose={onClose}
      />

      {/* Divider before Options */}
      <ContextMenuItem isDivider />

      {/* Show vendor UI (only enabled for 3rd party effects) */}
      <ContextMenuItem
        label="Show vendor UI"
        onClick={handleShowVendorUI}
        disabled={!isThirdParty}
        checked={showVendorUI}
        onClose={onClose}
      />

      {/* Options... (only enabled for 3rd party effects) */}
      <ContextMenuItem
        label="Options..."
        onClick={handleOptions}
        disabled={!isThirdParty}
        onClose={onClose}
      />
    </ContextMenu>
  );
};

export default EffectDialogContextMenu;

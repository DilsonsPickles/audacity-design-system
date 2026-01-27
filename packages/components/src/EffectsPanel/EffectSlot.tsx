import React, { useState } from 'react';
import { Icon } from '../Icon';
import { ToggleButton } from '../ToggleButton';
import { useTheme } from '../ThemeProvider';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import './EffectSlot.css';

export interface EffectSlotProps {
  /**
   * Effect name
   */
  effectName?: string;

  /**
   * Whether the effect is enabled
   */
  enabled?: boolean;

  /**
   * Called when the enable/disable button is clicked
   */
  onToggle?: (enabled: boolean) => void;

  /**
   * Called when the effect name field is clicked (to select effect)
   */
  onSelectEffect?: () => void;

  /**
   * Called when the settings dropdown is clicked
   */
  onShowSettings?: () => void;

  /**
   * Called when remove effect is clicked
   */
  onRemoveEffect?: () => void;

  /**
   * Whether this slot is being dragged
   */
  isDragging?: boolean;

  /**
   * Called when drag starts
   */
  onDragStart?: (e: React.DragEvent) => void;

  /**
   * Called during drag over
   */
  onDragOver?: (e: React.DragEvent) => void;

  /**
   * Called when dropped
   */
  onDrop?: (e: React.DragEvent) => void;

  /**
   * Called when drag ends
   */
  onDragEnd?: (e: React.DragEvent) => void;

  /**
   * Additional CSS class names
   */
  className?: string;

  /**
   * Inline styles (for animations)
   */
  style?: React.CSSProperties;

  /**
   * Custom active color for the toggle button (e.g., orange for master effects)
   */
  activeColor?: string;
}

/**
 * EffectSlot - A draggable effect slot with toggle, name, and settings
 * Used in the effects panel stack for both track and master effects
 */
export const EffectSlot: React.FC<EffectSlotProps> = ({
  effectName = 'Effect name',
  enabled = true,
  onToggle,
  onSelectEffect,
  onShowSettings,
  onRemoveEffect,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  className = '',
  style: customStyle,
  activeColor,
}) => {
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleSettingsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right + 4, y: rect.top });
    setMenuOpen(true);
    onShowSettings?.();
  };

  const themeStyle = {
    '--es-drag-handle-color': theme.foreground.icon.primary,
    '--es-toggle-bg': theme.background.control.button.secondary.idle,
    '--es-toggle-hover-bg': theme.background.control.button.secondary.hover,
    '--es-toggle-active-bg': theme.background.control.button.primary.active,
    '--es-toggle-icon-color': theme.foreground.icon.primary,
    '--es-toggle-active-icon-color': theme.foreground.text.inverse,
    '--es-input-bg': theme.background.control.input.idle,
    '--es-input-border': theme.border.input.idle,
    '--es-input-hover-border': theme.border.input.hover,
    '--es-text-color': theme.foreground.text.primary,
    '--es-focus-border': theme.border.focus,
  } as React.CSSProperties;

  return (
    <div
      className={`effect-slot ${isDragging ? 'effect-slot--dragging' : ''} ${className}`}
      style={{ ...themeStyle, ...customStyle }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <div className="effect-slot__drag-handle">
        <Icon name="gripper" size={16} />
      </div>

      <div className="effect-slot__content">
        {/* Toggle button */}
        <ToggleButton
          icon="power"
          iconSize={14}
          active={enabled}
          onClick={() => onToggle?.(!enabled)}
          ariaLabel={enabled ? 'Disable effect' : 'Enable effect'}
          size={24}
          activeColor={activeColor}
        />

        {/* Effect name field */}
        <button
          className="effect-slot__name-field"
          onClick={onSelectEffect}
          aria-label="Select effect"
        >
          <span className="effect-slot__name-text">{effectName}</span>
        </button>

        {/* Settings dropdown button */}
        <button
          className="effect-slot__settings-button"
          onClick={handleSettingsClick}
          aria-label="Effect settings"
        >
          <Icon name="caret-down" size={16} />
        </button>
      </div>

      {/* Context menu */}
      <ContextMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        x={menuPosition.x}
        y={menuPosition.y}
      >
        <ContextMenuItem
          label="Remove effect"
          onClick={() => {
            onRemoveEffect?.();
            setMenuOpen(false);
          }}
        />
        <ContextMenuItem label="Audacity" hasSubmenu>
          <ContextMenuItem label="Amplify" onClick={() => console.log('Amplify')} />
          <ContextMenuItem label="Echo" onClick={() => console.log('Echo')} />
          <ContextMenuItem label="Normalize" onClick={() => console.log('Normalize')} />
        </ContextMenuItem>
        <ContextMenuItem label="AudioUnit" hasSubmenu>
          <ContextMenuItem label="AU Reverb" onClick={() => console.log('AU Reverb')} />
          <ContextMenuItem label="AU Delay" onClick={() => console.log('AU Delay')} />
        </ContextMenuItem>
        <ContextMenuItem label="VST3" hasSubmenu>
          <ContextMenuItem label="VST Compressor" onClick={() => console.log('VST Compressor')} />
          <ContextMenuItem label="VST EQ" onClick={() => console.log('VST EQ')} />
        </ContextMenuItem>
      </ContextMenu>
    </div>
  );
};

export default EffectSlot;

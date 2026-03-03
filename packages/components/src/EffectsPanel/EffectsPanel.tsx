import React, { ReactNode, useState } from 'react';
import { SidePanel } from '../SidePanel';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { useTheme } from '../ThemeProvider';
import { useTabGroup } from '../hooks/useTabGroup';
import { EffectsPanelHeader } from './EffectsPanelHeader';
import { EffectsStackHeader } from './EffectsStackHeader';
import { EffectSlot } from './EffectSlot';
import './EffectsPanel.css';

export interface Effect {
  id: string;
  name: string;
  enabled: boolean;
}

export interface EffectSlotProps {
  /** Effect data */
  effect?: Effect;
  /** Whether this is a master effect slot */
  isMaster?: boolean;
  /** Called when effect enabled state changes */
  onToggle?: (enabled: boolean) => void;
  /** Called when effect is selected from dropdown */
  onEffectChange?: (effectId: string) => void;
  /** Called when effect settings should be shown */
  onShowSettings?: () => void;
}

export interface EffectsTrackSectionProps {
  /** Track name */
  trackName: string;
  /** Track effects */
  effects: Effect[];
  /** Whether all effects are enabled */
  allEnabled: boolean;
  /** Called when track effects are toggled */
  onToggleAll?: (enabled: boolean) => void;
  /** Called when effect enabled state changes */
  onEffectToggle?: (effectIndex: number, enabled: boolean) => void;
  /** Called when effect is changed */
  onEffectChange?: (effectIndex: number, effectId: string) => void;
  /** Called when effects are reordered */
  onEffectsReorder?: (fromIndex: number, toIndex: number) => void;
  /** Called when "Add effect" is clicked */
  onAddEffect?: (event: React.MouseEvent) => void;
  /** Called when track context menu is clicked */
  onContextMenu?: (event: React.MouseEvent) => void;
  /** Called when effect is removed */
  onRemoveEffect?: (effectIndex: number) => void;
  /** Called when effect is replaced with a different effect */
  onReplaceEffect?: (effectIndex: number, effectName: string) => void;
}

export interface EffectsMasterSectionProps {
  /** Master effects */
  effects: Effect[];
  /** Whether all master effects are enabled */
  allEnabled: boolean;
  /** Called when master effects are toggled */
  onToggleAll?: (enabled: boolean) => void;
  /** Called when effect enabled state changes */
  onEffectToggle?: (effectIndex: number, enabled: boolean) => void;
  /** Called when effect is changed */
  onEffectChange?: (effectIndex: number, effectId: string) => void;
  /** Called when effects are reordered */
  onEffectsReorder?: (fromIndex: number, toIndex: number) => void;
  /** Called when "Add master effect" is clicked */
  onAddEffect?: (event: React.MouseEvent) => void;
  /** Called when master context menu is clicked */
  onContextMenu?: (event: React.MouseEvent) => void;
  /** Called when effect is removed */
  onRemoveEffect?: (effectIndex: number) => void;
  /** Called when effect is replaced with a different effect */
  onReplaceEffect?: (effectIndex: number, effectName: string) => void;
}

export interface EffectsPanelProps {
  /** Whether the panel is visible */
  isOpen?: boolean;
  /** Track section props */
  trackSection?: EffectsTrackSectionProps;
  /** Master section props */
  masterSection?: EffectsMasterSectionProps;
  /** Whether the panel is resizable */
  resizable?: boolean;
  /** Minimum width when resizing (px) */
  minWidth?: number;
  /** Maximum width when resizing (px) */
  maxWidth?: number;
  /** Called when panel is resized */
  onResize?: (width: number) => void;
  /** Called when panel is closed */
  onClose?: () => void;
  /** Called when Tab is pressed on the panel container — allows parent to redirect focus */
  onTabOut?: () => void;
  /** Additional CSS class */
  className?: string;
  /** Positioning mode - 'sidebar' for static left panel, 'overlay' for absolute positioned overlay */
  mode?: 'sidebar' | 'overlay';
  /** Position for overlay mode (left offset in px) */
  left?: number;
  /** Position for overlay mode (top offset in px) */
  top?: number;
  /** Width for overlay mode (px) */
  width?: number;
  /** Height for overlay mode (px) */
  height?: number;
}

/**
 * Effect Slot Wrapper Component
 * Adapts the new EffectSlot component to the panel's interface
 */
const EffectSlotWrapper: React.FC<EffectSlotProps> = ({
  effect,
  isMaster = false,
  onToggle,
  onEffectChange,
  onShowSettings,
}) => {
  return (
    <EffectSlot
      effectName={effect?.name || (isMaster ? 'Master effect name' : 'Effect name')}
      enabled={effect?.enabled ?? true}
      onToggle={onToggle}
      onSelectEffect={onEffectChange ? () => onEffectChange('') : undefined}
      onShowSettings={onShowSettings}
    />
  );
};

/**
 * Track Effects Section
 */
const TrackEffectsSection: React.FC<EffectsTrackSectionProps & { isNavigatingInPanel?: boolean }> = ({
  trackName,
  effects,
  allEnabled,
  onToggleAll,
  onEffectToggle,
  onEffectChange,
  onEffectsReorder,
  onAddEffect,
  onContextMenu,
  onRemoveEffect,
  onReplaceEffect,
  isNavigatingInPanel = false,
}) => {
  const { theme } = useTheme();
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isNavigatingInEffectStack, setIsNavigatingInEffectStack] = React.useState(false);
  const effectStackRef = React.useRef<HTMLDivElement>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder immediately during drag
    onEffectsReorder?.(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Handle keyboard navigation for effect stack
  const handleEffectStackKeyDown = (e: React.KeyboardEvent) => {
    if (!effectStackRef.current) return;

    const isStackFocused = document.activeElement === effectStackRef.current;

    // When focused on stack itself (not navigating inside)
    if (!isNavigatingInEffectStack && isStackFocused) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        // Enter the stack - first set the state, then focus will be set by useEffect
        setIsNavigatingInEffectStack(true);

        // Use setTimeout to ensure the useEffect runs first and sets tabIndex to 0
        setTimeout(() => {
          // First, try to find the drag handle in the first effect slot
          const firstSlot = effectStackRef.current?.querySelector('.effect-slot');
          const dragHandle = firstSlot?.querySelector<HTMLElement>('.effect-slot__drag-handle');

          if (dragHandle) {
            dragHandle.focus();
          } else {
            // Fallback to first button if drag handle not found
            const focusableElements = effectStackRef.current?.querySelectorAll<HTMLElement>(
              'button, input, select'
            );
            if (focusableElements && focusableElements.length > 0) {
              focusableElements[0].focus();
            }
          }
        }, 0);
        return;
      }
    }
    // When navigating inside the stack
    else if (isNavigatingInEffectStack) {
      // Arrow key navigation - move between effects like a grid
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentSlot = (document.activeElement as HTMLElement).closest('.effect-slot');
        const allSlots = effectStackRef.current.querySelectorAll('.effect-slot');
        const slotIndex = Array.from(allSlots).indexOf(currentSlot as Element);

        if (slotIndex === -1) return;

        // Move to the same button position in the adjacent effect
        let targetSlotIndex = e.key === 'ArrowDown' ? slotIndex + 1 : slotIndex - 1;

        // Wrap around: if going down past the end, go to first; if going up before start, go to last
        if (targetSlotIndex >= allSlots.length) {
          targetSlotIndex = 0;
        } else if (targetSlotIndex < 0) {
          targetSlotIndex = allSlots.length - 1;
        }

        const targetSlot = allSlots[targetSlotIndex];
        const targetButtons = targetSlot.querySelectorAll<HTMLElement>(
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]'
        );

        // Find the button at the same position within the slot
        const buttonsInCurrentSlot = currentSlot?.querySelectorAll<HTMLElement>(
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]'
        );
        const buttonIndexInSlot = buttonsInCurrentSlot ?
          Array.from(buttonsInCurrentSlot).indexOf(document.activeElement as HTMLElement) : 0;

        // Focus the same button position in the target slot, or the first button if it doesn't exist
        if (targetButtons[buttonIndexInSlot]) {
          targetButtons[buttonIndexInSlot].focus();
        } else if (targetButtons.length > 0) {
          targetButtons[0].focus();
        }

        return;
      }

      // Arrow Left/Right navigates between buttons within an effect
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentSlot = (document.activeElement as HTMLElement).closest('.effect-slot');
        if (!currentSlot) return;

        const buttonsInSlot = currentSlot.querySelectorAll<HTMLElement>(
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]'
        );
        const buttonArray = Array.from(buttonsInSlot);
        const currentIndex = buttonArray.indexOf(document.activeElement as HTMLElement);

        if (currentIndex === -1) return;

        let newIndex = e.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;

        // Wrap around: if going right past the end, go to first; if going left before start, go to last
        if (newIndex >= buttonArray.length) {
          newIndex = 0;
        } else if (newIndex < 0) {
          newIndex = buttonArray.length - 1;
        }

        buttonArray[newIndex].focus();

        return;
      }

      // Tab exits the effect stack and moves to next element
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        // Exit the stack
        setIsNavigatingInEffectStack(false);

        // Find the "Add effect" button after this stack
        const parentSection = effectStackRef.current.closest('.effects-panel__track-section, .effects-panel__master-section');
        const addButton = parentSection?.querySelector<HTMLElement>('.effects-panel__add-button');
        if (addButton) {
          addButton.focus();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // Exit the stack - return focus to stack itself
        setIsNavigatingInEffectStack(false);
        effectStackRef.current.focus();
        return;
      }
    }
  };

  const handleEffectStackFocus = () => {
    // When stack receives focus from outside, ensure we're not in navigation mode
    if (document.activeElement === effectStackRef.current) {
      setIsNavigatingInEffectStack(false);
    }
  };

  const handleEffectStackBlur = (e: React.FocusEvent) => {
    // If focus is leaving the stack entirely, reset navigation state
    if (!effectStackRef.current?.contains(e.relatedTarget as Node)) {
      setIsNavigatingInEffectStack(false);
    }
  };

  // Dynamically set tabIndex on focusable elements inside effect stack
  React.useEffect(() => {
    if (!effectStackRef.current) return;

    const focusableElements = effectStackRef.current.querySelectorAll<HTMLElement>(
      'button, input, select, [role="button"]'
    );

    focusableElements.forEach((element) => {
      element.tabIndex = isNavigatingInEffectStack ? 0 : -1;
    });
  }, [isNavigatingInEffectStack, effects]);

  return (
    <div className="effects-panel__track-section">
      {/* Header */}
      <EffectsStackHeader
        name={trackName}
        allEnabled={allEnabled}
        onToggleAll={onToggleAll}
        onContextMenu={onContextMenu}
      />

      {/* Effect stack - only show if there are effects */}
      {effects.length > 0 && (
        <div
          ref={effectStackRef}
          className="effects-panel__effect-stack"
          tabIndex={isNavigatingInPanel ? 0 : -1}
          onKeyDown={handleEffectStackKeyDown}
          onFocus={handleEffectStackFocus}
          onBlur={handleEffectStackBlur}
          role="group"
          aria-label="Effect stack"
        >
          {effects.map((effect, index) => (
            <EffectSlot
              key={effect.id}
              effectName={effect?.name || 'Effect name'}
              enabled={effect?.enabled ?? true}
              isDragging={draggedIndex === index}
              onToggle={(enabled) => onEffectToggle?.(index, enabled)}
              onSelectEffect={onEffectChange ? () => onEffectChange?.(index, '') : undefined}
              onRemoveEffect={() => onRemoveEffect?.(index)}
              onReplaceEffect={(effectName) => onReplaceEffect?.(index, effectName)}
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}

      {/* Add effect button */}
      <div className="effects-panel__add-button-container">
        <Button
          variant="secondary"
          size="default"
          onClick={(e) => e && onAddEffect?.(e)}
          className="effects-panel__add-button"
        >
          Add effect
        </Button>
      </div>
    </div>
  );
};

/**
 * Master Effects Section
 */
const MasterEffectsSection: React.FC<EffectsMasterSectionProps & { isNavigatingInPanel?: boolean }> = ({
  effects,
  allEnabled,
  onToggleAll,
  onEffectToggle,
  onEffectChange,
  onEffectsReorder,
  onAddEffect,
  onContextMenu,
  onRemoveEffect,
  onReplaceEffect,
  isNavigatingInPanel = false,
}) => {
  const { theme } = useTheme();
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isNavigatingInEffectStack, setIsNavigatingInEffectStack] = React.useState(false);
  const effectStackRef = React.useRef<HTMLDivElement>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder immediately during drag
    onEffectsReorder?.(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Handle keyboard navigation for effect stack
  const handleEffectStackKeyDown = (e: React.KeyboardEvent) => {
    if (!effectStackRef.current) return;

    const isStackFocused = document.activeElement === effectStackRef.current;

    // When focused on stack itself (not navigating inside)
    if (!isNavigatingInEffectStack && isStackFocused) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        // Enter the stack - first set the state, then focus will be set by useEffect
        setIsNavigatingInEffectStack(true);

        // Use setTimeout to ensure the useEffect runs first and sets tabIndex to 0
        setTimeout(() => {
          // First, try to find the drag handle in the first effect slot
          const firstSlot = effectStackRef.current?.querySelector('.effect-slot');
          const dragHandle = firstSlot?.querySelector<HTMLElement>('.effect-slot__drag-handle');

          if (dragHandle) {
            dragHandle.focus();
          } else {
            // Fallback to first button if drag handle not found
            const focusableElements = effectStackRef.current?.querySelectorAll<HTMLElement>(
              'button, input, select'
            );
            if (focusableElements && focusableElements.length > 0) {
              focusableElements[0].focus();
            }
          }
        }, 0);
        return;
      }
    }
    // When navigating inside the stack
    else if (isNavigatingInEffectStack) {
      // Arrow key navigation - move between effects like a grid
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentSlot = (document.activeElement as HTMLElement).closest('.effect-slot');
        const allSlots = effectStackRef.current.querySelectorAll('.effect-slot');
        const slotIndex = Array.from(allSlots).indexOf(currentSlot as Element);

        if (slotIndex === -1) return;

        // Move to the same button position in the adjacent effect
        let targetSlotIndex = e.key === 'ArrowDown' ? slotIndex + 1 : slotIndex - 1;

        // Wrap around: if going down past the end, go to first; if going up before start, go to last
        if (targetSlotIndex >= allSlots.length) {
          targetSlotIndex = 0;
        } else if (targetSlotIndex < 0) {
          targetSlotIndex = allSlots.length - 1;
        }

        const targetSlot = allSlots[targetSlotIndex];
        const targetButtons = targetSlot.querySelectorAll<HTMLElement>(
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]'
        );

        // Find the button at the same position within the slot
        const buttonsInCurrentSlot = currentSlot?.querySelectorAll<HTMLElement>(
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]'
        );
        const buttonIndexInSlot = buttonsInCurrentSlot ?
          Array.from(buttonsInCurrentSlot).indexOf(document.activeElement as HTMLElement) : 0;

        // Focus the same button position in the target slot, or the first button if it doesn't exist
        if (targetButtons[buttonIndexInSlot]) {
          targetButtons[buttonIndexInSlot].focus();
        } else if (targetButtons.length > 0) {
          targetButtons[0].focus();
        }

        return;
      }

      // Arrow Left/Right navigates between buttons within an effect
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentSlot = (document.activeElement as HTMLElement).closest('.effect-slot');
        if (!currentSlot) return;

        const buttonsInSlot = currentSlot.querySelectorAll<HTMLElement>(
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]'
        );
        const buttonArray = Array.from(buttonsInSlot);
        const currentIndex = buttonArray.indexOf(document.activeElement as HTMLElement);

        if (currentIndex === -1) return;

        let newIndex = e.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;

        // Wrap around: if going right past the end, go to first; if going left before start, go to last
        if (newIndex >= buttonArray.length) {
          newIndex = 0;
        } else if (newIndex < 0) {
          newIndex = buttonArray.length - 1;
        }

        buttonArray[newIndex].focus();

        return;
      }

      // Tab exits the effect stack and moves to next element
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        // Exit the stack
        setIsNavigatingInEffectStack(false);

        // Find the "Add effect" button after this stack
        const parentSection = effectStackRef.current.closest('.effects-panel__track-section, .effects-panel__master-section');
        const addButton = parentSection?.querySelector<HTMLElement>('.effects-panel__add-button');
        if (addButton) {
          addButton.focus();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // Exit the stack - return focus to stack itself
        setIsNavigatingInEffectStack(false);
        effectStackRef.current.focus();
        return;
      }
    }
  };

  const handleEffectStackFocus = () => {
    // When stack receives focus from outside, ensure we're not in navigation mode
    if (document.activeElement === effectStackRef.current) {
      setIsNavigatingInEffectStack(false);
    }
  };

  const handleEffectStackBlur = (e: React.FocusEvent) => {
    // If focus is leaving the stack entirely, reset navigation state
    if (!effectStackRef.current?.contains(e.relatedTarget as Node)) {
      setIsNavigatingInEffectStack(false);
    }
  };

  // Dynamically set tabIndex on focusable elements inside effect stack
  React.useEffect(() => {
    if (!effectStackRef.current) return;

    const focusableElements = effectStackRef.current.querySelectorAll<HTMLElement>(
      'button, input, select, [role="button"]'
    );

    focusableElements.forEach((element) => {
      element.tabIndex = isNavigatingInEffectStack ? 0 : -1;
    });
  }, [isNavigatingInEffectStack, effects]);

  return (
    <div className="effects-panel__master-section">
      {/* Header */}
      <EffectsStackHeader
        name="Master track"
        allEnabled={allEnabled}
        onToggleAll={onToggleAll}
        onContextMenu={onContextMenu}
        isMaster
      />

      {/* Effect stack - only show if there are effects */}
      {effects.length > 0 && (
        <div
          ref={effectStackRef}
          className="effects-panel__effect-stack"
          tabIndex={isNavigatingInPanel ? 0 : -1}
          onKeyDown={handleEffectStackKeyDown}
          onFocus={handleEffectStackFocus}
          onBlur={handleEffectStackBlur}
          role="group"
          aria-label="Master effect stack"
        >
          {effects.map((effect, index) => (
            <EffectSlot
              key={effect.id}
              effectName={effect?.name || 'Master effect name'}
              enabled={effect?.enabled ?? true}
              isDragging={draggedIndex === index}
              onToggle={(enabled) => onEffectToggle?.(index, enabled)}
              onSelectEffect={onEffectChange ? () => onEffectChange?.(index, '') : undefined}
              onRemoveEffect={() => onRemoveEffect?.(index)}
              onReplaceEffect={(effectName) => onReplaceEffect?.(index, effectName)}
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDragEnd={handleDragEnd}
              activeColor={theme.accent.secondary}
            />
          ))}
        </div>
      )}

      {/* Add master effect button */}
      <div className="effects-panel__add-button-container">
        <Button
          variant="secondary"
          size="default"
          onClick={(e) => e && onAddEffect?.(e)}
          className="effects-panel__add-button"
        >
          Add master effect
        </Button>
      </div>
    </div>
  );
};

/**
 * Effects Panel - Sidebar panel for managing track and master effects
 * Can be used as a static sidebar or as an overlay that appears next to track controls
 */
export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  isOpen = true,
  trackSection,
  masterSection,
  resizable = false,
  minWidth = 240,
  maxWidth = 400,
  onResize,
  onClose,
  onTabOut,
  className = '',
  mode = 'sidebar',
  left = 0,
  top = 0,
  width,
  height,
}) => {
  const { theme } = useTheme();
  const [masterSectionHeight, setMasterSectionHeight] = React.useState(230); // Default master section height
  const [isResizingVertical, setIsResizingVertical] = React.useState(false);
  const [isNavigatingInside, setIsNavigatingInside] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const itemRefsArray = React.useRef<(HTMLElement | null)[]>([null]);

  // Use tab group for proper integration with app-wide tab navigation
  // baseTabIndex auto-resolved from profile's tabOrder['effects-panel']
  const tabGroup = useTabGroup({
    groupId: 'effects-panel',
    itemIndex: 0,  // Panel is a single item in the tab group
    totalItems: 1,
    itemRefs: itemRefsArray,
  });

  const style = {
    '--ep-bg': theme.background.surface.default,
    '--ep-header-bg': theme.background.surface.default,
    '--ep-header-border': theme.border.default,
    '--ep-section-bg': theme.background.surface.default,
    '--ep-section-border': theme.border.default,
    '--ep-stack-bg': theme.background.surface.inset,
    '--ep-text-primary': theme.foreground.text.primary,
    '--ep-text-secondary': theme.foreground.text.secondary,
    '--ep-icon-primary': theme.foreground.icon.primary,
    '--ep-button-bg': theme.background.control.button.secondary.idle,
    '--ep-button-hover-bg': theme.background.control.button.secondary.hover,
    '--ep-button-active-bg': theme.background.control.button.primary.active,
    '--ep-toggle-active-bg': theme.background.control.button.primary.active,
    '--ep-toggle-icon-color': theme.foreground.text.inverse,
    '--ep-input-bg': theme.background.control.input.idle,
    '--ep-input-border': theme.border.input.idle,
  } as React.CSSProperties;

  // Handle vertical resize
  const handleVerticalResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingVertical(true);
  };

  React.useEffect(() => {
    if (!isResizingVertical) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!contentRef.current) return;

      const contentRect = contentRef.current.getBoundingClientRect();
      const newHeight = contentRect.bottom - e.clientY;

      // Clamp height between min and max (min: 140px for master, min: 140px for track)
      const clampedHeight = Math.max(140, Math.min(contentRect.height - 140, newHeight));
      setMasterSectionHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizingVertical(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingVertical]);

  // Handle keyboard navigation - integrate with tab group and add Enter/Escape/Tab handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!panelRef.current) return;

    const isPanelFocused = document.activeElement === panelRef.current;

    // When focused on panel itself (not navigating inside)
    if (!isNavigatingInside && isPanelFocused) {
      // If focus is invisible (from E shortcut), first Tab reveals the outline
      if (e.key === 'Tab' && (e.currentTarget as HTMLElement).hasAttribute('data-focus-mouse')) {
        e.preventDefault();
        (e.currentTarget as HTMLElement).removeAttribute('data-focus-mouse');
        return;
      }

      // Tab on the panel container — let parent redirect focus
      if (e.key === 'Tab' && !e.shiftKey && onTabOut) {
        e.preventDefault();
        onTabOut();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        // Enter the panel - first set the state, then focus will be set by useEffect
        setIsNavigatingInside(true);

        // Use setTimeout to ensure the useEffect runs first and sets tabIndex to 0
        setTimeout(() => {
          const focusableElements = panelRef.current?.querySelectorAll<HTMLElement>(
            'button, input, select, [tabindex="0"]'
          );
          if (focusableElements && focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }, 0);
        return;
      }
    }
    // When navigating inside the panel
    else if (isNavigatingInside) {
      // Handle Tab key for wrapping
      if (e.key === 'Tab') {
        e.preventDefault();
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]'
        );
        const focusableArray = Array.from(focusableElements);
        const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement);

        if (e.shiftKey) {
          // Shift+Tab - move backward
          if (currentIndex <= 0) {
            // Wrap to last element
            focusableArray[focusableArray.length - 1]?.focus();
          } else {
            focusableArray[currentIndex - 1]?.focus();
          }
        } else {
          // Tab - move forward
          if (currentIndex >= focusableArray.length - 1) {
            // Wrap to first element
            focusableArray[0]?.focus();
          } else {
            focusableArray[currentIndex + 1]?.focus();
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // Exit the panel - return focus to panel itself
        setIsNavigatingInside(false);
        panelRef.current.focus();
        return;
      }
    }

    // Let the tab group handle other keyboard events (arrows, etc.)
    tabGroup.onKeyDown?.(e);
  };

  const handleFocus = (e: React.FocusEvent) => {
    // When panel container receives focus from outside, ensure we're not in navigation mode
    if (document.activeElement === panelRef.current) {
      setIsNavigatingInside(false);
    }
    // Don't automatically set isNavigatingInside when a child gets focus
    // Only Enter key should enter navigation mode
    // Call tab group's focus handler
    tabGroup.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // If focus is leaving the panel entirely, reset navigation state
    if (!panelRef.current?.contains(e.relatedTarget as Node)) {
      setIsNavigatingInside(false);
    }
    // Call tab group's blur handler
    tabGroup.onBlur?.(e);
  };

  // Manage tabIndex on all focusable elements inside the panel
  // When NOT navigating inside, all children should be removed from tab order
  React.useEffect(() => {
    if (!panelRef.current) return;

    const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
      'button, input, select, [role="button"], [tabindex="0"]'
    );

    focusableElements.forEach((element) => {
      // Skip the panel container itself
      if (element === panelRef.current) return;

      // Skip effect stack containers themselves - they need to remain focusable
      if (element.classList.contains('effects-panel__effect-stack')) return;

      // Skip elements inside effect stacks - they have their own tabIndex management
      const isInsideEffectStack = element.closest('.effects-panel__effect-stack');
      if (isInsideEffectStack) return;

      // When navigating inside, restore tabIndex to 0 (or leave as-is if already set)
      // When not navigating inside, remove from tab order
      if (isNavigatingInside) {
        // Only set to 0 if it's currently -1 (was removed from tab order)
        if (element.tabIndex === -1) {
          element.tabIndex = 0;
        }
      } else {
        // Remove all children from tab order when not navigating inside
        element.tabIndex = -1;
      }
    });
  }, [isNavigatingInside, trackSection, masterSection]);

  // Don't render if not open
  if (!isOpen) return null;

  const content = (
    <>
      {/* Header */}
      <EffectsPanelHeader
        title="Effects"
        onClose={onClose}
      />

      {/* Body container */}
      <div ref={contentRef} className="effects-panel__content">
        {/* Track Effects Section */}
        {trackSection && (
          <div className="effects-panel__track-section" style={{ flex: 1, minHeight: 0 }}>
            <TrackEffectsSection {...trackSection} isNavigatingInPanel={isNavigatingInside} />
          </div>
        )}

        {/* Vertical resize handle */}
        {trackSection && masterSection && (
          <div
            className={`effects-panel__vertical-resize-handle ${isResizingVertical ? 'effects-panel__vertical-resize-handle--active' : ''}`}
            onMouseDown={handleVerticalResizeStart}
          />
        )}

        {/* Master Effects Section */}
        {masterSection && (
          <div className="effects-panel__master-section" style={{ height: masterSectionHeight, minHeight: 140, flexShrink: 0 }}>
            <MasterEffectsSection {...masterSection} isNavigatingInPanel={isNavigatingInside} />
          </div>
        )}
      </div>
    </>
  );

  // Set the panel ref in the refs array for tab group
  React.useEffect(() => {
    if (panelRef.current) {
      itemRefsArray.current[0] = panelRef.current;
    }
  }, []);

  // On mount: give the panel invisible DOM focus (Tab reveals the focus ring)
  // useLayoutEffect runs synchronously after DOM commit, before paint or other handlers
  React.useLayoutEffect(() => {
    if (panelRef.current) {
      panelRef.current.setAttribute('data-focus-mouse', '');
      panelRef.current.focus();
    }
  }, []);

  // Overlay mode - absolute positioned panel
  if (mode === 'overlay') {
    return (
      <div
        ref={panelRef}
        className={`effects-panel effects-panel--overlay effects-panel__focusable-container ${className}`}
        style={{
          ...style,
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: width ? `${width}px` : `${minWidth}px`,
          height: height ? `${height}px` : 'auto',
          zIndex: 1000,
        }}
        tabIndex={tabGroup.tabIndex}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        role="region"
        aria-label="Effects panel"
      >
        {content}
      </div>
    );
  }

  // Sidebar mode - uses SidePanel wrapper
  return (
    <SidePanel
      position="left"
      width={240}
      resizable={resizable}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResize={onResize}
      className={`effects-panel ${className}`}
      style={style}
    >
      <div
        ref={panelRef}
        tabIndex={tabGroup.tabIndex}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        role="region"
        aria-label="Effects panel"
        className="effects-panel__focusable-container"
      >
        {content}
      </div>
    </SidePanel>
  );
};

export default EffectsPanel;

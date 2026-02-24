import { useState, useRef, useCallback, useEffect } from 'react';

// --- Type definitions for each context menu ---

export interface ClipContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  clipId: number;
  trackIndex: number;
  openedViaKeyboard?: boolean;
}

export interface TrackContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  trackIndex: number;
  openedViaKeyboard?: boolean;
}

export interface TimelineRulerContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export interface EffectsPanelState {
  isOpen: boolean;
  trackIndex: number;
  left: number;
  top: number;
  height: number;
  width: number;
}

export interface EffectDialogState {
  isOpen: boolean;
  effectId: string;
  effectName: string;
  trackIndex?: number; // undefined means master effect
  effectIndex: number;
}

export interface EffectContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export interface EffectSelectorMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  trackIndex?: number; // undefined means master effect
}

export interface TimeSelectionContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

// --- Return type ---

export interface UseContextMenuStateReturn {
  // Clip context menu
  clipContextMenu: ClipContextMenuState | null;
  setClipContextMenu: React.Dispatch<React.SetStateAction<ClipContextMenuState | null>>;

  // Track context menu
  trackContextMenu: TrackContextMenuState | null;
  setTrackContextMenu: React.Dispatch<React.SetStateAction<TrackContextMenuState | null>>;

  // Timeline ruler context menu
  timelineRulerContextMenu: TimelineRulerContextMenuState | null;
  setTimelineRulerContextMenu: React.Dispatch<React.SetStateAction<TimelineRulerContextMenuState | null>>;

  // Effects panel
  effectsPanel: EffectsPanelState | null;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;

  // Effect dialog
  effectDialog: EffectDialogState | null;
  setEffectDialog: React.Dispatch<React.SetStateAction<EffectDialogState | null>>;

  // Effect dialog context menu
  effectContextMenu: EffectContextMenuState;
  setEffectContextMenu: React.Dispatch<React.SetStateAction<EffectContextMenuState>>;

  // Effect selector menu
  effectSelectorMenu: EffectSelectorMenuState | null;
  setEffectSelectorMenu: React.Dispatch<React.SetStateAction<EffectSelectorMenuState | null>>;

  // Time selection context menu
  timeSelectionContextMenu: TimeSelectionContextMenuState | null;
  setTimeSelectionContextMenu: React.Dispatch<React.SetStateAction<TimeSelectionContextMenuState | null>>;

  // Refs
  contextMenuClosedTimeRef: React.MutableRefObject<number>;
  timeSelectionMenuRef: React.RefObject<HTMLDivElement | null>;

  // Global mousedown handler (exposed for testing/external use if needed)
  handleGlobalMouseDown: (e: MouseEvent) => void;
}

/**
 * Hook for managing all context menu state in the application.
 *
 * Manages state for:
 * - Clip context menu
 * - Track context menu
 * - Timeline ruler context menu
 * - Effects panel
 * - Effect dialog
 * - Effect dialog context menu
 * - Effect selector menu
 * - Time selection context menu
 *
 * Also sets up a global mousedown listener to close the time selection
 * context menu when clicking outside of it (excluding right-clicks).
 */
export function useContextMenuState(): UseContextMenuStateReturn {
  // Clip context menu state
  const [clipContextMenu, setClipContextMenu] = useState<ClipContextMenuState | null>(null);

  // Track context menu state
  const [trackContextMenu, setTrackContextMenu] = useState<TrackContextMenuState | null>(null);

  // Timeline ruler context menu state
  const [timelineRulerContextMenu, setTimelineRulerContextMenu] = useState<TimelineRulerContextMenuState | null>(null);

  // Effects panel state
  const [effectsPanel, setEffectsPanel] = useState<EffectsPanelState | null>(null);

  // Effect dialog state
  const [effectDialog, setEffectDialog] = useState<EffectDialogState | null>(null);

  // Effect dialog context menu state
  const [effectContextMenu, setEffectContextMenu] = useState<EffectContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  // Effect selector menu state
  const [effectSelectorMenu, setEffectSelectorMenu] = useState<EffectSelectorMenuState | null>(null);

  // Time selection context menu state
  const [timeSelectionContextMenu, setTimeSelectionContextMenu] = useState<TimeSelectionContextMenuState | null>(null);

  // Ref to prevent menu from re-opening immediately after closing
  const contextMenuClosedTimeRef = useRef<number>(0);

  // Ref to track the menu element so we can exclude it from click-outside detection
  const timeSelectionMenuRef = useRef<HTMLDivElement>(null);

  // Close time selection context menu when clicking anywhere (except right-click or on the menu itself)
  const handleGlobalMouseDown = useCallback((e: MouseEvent) => {
    // Close menu on left-click (button 0) or middle-click (button 1)
    // Don't close on right-click (button 2) as that might open the menu
    // Don't close if clicking on the menu itself (let the menu handle its own clicks)
    if (e.button !== 2 && timeSelectionContextMenu) {
      const target = e.target as Node;
      const menuElement = timeSelectionMenuRef.current;

      // If clicking outside the menu, close it
      if (menuElement && !menuElement.contains(target)) {
        contextMenuClosedTimeRef.current = Date.now();
        setTimeSelectionContextMenu(null);
      }
    }
  }, [timeSelectionContextMenu]);

  // Add/remove global mousedown listener
  useEffect(() => {
    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown);
  }, [handleGlobalMouseDown]);

  return {
    clipContextMenu,
    setClipContextMenu,
    trackContextMenu,
    setTrackContextMenu,
    timelineRulerContextMenu,
    setTimelineRulerContextMenu,
    effectsPanel,
    setEffectsPanel,
    effectDialog,
    setEffectDialog,
    effectContextMenu,
    setEffectContextMenu,
    effectSelectorMenu,
    setEffectSelectorMenu,
    timeSelectionContextMenu,
    setTimeSelectionContextMenu,
    contextMenuClosedTimeRef,
    timeSelectionMenuRef,
    handleGlobalMouseDown,
  };
}

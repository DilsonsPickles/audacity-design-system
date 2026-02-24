import { useState, useCallback, useMemo } from 'react';

/**
 * All known dialog IDs in the application.
 * Using a const array for type safety and iteration.
 */
const DIALOG_IDS = [
  'shareDialog',
  'createAccount',
  'syncingDialog',
  'saveToCloudDialog',
  'saveProjectModal',
  'preferencesModal',
  'exportModal',
  'labelEditor',
  'pluginManager',
  'alertDialog',
  'vstOptionsDialog',
  'debugPanel',
  'spectrogramSettings',
  'pluginBrowser',
  'macroManager',
] as const;

export type DialogId = (typeof DIALOG_IDS)[number];

export interface UseDialogStateReturn {
  /** Open a dialog by ID */
  openDialog: (id: string) => void;
  /** Close a dialog by ID */
  closeDialog: (id: string) => void;
  /** Check if a dialog is open by ID */
  isOpen: (id: string) => boolean;

  // Backwards-compatible individual boolean getters and setters
  // Each mirrors the original useState<boolean> pattern from App.tsx

  isShareDialogOpen: boolean;
  setIsShareDialogOpen: (open: boolean) => void;

  isCreateAccountOpen: boolean;
  setIsCreateAccountOpen: (open: boolean) => void;

  isSyncingDialogOpen: boolean;
  setIsSyncingDialogOpen: (open: boolean) => void;

  isSaveToCloudDialogOpen: boolean;
  setIsSaveToCloudDialogOpen: (open: boolean) => void;

  isSaveProjectModalOpen: boolean;
  setIsSaveProjectModalOpen: (open: boolean) => void;

  isPreferencesModalOpen: boolean;
  setIsPreferencesModalOpen: (open: boolean) => void;

  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;

  isLabelEditorOpen: boolean;
  setIsLabelEditorOpen: (open: boolean) => void;

  isPluginManagerOpen: boolean;
  setIsPluginManagerOpen: (open: boolean) => void;

  alertDialogOpen: boolean;
  setAlertDialogOpen: (open: boolean) => void;

  isVSTOptionsDialogOpen: boolean;
  setIsVSTOptionsDialogOpen: (open: boolean) => void;

  isDebugPanelOpen: boolean;
  setIsDebugPanelOpen: (open: boolean) => void;

  isSpectrogramSettingsOpen: boolean;
  setIsSpectrogramSettingsOpen: (open: boolean) => void;

  isPluginBrowserOpen: boolean;
  setIsPluginBrowserOpen: (open: boolean) => void;

  isMacroManagerOpen: boolean;
  setIsMacroManagerOpen: (open: boolean) => void;
}

/**
 * Hook that consolidates all dialog open/close boolean state into a single Set.
 *
 * Instead of ~15 individual `useState<boolean>` calls, this hook uses a single
 * `useState<Set<string>>` to track which dialogs are currently open.
 *
 * Provides both a generic API (`openDialog`, `closeDialog`, `isOpen`) and
 * backwards-compatible individual boolean getters and setters for each known
 * dialog ID.
 *
 * @example
 * ```ts
 * const dialogs = useDialogState();
 *
 * // Generic API
 * dialogs.openDialog('shareDialog');
 * dialogs.isOpen('shareDialog'); // true
 * dialogs.closeDialog('shareDialog');
 *
 * // Backwards-compatible API (same as original useState pairs)
 * dialogs.isShareDialogOpen; // false
 * dialogs.setIsShareDialogOpen(true);
 * dialogs.isShareDialogOpen; // true
 * ```
 */
export function useDialogState(): UseDialogStateReturn {
  const [openDialogs, setOpenDialogs] = useState<Set<string>>(() => new Set());

  const openDialog = useCallback((id: string) => {
    setOpenDialogs((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const closeDialog = useCallback((id: string) => {
    setOpenDialogs((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isOpen = useCallback(
    (id: string): boolean => {
      return openDialogs.has(id);
    },
    [openDialogs],
  );

  // Helper to create a setter function that mirrors React's setState(boolean) pattern
  const makeSetter = useCallback(
    (id: DialogId) => {
      return (open: boolean) => {
        if (open) {
          openDialog(id);
        } else {
          closeDialog(id);
        }
      };
    },
    [openDialog, closeDialog],
  );

  // Build the backwards-compatible individual getters and setters.
  // useMemo ensures setter references are stable across renders (they only
  // change if openDialog/closeDialog change, which are themselves stable).
  const setters = useMemo(
    () => ({
      setIsShareDialogOpen: makeSetter('shareDialog'),
      setIsCreateAccountOpen: makeSetter('createAccount'),
      setIsSyncingDialogOpen: makeSetter('syncingDialog'),
      setIsSaveToCloudDialogOpen: makeSetter('saveToCloudDialog'),
      setIsSaveProjectModalOpen: makeSetter('saveProjectModal'),
      setIsPreferencesModalOpen: makeSetter('preferencesModal'),
      setIsExportModalOpen: makeSetter('exportModal'),
      setIsLabelEditorOpen: makeSetter('labelEditor'),
      setIsPluginManagerOpen: makeSetter('pluginManager'),
      setAlertDialogOpen: makeSetter('alertDialog'),
      setIsVSTOptionsDialogOpen: makeSetter('vstOptionsDialog'),
      setIsDebugPanelOpen: makeSetter('debugPanel'),
      setIsSpectrogramSettingsOpen: makeSetter('spectrogramSettings'),
      setIsPluginBrowserOpen: makeSetter('pluginBrowser'),
      setIsMacroManagerOpen: makeSetter('macroManager'),
    }),
    [makeSetter],
  );

  return {
    // Generic API
    openDialog,
    closeDialog,
    isOpen,

    // Backwards-compatible boolean getters
    isShareDialogOpen: openDialogs.has('shareDialog'),
    isCreateAccountOpen: openDialogs.has('createAccount'),
    isSyncingDialogOpen: openDialogs.has('syncingDialog'),
    isSaveToCloudDialogOpen: openDialogs.has('saveToCloudDialog'),
    isSaveProjectModalOpen: openDialogs.has('saveProjectModal'),
    isPreferencesModalOpen: openDialogs.has('preferencesModal'),
    isExportModalOpen: openDialogs.has('exportModal'),
    isLabelEditorOpen: openDialogs.has('labelEditor'),
    isPluginManagerOpen: openDialogs.has('pluginManager'),
    alertDialogOpen: openDialogs.has('alertDialog'),
    isVSTOptionsDialogOpen: openDialogs.has('vstOptionsDialog'),
    isDebugPanelOpen: openDialogs.has('debugPanel'),
    isSpectrogramSettingsOpen: openDialogs.has('spectrogramSettings'),
    isPluginBrowserOpen: openDialogs.has('pluginBrowser'),
    isMacroManagerOpen: openDialogs.has('macroManager'),

    // Backwards-compatible setters
    ...setters,
  };
}

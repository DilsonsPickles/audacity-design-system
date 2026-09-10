import React from 'react';
import { Button } from '../Button';
import { GhostButton } from '../GhostButton';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { NewMacroDialog, RenameMacroDialog } from '../MacroManager/MacroDialogs';
import type { Macro } from '../MacroManager/macroTypes';
import './MacrosPanel.css';

export interface MacrosPanelProps {
  /** Available macros */
  macros: Macro[];
  /** Called when a new macro is created via the "Create new macro" dialog */
  onCreateMacro?: (name: string) => void;
  /** Called when "Import macro" is clicked */
  onImportMacro?: () => void;
  /** Called when a macro should open in the macro editor (row click, or menu "Edit macro") */
  onEditMacro?: (macroId: string) => void;
  /** Called when a macro is renamed via the rename dialog */
  onRenameMacro?: (macroId: string, newName: string) => void;
  /** Called when a macro is deleted via the row menu */
  onDeleteMacro?: (macroId: string) => void;
  /** Called when "Export macro" is picked from the row menu */
  onExportMacro?: (macroId: string) => void;
  /** Called when a row's play button is clicked (run on current project) */
  onRunOnProject?: (macroId: string) => void;
  /** Called when a row's run-on-files button is clicked (batch mode) */
  onRunOnFiles?: (macroId: string) => void;
  /** Operating system for the nested dialogs' header controls */
  os?: 'macos' | 'windows';
}

interface MacroRowProps {
  macro: Macro;
  onEdit?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onRunOnProject?: () => void;
  onRunOnFiles?: () => void;
}

/** Delay before a single row click opens the editor, so a double-click
 *  (run on project) can cancel it. */
const ROW_DOUBLE_CLICK_WINDOW = 250;

function MacroRow({ macro, onEdit, onRename, onDelete, onExport, onRunOnProject, onRunOnFiles }: MacroRowProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });

  // Single click opens the editor (deferred); double click runs the macro
  // on the current project and swallows the pending single-click edit.
  const clickTimerRef = React.useRef<number | null>(null);
  React.useEffect(() => () => {
    if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
  }, []);
  const handleRowClick = () => {
    if (clickTimerRef.current !== null) return; // second click of a double-click
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      onEdit?.();
    }, ROW_DOUBLE_CLICK_WINDOW);
  };
  const handleRowDoubleClick = () => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onRunOnProject?.();
  };

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right, y: rect.bottom });
    setMenuOpen(true);
  };

  const menuItem = (label: string, action?: () => void) => (
    <ContextMenuItem
      label={label}
      onClick={() => {
        setMenuOpen(false);
        action?.();
      }}
    />
  );

  return (
    <>
      <div
        className="macros-panel__row"
        data-macro-id={macro.id}
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onDoubleClick={handleRowDoubleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit?.();
          }
        }}
      >
        <span className="macros-panel__row-name" title={macro.name}>{macro.name}</span>
        <div
          className="macros-panel__row-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <GhostButton
            icon="play"
            size="medium"
            ariaLabel={`Run ${macro.name} on current project`}
            onClick={onRunOnProject}
          />
          <GhostButton
            icon="file"
            size="medium"
            ariaLabel={`Run ${macro.name} on files`}
            onClick={onRunOnFiles}
          />
          <GhostButton
            icon="menu"
            size="medium"
            ariaLabel={`${macro.name} options`}
            active={menuOpen}
            onClick={handleMenuClick}
          />
        </div>
      </div>

      <ContextMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        x={menuPosition.x}
        y={menuPosition.y}
      >
        {menuItem('Edit macro', onEdit)}
        {menuItem('Rename macro', onRename)}
        {menuItem('Export macro', onExport)}
        {menuItem('Delete macro', onDelete)}
      </ContextMenu>
    </>
  );
}

/**
 * MacrosPanel — dockable macro management panel. Lists macros with
 * per-row run / run-on-files / options actions, plus import and create.
 * Row single-click edits; double-click runs the macro on the project.
 * Editing an individual macro happens in the separate MacroEditorDialog;
 * this panel only reports `onEditMacro`.
 */
export function MacrosPanel({
  macros,
  onCreateMacro,
  onImportMacro,
  onEditMacro,
  onRenameMacro,
  onDeleteMacro,
  onExportMacro,
  onRunOnProject,
  onRunOnFiles,
  os = 'macos',
}: MacrosPanelProps) {
  const [isNewMacroDialogOpen, setIsNewMacroDialogOpen] = React.useState(false);
  const [macroToRename, setMacroToRename] = React.useState<string | null>(null);
  const renamingMacro = macros.find((m) => m.id === macroToRename);

  return (
    <div className="macros-panel" role="region" aria-label="Macros panel">
      <div className="macros-panel__header">
        <span className="macros-panel__title">Macros</span>
      </div>

      <div className="macros-panel__actions">
        <Button variant="secondary" size="small" onClick={onImportMacro}>
          Import macro
        </Button>
        <Button variant="primary" size="small" onClick={() => setIsNewMacroDialogOpen(true)}>
          Create new
        </Button>
      </div>

      <div className="macros-panel__list">
        {macros.length === 0 && (
          <div className="macros-panel__empty">
            No macros yet. Create one to batch-apply a sequence of commands.
          </div>
        )}
        {macros.map((macro) => (
          <MacroRow
            key={macro.id}
            macro={macro}
            onEdit={() => onEditMacro?.(macro.id)}
            onRename={() => setMacroToRename(macro.id)}
            onDelete={() => onDeleteMacro?.(macro.id)}
            onExport={() => onExportMacro?.(macro.id)}
            onRunOnProject={() => onRunOnProject?.(macro.id)}
            onRunOnFiles={() => onRunOnFiles?.(macro.id)}
          />
        ))}
      </div>

      <NewMacroDialog
        isOpen={isNewMacroDialogOpen}
        onClose={() => setIsNewMacroDialogOpen(false)}
        onCreate={(name) => {
          onCreateMacro?.(name);
          setIsNewMacroDialogOpen(false);
        }}
        os={os}
      />

      <RenameMacroDialog
        isOpen={macroToRename !== null}
        onClose={() => setMacroToRename(null)}
        onRename={(newName) => {
          if (macroToRename) {
            onRenameMacro?.(macroToRename, newName);
          }
          setMacroToRename(null);
        }}
        currentName={renamingMacro?.name || ''}
        os={os}
      />
    </div>
  );
}

export default MacrosPanel;

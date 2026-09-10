/**
 * MacroManager - Modal for managing and running macros
 * Based on Figma design: node-id=9182-129953
 */

import React from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { Table } from '../Table/Table';
import { TableHeader } from '../Table/TableHeader';
import { TableHeaderCell } from '../Table/TableHeaderCell';
import { TableBody } from '../Table/TableBody';
import { TableRow } from '../Table/TableRow';
import { TableCell } from '../Table/TableCell';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { SelectCommandDialog, Command } from '../SelectCommandDialog';
import { NewMacroDialog, RenameMacroDialog } from './MacroDialogs';
import type { Macro } from './macroTypes';
import './MacroManager.css';

export type { Macro, MacroStep } from './macroTypes';

export interface MacroManagerProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Available macros
   */
  macros: Macro[];
  /**
   * Currently selected macro ID
   */
  selectedMacroId?: string;
  /**
   * Callback when dialog should close
   */
  onClose?: () => void;
  /**
   * Callback when a macro is selected
   */
  onSelectMacro?: (macroId: string) => void;
  /**
   * Callback when "Add step" is clicked
   */
  onAddStep?: () => void;
  /**
   * Callback when "Run on current project" is clicked
   */
  onRunOnProject?: () => void;
  /**
   * Callback when "Run on files" is clicked
   */
  onRunOnFiles?: () => void;
  /**
   * Callback when "Collapse" is clicked
   */
  onCollapse?: () => void;
  /**
   * Callback when "Add macro" is clicked
   */
  onAddMacro?: (name: string) => void;
  /**
   * Callback when a macro is renamed
   */
  onRenameMacro?: (macroId: string, newName: string) => void;
  /**
   * Callback when a macro is deleted
   */
  onDeleteMacro?: (macroId: string) => void;
  /**
   * Callback when a command is added to a macro
   */
  onAddCommand?: (macroId: string, command: Command) => void;
  /**
   * Available commands for selection
   */
  availableCommands?: Command[];
  /**
   * Operating system for platform-specific header controls
   * @default 'macos'
   */
  os?: 'macos' | 'windows';
}

/**
 * MacroListItem - Internal component for rendering individual macro list items
 */
interface MacroListItemProps {
  name: string;
  isSelected: boolean;
  onClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

function MacroListItem({ name, isSelected, onClick, onRename, onDelete }: MacroListItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenuPosition({
      x: rect.right,
      y: rect.bottom
    });
    setContextMenuOpen(true);
  };

  return (
    <>
      <div
        className={`macro-list-item ${isSelected ? 'macro-list-item--selected' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="macro-list-item__name">{name}</span>
        {isSelected && <div className="macro-list-item__indicator" />}
        {(isHovered || isSelected) && (
          <button
            className="macro-list-item__menu"
            aria-label="Macro options"
            onClick={handleMenuClick}
          >
            <Icon name="menu" size={16} />
          </button>
        )}
      </div>

      <ContextMenu
        isOpen={contextMenuOpen}
        onClose={() => setContextMenuOpen(false)}
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
      >
        <ContextMenuItem
          label="Rename macro"
          onClick={() => {
            setContextMenuOpen(false);
            onRename?.();
          }}
        />
        <ContextMenuItem
          label="Delete macro"
          onClick={() => {
            setContextMenuOpen(false);
            onDelete?.();
          }}
        />
      </ContextMenu>
    </>
  );
}

/**
 * MacroManager component - Modal for managing and running macros
 */
export function MacroManager({
  isOpen,
  macros,
  selectedMacroId,
  onClose,
  onSelectMacro,
  onAddStep,
  onRunOnProject,
  onRunOnFiles,
  onCollapse,
  onAddMacro,
  onRenameMacro,
  onDeleteMacro,
  onAddCommand,
  availableCommands = [],
  os = 'macos',
}: MacroManagerProps) {
  const [isNewMacroDialogOpen, setIsNewMacroDialogOpen] = React.useState(false);
  const [isRenameMacroDialogOpen, setIsRenameMacroDialogOpen] = React.useState(false);
  const [isSelectCommandDialogOpen, setIsSelectCommandDialogOpen] = React.useState(false);
  const [macroToRename, setMacroToRename] = React.useState<string | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = React.useState<number | null>(null);
  const selectedMacro = macros.find(m => m.id === selectedMacroId);
  const renamingMacro = macros.find(m => m.id === macroToRename);

  return (
    <>
    <Dialog
      isOpen={isOpen}
      title="Macro manager"
      onClose={onClose}
      os={os}
      width={880}
      minHeight={600}
      customLayout
      className="macro-manager"
    >
      {/* Main Content */}
      <div className="macro-manager__content">
          {/* Left Sidebar */}
          <div className="macro-manager__sidebar">
            <div className="macro-manager__sidebar-header">
              <span className="macro-manager__sidebar-title">Macros</span>
              <div className="macro-manager__sidebar-actions">
                <button
                  className="icon-button"
                  aria-label="Add macro"
                  onClick={() => setIsNewMacroDialogOpen(true)}
                >
                  <Icon name="plus" size={16} />
                </button>
                <button className="icon-button" aria-label="Import macro">
                  <Icon name="export" size={16} />
                </button>
                <button className="icon-button" aria-label="Export macro">
                  <Icon name="export" size={16} />
                </button>
                <button className="icon-button" aria-label="Delete macro">
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
            <div className="macro-manager__macro-list">
              {macros.map((macro) => (
                <MacroListItem
                  key={macro.id}
                  name={macro.name}
                  isSelected={selectedMacroId === macro.id}
                  onClick={() => onSelectMacro?.(macro.id)}
                  onRename={() => {
                    setMacroToRename(macro.id);
                    setIsRenameMacroDialogOpen(true);
                  }}
                  onDelete={() => {
                    onDeleteMacro?.(macro.id);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="macro-manager__main">
            {/* Macro Header */}
            <div className="macro-manager__header">
              <h2 className="macro-manager__macro-name">{selectedMacro?.name || 'Select a macro'}</h2>
              <div className="macro-manager__header-actions">
                <Button
                  variant="secondary"
                  size="default"
                  onClick={() => setIsSelectCommandDialogOpen(true)}
                  disabled={!selectedMacroId}
                >
                  Add step
                </Button>
                <button className="icon-button" aria-label="Move step up">
                  <Icon name="chevron-left" size={16} />
                </button>
                <button className="icon-button" aria-label="Move step down">
                  <Icon name="chevron-right" size={16} />
                </button>
                <button className="icon-button" aria-label="Edit step">
                  <Icon name="edit" size={16} />
                </button>
                <button className="icon-button" aria-label="Delete step">
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>

            {/* Steps Table */}
            <div className="macro-manager__table-container">
              <Table>
                <TableHeader>
                  <TableHeaderCell width={67} align="left">Step</TableHeaderCell>
                  <TableHeaderCell width={120} align="left">Command</TableHeaderCell>
                  <TableHeaderCell flexGrow align="left">Parameters</TableHeaderCell>
                </TableHeader>

                <TableBody>
                  {selectedMacro?.steps.map((step, index) => (
                    <TableRow
                      key={index}
                      selected={selectedStepIndex === index}
                      onClick={() => setSelectedStepIndex(index)}
                    >
                      <TableCell width={67} align="center">
                        {index + 1}
                      </TableCell>
                      <TableCell width={120}>
                        {step.command}
                      </TableCell>
                      <TableCell flexGrow>
                        <div className="parameter-badge">
                          {step.parameters}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Action Bar */}
            <div className="macro-manager__action-bar">
              <span className="macro-manager__action-label">Run this macro on:</span>
              <div className="macro-manager__action-buttons">
                <Button
                  variant="primary"
                  size="default"
                  icon={<Icon name="play" size={16} />}
                  onClick={onRunOnProject}
                >
                  Current project
                </Button>
                <Button
                  variant="primary"
                  size="default"
                  icon={<Icon name="save" size={16} />}
                  onClick={onRunOnFiles}
                >
                  Files
                </Button>
              </div>
            </div>
          </div>
      </div>

      {/* Footer */}
      <div className="macro-manager__footer">
        <Button variant="secondary" size="default" onClick={onCollapse}>
          Collapse
        </Button>
        <Button variant="secondary" size="default" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>

    <NewMacroDialog
      isOpen={isNewMacroDialogOpen}
      onClose={() => setIsNewMacroDialogOpen(false)}
      onCreate={(name) => {
        onAddMacro?.(name);
        setIsNewMacroDialogOpen(false);
      }}
      os={os}
    />

    <RenameMacroDialog
      isOpen={isRenameMacroDialogOpen}
      onClose={() => {
        setIsRenameMacroDialogOpen(false);
        setMacroToRename(null);
      }}
      onRename={(newName) => {
        if (macroToRename) {
          onRenameMacro?.(macroToRename, newName);
        }
        setIsRenameMacroDialogOpen(false);
        setMacroToRename(null);
      }}
      currentName={renamingMacro?.name || ''}
      os={os}
    />

    <SelectCommandDialog
      isOpen={isSelectCommandDialogOpen}
      onClose={() => setIsSelectCommandDialogOpen(false)}
      onSelectCommand={(command) => {
        if (selectedMacroId) {
          onAddCommand?.(selectedMacroId, command);
        }
        setIsSelectCommandDialogOpen(false);
      }}
      commands={availableCommands}
      os={os}
    />
    </>
  );
}

export default MacroManager;

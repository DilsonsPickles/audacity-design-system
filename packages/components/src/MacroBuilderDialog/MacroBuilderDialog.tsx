import React from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { GhostButton } from '../GhostButton';
import { Icon } from '../Icon';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { CommandParametersDialog, type CommandParameter } from '../CommandParametersDialog';
import { RenameMacroDialog } from '../MacroManager/MacroDialogs';
import { EditStepDialog } from '../MacroEditorDialog/MacroEditorDialog';
import type { Command } from '../SelectCommandDialog';
import type { Macro } from '../MacroManager/macroTypes';
import './MacroBuilderDialog.css';

export interface MacroBuilderDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The macro being edited (null renders nothing while closed) */
  macro: Macro | null;
  /** Callback when the dialog should close. Edits apply live (auto-save) —
   *  Done/close never discards anything. */
  onClose?: () => void;
  /** Called when the macro is renamed via the header's Rename macro dialog */
  onRenameMacro?: (macroId: string, newName: string) => void;
  /** Called when "Delete macro" is picked from the header menu (the
   *  consumer is expected to also close the builder) */
  onDeleteMacro?: (macroId: string) => void;
  /** Called when "Export macro" is picked from the header menu */
  onExportMacro?: (macroId: string) => void;
  /** Called when the footer's Run button is clicked — runs the macro on
   *  the current project. Like the editor, this is a NON-MODAL window:
   *  edit, run, watch, tweak. */
  onRun?: (macroId: string) => void;
  /** Called when the footer's "Run on files…" button is clicked */
  onRunFiles?: (macroId: string) => void;
  /** Called when a command is added as a new step (transfer button,
   *  double-click, or Enter in the search field). The builder never
   *  passes `parameters` — steps are added with the consumer's defaults
   *  and edited afterwards in place, so nothing ever stacks on top of
   *  the add flow. */
  onAddCommand?: (macroId: string, command: Command, parameters?: string) => void;
  /** Called when a step's parameters are edited via the row pencil */
  onEditStep?: (macroId: string, stepIndex: number, parameters: string) => void;
  /** Called when the steps pane's trash button removes the selected step */
  onDeleteStep?: (macroId: string, stepIndex: number) => void;
  /** Called when the selected step is moved up (-1) or down (+1) */
  onMoveStep?: (macroId: string, stepIndex: number, direction: -1 | 1) => void;
  /** Available commands for the command pane */
  availableCommands?: Command[];
  /** Parameter schema lookup for a step's command — same contract as
   *  MacroEditorDialog's. */
  getCommandParameters?: (commandName: string) => CommandParameter[] | null;
  /** Operating system for platform-specific header controls */
  os?: 'macos' | 'windows';
}

const ALL_CATEGORIES = 'all';

/**
 * MacroBuilderDialog — the MuseScore-"New score" layout for building a
 * macro. Everything lives in ONE window: a category rail (Family), a
 * searchable command list (Instruments) and the macro's step list (Your
 * score), joined by a transfer button. The search field is always
 * visible, so adding a step never opens a picker window — type, Enter
 * (or select and →, or double-click) and the step lands in the macro.
 * Steps are added with default parameters and edited in place via the
 * row pencil; ↑/↓ reorder the selected step and the trash removes it.
 * Non-modal and auto-saving, like MacroEditorDialog.
 */
export function MacroBuilderDialog({
  isOpen,
  macro,
  onClose,
  onRenameMacro,
  onDeleteMacro,
  onExportMacro,
  onRun,
  onRunFiles,
  onAddCommand,
  onEditStep,
  onDeleteStep,
  onMoveStep,
  availableCommands = [],
  getCommandParameters,
  os = 'macos',
}: MacroBuilderDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>(ALL_CATEGORIES);
  const [selectedCommandId, setSelectedCommandId] = React.useState<string | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = React.useState<number | null>(null);
  const [editingStepIndex, setEditingStepIndex] = React.useState<number | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
  const [macroMenuOpen, setMacroMenuOpen] = React.useState(false);
  const [macroMenuPosition, setMacroMenuPosition] = React.useState({ x: 0, y: 0 });

  // Reset transient state whenever a different macro opens
  React.useEffect(() => {
    setSearchQuery('');
    setSelectedCategory(ALL_CATEGORIES);
    setSelectedCommandId(null);
    setSelectedStepIndex(null);
    setEditingStepIndex(null);
  }, [macro?.id, isOpen]);

  // Rail order = first appearance in the data (same rule as the picker)
  const categories = React.useMemo(() => {
    const seen: string[] = [];
    for (const cmd of availableCommands) {
      if (!seen.includes(cmd.category)) seen.push(cmd.category);
    }
    return seen;
  }, [availableCommands]);

  const query = searchQuery.trim().toLowerCase();
  const matching = React.useMemo(
    () => (query ? availableCommands.filter((cmd) => cmd.name.toLowerCase().includes(query)) : availableCommands),
    [availableCommands, query],
  );

  const countByCategory = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cmd of matching) counts[cmd.category] = (counts[cmd.category] ?? 0) + 1;
    return counts;
  }, [matching]);

  const visible = selectedCategory === ALL_CATEGORIES
    ? matching
    : matching.filter((cmd) => cmd.category === selectedCategory);

  if (!macro) return null;

  const stepCount = macro.steps.length;
  const selectedCommand = visible.find((cmd) => cmd.id === selectedCommandId) ?? null;

  const addCommand = (command: Command) => {
    onAddCommand?.(macro.id, command);
    // The new step lands at the end — select it so ↑/trash act on it
    setSelectedStepIndex(stepCount);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && visible.length > 0) {
      e.preventDefault();
      // A highlighted command wins; otherwise the first visible match
      addCommand(selectedCommand ?? visible[0]);
    }
  };

  const moveSelectedStep = (direction: -1 | 1) => {
    if (selectedStepIndex === null) return;
    const target = selectedStepIndex + direction;
    if (target < 0 || target >= stepCount) return;
    onMoveStep?.(macro.id, selectedStepIndex, direction);
    setSelectedStepIndex(target);
  };

  const deleteSelectedStep = () => {
    if (selectedStepIndex === null) return;
    onDeleteStep?.(macro.id, selectedStepIndex);
    setSelectedStepIndex(null);
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        title="Macro builder"
        onClose={onClose}
        os={os}
        nonModal
        closeOnClickOutside={false}
        width={960}
        minHeight="min(600px, calc(100vh - 32px))"
        customLayout
        className="macro-builder"
      >
        <div className="macro-builder__header">
          <h2 className="macro-builder__macro-name">{macro.name}</h2>
          <Button
            variant="secondary"
            className="macro-builder__icon-button"
            ariaLabel="Macro options"
            onClick={(e) => {
              if (!e) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setMacroMenuPosition({ x: rect.right, y: rect.bottom });
              setMacroMenuOpen(true);
            }}
          >
            <Icon name="menu" />
          </Button>
        </div>

        <div className="macro-builder__columns">
          {/* Category rail — the mockup's "Family" pane */}
          <nav className="macro-builder__rail" aria-label="Command categories">
            <div className="macro-builder__pane-title">Category</div>
            <div className="macro-builder__rail-list">
              <button
                type="button"
                className={`macro-builder__rail-item${selectedCategory === ALL_CATEGORIES ? ' macro-builder__rail-item--selected' : ''}`}
                aria-pressed={selectedCategory === ALL_CATEGORIES}
                onClick={() => setSelectedCategory(ALL_CATEGORIES)}
              >
                <span className="macro-builder__rail-label">All commands</span>
                <span className="macro-builder__rail-count">{matching.length}</span>
              </button>
              {categories.map((category) => {
                const count = countByCategory[category] ?? 0;
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    className={`macro-builder__rail-item${isSelected ? ' macro-builder__rail-item--selected' : ''}${count === 0 ? ' macro-builder__rail-item--empty' : ''}`}
                    aria-pressed={isSelected}
                    disabled={count === 0}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span className="macro-builder__rail-label">{category}</span>
                    <span className="macro-builder__rail-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Command pane — the mockup's "Instruments" pane, search always on */}
          <div className="macro-builder__commands-pane">
            <div className="macro-builder__pane-title">Commands</div>
            <div className="macro-builder__search-container">
              <Icon name="zoom-in" size={16} />
              <input
                type="text"
                className="macro-builder__search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search commands"
                autoFocus
                onKeyDown={handleSearchKeyDown}
              />
              {searchQuery && (
                <button
                  className="macro-builder__clear-button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
            <div className="macro-builder__command-list" role="listbox" aria-label="Available commands">
              {visible.length === 0 && (
                <div className="macro-builder__empty">
                  {query ? `No commands match “${searchQuery.trim()}”` : 'No commands'}
                </div>
              )}
              {visible.map((command) => {
                const isSelected = command.id === selectedCommandId;
                return (
                  <button
                    key={command.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-command-id={command.id}
                    className={`macro-builder__command-item${isSelected ? ' macro-builder__command-item--selected' : ''}`}
                    onClick={() => setSelectedCommandId(command.id)}
                    onDoubleClick={() => addCommand(command)}
                  >
                    {command.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transfer column — the mockup's → button */}
          <div className="macro-builder__transfer">
            <Button
              variant="secondary"
              className="macro-builder__icon-button"
              ariaLabel="Add command to macro"
              disabled={!selectedCommand}
              onClick={() => {
                if (selectedCommand) addCommand(selectedCommand);
              }}
            >
              <Icon name="chevron-right" />
            </Button>
          </div>

          {/* Steps pane — the mockup's "Your score" pane */}
          <div className="macro-builder__steps-pane">
            <div className="macro-builder__steps-header">
              <div className="macro-builder__pane-title">Your macro</div>
              <GhostButton
                icon="trash"
                size="medium"
                ariaLabel="Remove selected step"
                disabled={selectedStepIndex === null}
                onClick={deleteSelectedStep}
              />
            </div>
            <div className="macro-builder__step-list" role="listbox" aria-label="Macro steps">
              {stepCount === 0 && (
                <div className="macro-builder__steps-hint">
                  Build your macro by adding commands to this list
                </div>
              )}
              {macro.steps.map((step, index) => {
                const isSelected = index === selectedStepIndex;
                return (
                  <div
                    key={index}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    data-step-index={index}
                    className={`macro-builder__step${isSelected ? ' macro-builder__step--selected' : ''}`}
                    onClick={() => setSelectedStepIndex(index)}
                    onDoubleClick={() => setEditingStepIndex(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingStepIndex(index);
                    }}
                  >
                    <div className="macro-builder__step-text">
                      <span className="macro-builder__step-command">{index + 1}. {step.command}</span>
                      {step.parameters && (
                        <span className="macro-builder__step-parameters" title={step.parameters}>
                          {step.parameters}
                        </span>
                      )}
                    </div>
                    <GhostButton
                      icon="edit"
                      size="medium"
                      className="macro-builder__step-edit"
                      ariaLabel={`Edit step ${index + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStepIndex(index);
                        setEditingStepIndex(index);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reorder column — the mockup's right-edge ↑/↓ */}
          <div className="macro-builder__reorder">
            <Button
              variant="secondary"
              className="macro-builder__icon-button"
              ariaLabel="Move step up"
              disabled={selectedStepIndex === null || selectedStepIndex === 0}
              onClick={() => moveSelectedStep(-1)}
            >
              <Icon name="caret-down" className="macro-builder__caret-up" />
            </Button>
            <Button
              variant="secondary"
              className="macro-builder__icon-button"
              ariaLabel="Move step down"
              disabled={selectedStepIndex === null || selectedStepIndex === stepCount - 1}
              onClick={() => moveSelectedStep(1)}
            >
              <Icon name="caret-down" />
            </Button>
          </div>
        </div>

        <div className="macro-builder__footer">
          <div className="macro-builder__run-group">
            {onRun && (
              <Button variant="secondary" size="default" onClick={() => onRun(macro.id)}>
                Run
              </Button>
            )}
            {onRunFiles && (
              <Button variant="secondary" size="default" onClick={() => onRunFiles(macro.id)}>
                Run on files…
              </Button>
            )}
          </div>
          <Button variant="secondary" size="default" onClick={onClose}>
            Done
          </Button>
        </div>
      </Dialog>

      <ContextMenu
        isOpen={macroMenuOpen}
        onClose={() => setMacroMenuOpen(false)}
        x={macroMenuPosition.x}
        y={macroMenuPosition.y}
      >
        <ContextMenuItem
          label="Rename macro"
          onClick={() => {
            setMacroMenuOpen(false);
            setIsRenameDialogOpen(true);
          }}
        />
        <ContextMenuItem
          label="Export macro"
          onClick={() => {
            setMacroMenuOpen(false);
            onExportMacro?.(macro.id);
          }}
        />
        <ContextMenuItem isDivider label="" />
        <ContextMenuItem
          label="Delete macro"
          onClick={() => {
            setMacroMenuOpen(false);
            onDeleteMacro?.(macro.id);
          }}
        />
      </ContextMenu>

      <RenameMacroDialog
        isOpen={isRenameDialogOpen}
        onClose={() => setIsRenameDialogOpen(false)}
        onRename={(newName) => {
          onRenameMacro?.(macro.id, newName);
          setIsRenameDialogOpen(false);
        }}
        currentName={macro.name}
        os={os}
      />

      {(() => {
        const editingStep = editingStepIndex !== null ? macro.steps[editingStepIndex] ?? null : null;
        const schema = editingStep ? getCommandParameters?.(editingStep.command) ?? null : null;
        const save = (parameters: string) => {
          if (editingStepIndex !== null) {
            onEditStep?.(macro.id, editingStepIndex, parameters);
          }
        };
        if (editingStep && schema) {
          return (
            <CommandParametersDialog
              isOpen
              commandName={editingStep.command}
              parameters={schema}
              initialParameters={editingStep.parameters}
              onClose={() => setEditingStepIndex(null)}
              onSubmit={save}
              os={os}
            />
          );
        }
        return (
          <EditStepDialog
            isOpen={editingStepIndex !== null}
            step={editingStep}
            onClose={() => setEditingStepIndex(null)}
            onSave={save}
            os={os}
          />
        );
      })()}
    </>
  );
}

export default MacroBuilderDialog;

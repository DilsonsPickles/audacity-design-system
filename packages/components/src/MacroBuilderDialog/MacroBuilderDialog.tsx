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
  /** Called while dragging a step row over another row to reorder steps */
  onReorderStep?: (macroId: string, fromIndex: number, toIndex: number) => void;
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
 * macro. Everything lives in ONE window: a searchable command list
 * (Instruments) with a category dropdown on top, and the macro's step
 * list (Your score), joined by a transfer button. The search field is
 * always visible, so adding a step never opens a picker window — type,
 * Enter (or select and →, or double-click) and the step lands in the
 * macro. Steps are added with default parameters and edited in place
 * via the row pencil; drag a row (or ↑/↓) to reorder and the trash
 * removes it. Non-modal and auto-saving, like MacroEditorDialog.
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
  onReorderStep,
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
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const stepListRef = React.useRef<HTMLDivElement>(null);
  // Category scope menu (the segment inside the search field)
  const [categoryMenuOpen, setCategoryMenuOpen] = React.useState(false);
  const [categoryMenuPosition, setCategoryMenuPosition] = React.useState({ x: 0, y: 0 });
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Reset transient state whenever a different macro opens
  React.useEffect(() => {
    setSearchQuery('');
    setSelectedCategory(ALL_CATEGORIES);
    setSelectedCommandId(null);
    setSelectedStepIndex(null);
    setEditingStepIndex(null);
    setDraggedIndex(null);
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

  const visible = selectedCategory === ALL_CATEGORIES
    ? matching
    : matching.filter((cmd) => cmd.category === selectedCategory);

  if (!macro) return null;

  const stepCount = macro.steps.length;
  const selectedCommand = visible.find((cmd) => cmd.id === selectedCommandId) ?? null;

  const pickCategory = (category: string) => {
    setSelectedCategory(category);
    setCategoryMenuOpen(false);
    // The scope is part of the search control — hand focus straight back
    searchInputRef.current?.focus();
  };

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

  // Whole-row drag-to-reorder (no grip — the row IS the handle, with a
  // 3px threshold so plain clicks still select and double-clicks still
  // edit). Same live-swap + edge auto-scroll machinery as
  // MacroEditorDialog's grip drag: document listeners are attached on
  // mousedown and removed on mouseup (self-cleaning, exempt from the
  // ref-mirror rule), the row whose bounds the pointer enters swaps
  // with the dragged row, and near the list's top/bottom edge a rAF
  // loop scrolls while re-running the swap test each frame. The
  // selection follows the dragged row throughout.
  const handleStepMouseDown = (index: number) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // The pencil (or any other row control) owns its own clicks
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const macroId = macro.id;
    const DRAG_THRESHOLD = 3; // px of vertical travel before a press becomes a drag
    const EDGE_ZONE = 32; // px from the list edge where auto-scroll engages
    const MAX_SCROLL_SPEED = 14; // px per frame at full depth
    const startY = e.clientY;
    let dragging = false;
    let currentIndex = index;
    let lastClientY = e.clientY;
    let rafId: number | null = null;
    setSelectedStepIndex(index);

    const swapAt = (clientY: number) => {
      const list = stepListRef.current;
      if (!list) return;
      const rows = list.querySelectorAll<HTMLElement>('[data-step-index]');
      for (const row of rows) {
        const targetIndex = Number(row.dataset.stepIndex);
        if (targetIndex === currentIndex) continue;
        const rect = row.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          onReorderStep?.(macroId, currentIndex, targetIndex);
          currentIndex = targetIndex;
          setDraggedIndex(targetIndex);
          setSelectedStepIndex(targetIndex);
          break;
        }
      }
    };

    const scrollVelocity = (clientY: number): number => {
      const list = stepListRef.current;
      if (!list) return 0;
      const rect = list.getBoundingClientRect();
      if (clientY < rect.top + EDGE_ZONE) {
        const depth = Math.min(1, (rect.top + EDGE_ZONE - clientY) / EDGE_ZONE);
        return -Math.ceil(depth * MAX_SCROLL_SPEED);
      }
      if (clientY > rect.bottom - EDGE_ZONE) {
        const depth = Math.min(1, (clientY - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE);
        return Math.ceil(depth * MAX_SCROLL_SPEED);
      }
      return 0;
    };

    const scrollLoop = () => {
      const list = stepListRef.current;
      if (list) {
        const velocity = scrollVelocity(lastClientY);
        if (velocity !== 0) {
          list.scrollTop += velocity;
          swapAt(lastClientY);
        }
      }
      rafId = requestAnimationFrame(scrollLoop);
    };

    const onMouseMove = (ev: MouseEvent) => {
      lastClientY = ev.clientY;
      if (!dragging) {
        if (Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
        setDraggedIndex(currentIndex);
        rafId = requestAnimationFrame(scrollLoop);
      }
      swapAt(ev.clientY);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
      setDraggedIndex(null);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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
        width={760}
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
          {/* Command pane — the mockup's "Instruments" pane with the
              category filter folded into a dropdown, search always on */}
          <div className="macro-builder__commands-pane">
            <div className="macro-builder__pane-title">Commands</div>
            {/* Scoped search: the category is a segment INSIDE the search
                field — one control reading "search within ⟨scope⟩" */}
            <div className="macro-builder__search-container">
              <button
                type="button"
                className="macro-builder__scope"
                aria-haspopup="menu"
                aria-expanded={categoryMenuOpen}
                aria-label="Filter by category"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setCategoryMenuPosition({ x: rect.left, y: rect.bottom + 2 });
                  setCategoryMenuOpen(true);
                }}
              >
                <span className="macro-builder__scope-label">
                  {selectedCategory === ALL_CATEGORIES ? 'All commands' : selectedCategory}
                </span>
                <Icon name="caret-down" size={12} />
              </button>
              <div className="macro-builder__search-field">
                <Icon name="zoom-in" size={16} />
                <input
                  ref={searchInputRef}
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
              {/* Select-first: BOTH step actions live here and act on the
                  selected step — no per-row controls */}
              <div className="macro-builder__steps-actions">
                <GhostButton
                  icon="edit"
                  size="medium"
                  ariaLabel="Edit selected step"
                  disabled={selectedStepIndex === null}
                  onClick={() => setEditingStepIndex(selectedStepIndex)}
                />
                <GhostButton
                  icon="trash"
                  size="medium"
                  ariaLabel="Remove selected step"
                  disabled={selectedStepIndex === null}
                  onClick={deleteSelectedStep}
                />
              </div>
            </div>
            <div
              ref={stepListRef}
              className={`macro-builder__step-list${draggedIndex !== null ? ' macro-builder__step-list--dragging' : ''}`}
              role="listbox"
              aria-label="Macro steps"
            >
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
                    className={`macro-builder__step${isSelected ? ' macro-builder__step--selected' : ''}${index === draggedIndex ? ' macro-builder__step--dragging' : ''}`}
                    onMouseDown={handleStepMouseDown(index)}
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
        isOpen={categoryMenuOpen}
        onClose={() => setCategoryMenuOpen(false)}
        x={categoryMenuPosition.x}
        y={categoryMenuPosition.y}
      >
        <ContextMenuItem
          label="All commands"
          checked={selectedCategory === ALL_CATEGORIES}
          onClick={() => pickCategory(ALL_CATEGORIES)}
        />
        <ContextMenuItem isDivider label="" />
        {categories.map((category) => (
          <ContextMenuItem
            key={category}
            label={category}
            checked={selectedCategory === category}
            onClick={() => pickCategory(category)}
          />
        ))}
      </ContextMenu>

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

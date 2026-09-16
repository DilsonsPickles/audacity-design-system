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
  // Multi-select, in click order. DELIBERATELY not keyed to the current
  // scope — a selection built in one category survives switching to
  // another, so one → can add commands spanning categories.
  const [selectedCommandIds, setSelectedCommandIds] = React.useState<string[]>([]);
  const anchorCommandIdRef = React.useRef<string | null>(null);
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
  // Per-row ⋯ menu: which step's menu is open, and where
  const [stepMenuIndex, setStepMenuIndex] = React.useState<number | null>(null);
  const [stepMenuPosition, setStepMenuPosition] = React.useState({ x: 0, y: 0 });
  const commandListRef = React.useRef<HTMLDivElement>(null);
  // Splitter: explicit commands-pane width once the user drags (null =
  // the default even split). Session-scoped, survives macro switches.
  const [commandsPaneWidth, setCommandsPaneWidth] = React.useState<number | null>(null);
  const [splitterActive, setSplitterActive] = React.useState(false);
  const columnsRef = React.useRef<HTMLDivElement>(null);
  const commandsPaneRef = React.useRef<HTMLDivElement>(null);

  // Reset transient state whenever a different macro opens
  React.useEffect(() => {
    setSearchQuery('');
    setSelectedCategory(ALL_CATEGORIES);
    setSelectedCommandIds([]);
    setSelectedStepIndex(null);
    setEditingStepIndex(null);
    setDraggedIndex(null);
    setStepMenuIndex(null);
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

  const pickCategory = (category: string) => {
    setSelectedCategory(category);
    setCategoryMenuOpen(false);
    // The scope is part of the search control — hand focus straight back
    searchInputRef.current?.focus();
  };

  // Click = replace selection; Cmd/Ctrl+click = toggle; Shift+click =
  // extend from the anchor through the visible list.
  const handleCommandClick = (command: Command, e: React.MouseEvent) => {
    if (e.shiftKey && anchorCommandIdRef.current) {
      const anchorIdx = visible.findIndex((cmd) => cmd.id === anchorCommandIdRef.current);
      const clickIdx = visible.findIndex((cmd) => cmd.id === command.id);
      if (anchorIdx !== -1 && clickIdx !== -1) {
        const [from, to] = anchorIdx < clickIdx ? [anchorIdx, clickIdx] : [clickIdx, anchorIdx];
        const range = visible.slice(from, to + 1).map((cmd) => cmd.id);
        setSelectedCommandIds((prev) => [...prev, ...range.filter((id) => !prev.includes(id))]);
        return;
      }
    }
    anchorCommandIdRef.current = command.id;
    if (e.metaKey || e.ctrlKey) {
      setSelectedCommandIds((prev) =>
        prev.includes(command.id) ? prev.filter((id) => id !== command.id) : [...prev, command.id],
      );
      return;
    }
    setSelectedCommandIds([command.id]);
  };

  // Add in selection (click) order; the last new step ends up selected
  const addCommands = (commands: Command[]) => {
    if (commands.length === 0) return;
    for (const command of commands) onAddCommand?.(macro.id, command);
    setSelectedStepIndex(stepCount + commands.length - 1);
    setSelectedCommandIds([]);
  };

  const selectedCommands = selectedCommandIds
    .map((id) => availableCommands.find((cmd) => cmd.id === id))
    .filter((cmd): cmd is Command => cmd !== undefined);

  // The selection summary appears once it stops being self-evident:
  // more than one command, or any selected command scrolled out of
  // sight behind another scope/search.
  const anySelectionHidden = selectedCommands.some(
    (cmd) => !visible.some((visibleCmd) => visibleCmd.id === cmd.id),
  );
  const showSelectionSummary = selectedCommands.length > 1 || anySelectionHidden;

  const focusCommandRow = (id: string) => {
    // Ids carry ':' and '/' — quoting the attribute value is enough
    commandListRef.current
      ?.querySelector<HTMLButtonElement>(`[data-command-id="${id}"]`)
      ?.focus();
  };

  // Arrow keys walk the visible list as a single selection, with DOM
  // focus following so Enter adds whatever the arrows landed on
  const moveCommandSelection = (fromId: string, delta: -1 | 1) => {
    const idx = visible.findIndex((cmd) => cmd.id === fromId);
    if (idx === -1) return;
    const target = visible[Math.min(visible.length - 1, Math.max(0, idx + delta))];
    if (!target || target.id === fromId) return;
    anchorCommandIdRef.current = target.id;
    setSelectedCommandIds([target.id]);
    focusCommandRow(target.id);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      // Drop from the search into the list: select + focus the first hit
      e.preventDefault();
      const first = visible[0];
      if (first) {
        anchorCommandIdRef.current = first.id;
        setSelectedCommandIds([first.id]);
        focusCommandRow(first.id);
      }
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // A built-up selection wins; otherwise the first visible match
    if (selectedCommands.length > 0) addCommands(selectedCommands);
    else if (visible.length > 0) addCommands([visible[0]]);
  };

  // Splitter between the commands pane and the rest: drag sets an
  // explicit width (clamped so neither pane collapses); double-click
  // resets to the even split. Self-cleaning document listeners.
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = commandsPaneRef.current?.getBoundingClientRect().width ?? 0;
    const columnsWidth = columnsRef.current?.getBoundingClientRect().width ?? 0;
    const MIN_PANE = 180;
    setSplitterActive(true);

    const onMouseMove = (ev: MouseEvent) => {
      let width = startWidth + (ev.clientX - startX);
      width = Math.max(MIN_PANE, width);
      if (columnsWidth > 0) width = Math.min(width, columnsWidth - MIN_PANE - 60);
      setCommandsPaneWidth(width);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setSplitterActive(false);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const moveStepAt = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stepCount) return;
    onMoveStep?.(macro.id, index, direction);
    setSelectedStepIndex(target);
  };

  const deleteStepAt = (index: number) => {
    onDeleteStep?.(macro.id, index);
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
        <div ref={columnsRef} className={`macro-builder__columns${splitterActive ? ' macro-builder__columns--resizing' : ''}`}>
          {/* Command pane — the mockup's "Instruments" pane with the
              category scope folded into the search field */}
          <div
            ref={commandsPaneRef}
            className="macro-builder__commands-pane"
            style={commandsPaneWidth !== null ? { flex: `0 0 ${commandsPaneWidth}px` } : undefined}
          >
            {/* One header band, two jobs: this half filters the list */}
            <div className="macro-builder__commands-header">
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
              <div className="macro-builder__search-container">
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
            <div ref={commandListRef} className="macro-builder__command-list" role="listbox" aria-label="Available commands">
              {visible.length === 0 && (
                <div className="macro-builder__empty">
                  {query ? `No commands match “${searchQuery.trim()}”` : 'No commands'}
                </div>
              )}
              {visible.map((command) => {
                const isSelected = selectedCommandIds.includes(command.id);
                return (
                  <button
                    key={command.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-command-id={command.id}
                    className={`macro-builder__command-item${isSelected ? ' macro-builder__command-item--selected' : ''}`}
                    onClick={(e) => handleCommandClick(command, e)}
                    onDoubleClick={() => addCommands([command])}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        moveCommandSelection(command.id, e.key === 'ArrowDown' ? 1 : -1);
                        return;
                      }
                      if (e.key !== 'Enter') return;
                      // Suppress the button's synthetic click — Enter is
                      // the add gesture, not another select
                      e.preventDefault();
                      if (isSelected && selectedCommands.length > 0) addCommands(selectedCommands);
                      else addCommands([command]);
                    }}
                  >
                    {command.name}
                  </button>
                );
              })}
            </div>
            {/* Selection bar — docked to the list it describes. With no
                transfer column, the batch's mouse path lives here too. */}
            {showSelectionSummary && (
              <div className="macro-builder__selection-summary">
                <span>{selectedCommands.length} selected</span>
                <span className="macro-builder__selection-actions">
                  <button
                    type="button"
                    className="macro-builder__selection-add"
                    onClick={() => addCommands(selectedCommands)}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="macro-builder__selection-clear"
                    onClick={() => setSelectedCommandIds([])}
                  >
                    Clear
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Splitter — drag to resize the commands pane; double-click
              resets the even split */}
          <div
            className="macro-builder__splitter"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize command list"
            onMouseDown={handleSplitterMouseDown}
            onDoubleClick={() => setCommandsPaneWidth(null)}
          />

          {/* Steps pane — its header IS the macro: name + macro menu */}
          <div className="macro-builder__steps-pane">
            <div className="macro-builder__steps-header">
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
                    <span className="macro-builder__step-grip" aria-hidden="true">
                      <Icon name="gripper" size={16} />
                    </span>
                    <div className="macro-builder__step-text">
                      <span className="macro-builder__step-command">{step.command}</span>
                      {step.parameters && (
                        <span className="macro-builder__step-parameters" title={step.parameters}>
                          {step.parameters}
                        </span>
                      )}
                    </div>
                    <div className="macro-builder__step-actions">
                      <GhostButton
                        icon="edit"
                        size="medium"
                        ariaLabel={`Edit step ${index + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStepIndex(index);
                          setEditingStepIndex(index);
                        }}
                      />
                      <GhostButton
                        icon="menu"
                        size="medium"
                        ariaLabel={`Step ${index + 1} options`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStepIndex(index);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setStepMenuPosition({ x: rect.right, y: rect.bottom });
                          setStepMenuIndex(index);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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

      {/* Per-row ⋯ menu — every step action in one place */}
      {stepMenuIndex !== null && (
        <ContextMenu
          isOpen
          onClose={() => setStepMenuIndex(null)}
          x={stepMenuPosition.x}
          y={stepMenuPosition.y}
        >
          <ContextMenuItem
            label="Move up"
            disabled={stepMenuIndex === 0}
            onClick={() => {
              setStepMenuIndex(null);
              moveStepAt(stepMenuIndex, -1);
            }}
          />
          <ContextMenuItem
            label="Move down"
            disabled={stepMenuIndex === stepCount - 1}
            onClick={() => {
              setStepMenuIndex(null);
              moveStepAt(stepMenuIndex, 1);
            }}
          />
          <ContextMenuItem isDivider label="" />
          <ContextMenuItem
            label="Delete step"
            onClick={() => {
              setStepMenuIndex(null);
              deleteStepAt(stepMenuIndex);
            }}
          />
        </ContextMenu>
      )}

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

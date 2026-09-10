import React from 'react';
import { Dialog } from '../Dialog';
import { Footer } from '../Footer/Footer';
import { Button } from '../Button';
import { GhostButton } from '../GhostButton';
import { Icon } from '../Icon';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { SelectCommandDialog, Command } from '../SelectCommandDialog';
import { CommandParametersDialog, type CommandParameter } from '../CommandParametersDialog';
import { RenameMacroDialog } from '../MacroManager/MacroDialogs';
import type { Macro, MacroStep } from '../MacroManager/macroTypes';
import './MacroEditorDialog.css';

export interface MacroEditorDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The macro being edited (null renders nothing while closed) */
  macro: Macro | null;
  /** Callback when the dialog should close. Edits apply live (auto-save) —
   *  Done/close never discards anything. */
  onClose?: () => void;
  /** Called when the macro is renamed via the header's Rename macro dialog */
  onRenameMacro?: (macroId: string, newName: string) => void;
  /** Called when the header's Delete macro button is clicked (the consumer
   *  is expected to also close the editor) */
  onDeleteMacro?: (macroId: string) => void;
  /** Called when the header's Export macro button is clicked */
  onExportMacro?: (macroId: string) => void;
  /** Called when the footer's Run button is clicked — runs the macro on
   *  the current project. The editor is a NON-MODAL window so the
   *  timeline stays visible and interactive: edit, run, watch, tweak. */
  onRun?: (macroId: string) => void;
  /** Called when a command is added as a new step via "New step" */
  onAddCommand?: (macroId: string, command: Command) => void;
  /** Called when a step's parameters are edited via the row pencil */
  onEditStep?: (macroId: string, stepIndex: number, parameters: string) => void;
  /** Called when a row's delete button is clicked */
  onDeleteStep?: (macroId: string, stepIndex: number) => void;
  /** Called when a step is moved up (-1) or down (+1) via the row menu */
  onMoveStep?: (macroId: string, stepIndex: number, direction: -1 | 1) => void;
  /** Called while dragging a row's grip handle over another row to reorder steps */
  onReorderStep?: (macroId: string, fromIndex: number, toIndex: number) => void;
  /** Available commands for the add-step picker */
  availableCommands?: Command[];
  /** Parameter schema lookup for a step's command. When provided, the row
   *  pencil opens a CommandParametersDialog built from the returned schema
   *  (an empty array shows the "no adjustable parameters" window); when
   *  omitted (or it returns null) the pencil falls back to the plain
   *  parameters-string editor. */
  getCommandParameters?: (commandName: string) => CommandParameter[] | null;
  /** Operating system for platform-specific header controls */
  os?: 'macos' | 'windows';
}

interface EditStepDialogProps {
  isOpen: boolean;
  step: MacroStep | null;
  onClose: () => void;
  onSave: (parameters: string) => void;
  os?: 'macos' | 'windows';
}

/** Small dialog for editing a step's parameters string. */
function EditStepDialog({ isOpen, step, onClose, onSave, os = 'macos' }: EditStepDialogProps) {
  const [parameters, setParameters] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setParameters(step?.parameters ?? '');
    }
  }, [isOpen, step]);

  if (!step) return null;

  const handleSave = () => {
    onSave(parameters);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Edit step"
      onClose={onClose}
      os={os}
      width={480}
      minHeight={0}
      footer={
        <Footer
          primaryText="Save"
          secondaryText="Cancel"
          onPrimaryClick={handleSave}
          onSecondaryClick={onClose}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>{step.command}</span>
        <label htmlFor="step-parameters-input" style={{ fontSize: '12px', fontWeight: 400 }}>
          Parameters
        </label>
        <input
          id="step-parameters-input"
          type="text"
          value={parameters}
          onChange={(e) => setParameters(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          autoFocus
          style={{
            padding: '7px 8px',
            fontSize: '12px',
            border: '1px solid #D2D6DD',
            borderRadius: '3px',
            outline: 'none',
          }}
        />
      </div>
    </Dialog>
  );
}

interface StepRowProps {
  step: MacroStep;
  index: number;
  stepCount: number;
  isDragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onGripMouseDown: (e: React.MouseEvent) => void;
}

function StepRow({
  step, index, stepCount, isDragging,
  onEdit, onDelete, onMove,
  onGripMouseDown,
}: StepRowProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right, y: rect.bottom });
    setMenuOpen(true);
  };

  return (
    <>
      <div
        className={`macro-editor__step${isDragging ? ' macro-editor__step--dragging' : ''}`}
        data-step-index={index}
      >
        <span
          className="macro-editor__step-grip"
          aria-hidden="true"
          onMouseDown={onGripMouseDown}
        >
          <Icon name="gripper" size={16} />
        </span>
        <div className="macro-editor__step-text">
          <span className="macro-editor__step-command">{index + 1}. {step.command}</span>
          {step.parameters && (
            <span className="macro-editor__step-parameters" title={step.parameters}>
              {step.parameters}
            </span>
          )}
        </div>
        <div className="macro-editor__step-actions">
          <GhostButton
            icon="brush"
            size="medium"
            ariaLabel={`Edit step ${index + 1}`}
            onClick={onEdit}
          />
          <GhostButton
            icon="trash"
            size="medium"
            ariaLabel={`Delete step ${index + 1}`}
            onClick={onDelete}
          />
          <GhostButton
            icon="menu"
            size="medium"
            ariaLabel={`Step ${index + 1} options`}
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
        <ContextMenuItem
          label="Move up"
          disabled={index === 0}
          onClick={() => {
            setMenuOpen(false);
            if (index > 0) onMove(-1);
          }}
        />
        <ContextMenuItem
          label="Move down"
          disabled={index === stepCount - 1}
          onClick={() => {
            setMenuOpen(false);
            if (index < stepCount - 1) onMove(1);
          }}
        />
      </ContextMenu>
    </>
  );
}

/**
 * MacroEditorDialog — floating editor for a single macro. Owns macro-level
 * actions (rename / delete / export) plus the step list: add, edit
 * parameters, delete, and reorder (drag handle, or the row menu's Move
 * up/down). A NON-MODAL window (2026-09-10): the app behind stays
 * interactive, and the footer's Run button executes the macro on the
 * project so you can test as you edit. All edits apply live
 * (auto-save); Done just closes. Run-on-files stays in the MacrosPanel.
 */
export function MacroEditorDialog({
  isOpen,
  macro,
  onClose,
  onRenameMacro,
  onDeleteMacro,
  onExportMacro,
  onRun,
  onAddCommand,
  onEditStep,
  onDeleteStep,
  onMoveStep,
  onReorderStep,
  getCommandParameters,
  availableCommands = [],
  os = 'macos',
}: MacroEditorDialogProps) {
  const [isSelectCommandDialogOpen, setIsSelectCommandDialogOpen] = React.useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
  const [editingStepIndex, setEditingStepIndex] = React.useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const stepListRef = React.useRef<HTMLDivElement>(null);

  // Reset transient state whenever a different macro opens
  React.useEffect(() => {
    setEditingStepIndex(null);
    setDraggedIndex(null);
  }, [macro?.id, isOpen]);

  if (!macro) return null;

  const stepCount = macro.steps.length;

  // Grip-handle drag-to-reorder. Document mousemove/mouseup listeners are
  // attached on mousedown and removed on mouseup (the self-cleaning pattern
  // that exempts this from the ref-mirror rule — everything the handlers
  // read is fixed for the duration of one drag). While dragging, the row
  // whose bounds the pointer enters swaps with the dragged row, and the
  // dragged index follows — the same live-swap behavior as EffectsPanel's
  // effect stacks, but mouse-driven rather than HTML5 drag-and-drop so it
  // works identically across browsers and the Electron shell.
  //
  // When the pointer nears (or passes) the scrollable list's top/bottom
  // edge, a rAF loop scrolls the list at a speed proportional to how deep
  // into the edge zone the pointer is — and re-runs the swap test each
  // frame, so rows keep reordering under a stationary pointer while the
  // list scrolls beneath it.
  const handleGripMouseDown = (index: number) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const macroId = macro.id;
    const EDGE_ZONE = 32; // px from the list edge where auto-scroll engages
    const MAX_SCROLL_SPEED = 14; // px per frame at full depth
    let currentIndex = index;
    let lastClientY = e.clientY;
    let rafId: number | null = null;
    setDraggedIndex(index);

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
    rafId = requestAnimationFrame(scrollLoop);
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        title="Edit macro"
        onClose={onClose}
        os={os}
        nonModal
        closeOnClickOutside={false}
        width={680}
        // 480px tall by default, but yield to short viewports — the Dialog's
        // own max-height (100vh - 32px) would otherwise lose to min-height
        // and push the footer off screen.
        minHeight="min(480px, calc(100vh - 32px))"
        customLayout
        className="macro-editor"
      >
        <div className="macro-editor__header">
          <h2 className="macro-editor__macro-name">{macro.name}</h2>
          <div className="macro-editor__header-actions">
            <Button
              variant="secondary"
              size="default"
              onClick={() => setIsRenameDialogOpen(true)}
            >
              Rename macro
            </Button>
            <Button
              variant="secondary"
              size="default"
              onClick={() => onDeleteMacro?.(macro.id)}
            >
              Delete macro
            </Button>
            <Button
              variant="secondary"
              size="default"
              onClick={() => onExportMacro?.(macro.id)}
            >
              Export macro
            </Button>
          </div>
        </div>

        <div className="macro-editor__body">
          <div className="macro-editor__steps-header">
            <span className="macro-editor__steps-title">Macro steps</span>
            <Button
              variant="primary"
              size="default"
              onClick={() => setIsSelectCommandDialogOpen(true)}
            >
              New step
            </Button>
          </div>

          <div
            ref={stepListRef}
            className={`macro-editor__step-list${draggedIndex !== null ? ' macro-editor__step-list--dragging' : ''}`}
            role="list"
            aria-label="Macro steps"
          >
            {macro.steps.map((step, index) => (
              <StepRow
                key={index}
                step={step}
                index={index}
                stepCount={stepCount}
                isDragging={draggedIndex === index}
                onEdit={() => setEditingStepIndex(index)}
                onDelete={() => onDeleteStep?.(macro.id, index)}
                onMove={(direction) => onMoveStep?.(macro.id, index, direction)}
                onGripMouseDown={handleGripMouseDown(index)}
              />
            ))}
          </div>
        </div>

        <div className="macro-editor__footer">
          {onRun && (
            <Button
              variant="primary"
              size="default"
              className="macro-editor__run"
              onClick={() => onRun(macro.id)}
            >
              Run
            </Button>
          )}
          <Button variant="secondary" size="default" onClick={onClose}>
            Done
          </Button>
        </div>
      </Dialog>

      <SelectCommandDialog
        isOpen={isSelectCommandDialogOpen}
        onClose={() => setIsSelectCommandDialogOpen(false)}
        onSelectCommand={(command) => {
          onAddCommand?.(macro.id, command);
          setIsSelectCommandDialogOpen(false);
        }}
        commands={availableCommands}
        os={os}
      />

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

export default MacroEditorDialog;

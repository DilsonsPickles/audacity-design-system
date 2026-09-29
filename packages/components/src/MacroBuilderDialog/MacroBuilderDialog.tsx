import React from 'react';
import { createPortal } from 'react-dom';
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
import { useAccessibilityProfile } from '../contexts/AccessibilityProfileContext';
import { useContainerTabGroup } from '../hooks/useContainerTabGroup';
import { announce } from '../utils/announce';
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
  /** Called when a command should be added as a step (double-click,
   *  Enter, or a drag into the step list). `atIndex` is where a DRAG
   *  dropped it; without it the step goes on the end. The builder never
   *  passes `parameters` — steps are added with the consumer's defaults
   *  and edited afterwards in place, so nothing ever stacks on top of
   *  the add flow. */
  onAddCommand?: (macroId: string, command: Command, parameters?: string, atIndex?: number) => void;
  /** Called when a step's parameters are edited via the row pencil */
  onEditStep?: (macroId: string, stepIndex: number, parameters: string) => void;
  /** Called when a row's ⋯ menu removes its step */
  onDeleteStep?: (macroId: string, stepIndex: number) => void;
  /** Called when "Remove all steps" is picked from the macro menu */
  onClearSteps?: (macroId: string) => void;
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

/** The commands pane's width until the user drags the splitter, and
 *  what a double-click on it returns to. */
const DEFAULT_COMMANDS_PANE_WIDTH = 280;
const MIN_PANE_WIDTH = 180;
/** What the steps pane keeps beyond its own minimum when the commands
 *  pane is widened as far as it goes. */
const STEPS_PANE_RESERVE = 60;
/** One arrow press on the splitter; Shift takes a bigger bite. */
const SPLITTER_STEP = 16;
const SPLITTER_BIG_STEP = 64;

/** Pointer travel before a press on a command becomes a drag. */
const COMMAND_DRAG_THRESHOLD = 4;
/** How near the step list's edge a drag scrolls it, and how fast. */
const DROP_EDGE_ZONE = 32;
const DROP_MAX_SCROLL_SPEED = 14;

/** A command being dragged into the step list. */
interface CommandDrag {
  command: Command;
  /** Pointer position, for the ghost */
  x: number;
  y: number;
  /** Where it would land: a step index, `stepCount` for the end, or
   *  null while the pointer is not over the step list (no drop). */
  insertAt: number | null;
}

/** The three things in a step's row that take focus, left to right. */
type StepCell = 'step' | 'edit' | 'menu';
const STEP_CELLS: readonly StepCell[] = ['step', 'edit', 'menu'];
const STEP_EDIT_CLASS = 'macro-builder__step-edit';
const STEP_MENU_CLASS = 'macro-builder__step-menu';

function stepCellOf(el: Element): StepCell {
  if (el.closest(`.${STEP_EDIT_CLASS}`)) return 'edit';
  if (el.closest(`.${STEP_MENU_CLASS}`)) return 'menu';
  return 'step';
}

/** Rows that fit in a scrolling list, less one so a page keeps a row
 *  of what was showing. */
function screenful(list: HTMLElement | null, row: HTMLElement | null): number {
  const rowHeight = row?.getBoundingClientRect().height ?? 0;
  if (!list || rowHeight <= 0) return 10; // no layout (tests): a plain ten
  return Math.max(1, Math.floor(list.clientHeight / rowHeight) - 1);
}

/** Display-only prettifying of a step's serialized parameters:
 *  `Start="0", End="1"` reads as `Start: 0, End: 1`. The raw string
 *  stays the source of truth for editing and the row's title. */
function prettyParameters(parameters: string): string {
  return parameters.replace(/="([^"]*)"/g, ': $1');
}

/**
 * MacroBuilderDialog — the MuseScore-"New score" layout for building a
 * macro. Everything lives in ONE window: a searchable command list
 * (Instruments) and the macro's step list (Your score), joined by a
 * transfer button. Search is the only filter — there is no category
 * picker (removed 2026-09-28). The search field is
 * always visible, so adding a step never opens a picker window. ONE
 * command is selected at a time (multi-select removed 2026-09-29) and
 * carries a + button. Double-click, the + or Enter adds it to the end;
 * DRAG it into the step list to put it where you want it. Steps are added with default parameters and edited in place
 * via the row pencil; drag a row (or ↑/↓) to reorder and the trash
 * removes it. Non-modal and auto-saving, like MacroEditorDialog.
 *
 * KEYBOARD (docs/accessibility-architecture.md → Edit macro window).
 * Six Tab stops, however many commands and steps there are: search,
 * the command list, the splitter, the macro's menu, the step list, the
 * footer — and Tab goes ROUND them: past the footer is the top again. Both lists are driven by the arrows. The
 * window is non-modal, so the app's document-level shortcuts are still
 * listening: every key a list uses is stopped from reaching them, or
 * the arrows would move the playhead and Delete would ask to delete a
 * track.
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
  onClearSteps,
  onMoveStep,
  onReorderStep,
  availableCommands = [],
  getCommandParameters,
  os = 'macos',
}: MacroBuilderDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  // ONE selected command. It stays selected after it is added, so its
  // + is still there to add it again.
  const [selectedCommandId, setSelectedCommandId] = React.useState<string | null>(null);
  const [commandDrag, setCommandDrag] = React.useState<CommandDrag | null>(null);
  // Set as a drag ends, cleared a moment later: a drag let go over the
  // row it began on is followed by a click on that row, which would
  // select it — and a drag must not touch the selection
  const justDraggedCommandRef = React.useRef(false);
  const stepsPaneRef = React.useRef<HTMLDivElement>(null);
  const [editingStepIndex, setEditingStepIndex] = React.useState<number | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
  const [macroMenuOpen, setMacroMenuOpen] = React.useState(false);
  const [macroMenuPosition, setMacroMenuPosition] = React.useState({ x: 0, y: 0 });
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const stepListRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  // Per-row ⋯ menu: which step's menu is open, and where
  const [stepMenuIndex, setStepMenuIndex] = React.useState<number | null>(null);
  const [stepMenuPosition, setStepMenuPosition] = React.useState({ x: 0, y: 0 });
  const commandListRef = React.useRef<HTMLDivElement>(null);
  // Whether the step table actually overflows — the scrollbar gutter
  // (and the header's matching segment) only exist when there is
  // something to scroll
  const [stepsOverflowing, setStepsOverflowing] = React.useState(false);
  // Splitter: explicit commands-pane width once the user drags (null =
  // DEFAULT_COMMANDS_PANE_WIDTH). Session-scoped, survives macro switches.
  const [commandsPaneWidth, setCommandsPaneWidth] = React.useState<number | null>(null);
  const [splitterActive, setSplitterActive] = React.useState(false);
  const columnsRef = React.useRef<HTMLDivElement>(null);
  const commandsPaneRef = React.useRef<HTMLDivElement>(null);
  const [columnsWidth, setColumnsWidth] = React.useState(0);

  const { activeProfile } = useAccessibilityProfile();
  const isFlat = activeProfile.config.tabNavigation === 'sequential';
  const wrapOf = (groupId: string) => activeProfile.config.tabGroups[groupId]?.wrap ?? true;

  // Roving focus: which command, and which cell of which step, is its
  // list's ONE tab stop. Remembered while focus is elsewhere.
  const [activeCommandId, setActiveCommandId] = React.useState<string | null>(null);
  const [activeStep, setActiveStep] = React.useState<{ index: number; cell: StepCell }>({ index: 0, cell: 'step' });
  // Focus to place once the steps have re-rendered (a move, a delete)
  const pendingStepFocusRef = React.useRef<{ index: number; cell: StepCell } | 'search' | null>(null);

  const footerRef = React.useRef<HTMLDivElement>(null);
  const footerGroup = useContainerTabGroup({
    containerRef: footerRef,
    groupId: 'macro-builder-footer',
    selector: 'button',
    startTabIndex: 0,
    ariaLabel: 'Macro actions',
  });

  // Reset transient state whenever a different macro opens
  React.useEffect(() => {
    setSearchQuery('');
    setSelectedCommandId(null);
    setEditingStepIndex(null);
    setDraggedIndex(null);
    setStepMenuIndex(null);
  }, [macro?.id, isOpen]);

  // The footer's buttons: re-count its stops when what it holds changes
  // (Run and Run on files are optional)
  const initFooterStops = footerGroup.initTabIndices;
  React.useEffect(() => {
    initFooterStops();
  }, [initFooterStops, isOpen, macro?.id, onRun, onRunFiles]);

  // The splitter's range, for its arrows and for assistive tech
  React.useEffect(() => {
    const columns = columnsRef.current;
    if (!columns) return;
    const update = () => setColumnsWidth(columns.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(columns);
    return () => observer.disconnect();
  }, [isOpen, macro?.id]);

  // Place focus after the steps changed under it
  React.useEffect(() => {
    const pending = pendingStepFocusRef.current;
    if (!pending) return;
    pendingStepFocusRef.current = null;
    // After a menu has finished handing focus back to its trigger
    const timer = window.setTimeout(() => {
      if (pending === 'search') searchInputRef.current?.focus();
      else focusStepCell(pending.index, pending.cell);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macro?.steps]);

  // Track step-table overflow (steps added/removed, window resized)
  React.useEffect(() => {
    const list = stepListRef.current;
    if (!list) return;
    const update = () => setStepsOverflowing(list.scrollHeight > list.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  }, [macro?.steps.length, isOpen]);

  const query = searchQuery.trim().toLowerCase();
  const visible = React.useMemo(
    () => (query ? availableCommands.filter((cmd) => cmd.name.toLowerCase().includes(query)) : availableCommands),
    [availableCommands, query],
  );

  const stepCellElement = (index: number, cell: StepCell): HTMLElement | null => {
    const row = stepListRef.current?.querySelector<HTMLElement>(`[data-step-index="${index}"]`) ?? null;
    if (!row || cell === 'step') return row;
    return row.querySelector<HTMLElement>(`.${cell === 'edit' ? STEP_EDIT_CLASS : STEP_MENU_CLASS}`);
  };
  function focusStepCell(index: number, cell: StepCell) {
    const el = stepCellElement(index, cell);
    if (!el) return;
    setActiveStep({ index, cell });
    el.focus();
    el.scrollIntoView?.({ block: 'nearest' }); // jsdom has none
  }
  const stepsHeaderRef = React.useRef<HTMLDivElement>(null);
  const focusMacroMenuButton = () => {
    stepsHeaderRef.current?.querySelector<HTMLElement>('button')?.focus();
  };
  /** Put focus back once a dialog that covered the window has gone. */
  const returnFocus = (to: () => void) => {
    window.setTimeout(to, 0);
  };

  if (!macro) return null;

  const stepCount = macro.steps.length;
  const maxPaneWidth = columnsWidth > 0
    ? Math.max(MIN_PANE_WIDTH, columnsWidth - MIN_PANE_WIDTH - STEPS_PANE_RESERVE)
    : undefined;
  const paneWidth = commandsPaneWidth ?? DEFAULT_COMMANDS_PANE_WIDTH;

  // The command list's one tab stop: where focus last was, else the
  // selected command if it is showing, else the top of the list
  const commandStopId = visible.some((cmd) => cmd.id === activeCommandId)
    ? activeCommandId
    : (visible.find((cmd) => cmd.id === selectedCommandId) ?? visible[0])?.id ?? null;
  const stepStop = {
    index: Math.max(0, Math.min(stepCount - 1, activeStep.index)),
    cell: activeStep.cell,
  };
  // Where a dragged command would land. It is drawn IN the list, as a
  // ghost of the step it would become, with the steps after it
  // renumbered — the list shows the result, not a mark to be read
  // (user decision 2026-09-29, as a reordered track is shown).
  const ghostAt = commandDrag?.insertAt ?? null;
  //
  // It LOOKS exactly like a step being reordered — the same row, the
  // same `--dragging` fade, grip and action icons included — because to
  // the eye it is the same thing: a step in flight. The icons are
  // pictures, not controls.
  const ghostStep = commandDrag && ghostAt !== null ? (
    <div
      key="ghost"
      className="macro-builder__step macro-builder__step--dragging macro-builder__step--ghost"
      data-step-ghost
      // Not a step yet: out of the list for assistive tech, and with no
      // data-step-index, so neither the keyboard nor the drag's own
      // hit test mistakes it for one
      aria-hidden="true"
    >
      <span className="macro-builder__step-grip">
        <Icon name="gripper" size={16} />
      </span>
      <span className="macro-builder__step-number">{Math.min(ghostAt, stepCount) + 1}</span>
      <div className="macro-builder__step-text">
        <span className="macro-builder__step-command">{commandDrag.command.name}</span>
      </div>
      <div className="macro-builder__step-actions">
        {(['edit', 'menu'] as const).map((icon) => (
          <span key={icon} className="ghost-button ghost-button--medium ghost-button--variant-ghost">
            <Icon name={icon} size={16} />
          </span>
        ))}
      </div>
    </div>
  ) : null;
  /** A step's number as the list would read after the drop. */
  const shownNumber = (index: number): number =>
    index + 1 + (ghostAt !== null && index >= ghostAt ? 1 : 0);
  const stepTabIndex = (index: number, cell: StepCell): number => {
    if (isFlat) return 0;
    return index === stepStop.index && cell === stepStop.cell ? 0 : -1;
  };

  // Click selects — one command at a time, whatever modifier is held
  const handleCommandClick = (command: Command, e: React.MouseEvent) => {
    // The second click of a double-click changes nothing — the dblclick
    // handler owns that gesture
    if (e.detail >= 2) return;
    // Nor does the click that ends a drag
    if (justDraggedCommandRef.current) return;
    setSelectedCommandId(command.id);
  };

  /** Add a command as a step: on the end, or at `atIndex` (a drag).
   *
   *  Adding from the LIST — the +, a double-click, Enter — leaves the
   *  command selected, so it can be added again. A DRAG does not touch
   *  the selection at all (user decision 2026-09-29, after selecting on
   *  pick-up was tried): dragging is reaching past the list to the
   *  steps, not choosing in the list. */
  const addCommand = (command: Command, atIndex?: number) => {
    const at = atIndex === undefined ? stepCount : Math.max(0, Math.min(stepCount, atIndex));
    if (atIndex === undefined) {
      onAddCommand?.(macro.id, command);
      setSelectedCommandId(command.id);
    } else {
      onAddCommand?.(macro.id, command, undefined, at);
    }
    // Focus stays in the command list, so say what happened in the
    // other pane — otherwise adding is silent to a screen reader
    announce(`${command.name} added as step ${at + 1}`);
  };

  // Drag a command into the step list to put it where you want it. The
  // same self-cleaning listeners as the step rows' own drag (attached on
  // mousedown, removed on mouseup — exempt from the ref-mirror rule).
  // Nothing is added until the drop, so a drag can always be abandoned:
  // release anywhere but the step list, or press Escape.
  const handleCommandMouseDown = (command: Command) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // The row's + owns its own presses: a press on it that wanders a
    // few pixels is still a click, not the start of a drag
    if ((e.target as HTMLElement).closest('button')) return;
    const doc = e.currentTarget.ownerDocument;
    const view = doc.defaultView ?? window;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let insertAt: number | null = null;
    let lastX = startX;
    let lastY = startY;
    let rafId: number | null = null;

    /** Which step the pointer would drop in front of. Anywhere over the
     *  steps pane counts: above the rows is the top, below them the end. */
    const insertIndexAt = (x: number, y: number): number | null => {
      const pane = stepsPaneRef.current?.getBoundingClientRect();
      if (!pane || x < pane.left || x > pane.right || y < pane.top || y > pane.bottom) return null;
      const rows = stepListRef.current?.querySelectorAll<HTMLElement>('[data-step-index]') ?? [];
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (y < rect.top + rect.height / 2) return Number(row.dataset.stepIndex);
      }
      return rows.length;
    };
    const update = () => {
      insertAt = insertIndexAt(lastX, lastY);
      setCommandDrag({ command, x: lastX, y: lastY, insertAt });
    };
    const scrollVelocity = (): number => {
      const list = stepListRef.current;
      if (!list || insertAt === null) return 0;
      const rect = list.getBoundingClientRect();
      if (lastY < rect.top + DROP_EDGE_ZONE) {
        return -Math.ceil(Math.min(1, (rect.top + DROP_EDGE_ZONE - lastY) / DROP_EDGE_ZONE) * DROP_MAX_SCROLL_SPEED);
      }
      if (lastY > rect.bottom - DROP_EDGE_ZONE) {
        return Math.ceil(Math.min(1, (lastY - (rect.bottom - DROP_EDGE_ZONE)) / DROP_EDGE_ZONE) * DROP_MAX_SCROLL_SPEED);
      }
      return 0;
    };
    const scrollLoop = () => {
      const list = stepListRef.current;
      const velocity = scrollVelocity();
      if (list && velocity !== 0) {
        const before = list.scrollTop;
        list.scrollTop += velocity;
        if (list.scrollTop !== before) update();
      }
      rafId = view.requestAnimationFrame(scrollLoop);
    };

    const finish = () => {
      doc.removeEventListener('mousemove', onMouseMove);
      doc.removeEventListener('mouseup', onMouseUp);
      view.removeEventListener('keydown', onKeyDown, true);
      if (rafId !== null) view.cancelAnimationFrame(rafId);
      doc.body.style.removeProperty('cursor');
      doc.body.style.removeProperty('user-select');
      setCommandDrag(null);
    };
    const onMouseMove = (ev: MouseEvent) => {
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (!dragging) {
        if (Math.hypot(lastX - startX, lastY - startY) < COMMAND_DRAG_THRESHOLD) return;
        dragging = true;
        doc.body.style.cursor = 'grabbing';
        doc.body.style.userSelect = 'none';
        rafId = view.requestAnimationFrame(scrollLoop);
      }
      update();
    };
    const onMouseUp = () => {
      const dropAt = dragging ? insertAt : null;
      if (dragging) {
        justDraggedCommandRef.current = true;
        view.setTimeout(() => { justDraggedCommandRef.current = false; }, 0);
      }
      finish();
      if (dropAt !== null) addCommand(command, dropAt);
    };
    // Escape abandons the drag. On WINDOW, in the capture phase: the
    // dialog takes Escape on document-capture to close itself, and a
    // drag must be let go of without losing the window.
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || !dragging) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      finish();
    };
    doc.addEventListener('mousemove', onMouseMove);
    doc.addEventListener('mouseup', onMouseUp);
    view.addEventListener('keydown', onKeyDown, true);
  };

  const focusCommandRow = (id: string) => {
    // Ids carry ':' and '/' — quoting the attribute value is enough
    commandListRef.current
      ?.querySelector<HTMLButtonElement>(`[data-command-id="${id}"]`)
      ?.focus();
  };

  // The command list is a listbox: ONE tab stop, driven by the arrows,
  // with selection following focus so Enter adds whatever they landed
  // on.
  const handleCommandListKeyDown = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-command-id]');
    const id = el?.dataset.commandId;
    if (!el || !id) return;
    const at = visible.findIndex((cmd) => cmd.id === id);
    if (at < 0) return;
    // Consumed keys stop here. The window is non-modal, so the app's
    // document shortcuts still run: left to them, the arrows and
    // Home/End move the project's playhead.
    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    const command = e.metaKey || e.ctrlKey;
    if (e.key === 'Enter' && !command && !e.altKey) {
      // Enter is the add gesture
      consume();
      addCommand(visible[at]);
      return;
    }
    if (command || e.altKey) return; // chords stay the app's
    const last = visible.length - 1;
    const clamp = (n: number) => Math.max(0, Math.min(last, n));
    const cycle = wrapOf('macro-builder-commands');
    let to: number;
    switch (e.key) {
      case 'ArrowDown': to = cycle ? (at + 1) % visible.length : clamp(at + 1); break;
      case 'ArrowUp': to = cycle ? (at - 1 + visible.length) % visible.length : clamp(at - 1); break;
      case 'Home': to = 0; break;
      case 'End': to = last; break;
      case 'PageDown': to = clamp(at + screenful(commandListRef.current, el)); break;
      case 'PageUp': to = clamp(at - screenful(commandListRef.current, el)); break;
      // One column: nothing to the side. Still kept from the playhead.
      case 'ArrowLeft':
      case 'ArrowRight': consume(); return;
      default: return;
    }
    consume();
    const target = visible[to];
    // Shift changes nothing: there is no range to grow
    setSelectedCommandId(target.id);
    setActiveCommandId(target.id);
    focusCommandRow(target.id);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      // Drop from the search into the list: select + focus the first hit
      e.preventDefault();
      const first = visible[0];
      if (first) {
        setSelectedCommandId(first.id);
        setActiveCommandId(first.id);
        focusCommandRow(first.id);
      }
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // The first result. Nothing is selected while the field has focus
    // (focusing it lets go of the selection), so there is no other
    // candidate — and what Enter adds is always the top of what shows.
    if (visible[0]) addCommand(visible[0]);
  };

  // Splitter between the commands pane and the rest: drag sets an
  // explicit width (clamped so neither pane collapses); double-click
  // resets to the default. Self-cleaning document listeners.
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = commandsPaneRef.current?.getBoundingClientRect().width ?? 0;
    const columnsWidth = columnsRef.current?.getBoundingClientRect().width ?? 0;
    const MIN_PANE = MIN_PANE_WIDTH;
    setSplitterActive(true);

    const onMouseMove = (ev: MouseEvent) => {
      let width = startWidth + (ev.clientX - startX);
      width = Math.max(MIN_PANE, width);
      if (columnsWidth > 0) width = Math.min(width, columnsWidth - MIN_PANE - STEPS_PANE_RESERVE);
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

  // The splitter from the keyboard: arrows resize, Home/End go to the
  // limits, Enter resets — the mouse's drag and double-click.
  const handleSplitterKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const max = maxPaneWidth ?? Number.POSITIVE_INFINITY;
    const by = e.shiftKey ? SPLITTER_BIG_STEP : SPLITTER_STEP;
    let width: number | null;
    switch (e.key) {
      case 'ArrowLeft': width = paneWidth - by; break;
      case 'ArrowRight': width = paneWidth + by; break;
      case 'Home': width = MIN_PANE_WIDTH; break;
      case 'End': if (maxPaneWidth === undefined) return; width = maxPaneWidth; break;
      case 'Enter': width = null; break;
      // Kept from the app even though they do nothing here
      case 'ArrowUp':
      case 'ArrowDown': e.preventDefault(); e.stopPropagation(); return;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
    setCommandsPaneWidth(width === null ? null : Math.max(MIN_PANE_WIDTH, Math.min(max, width)));
  };

  // Where focus goes is said BEFORE the change, and placed once the
  // steps have re-rendered: the row that had focus is about to be a
  // different step, or gone.
  const moveStepAt = (index: number, direction: -1 | 1, cell: StepCell = 'menu') => {
    const target = index + direction;
    if (target < 0 || target >= stepCount) return;
    pendingStepFocusRef.current = { index: target, cell };
    onMoveStep?.(macro.id, index, direction);
    announce(`${macro.steps[index].command} moved to step ${target + 1} of ${stepCount}`);
  };

  const deleteStepAt = (index: number, cell: StepCell = 'menu') => {
    // The step that takes its place, else the one before, else search
    pendingStepFocusRef.current = stepCount > 1
      ? { index: Math.min(index, stepCount - 2), cell }
      : 'search';
    onDeleteStep?.(macro.id, index);
    announce(`Step ${index + 1}, ${macro.steps[index].command}, deleted`);
  };

  // The step list: ONE tab stop. Down/Up go down and up the steps,
  // Left/Right along a step's row (the step, its edit button, its
  // menu) — the same two moves as the Macro manager's list.
  const handleStepListKeyDown = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-step-index]');
    if (!row || !stepListRef.current?.contains(row)) return;
    const index = Number(row.dataset.stepIndex);
    const cell = stepCellOf(target);
    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    const command = e.metaKey || e.ctrlKey;

    // Actions — every profile, from any cell of the row
    if (e.key === 'Enter' && cell === 'step' && !command && !e.altKey && !e.shiftKey) {
      // On the row only: Enter on a button is that button's own
      consume();
      setEditingStepIndex(index);
      return;
    }
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      consume();
      stepCellElement(index, 'menu')?.click();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !command && !e.altKey) {
      consume();
      deleteStepAt(index, cell);
      return;
    }
    if (command && !e.altKey && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      // Cmd/Ctrl+arrow carries the step with it, as it does a track.
      // Consumed at the ends too.
      consume();
      moveStepAt(index, e.key === 'ArrowUp' ? -1 : 1, cell);
      return;
    }

    if (isFlat) return; // arrows are the tab-groups profile's
    if (command || e.altKey || e.shiftKey) return;
    const cycle = wrapOf('macro-builder-steps');
    const goToStep = (next: number) => {
      consume();
      const to = Math.max(0, Math.min(stepCount - 1, next));
      if (to !== index) focusStepCell(to, cell);
    };
    const along = (by: number) => {
      consume();
      const at = STEP_CELLS.indexOf(cell);
      const to = cycle
        ? (at + by + STEP_CELLS.length) % STEP_CELLS.length
        : Math.max(0, Math.min(STEP_CELLS.length - 1, at + by));
      if (to !== at) focusStepCell(index, STEP_CELLS[to]);
    };
    switch (e.key) {
      case 'ArrowDown': goToStep(cycle ? (index + 1) % stepCount : index + 1); break;
      case 'ArrowUp': goToStep(cycle ? (index - 1 + stepCount) % stepCount : index - 1); break;
      case 'Home': goToStep(0); break;
      case 'End': goToStep(stepCount - 1); break;
      case 'PageDown': goToStep(index + screenful(stepListRef.current, row)); break;
      case 'PageUp': goToStep(index - screenful(stepListRef.current, row)); break;
      case 'ArrowRight': along(1); break;
      case 'ArrowLeft': along(-1); break;
      default: break;
    }
  };

  const handleStepListFocus = (e: React.FocusEvent) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-step-index]');
    if (!row) return;
    const index = Number(row.dataset.stepIndex);
    const cell = stepCellOf(e.target as HTMLElement);
    if (index !== activeStep.index || cell !== activeStep.cell) setActiveStep({ index, cell });
  };

  // Whole-row drag-to-reorder (the row IS the handle, with a 3px
  // threshold so double-clicks still edit). Same live-swap + edge
  // auto-scroll machinery as MacroEditorDialog's grip drag: document
  // listeners are attached on mousedown and removed on mouseup
  // (self-cleaning, exempt from the ref-mirror rule), the row whose
  // bounds the pointer enters swaps with the dragged row, and near the
  // list's top/bottom edge a rAF loop scrolls while re-running the
  // swap test each frame.
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
        title="Edit macro"
        onClose={onClose}
        os={os}
        nonModal
        // Tab goes round the window rather than out into the app
        // behind it (user decision 2026-09-29)
        loopTab
        closeOnClickOutside={false}
        width={816}
        minHeight="min(600px, calc(100vh - 32px))"
        customLayout
        className="macro-builder"
      >
        <div ref={columnsRef} className={`macro-builder__columns${splitterActive ? ' macro-builder__columns--resizing' : ''}`}>
          {/* Command pane — the mockup's "Instruments" pane */}
          <div
            ref={commandsPaneRef}
            className="macro-builder__commands-pane"
            style={{ flex: `0 0 ${commandsPaneWidth ?? DEFAULT_COMMANDS_PANE_WIDTH}px` }}
          >
            {/* One header band, two jobs: this half filters the list */}
            <div className="macro-builder__commands-header">
              <div className="macro-builder__search-container">
                <Icon name="search" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="macro-builder__search-input"
                  value={searchQuery}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSearchQuery(next);
                    // A selection the search has hidden is no selection:
                    // nothing unseen should be what Enter adds
                    const q = next.trim().toLowerCase();
                    const stillShown = availableCommands.some(
                      (cmd) => cmd.id === selectedCommandId && (!q || cmd.name.toLowerCase().includes(q)),
                    );
                    if (!stillShown) setSelectedCommandId(null);
                  }}
                  placeholder="Search"
                  aria-label="Search commands"
                  autoFocus
                  // Going to the search field lets go of the selection
                  // (user decision 2026-09-29): you are looking for
                  // something else now. On focus, so a click and the
                  // keyboard agree.
                  onFocus={() => setSelectedCommandId(null)}
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
            <div
              ref={commandListRef}
              className="macro-builder__command-list"
              role="listbox"
              aria-label="Available commands"
              onKeyDown={handleCommandListKeyDown}
            >
              {visible.length === 0 && (
                <div className="macro-builder__empty">
                  {query ? `No commands match “${searchQuery.trim()}”` : 'No commands'}
                </div>
              )}
              {visible.map((command) => {
                const isSelected = command.id === selectedCommandId;
                return (
                  <div
                    key={command.id}
                    role="option"
                    aria-selected={isSelected}
                    data-command-id={command.id}
                    className={`macro-builder__command-item${isSelected ? ' macro-builder__command-item--selected' : ''}`}
                    onClick={(e) => handleCommandClick(command, e)}
                    onDoubleClick={() => addCommand(command)}
                    onMouseDown={handleCommandMouseDown(command)}
                    // One tab stop for the whole list — 280 commands
                    // were 280 presses of Tab between search and steps
                    tabIndex={command.id === commandStopId ? 0 : -1}
                    onFocus={() => setActiveCommandId(command.id)}
                  >
                    <span className="macro-builder__command-name" title={command.name}>{command.name}</span>
                    {isSelected && (
                      // The selected command's + adds it to the end —
                      // the one-click twin of double-click. Out of the
                      // Tab order and hidden from assistive tech: an
                      // option cannot hold a control, and the keyboard
                      // already has Enter. A double-click here is two
                      // adds — it must not also reach the row, which
                      // would make it three.
                      <span
                        className="macro-builder__command-add"
                        aria-hidden="true"
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        <GhostButton
                          icon="plus"
                          size="small"
                          tabIndex={-1}
                          ariaLabel={`Add ${command.name}`}
                          onClick={() => addCommand(command)}
                        />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Splitter — drag to resize the commands pane; double-click
              resets it to the default width */}
          <div
            className="macro-builder__splitter"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize command list"
            // A focusable separator is a control with a value
            aria-valuenow={Math.round(paneWidth)}
            aria-valuemin={MIN_PANE_WIDTH}
            aria-valuemax={maxPaneWidth === undefined ? undefined : Math.round(maxPaneWidth)}
            aria-valuetext={`${Math.round(paneWidth)} pixels`}
            tabIndex={0}
            onKeyDown={handleSplitterKeyDown}
            onMouseDown={handleSplitterMouseDown}
            onDoubleClick={() => setCommandsPaneWidth(null)}
          />

          {/* Steps pane — its header shares the band: macro name + menu.
              Below it, the macro as a TABLE: Step | Command | Actions. */}
          <div ref={stepsPaneRef} className="macro-builder__steps-pane">
            <div ref={stepsHeaderRef} className="macro-builder__steps-header">
              <h2 className="macro-builder__macro-name">{macro.name}</h2>
              <GhostButton
                icon="menu"
                size="medium"
                ariaLabel="Macro options"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMacroMenuPosition({ x: rect.right, y: rect.bottom });
                  setMacroMenuOpen(true);
                }}
              />
            </div>
            <div className="macro-builder__step-table-head">
              <span className="macro-builder__step-grip macro-builder__step-head-cell" />
              <span className="macro-builder__step-number macro-builder__step-head-cell">Step</span>
              <span className="macro-builder__step-text macro-builder__step-head-cell">Command</span>
              <span className="macro-builder__step-actions macro-builder__step-head-cell">Actions</span>
              {/* Offsets the head by the body's 16px scrollbar gutter so
                  the Actions column lines up with the rows — only while
                  the table actually scrolls (the gutter exists only
                  when there is something to scroll) */}
              {stepsOverflowing && (
                <span className="macro-builder__step-head-gutter" aria-hidden="true" />
              )}
            </div>
            <div
              ref={stepListRef}
              className={`macro-builder__step-list${draggedIndex !== null ? ' macro-builder__step-list--dragging' : ''}`}
              role="list"
              aria-label="Macro steps"
              onKeyDown={handleStepListKeyDown}
              onFocus={handleStepListFocus}
            >
              {stepCount === 0 && ghostStep === null && (
                <div className="macro-builder__steps-hint">
                  Drag a command here, or double-click it, to add it to your macro
                </div>
              )}
              {macro.steps.map((step, index) => {
                return (
                  <React.Fragment key={index}>
                  {ghostAt === index && ghostStep}
                  <div
                    role="listitem"
                    tabIndex={stepTabIndex(index, 'step')}
                    data-step-index={index}
                    aria-label={`Step ${index + 1} of ${stepCount}: ${step.command}${step.parameters ? `, ${prettyParameters(step.parameters)}` : ''}`}
                    className={`macro-builder__step${index === draggedIndex ? ' macro-builder__step--dragging' : ''}`}
                    onMouseDown={handleStepMouseDown(index)}
                    onDoubleClick={() => setEditingStepIndex(index)}
                  >
                    <span className="macro-builder__step-grip" aria-hidden="true">
                      <Icon name="gripper" size={16} />
                    </span>
                    <span className="macro-builder__step-number">{shownNumber(index)}</span>
                    <div className="macro-builder__step-text">
                      <span className="macro-builder__step-command">{step.command}</span>
                      {step.parameters && (
                        <span
                          className="macro-builder__step-parameters"
                          title={prettyParameters(step.parameters)}
                        >
                          {prettyParameters(step.parameters)}
                        </span>
                      )}
                    </div>
                    <div className="macro-builder__step-actions">
                      <GhostButton
                        icon="edit"
                        size="medium"
                        className={STEP_EDIT_CLASS}
                        tabIndex={stepTabIndex(index, 'edit')}
                        ariaLabel={`Edit step ${index + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStepIndex(index);
                        }}
                      />
                      <GhostButton
                        icon="menu"
                        size="medium"
                        className={STEP_MENU_CLASS}
                        tabIndex={stepTabIndex(index, 'menu')}
                        ariaLabel={`Step ${index + 1} options`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setStepMenuPosition({ x: rect.right, y: rect.bottom });
                          setStepMenuIndex(index);
                        }}
                      />
                    </div>
                  </div>
                  </React.Fragment>
                );
              })}
              {ghostAt !== null && ghostAt >= stepCount && ghostStep}
            </div>
          </div>

        </div>

        <div
          ref={footerRef}
          className="macro-builder__footer"
          {...footerGroup.containerProps}
          onKeyDown={footerGroup.onKeyDown}
          onFocus={footerGroup.onFocus}
          onBlur={footerGroup.onBlur}
          onClickCapture={footerGroup.onClickCapture}
        >
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

      {/* The command in flight, as a chip at the pointer — only while
          it is NOT over the steps. Over them it is shown as a ghost
          step in the list instead, and the two would say the same
          thing. In the body, not the window: a fixed box inside a moved
          or transformed ancestor is placed relative to THAT, and would
          trail the pointer by the window's offset. */}
      {commandDrag && commandDrag.insertAt === null && createPortal(
        <div
          className="macro-builder__drag-ghost macro-builder__drag-ghost--no-drop"
          aria-hidden="true"
          style={{ left: commandDrag.x, top: commandDrag.y }}
        >
          {commandDrag.command.name}
        </div>,
        commandsPaneRef.current?.ownerDocument.body ?? document.body,
      )}

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
          label="Remove all steps"
          disabled={stepCount === 0}
          onClick={() => {
            setMacroMenuOpen(false);
            // Nothing left in the list to hold focus
            pendingStepFocusRef.current = 'search';
            onClearSteps?.(macro.id);
            announce('All steps removed');
          }}
        />
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
        onClose={() => {
          setIsRenameDialogOpen(false);
          returnFocus(focusMacroMenuButton);
        }}
        onRename={(newName) => {
          onRenameMacro?.(macro.id, newName);
          setIsRenameDialogOpen(false);
          returnFocus(focusMacroMenuButton);
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
        // Back to the step that was being edited, on the row itself
        const closeEditor = () => {
          const index = editingStepIndex;
          setEditingStepIndex(null);
          if (index !== null) returnFocus(() => focusStepCell(index, 'step'));
        };
        if (editingStep && schema) {
          return (
            <CommandParametersDialog
              isOpen
              commandName={editingStep.command}
              parameters={schema}
              initialParameters={editingStep.parameters}
              onClose={closeEditor}
              onSubmit={save}
              os={os}
            />
          );
        }
        return (
          <EditStepDialog
            isOpen={editingStepIndex !== null}
            step={editingStep}
            onClose={closeEditor}
            onSave={save}
            os={os}
          />
        );
      })()}
    </>
  );
}

export default MacroBuilderDialog;

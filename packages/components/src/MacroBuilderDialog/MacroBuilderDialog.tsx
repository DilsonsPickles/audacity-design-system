import React from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '../Dialog';
import { useTheme } from '../ThemeProvider';
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

/** The step table's columns, left to right. The grip is the first: the
 *  mouse drags it, and the keyboard steps INTO it (Enter / Space) to
 *  carry the step with Up / Down. */
type GridCol = 'grip' | 'number' | 'command' | 'actions';
const GRID_COLS: readonly GridCol[] = ['grip', 'number', 'command', 'actions'];
/** The controls inside the Actions cell, left to right. */
type ActionControl = 'edit' | 'menu';
const ACTION_CONTROLS: readonly ActionControl[] = ['edit', 'menu'];
const STEP_EDIT_CLASS = 'macro-builder__step-edit';
const STEP_MENU_CLASS = 'macro-builder__step-menu';

/** A place in the step table: row 0 is the head, step i is row i + 1;
 *  `inner` names a control inside the Actions cell once it has been
 *  entered (Enter / Space on the cell). */
interface GridPos {
  row: number;
  col: GridCol;
  inner?: ActionControl;
}
/** Where Tab lands before the table has been used: the head's first cell. */
const HEAD_CELL: GridPos = { row: 0, col: 'grip' };
const samePos = (a: GridPos, b: GridPos) => a.row === b.row && a.col === b.col && a.inner === b.inner;

function gridPosOf(el: Element): GridPos | null {
  const cell = el.closest<HTMLElement>('[data-grid-row]');
  if (!cell) return null;
  const row = Number(cell.dataset.gridRow);
  const col = cell.dataset.gridCol as GridCol;
  if (el.closest(`.${STEP_EDIT_CLASS}`)) return { row, col, inner: 'edit' };
  if (el.closest(`.${STEP_MENU_CLASS}`)) return { row, col, inner: 'menu' };
  return { row, col };
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
  const { theme } = useTheme();
  // THE DIALOG FOLLOWS THE THEME (2026-10-13, "check macro manager… in
  // dark mode, seems broken": MacroBuilderDialog.css reads these
  // variables with light fallbacks and nothing set them, so the command
  // list and the steps table stayed light in a dark window)
  const accent = theme.background.control.button.primary.idle;
  const builderVars = {
    '--accent-primary': accent,
    '--accent-primary-tint': `color-mix(in srgb, ${accent} 20%, transparent)`,
    '--bg-table-header': theme.background.surface.subtle,
    '--bg-table-item-idle': theme.background.surface.default,
    '--button-ghost-hover': theme.background.menu.item.hover,
    '--dialog-header-bg': theme.background.surface.default,
    '--focus-border-color': theme.border.focus,
    '--input-bg': theme.background.control.input.idle,
    '--input-border': theme.border.input.idle,
    '--input-border-active': theme.border.focus,
    '--macro-builder-list-bg': theme.background.surface.subtle,
    '--macro-builder-well-bg': theme.background.surface.subtle,
    '--stroke-primary': theme.border.default,
    '--stroke-table-item': theme.border.default,
    '--text-primary': theme.foreground.text.primary,
    '--text-secondary': theme.foreground.text.secondary,
  } as React.CSSProperties;
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

  // Roving focus: which command, and which cell of the step table, is
  // its list's ONE tab stop. Remembered while focus is elsewhere; the
  // table's starts on the head's first cell.
  const [activeCommandId, setActiveCommandId] = React.useState<string | null>(null);
  const [activePos, setActivePos] = React.useState<GridPos>(HEAD_CELL);
  // The step being REORDERED from the keyboard — its grip cell was
  // entered with Enter / Space; Up / Down carry it until Enter, Space
  // or Escape lets go (or focus leaves the cell)
  const [reorderingIndex, setReorderingIndex] = React.useState<number | null>(null);
  // Focus to place once the steps have re-rendered (a move, a delete)
  const pendingStepFocusRef = React.useRef<GridPos | 'search' | null>(null);

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
      else focusGridCell(pending);
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

  const stepTableRef = React.useRef<HTMLDivElement>(null);
  const gridCellElement = (pos: GridPos): HTMLElement | null => {
    const cell = stepTableRef.current?.querySelector<HTMLElement>(
      `[data-grid-row="${pos.row}"][data-grid-col="${pos.col}"]`,
    ) ?? null;
    if (!cell || !pos.inner) return cell;
    return cell.querySelector<HTMLElement>(`.${pos.inner === 'edit' ? STEP_EDIT_CLASS : STEP_MENU_CLASS}`);
  };
  function focusGridCell(pos: GridPos) {
    const el = gridCellElement(pos);
    if (!el) return;
    setActivePos(pos);
    el.focus();
    el.scrollIntoView?.({ block: 'nearest' }); // jsdom has none
  }
  /** The step's menu button, for the menu key and the menu's own focus return. */
  const stepMenuButton = (index: number) => gridCellElement({ row: index + 1, col: 'actions', inner: 'menu' });
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
  // The remembered cell, kept inside the table as it is now (a step
  // that was deleted from under it falls to the last row)
  const gridStop: GridPos = activePos.row > stepCount
    ? { row: stepCount, col: activePos.col, inner: stepCount > 0 ? activePos.inner : undefined }
    : activePos;
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
  const gridTabIndex = (pos: GridPos): number => {
    if (isFlat) return 0;
    return samePos(pos, gridStop) ? 0 : -1;
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
  // `from` is the cell the edit was made from, so focus can stay in that
  // column; the menu's items come from its button.
  const fromMenu = (index: number): GridPos => ({ row: index + 1, col: 'actions', inner: 'menu' });
  const moveStepAt = (index: number, direction: -1 | 1, from: GridPos = fromMenu(index)) => {
    const target = index + direction;
    if (target < 0 || target >= stepCount) return;
    pendingStepFocusRef.current = { ...from, row: target + 1 };
    if (reorderingIndex === index) setReorderingIndex(target);
    onMoveStep?.(macro.id, index, direction);
    announce(`${macro.steps[index].command} moved to step ${target + 1} of ${stepCount}`);
  };

  const deleteStepAt = (index: number, from: GridPos = fromMenu(index)) => {
    // The step that takes its place, else the one before, else the head
    // — the table is still there to hold focus
    pendingStepFocusRef.current = stepCount > 1
      ? { ...from, row: Math.min(index, stepCount - 2) + 1 }
      : HEAD_CELL;
    onDeleteStep?.(macro.id, index);
    announce(`Step ${index + 1}, ${macro.steps[index].command}, deleted`);
  };

  // The step table: ONE tab stop, on the head's first cell until the
  // table has been used. The arrows move between CELLS — Down/Up by row,
  // the head row included, Left/Right by column, Home/End the row's
  // ends, Cmd/Ctrl+Home/End the table's corners — and Enter or Space
  // goes INTO a cell: the Command cell opens the step's editor, the
  // Actions cell hands focus to its first control (then Left/Right go
  // between its controls and Escape comes back out). The data grid's
  // model (2026-10-21, "tab focus to start on top left cell (table
  // header) and then arrow keys move through. Enter/Space to enter
  // cell"); before, the row and its two buttons took focus in turn.
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    const pos = gridPosOf(target);
    if (!pos || !stepTableRef.current?.contains(target)) return;
    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    const command = e.metaKey || e.ctrlKey;
    const plain = !command && !e.altKey && !e.shiftKey;
    const index = pos.row - 1; // -1 on the head row
    const onStep = index >= 0 && index < stepCount;
    const rowCount = stepCount + 1;

    // Carrying a step from its grip cell: Up / Down move it, Enter,
    // Space or Escape let go. Consumed whatever they do. The carried
    // step is read from STATE, not from the focused cell: focus follows
    // a move a tick after the re-render, and a key repeat (Down held)
    // arrives before it has — read from the cell, the second press saw
    // the row the step had just left and let go of it.
    if (reorderingIndex !== null && pos.col === 'grip' && pos.row > 0 && plain) {
      const carried = reorderingIndex;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        consume();
        moveStepAt(carried, e.key === 'ArrowUp' ? -1 : 1, { row: carried + 1, col: 'grip' });
        return;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        consume();
        setReorderingIndex(null);
        announce(`${macro.steps[carried].command} is step ${carried + 1} of ${stepCount}`);
        return;
      }
      // Any other key lets go and does what it does
      setReorderingIndex(null);
    }

    // Going into a cell — every profile. Space is the table's here (it
    // is play/pause elsewhere in the app): a key that enters a cell
    // must never also start playback.
    if ((e.key === 'Enter' || e.key === ' ') && plain && !pos.inner) {
      consume();
      if (!onStep) return; // the head, or the hint: nothing to go into
      if (pos.col === 'grip') {
        setReorderingIndex(index);
        announce(`Reordering step ${index + 1}, ${macro.steps[index].command}. Up and Down move it, Enter when done`);
      } else if (pos.col === 'command') setEditingStepIndex(index);
      else if (pos.col === 'actions') focusGridCell({ ...pos, inner: ACTION_CONTROLS[0] });
      return;
    }
    if (pos.inner) {
      // Inside the Actions cell: Enter and Space are the button's own;
      // Escape comes back out to the cell
      if (e.key === 'Enter' || e.key === ' ') return;
      if (e.key === 'Escape') {
        consume();
        focusGridCell({ row: pos.row, col: pos.col });
        return;
      }
    }

    // Row shortcuts — every profile, from any cell of a step's row
    if (onStep) {
      if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
        consume();
        stepMenuButton(index)?.click();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !command && !e.altKey) {
        consume();
        deleteStepAt(index, pos);
        return;
      }
      if (command && !e.altKey && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        // Cmd/Ctrl+arrow carries the step with it, as it does a track.
        // Consumed at the ends too.
        consume();
        moveStepAt(index, e.key === 'ArrowUp' ? -1 : 1, pos);
        return;
      }
    }

    if (isFlat) return; // arrows are the tab-groups profile's
    if (command && !e.altKey && !e.shiftKey && (e.key === 'Home' || e.key === 'End')) {
      // The table's corners
      consume();
      focusGridCell(e.key === 'Home' ? HEAD_CELL : { row: rowCount - 1, col: GRID_COLS[GRID_COLS.length - 1] });
      return;
    }
    if (command || e.altKey || e.shiftKey) return;
    const cycle = wrapOf('macro-builder-steps');
    const goToRow = (next: number) => {
      consume();
      const to = Math.max(0, Math.min(rowCount - 1, next));
      // A control inside the Actions cell is kept down the column; the
      // head has no controls
      if (to !== pos.row) focusGridCell({ row: to, col: pos.col, inner: to > 0 ? pos.inner : undefined });
    };
    const along = (by: number) => {
      consume();
      if (pos.inner) {
        // Between the cell's own controls, cycling
        const at = ACTION_CONTROLS.indexOf(pos.inner);
        focusGridCell({ ...pos, inner: ACTION_CONTROLS[(at + by + ACTION_CONTROLS.length) % ACTION_CONTROLS.length] });
        return;
      }
      const at = GRID_COLS.indexOf(pos.col);
      const to = cycle
        ? (at + by + GRID_COLS.length) % GRID_COLS.length
        : Math.max(0, Math.min(GRID_COLS.length - 1, at + by));
      if (to !== at) focusGridCell({ row: pos.row, col: GRID_COLS[to] });
    };
    const toCol = (col: GridCol) => {
      consume();
      if (col !== pos.col || pos.inner) focusGridCell({ row: pos.row, col });
    };
    const rowEl = target.closest<HTMLElement>('[data-step-index]');
    switch (e.key) {
      case 'ArrowDown': goToRow(cycle ? (pos.row + 1) % rowCount : pos.row + 1); break;
      case 'ArrowUp': goToRow(cycle ? (pos.row - 1 + rowCount) % rowCount : pos.row - 1); break;
      case 'Home': toCol(GRID_COLS[0]); break;
      case 'End': toCol(GRID_COLS[GRID_COLS.length - 1]); break;
      case 'PageDown': goToRow(pos.row + screenful(stepListRef.current, rowEl)); break;
      case 'PageUp': goToRow(pos.row - screenful(stepListRef.current, rowEl)); break;
      case 'ArrowRight': along(1); break;
      case 'ArrowLeft': along(-1); break;
      default: break;
    }
  };

  const handleGridFocus = (e: React.FocusEvent) => {
    const pos = gridPosOf(e.target as HTMLElement);
    if (pos && !samePos(pos, activePos)) setActivePos(pos);
    // A step is carried only while its grip cell has the focus
    if (reorderingIndex !== null && !(pos && pos.col === 'grip' && pos.row === reorderingIndex + 1)) {
      setReorderingIndex(null);
    }
  };
  const handleGridBlur = (e: React.FocusEvent) => {
    if (reorderingIndex === null) return;
    const next = e.relatedTarget instanceof Element ? gridPosOf(e.relatedTarget) : null;
    if (!(next && next.col === 'grip' && next.row === reorderingIndex + 1)) setReorderingIndex(null);
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
        style={builderVars}
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
            {/* The table is an ARIA grid (2026-10-21): the head is its
                first row of column headers, the scrolling list its
                rowgroup, every step a row of cells — so a screen reader
                announces "table, N rows, 3 columns", reads the column's
                name over each cell, and its own table navigation works.
                The CELLS take the focus (data-grid-row / data-grid-col
                place them; the one tab stop is `gridStop`), the head's
                included. The grip is the mouse's drag handle, not a
                column: it is hidden from the tree. */}
            <div
              ref={stepTableRef}
              className="macro-builder__step-table"
              role="grid"
              aria-label="Macro steps"
              aria-rowcount={Math.max(stepCount, 1) + 1}
              aria-colcount={GRID_COLS.length}
              onKeyDown={handleGridKeyDown}
              onFocus={handleGridFocus}
              onBlur={handleGridBlur}
            >
            <div className="macro-builder__step-table-head" role="row" aria-rowindex={1}>
              <span
                className="macro-builder__step-grip macro-builder__step-head-cell"
                role="columnheader"
                aria-colindex={1}
                aria-label="Reorder"
                data-grid-row={0}
                data-grid-col="grip"
                tabIndex={gridTabIndex({ row: 0, col: 'grip' })}
              />
              <span
                className="macro-builder__step-number macro-builder__step-head-cell"
                role="columnheader"
                aria-colindex={2}
                data-grid-row={0}
                data-grid-col="number"
                tabIndex={gridTabIndex({ row: 0, col: 'number' })}
              >
                Step
              </span>
              <span
                className="macro-builder__step-text macro-builder__step-head-cell"
                role="columnheader"
                aria-colindex={3}
                data-grid-row={0}
                data-grid-col="command"
                tabIndex={gridTabIndex({ row: 0, col: 'command' })}
              >
                Command
              </span>
              <span
                className="macro-builder__step-actions macro-builder__step-head-cell"
                role="columnheader"
                aria-colindex={4}
                data-grid-row={0}
                data-grid-col="actions"
                tabIndex={gridTabIndex({ row: 0, col: 'actions' })}
              >
                Actions
              </span>
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
              role="rowgroup"
            >
              {stepCount === 0 && ghostStep === null && (
                // A rowgroup's only children are rows: the hint is one
                // row of one cell spanning the table
                <div className="macro-builder__steps-hint" role="row" aria-rowindex={2}>
                  <div role="gridcell" aria-colindex={1} aria-colspan={GRID_COLS.length}>
                    Drag a command here, or double-click it, to add it to your macro
                  </div>
                </div>
              )}
              {macro.steps.map((step, index) => {
                return (
                  <React.Fragment key={index}>
                  {ghostAt === index && ghostStep}
                  <div
                    role="row"
                    aria-rowindex={index + 2}
                    data-step-index={index}
                    aria-label={`Step ${index + 1} of ${stepCount}: ${step.command}${step.parameters ? `, ${prettyParameters(step.parameters)}` : ''}`}
                    // A step carried from the keyboard wears the drag's look: a step in flight
                    className={`macro-builder__step${index === draggedIndex || index === reorderingIndex ? ' macro-builder__step--dragging' : ''}`}
                    onMouseDown={handleStepMouseDown(index)}
                    onDoubleClick={() => setEditingStepIndex(index)}
                  >
                    <span
                      className="macro-builder__step-grip"
                      role="gridcell"
                      aria-colindex={1}
                      aria-label={`Reorder step ${index + 1}`}
                      data-grid-row={index + 1}
                      data-grid-col="grip"
                      data-reordering={index === reorderingIndex ? '' : undefined}
                      // While the step is carried, Escape lets go of it
                      // rather than closing the window (Dialog's rule)
                      data-owns-escape={index === reorderingIndex ? 'self' : undefined}
                      tabIndex={gridTabIndex({ row: index + 1, col: 'grip' })}
                    >
                      <Icon name="gripper" size={16} />
                    </span>
                    <span
                      className="macro-builder__step-number"
                      role="gridcell"
                      aria-colindex={2}
                      data-grid-row={index + 1}
                      data-grid-col="number"
                      tabIndex={gridTabIndex({ row: index + 1, col: 'number' })}
                    >
                      {shownNumber(index)}
                    </span>
                    <div
                      className="macro-builder__step-text"
                      role="gridcell"
                      aria-colindex={3}
                      data-grid-row={index + 1}
                      data-grid-col="command"
                      tabIndex={gridTabIndex({ row: index + 1, col: 'command' })}
                    >
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
                    <div
                      className="macro-builder__step-actions"
                      role="gridcell"
                      aria-colindex={4}
                      data-grid-row={index + 1}
                      data-grid-col="actions"
                      tabIndex={gridTabIndex({ row: index + 1, col: 'actions' })}
                      // Escape on a control inside steps back out to the
                      // cell; the window's Escape (Dialog) yields to it
                      data-owns-escape=""
                    >
                      <GhostButton
                        icon="edit"
                        size="medium"
                        className={STEP_EDIT_CLASS}
                        tabIndex={gridTabIndex({ row: index + 1, col: 'actions', inner: 'edit' })}
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
                        tabIndex={gridTabIndex({ row: index + 1, col: 'actions', inner: 'menu' })}
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
        // Back to the step that was being edited, on its Command cell —
        // the cell Enter opened it from
        const closeEditor = () => {
          const index = editingStepIndex;
          setEditingStepIndex(null);
          if (index !== null) returnFocus(() => focusGridCell({ row: index + 1, col: 'command' }));
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

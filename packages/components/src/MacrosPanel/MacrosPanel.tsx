import React from 'react';
import { Button } from '../Button';
import { GhostButton } from '../GhostButton';
import { Icon } from '../Icon';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { NewMacroDialog, RenameMacroDialog } from '../MacroManager/MacroDialogs';
import type { Macro } from '../MacroManager/macroTypes';
import { useAccessibilityProfile } from '../contexts/AccessibilityProfileContext';
import { useContainerTabGroup } from '../hooks/useContainerTabGroup';
import './MacrosPanel.css';

export interface MacrosPanelProps {
  /** Available macros */
  macros: Macro[];
  /** Called when a new macro is created via the "New macro" dialog */
  onCreateMacro?: (name: string) => void;
  /** Called when "Import macro…" is picked from the panel menu */
  onImportMacro?: () => void;
  /** Called when a macro should open in the macro editor (row click, or menu "Edit macro") */
  onEditMacro?: (macroId: string) => void;
  /** Called when a macro is renamed via the rename dialog */
  onRenameMacro?: (macroId: string, newName: string) => void;
  /** Called when "Duplicate macro" is picked from the row menu */
  onDuplicateMacro?: (macroId: string) => void;
  /** Called when a macro is deleted via the row menu */
  onDeleteMacro?: (macroId: string) => void;
  /** Called when "Export macro" is picked from the row menu */
  onExportMacro?: (macroId: string) => void;
  /** Called when a row's Run button is clicked (run on current project) */
  onRunOnProject?: (macroId: string) => void;
  /** Called when "Apply to files…" is picked from the row menu (batch mode) */
  onRunOnFiles?: (macroId: string) => void;
  /** Operating system for the nested dialogs' header controls */
  os?: 'macos' | 'windows';
  /**
   * Where the panel sits in the app's reading order, which decides its
   * place in the Tab order: `start` = before the tracks (docked left),
   * `end` = after them (docked right or bottom). In a window of its own
   * either will do — it is the only thing there.
   * @default 'start'
   */
  placement?: 'start' | 'end';
}

/** The three things in a row that take focus, left to right. */
type Cell = 'name' | 'run' | 'menu';
const CELLS: readonly Cell[] = ['name', 'run', 'menu'];
const CELL_CLASS: Record<Cell, string> = {
  name: 'macros-panel__row-name',
  run: 'macros-panel__run',
  menu: 'macros-panel__menu',
};

function cellOf(el: Element | null): Cell | null {
  if (!el) return null;
  for (const cell of CELLS) {
    if (el.closest(`.${CELL_CLASS[cell]}`)) return cell;
  }
  return null;
}

interface MacroRowProps {
  macro: Macro;
  /** tabIndex for each cell — the list owns the roving focus */
  tabIndexOf: (cell: Cell) => number;
  onEdit?: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onRunOnProject?: () => void;
  onRunOnFiles?: () => void;
}

/** Delay before a single row click opens the editor, so a double-click
 *  (run on project) can cancel it. */
const ROW_DOUBLE_CLICK_WINDOW = 250;

/** Anchor a context menu to the bottom-right corner of the clicked button. */
function menuAnchor(e: React.MouseEvent<HTMLButtonElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  return { x: rect.right, y: rect.bottom };
}

function MacroRow({
  macro, tabIndexOf, onEdit, onRename, onDuplicate, onDelete, onExport, onRunOnProject, onRunOnFiles,
}: MacroRowProps) {
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
    setMenuPosition(menuAnchor(e));
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
      {/* The row is a GROUP of three real buttons, not a button itself:
          a button that contains buttons is invalid, and a screen reader
          could not reach Run or the menu through it. The whole row
          still takes the mouse (click edits, double-click runs); the
          keyboard and assistive tech use the name button. */}
      <div
        className="macros-panel__row"
        data-macro-id={macro.id}
        role="group"
        aria-label={macro.name}
        onClick={handleRowClick}
        onDoubleClick={handleRowDoubleClick}
      >
        <button
          type="button"
          className={CELL_CLASS.name}
          title={macro.name}
          aria-label={`Edit ${macro.name}`}
          tabIndex={tabIndexOf('name')}
        >
          {macro.name}
        </button>
        <div
          className="macros-panel__row-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="secondary"
            className={CELL_CLASS.run}
            icon={<Icon name="play" />}
            ariaLabel={`Run ${macro.name} on current project`}
            tabIndex={tabIndexOf('run')}
            onClick={onRunOnProject}
          >
            Run
          </Button>
          <GhostButton
            icon="menu"
            size="medium"
            className={CELL_CLASS.menu}
            ariaLabel={`${macro.name} options`}
            active={menuOpen}
            tabIndex={tabIndexOf('menu')}
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
        {menuItem('Apply to files…', onRunOnFiles)}
        <ContextMenuItem isDivider label="" />
        {menuItem('Edit macro', onEdit)}
        {menuItem('Rename macro', onRename)}
        {menuItem('Duplicate macro', onDuplicate)}
        {menuItem('Export macro', onExport)}
        {menuItem('Delete macro', onDelete)}
      </ContextMenu>
    </>
  );
}

/**
 * MacrosPanel — dockable macro management panel. A "Macros" header carries
 * the primary "New macro" button and a panel menu (Import); each row is a
 * full-width list item with a Run button (run on project) and a kebab
 * holding "Apply to files…" plus the management actions.
 * Row single-click edits; double-click runs the macro on the project.
 * Editing an individual macro happens in the separate MacroEditorDialog;
 * this panel only reports `onEditMacro`.
 *
 * KEYBOARD (docs/accessibility-architecture.md → Macro manager). Two Tab
 * stops under the tab-groups profile: the header actions, then the list.
 * The list is a grid — Up/Down move between macros, Left/Right between
 * a macro's name, Run and menu — and remembers where you were. Enter
 * presses what has focus; F2 renames, Shift+F10 opens the row's menu,
 * Cmd/Ctrl+Enter runs on the project, from anywhere in the row. Under
 * the flat profile every control is its own Tab stop and the arrows do
 * nothing; the row shortcuts still work.
 *
 * Space is NOT handled here: app-wide it is play/pause, from any
 * control that isn't a text field.
 */
export function MacrosPanel({
  macros,
  onCreateMacro,
  onImportMacro,
  onEditMacro,
  onRenameMacro,
  onDuplicateMacro,
  onDeleteMacro,
  onExportMacro,
  onRunOnProject,
  onRunOnFiles,
  os = 'macos',
  placement = 'start',
}: MacrosPanelProps) {
  const [isNewMacroDialogOpen, setIsNewMacroDialogOpen] = React.useState(false);
  const [macroToRename, setMacroToRename] = React.useState<string | null>(null);
  const [panelMenuOpen, setPanelMenuOpen] = React.useState(false);
  const [panelMenuPosition, setPanelMenuPosition] = React.useState({ x: 0, y: 0 });
  const renamingMacro = macros.find((m) => m.id === macroToRename);

  const { activeProfile } = useAccessibilityProfile();
  const isFlat = activeProfile.config.tabNavigation === 'sequential';
  const groupSuffix = placement === 'end' ? '-end' : '';
  const listGroupId = `macros-panel${groupSuffix}`;
  const listTabIndex = isFlat ? 0 : activeProfile.config.tabOrder?.[listGroupId] ?? 0;

  const listRef = React.useRef<HTMLDivElement>(null);
  const actionsRef = React.useRef<HTMLDivElement>(null);
  const newMacroButtonRef = React.useRef<HTMLButtonElement>(null);

  // Header actions: one Tab stop, arrows between the two buttons — the
  // same hook every toolbar in the app uses.
  const actionsGroup = useContainerTabGroup({
    containerRef: actionsRef,
    groupId: `macros-panel-actions${groupSuffix}`,
    selector: 'button',
    ariaLabel: 'Macro manager actions',
  });
  const initActionTabIndices = actionsGroup.initTabIndices;
  React.useEffect(() => {
    initActionTabIndices();
  }, [initActionTabIndices]);

  // The list's roving focus: which cell is its one Tab stop. Kept by
  // macro ID, so it survives the list changing around it, and NOT reset
  // when focus leaves — coming back to a long list should return you to
  // the macro you were on, not the top.
  const [active, setActive] = React.useState<{ id: string | null; cell: Cell }>({ id: null, cell: 'name' });
  const activeId = macros.some((m) => m.id === active.id) ? active.id : macros[0]?.id ?? null;
  const tabIndexFor = (id: string, cell: Cell): number => {
    if (isFlat) return 0;
    return id === activeId && cell === active.cell ? listTabIndex : -1;
  };

  const cellElement = (id: string, cell: Cell): HTMLElement | null => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-macro-id]') ?? [];
    for (const row of rows) {
      if (row.dataset.macroId === id) return row.querySelector<HTMLElement>(`.${CELL_CLASS[cell]}`);
    }
    return null;
  };
  const focusCell = (id: string, cell: Cell) => {
    const el = cellElement(id, cell);
    if (!el) return;
    setActive({ id, cell });
    el.focus();
    // jsdom has no layout, so no scrollIntoView
    el.scrollIntoView?.({ block: 'nearest' });
  };

  // Focus to place once the list has re-rendered — after a delete the
  // row that had focus is gone, and focus would fall to the page.
  const pendingFocusRef = React.useRef<{ id: string | null; cell: Cell } | null>(null);
  React.useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    // After the menu has finished handing focus back to its trigger
    const timer = window.setTimeout(() => {
      if (pending.id !== null && cellElement(pending.id, pending.cell)) focusCell(pending.id, pending.cell);
      else newMacroButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macros]);

  const handleDelete = (id: string) => {
    const index = macros.findIndex((m) => m.id === id);
    const neighbour = macros[index + 1] ?? macros[index - 1];
    pendingFocusRef.current = { id: neighbour?.id ?? null, cell: 'name' };
    onDeleteMacro?.(id);
  };

  /** Put focus back on a macro once a dialog that covered it has gone. */
  const returnFocusTo = (id: string | null) => {
    window.setTimeout(() => {
      if (id !== null && cellElement(id, 'name')) focusCell(id, 'name');
      else newMacroButtonRef.current?.focus();
    }, 0);
  };

  const handleListFocus = (e: React.FocusEvent) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-macro-id]');
    const cell = cellOf(e.target as HTMLElement);
    const id = row?.dataset.macroId;
    if (!id || !cell) return;
    if (id !== active.id || cell !== active.cell) setActive({ id, cell });
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-macro-id]');
    const id = row?.dataset.macroId;
    if (!row || !id || !listRef.current?.contains(row)) return;
    const index = macros.findIndex((m) => m.id === id);
    if (index < 0) return;
    const cell = cellOf(target) ?? 'name';
    // Consumed keys stop here: the app's document-level shortcuts would
    // otherwise act on the PROJECT (arrows move the playhead and the
    // track focus, Home/End jump the playhead).
    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    const command = e.metaKey || e.ctrlKey;

    // Row shortcuts — every profile, from any cell of the row
    if (e.key === 'F2' && !command && !e.altKey) {
      consume();
      setMacroToRename(id);
      return;
    }
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      consume();
      // Through the button, so the menu anchors where the mouse's does
      // and hands focus back to the cell it was opened from
      cellElement(id, 'menu')?.click();
      return;
    }
    if (e.key === 'Enter' && command) {
      consume();
      onRunOnProject?.(id);
      return;
    }
    // Enter on the name opens the macro AT ONCE. Left to the browser it
    // would become a click on the row, which waits out the double-click
    // window — a wait the keyboard has no use for.
    if (e.key === 'Enter' && cell === 'name' && !e.altKey && !e.shiftKey) {
      consume();
      onEditMacro?.(id);
      return;
    }

    // Arrow navigation belongs to the tab-groups profile only
    if (isFlat) return;
    if (command || e.altKey || e.shiftKey) return; // chords stay the app's
    const goToRow = (next: number) => {
      consume(); // at an edge too: the list holds, the app does not take over
      const clamped = Math.max(0, Math.min(macros.length - 1, next));
      if (clamped !== index) focusCell(macros[clamped].id, cell);
    };
    const goToCell = (step: number) => {
      consume();
      const next = CELLS[CELLS.indexOf(cell) + step];
      if (next) focusCell(id, next);
    };
    const pageSize = () => {
      const list = listRef.current;
      const rowHeight = row.getBoundingClientRect().height;
      if (!list || rowHeight <= 0) return 10;
      return Math.max(1, Math.floor(list.clientHeight / rowHeight) - 1);
    };
    switch (e.key) {
      case 'ArrowDown': goToRow(index + 1); break;
      case 'ArrowUp': goToRow(index - 1); break;
      case 'Home': goToRow(0); break;
      case 'End': goToRow(macros.length - 1); break;
      case 'PageDown': goToRow(index + pageSize()); break;
      case 'PageUp': goToRow(index - pageSize()); break;
      case 'ArrowRight': goToCell(1); break;
      case 'ArrowLeft': goToCell(-1); break;
      default: break;
    }
  };

  const handlePanelMenuClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (!e) return;
    setPanelMenuPosition(menuAnchor(e));
    setPanelMenuOpen(true);
  };

  return (
    <div className="macros-panel" role="region" aria-label="Macro manager" data-placement={placement}>
      <div className="macros-panel__header">
        <span className="macros-panel__title" id="macros-panel-title">Macros</span>
        <div
          ref={actionsRef}
          className="macros-panel__header-actions"
          {...actionsGroup.containerProps}
          onKeyDown={actionsGroup.onKeyDown}
          onFocus={actionsGroup.onFocus}
          onBlur={actionsGroup.onBlur}
          onClickCapture={actionsGroup.onClickCapture}
        >
          <Button
            ref={newMacroButtonRef}
            variant="primary"
            size="small"
            icon={<Icon name="plus" />}
            onClick={() => setIsNewMacroDialogOpen(true)}
          >
            New macro
          </Button>
          {/* Solid kebab — paired with the primary New macro button, per
              the Figma kebab rule (ghost when standing alone in a row) */}
          <GhostButton
            icon="menu"
            variant="solid"
            size="compact"
            ariaLabel="Macro manager options"
            active={panelMenuOpen}
            onClick={handlePanelMenuClick}
          />
        </div>
      </div>

      <div
        ref={listRef}
        className="macros-panel__list"
        role="group"
        aria-labelledby="macros-panel-title"
        onKeyDown={handleListKeyDown}
        onFocus={handleListFocus}
      >
        {macros.length === 0 && (
          <div className="macros-panel__empty">
            No macros yet. A macro runs a set of commands on a project or a batch of files.
          </div>
        )}
        {macros.map((macro) => (
          <MacroRow
            key={macro.id}
            macro={macro}
            tabIndexOf={(cell) => tabIndexFor(macro.id, cell)}
            onEdit={() => onEditMacro?.(macro.id)}
            onRename={() => setMacroToRename(macro.id)}
            onDuplicate={() => onDuplicateMacro?.(macro.id)}
            onDelete={() => handleDelete(macro.id)}
            onExport={() => onExportMacro?.(macro.id)}
            onRunOnProject={() => onRunOnProject?.(macro.id)}
            onRunOnFiles={() => onRunOnFiles?.(macro.id)}
          />
        ))}
      </div>

      <ContextMenu
        isOpen={panelMenuOpen}
        onClose={() => setPanelMenuOpen(false)}
        x={panelMenuPosition.x}
        y={panelMenuPosition.y}
      >
        <ContextMenuItem
          label="Import macro…"
          onClick={() => {
            setPanelMenuOpen(false);
            onImportMacro?.();
          }}
        />
      </ContextMenu>

      <NewMacroDialog
        isOpen={isNewMacroDialogOpen}
        onClose={() => {
          setIsNewMacroDialogOpen(false);
          returnFocusTo(null);
        }}
        onCreate={(name) => {
          onCreateMacro?.(name);
          setIsNewMacroDialogOpen(false);
        }}
        os={os}
      />

      <RenameMacroDialog
        isOpen={macroToRename !== null}
        onClose={() => {
          returnFocusTo(macroToRename);
          setMacroToRename(null);
        }}
        onRename={(newName) => {
          if (macroToRename) {
            onRenameMacro?.(macroToRename, newName);
          }
          returnFocusTo(macroToRename);
          setMacroToRename(null);
        }}
        currentName={renamingMacro?.name || ''}
        os={os}
      />
    </div>
  );
}

export default MacrosPanel;

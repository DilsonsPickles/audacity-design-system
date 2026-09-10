/**
 * SelectCommandDialog — the "Command picker": category-driven picker for
 * macro steps.
 *
 * Search across everything on top; a category rail on the left (order =
 * first appearance in `commands`, so the data file controls it); the
 * matching commands on the right, grouped under category headers when
 * viewing "All commands". Clicking a command reports it via
 * `onSelectCommand`; the CONSUMER decides what happens next — add it
 * and close, or (for commands with parameters) open the parameters
 * window on top of this one so Cancel returns to the search with the
 * query intact. The search state resets only when the dialog closes.
 * Enter picks the first visible match, so "type, Enter" adds a step
 * without touching the mouse. The rail's counts follow the search so
 * you can see where the hits are before narrowing.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import './SelectCommandDialog.css';

export interface Command {
  id: string;
  name: string;
  category: string;
}

export interface SelectCommandDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Callback when dialog should close
   */
  onClose?: () => void;
  /**
   * Callback when a command is picked. The dialog stays open; the
   * consumer closes it (or stacks a parameters window on top first).
   */
  onSelectCommand?: (command: Command) => void;
  /**
   * Available commands
   */
  commands: Command[];
  /**
   * Whether Escape closes this dialog. Turn OFF while another modal is
   * stacked on top — every open Dialog listens for Escape on the
   * document, so otherwise one press closes both.
   */
  closeOnEscape?: boolean;
  /**
   * Operating system for platform-specific header controls
   */
  os?: 'macos' | 'windows';
}

const ALL_CATEGORIES = 'all';

/**
 * SelectCommandDialog component
 */
export function SelectCommandDialog({
  isOpen,
  onClose,
  onSelectCommand,
  commands,
  closeOnEscape = true,
  os = 'macos',
}: SelectCommandDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);

  // Search state survives a pick (a stacked parameters window may hand
  // control back here on Cancel) and resets only once the dialog closes.
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory(ALL_CATEGORIES);
    }
  }, [isOpen]);

  // Rail order = first appearance in the data
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const cmd of commands) {
      if (!seen.includes(cmd.category)) seen.push(cmd.category);
    }
    return seen;
  }, [commands]);

  const query = searchQuery.trim().toLowerCase();
  const matching = useMemo(
    () => (query ? commands.filter((cmd) => cmd.name.toLowerCase().includes(query)) : commands),
    [commands, query],
  );

  // Per-category hit counts drive the rail badges (and disable empties
  // while searching)
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cmd of matching) counts[cmd.category] = (counts[cmd.category] ?? 0) + 1;
    return counts;
  }, [matching]);

  const visible = selectedCategory === ALL_CATEGORIES
    ? matching
    : matching.filter((cmd) => cmd.category === selectedCategory);

  // Group in rail order; a single selected category renders as one group
  // without its header (the rail already names it)
  const groups = useMemo(() => {
    const byCategory = new Map<string, Command[]>();
    for (const cmd of visible) {
      const list = byCategory.get(cmd.category) ?? [];
      list.push(cmd);
      byCategory.set(cmd.category, list);
    }
    return categories
      .filter((c) => byCategory.has(c))
      .map((c) => ({ category: c, commands: byCategory.get(c)! }));
  }, [visible, categories]);

  const showGroupHeaders = selectedCategory === ALL_CATEGORIES;

  const pick = (command: Command) => {
    onSelectCommand?.(command);
  };

  const handleClose = () => {
    onClose?.();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && visible.length > 0) {
      e.preventDefault();
      pick(visible[0]);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Command picker"
      onClose={handleClose}
      os={os}
      width={720}
      minHeight={600}
      closeOnEscape={closeOnEscape}
      customLayout
      className="select-command-dialog"
    >
      {/* Header with search */}
      <div className="select-command-dialog__header">
        <div className="select-command-dialog__search-container">
          <Icon name="zoom-in" size={16} />
          <input
            type="text"
            className="select-command-dialog__search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands"
            aria-label="Search commands"
            autoFocus
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <button
              className="select-command-dialog__clear-button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="select-command-dialog__content">
        {/* Category rail */}
        <nav className="select-command-dialog__rail" aria-label="Command categories">
          <button
            type="button"
            className={`select-command-dialog__rail-item${selectedCategory === ALL_CATEGORIES ? ' select-command-dialog__rail-item--selected' : ''}`}
            aria-pressed={selectedCategory === ALL_CATEGORIES}
            onClick={() => setSelectedCategory(ALL_CATEGORIES)}
          >
            <span className="select-command-dialog__rail-label">All commands</span>
            <span className="select-command-dialog__rail-count">{matching.length}</span>
          </button>
          {categories.map((category) => {
            const count = countByCategory[category] ?? 0;
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                className={`select-command-dialog__rail-item${isSelected ? ' select-command-dialog__rail-item--selected' : ''}${count === 0 ? ' select-command-dialog__rail-item--empty' : ''}`}
                aria-pressed={isSelected}
                disabled={count === 0}
                onClick={() => setSelectedCategory(category)}
              >
                <span className="select-command-dialog__rail-label">{category}</span>
                <span className="select-command-dialog__rail-count">{count}</span>
              </button>
            );
          })}
        </nav>

        {/* Command list */}
        <div className="select-command-dialog__body">
          {groups.length === 0 && (
            <div className="select-command-dialog__empty">
              {query ? `No commands match “${searchQuery.trim()}”` : 'No commands'}
            </div>
          )}
          {groups.map((group) => (
            <div key={group.category} className="select-command-dialog__group">
              {showGroupHeaders && (
                <div className="select-command-dialog__group-header">{group.category}</div>
              )}
              <div className="select-command-dialog__commands">
                {group.commands.map((command) => (
                  <button
                    key={command.id}
                    type="button"
                    data-command-id={command.id}
                    className="select-command-dialog__command-item"
                    onClick={() => pick(command)}
                  >
                    {command.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

export default SelectCommandDialog;

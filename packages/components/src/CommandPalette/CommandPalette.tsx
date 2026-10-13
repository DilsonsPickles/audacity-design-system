import React from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './CommandPalette.css';

/** One runnable thing: a menu item, a keyboard-only command, a dialog */
export interface PaletteCommand {
  id: string;
  label: string;
  /** The chord as the menus write it ('Ctrl+Shift+F'); shown in the OS's glyphs */
  shortcut?: string;
  /** Where it lives — the menu's name, or a family ('Clip') */
  group?: string;
  disabled?: boolean;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  commands: ReadonlyArray<PaletteCommand>;
  /** Runs AFTER the palette has closed and focus has gone back to the
   *  opener, so a command that reads the focus (a clip's dialog) sees it */
  onRun: (id: string) => void;
  onClose: () => void;
  os?: 'macos' | 'windows';
  placeholder?: string;
  /** What an EMPTY query shows, in this order (ids; unknown ones are
   *  skipped): the host's recents and its curated common commands —
   *  a short list, not the whole catalogue (user decision 2026-10-13,
   *  "not show so many options, just the common ones"). Unset, an empty
   *  query lists everything. */
  suggestedIds?: ReadonlyArray<string>;
}

/** The chord in the OS's own glyphs: 'Ctrl+Shift+F' → '⌘⇧F' on macOS;
 *  as written on Windows (the Shortcuts page's own order, ⌘ then ⇧). */
export function formatPaletteShortcut(shortcut: string, os: 'macos' | 'windows'): string {
  if (os !== 'macos') return shortcut;
  const parts = shortcut.split('+').map((p) => p.trim());
  const mods: string[] = [];
  const keys: string[] = [];
  for (const p of parts) {
    const low = p.toLowerCase();
    if (low === 'ctrl' || low === 'cmd' || low === 'meta') mods.push('⌘');
    else if (low === 'alt' || low === 'option') mods.push('⌥');
    else if (low === 'shift') mods.push('⇧');
    else keys.push(p.length === 1 ? p.toUpperCase() : p);
  }
  // The app's usual order: ⌥⇧F, ⌥⌘I — and ⌘⇧F (⌘ before ⇧ when there is
  // no ⌥), as the Shortcuts page writes them
  const has = (m: string) => mods.includes(m);
  const text = has('⌥') ? ['⌥', '⇧', '⌘'].filter(has).join('') : ['⌘', '⇧'].filter(has).join('');
  return text + keys.join('');
}

/** The commands that match, best first: a label that STARTS with the
 *  query, then one with a WORD starting with it, then any that contains
 *  it (the group counts as a last resort); an empty query lists them all
 *  in their given order. Case-insensitive; stable within a rank. */
export function rankPaletteCommands<T extends PaletteCommand>(commands: ReadonlyArray<T>, query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...commands];
  const scored: Array<{ c: T; score: number; i: number }> = [];
  commands.forEach((c, i) => {
    const label = c.label.toLowerCase();
    let score: number | null = null;
    if (label.startsWith(q)) score = 0;
    else if (label.split(/[\s/]+/).some((w) => w.startsWith(q))) score = 1;
    else if (label.includes(q)) score = 2;
    else if ((c.group ?? '').toLowerCase().includes(q)) score = 3;
    if (score !== null) scored.push({ c, score, i });
  });
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).map((s) => s.c);
}

/**
 * THE COMMAND PALETTE (user decision 2026-10-13, after a day of chord
 * scarcity: "perhaps the command palette is worth looking at?", then
 * "I want command palette on cmd + p"): every named action by name —
 * the menus' items and the keyboard-only commands — found by typing,
 * run with Enter, the chord shown beside each so the palette teaches
 * the shortcuts. ↑ ↓ move the highlight (wrapping), Enter runs it,
 * Escape leaves, a click runs a row; the list is a combobox + listbox
 * for assistive tech. Centred in the window; an empty query shows the
 * host's SHORT list (recents, then its common commands — `suggestedIds`),
 * never the whole catalogue (2026-10-13, "in the middle of the screen
 * and not show so many options, just the common ones"). The palette CLOSES AND RESTORES FOCUS to what had
 * it BEFORE it runs the command, so a command that acts on the focus
 * (a clip's dialog) acts on the right thing.
 */
export function CommandPalette({ isOpen, commands, onRun, onClose, os = 'macos', placeholder = 'Type a command…', suggestedIds }: CommandPaletteProps) {
  const { theme } = useTheme();
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  const listId = React.useId();
  useFocusTrap(rootRef, isOpen);

  React.useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setHighlight(0);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const results = React.useMemo(() => {
    if (!query.trim() && suggestedIds) {
      return suggestedIds.map((id) => commands.find((c) => c.id === id)).filter((c): c is PaletteCommand => !!c);
    }
    return rankPaletteCommands(commands, query);
  }, [commands, query, suggestedIds]);
  const clampedHighlight = results.length === 0 ? 0 : Math.min(highlight, results.length - 1);

  // The highlighted row stays in view
  React.useEffect(() => {
    const row = listRef.current?.children[clampedHighlight] as HTMLElement | undefined;
    row?.scrollIntoView?.({ block: 'nearest' });
  }, [clampedHighlight, results]);

  const close = React.useCallback(() => {
    onClose();
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && opener.isConnected) requestAnimationFrame(() => opener.focus());
  }, [onClose]);

  const pick = (c: PaletteCommand) => {
    if (c.disabled) return;
    const opener = openerRef.current;
    openerRef.current = null;
    onClose();
    // Focus back first, then the command — in the frame after the
    // palette has gone, so the command's own dialog can take the focus
    requestAnimationFrame(() => {
      if (opener && opener.isConnected) opener.focus();
      onRun(c.id);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) setHighlight((clampedHighlight + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) setHighlight((clampedHighlight - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = results[clampedHighlight];
      if (c) pick(c);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  if (!isOpen) return null;
  const style = {
    '--palette-bg': theme.background.menu.background,
    '--palette-border': theme.border.default,
    '--palette-divider': theme.border.divider,
    '--palette-text': theme.foreground.text.primary,
    '--palette-hover': theme.background.menu.item.hover,
    '--palette-input-bg': theme.background.surface.default,
    '--palette-icon': theme.foreground.icon.primary,
  } as React.CSSProperties;
  const activeId = results[clampedHighlight] ? `${listId}-${clampedHighlight}` : undefined;

  return (
    <div
      className="command-palette__overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={rootRef}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-owns-keyboard=""
        data-command-palette
        style={style}
        onKeyDown={onKeyDown}
      >
        <div className="command-palette__field">
          {/* The design system's magnifier (SearchField's), before the text —
              "put the search icon in before the search", 2026-10-13 */}
          <span className="command-palette__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        <input
          ref={inputRef}
          className="command-palette__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-label="Command"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
          autoComplete="off"
          spellCheck={false}
        />
        </div>
        <ul ref={listRef} id={listId} className="command-palette__list" role="listbox" aria-label="Commands">
          {results.length === 0 && (
            <li className="command-palette__empty" aria-live="polite">No matching command</li>
          )}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === clampedHighlight}
              aria-disabled={c.disabled || undefined}
              className={`command-palette__row${i === clampedHighlight ? ' command-palette__row--active' : ''}${c.disabled ? ' command-palette__row--disabled' : ''}`}
              data-command-id={c.id}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
            >
              <span className="command-palette__label">{c.label}</span>
              {c.group && <span className="command-palette__group">{c.group}</span>}
              {c.shortcut && <kbd className="command-palette__shortcut">{formatPaletteShortcut(c.shortcut, os)}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

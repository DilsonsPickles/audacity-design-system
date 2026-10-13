import React from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { SearchField } from '../SearchField/SearchField';
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

/** Optimal-string-alignment distance (Levenshtein + a transposition),
 *  capped: the fuzzy tier's "one slip" — "spilt" finds Split */
function slipDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = []; let prev = Array.from({ length: b.length + 1 }, (_, j) => j); let cur: number[] = [];
  for (let i = 1; i <= a.length; i++) {
    cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
    }
    prev2.splice(0, prev2.length, ...prev); prev = cur;
  }
  return prev[b.length];
}

const WORD_SPLIT = /[\s/]+/;

/** Where the query matches a label — the characters to highlight — or
 *  null: the substring (case-insensitive), else the WORD within one slip
 *  of the query (the fuzzy tier; a query of four or more characters). */
export function paletteMatchRange(label: string, query: string): [number, number] | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const low = label.toLowerCase();
  const at = low.indexOf(q);
  if (at >= 0) return [at, at + q.length];
  if (q.length < 4) return null;
  let pos = 0;
  for (const word of label.split(WORD_SPLIT)) {
    const start = label.indexOf(word, pos);
    pos = start + word.length;
    const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (w.length >= 3 && slipDistance(w, q, 1) <= 1) return [start, start + word.length];
  }
  return null;
}

/** The commands that match, best first: a label that STARTS with the
 *  query, then one with a WORD starting with it, then any that contains
 *  it, then the group, then a FUZZY word within one slip ("spilt" finds
 *  Split — the Figma "Command Palette Fuzzy" variant, 2026-10-13); an
 *  empty query lists them all in their given order. Case-insensitive;
 *  stable within a rank. */
export function rankPaletteCommands<T extends PaletteCommand>(commands: ReadonlyArray<T>, query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...commands];
  const scored: Array<{ c: T; score: number; i: number }> = [];
  commands.forEach((c, i) => {
    const label = c.label.toLowerCase();
    let score: number | null = null;
    if (label.startsWith(q)) score = 0;
    else if (label.split(WORD_SPLIT).some((w) => w.startsWith(q))) score = 1;
    else if (label.includes(q)) score = 2;
    else if ((c.group ?? '').toLowerCase().includes(q)) score = 3;
    else if (paletteMatchRange(c.label, q)) score = 4;
    if (score !== null) scored.push({ c, score, i });
  });
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).map((s) => s.c);
}

/** The label with its match wrapped in <mark> (the design's highlight) */
function HighlightedLabel({ label, query }: { label: string; query: string }) {
  const range = paletteMatchRange(label, query);
  if (!range) return <>{label}</>;
  const [a, b] = range;
  return (
    <>
      {label.slice(0, a)}
      <mark className="command-palette__match">{label.slice(a, b)}</mark>
      {label.slice(b)}
    </>
  );
}

/**
 * THE COMMAND PALETTE (user decision 2026-10-13, after a day of chord
 * scarcity: "perhaps the command palette is worth looking at?", then
 * "I want command palette on cmd + p"): every named action by name —
 * the menus' items and the keyboard-only commands — found by typing,
 * run with Enter, the chord shown beside each so the palette teaches
 * the shortcuts. ↑ ↓ move the highlight (wrapping), Enter runs it,
 * Escape leaves, a click runs a row; the list is a combobox + listbox
 * for assistive tech; the field is the design system's SearchField,
 * large, nested in the container, and each row highlights where the
 * query matched. Centred in the window; an empty query shows the
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
  const listRef = React.useRef<HTMLUListElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  const listId = React.useId();
  useFocusTrap(rootRef, isOpen);

  React.useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setHighlight(0);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = requestAnimationFrame(() => rootRef.current?.querySelector<HTMLInputElement>('.search-field__input')?.focus());
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
    '--palette-match': theme.background.control.button.primary.idle,
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
          {/* The design system's search field, nested in the container (the
              Figma "Command Palette" frame; "it can be a search input nested
              in a container", 2026-10-13): magnifier, text, a clear X. Enter
              is its onSubmit; ↑ ↓ Escape bubble to the palette. No focus
              frame on the input: the palette is the focus, and a text field
              counts as focus-visible however it was focused. */}
          <SearchField
            size="large"
            fullWidth
            value={query}
            placeholder={placeholder}
            onChange={(v) => { setQuery(v); setHighlight(0); }}
            onSubmit={() => { const c = results[clampedHighlight]; if (c) pick(c); }}
            inputProps={{
              role: 'combobox',
              'aria-expanded': true,
              'aria-controls': listId,
              'aria-activedescendant': activeId,
              'aria-autocomplete': 'list',
              'aria-label': 'Command',
              'data-no-focus-frame': '',
              autoComplete: 'off',
              spellCheck: false,
            } as React.InputHTMLAttributes<HTMLInputElement>}
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
              <span className="command-palette__label"><HighlightedLabel label={c.label} query={query} /></span>
              {c.group && <span className="command-palette__group">{c.group}</span>}
              {c.shortcut && <kbd className="command-palette__shortcut">{formatPaletteShortcut(c.shortcut, os)}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

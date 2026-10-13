import React from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { ShortcutRow } from '../PreferencesModal/pages/shortcutsData';
import './KeyboardMap.css';

/** One key chord: its modifiers and key, as parsed from a Shortcuts row */
export interface ParsedBinding {
  mods: Modifier[];
  key: string;
  /** The chord as written, e.g. "⌥⇧F" */
  text: string;
  action: string;
  rowId: string;
  /** The modifier state it belongs to: 'plain', 'shift', 'opt+shift', … */
  state: string;
}

export type Modifier = 'ctrl' | 'opt' | 'shift' | 'cmd';
const MOD_OF_GLYPH: Record<string, Modifier> = { '⌘': 'cmd', '⌥': 'opt', '⇧': 'shift', '⌃': 'ctrl' };
const MOD_ORDER: Modifier[] = ['ctrl', 'opt', 'shift', 'cmd'];
const MOD_GLYPH: Record<Modifier, string> = { ctrl: '⌃', opt: '⌥', shift: '⇧', cmd: '⌘' };
const KEY_ALIAS: Record<string, string> = { Esc: 'Escape', Enter: 'Return', '⌫': 'Delete', '−': '-' };

export const modifierText = (mods: ReadonlyArray<Modifier>) => MOD_ORDER.filter((m) => mods.includes(m)).map((m) => MOD_GLYPH[m]).join('');
export const stateOf = (mods: ReadonlyArray<Modifier>) => MOD_ORDER.filter((m) => mods.includes(m)).join('+') || 'plain';
export const stateLabel = (s: string) => (s === 'plain' ? 'Plain' : s.split('+').map((m) => MOD_GLYPH[m as Modifier]).join(''));

/** "⌥⌘⇧F · ⌘⇧F", "← → / ↑ ↓", "1–5 / 0", "⇧F10 · Menu key" → the chords */
export function parseShortcutRow(row: ShortcutRow): ParsedBinding[] {
  const out: ParsedBinding[] = [];
  const push = (mods: Modifier[], key: string, text: string) => out.push({ mods, key, text, action: row.action, rowId: row.id, state: stateOf(mods) });
  for (const part of row.shortcut.split(/\s[/·]\s/)) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    for (let t of tokens) {
      if (t === 'key') continue;
      if (t === 'Menu') { push([], 'Menu', 'Menu key'); continue; }
      const mods: Modifier[] = [];
      while (t.length > 1 && MOD_OF_GLYPH[t[0]]) { mods.push(MOD_OF_GLYPH[t[0]]); t = t.slice(1); }
      const range = /^(\d)[–-](\d)$/.exec(t);
      if (range) { for (let d = +range[1]; d <= +range[2]; d++) push(mods, String(d), modifierText(mods) + d); continue; }
      push(mods, KEY_ALIAS[t] ?? t, modifierText(mods) + t);
    }
  }
  return out;
}

export function parseShortcutRows(rows: ReadonlyArray<ShortcutRow>): ParsedBinding[] {
  return rows.filter((r) => r.shortcut).flatMap(parseShortcutRow);
}

interface KeySpec { k: string; u?: number; cap?: string; mod?: Modifier | 'caps'; note?: string }
const LAYOUT: Array<{ fn?: boolean; keys: Array<string | KeySpec> }> = [
  { fn: true, keys: ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'] },
  { keys: ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', { k: 'Delete', u: 1.6, cap: '⌫' }] },
  { keys: [{ k: 'Tab', u: 1.6 }, 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', { k: '\\', u: 1 }] },
  { keys: [{ k: 'Caps', u: 1.9, mod: 'caps', cap: 'Caps' }, 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", { k: 'Return', u: 1.8, cap: '↩ Return' }] },
  { keys: [{ k: 'Shift', u: 2.4, mod: 'shift', cap: '⇧ Shift' }, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', { k: 'Shift', u: 2.3, mod: 'shift', cap: '⇧ Shift' }] },
  { keys: [{ k: 'Ctrl', u: 1.2, mod: 'ctrl', cap: '⌃' }, { k: 'Opt', u: 1.2, mod: 'opt', cap: '⌥' }, { k: 'Cmd', u: 1.5, mod: 'cmd', cap: '⌘' }, { k: 'Space', u: 5.6 }, { k: 'Cmd', u: 1.5, mod: 'cmd', cap: '⌘' }, { k: 'Opt', u: 1.2, mod: 'opt', cap: '⌥' }, '←', { k: '↑', cap: '↑ ↓', note: '↓' }, '→'] },
];
const STATE_ORDER = ['plain', 'shift', 'opt', 'cmd', 'opt+shift', 'shift+cmd', 'opt+cmd', 'opt+shift+cmd', 'ctrl', 'ctrl+shift'];

export interface KeyboardMapProps {
  isOpen: boolean;
  onClose: () => void;
  /** The Shortcuts page's rows (`SHORTCUT_ROWS`) */
  rows: ReadonlyArray<ShortcutRow>;
}

/**
 * THE KEYBOARD MAP (user request 2026-10-13, "I wouldn't mind seeing it
 * overlayed in the demo"): the app's shortcuts on a Mac keyboard, as an
 * overlay — ⌘/ and View › Keyboard map. Pick a modifier state (or HOLD
 * the modifier: the map follows the keys you are holding) and the bound
 * keys light up with a short caption; a dot marks a key bound in another
 * state; click a key to see everything on it in every state. Built from
 * the same rows as Preferences › Shortcuts, so the two never disagree.
 * Escape, the close button or a click outside closes it; it owns the
 * keyboard while open (`data-owns-keyboard`).
 */
export function KeyboardMap({ isOpen, onClose, rows }: KeyboardMapProps) {
  const { theme } = useTheme();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  const bindings = React.useMemo(() => parseShortcutRows(rows), [rows]);
  const states = React.useMemo(() => {
    const set = [...new Set(bindings.map((b) => b.state))];
    return set.sort((a, b) => (STATE_ORDER.indexOf(a) + 1 || 99) - (STATE_ORDER.indexOf(b) + 1 || 99));
  }, [bindings]);
  const [picked, setPicked] = React.useState('plain');
  const [held, setHeld] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<KeySpec | null>(null);
  const state = held ?? picked;
  useFocusTrap(rootRef, isOpen);

  React.useEffect(() => {
    if (!isOpen) return;
    setPicked('plain');
    setHeld(null);
    setSelected(null);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('[data-keyboard-map-close]')?.focus());
    // The modifiers you HOLD pick the state, as long as you hold them
    const read = (e: KeyboardEvent) => {
      const mods: Modifier[] = [];
      if (e.ctrlKey) mods.push('ctrl');
      if (e.altKey) mods.push('opt');
      if (e.shiftKey) mods.push('shift');
      if (e.metaKey) mods.push('cmd');
      setHeld(mods.length ? stateOf(mods) : null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      read(e);
    };
    const onKeyUp = (e: KeyboardEvent) => read(e);
    const onBlur = () => setHeld(null);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const close = () => {
    onClose();
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && opener.isConnected) requestAnimationFrame(() => opener.focus());
  };

  if (!isOpen) return null;
  const style = {
    '--km-bg': theme.background.menu.background,
    '--km-cap': theme.background.control.input.idle,
    '--km-cap-edge': theme.border.input.idle,
    '--km-line': theme.border.default,
    '--km-ink': theme.foreground.text.primary,
    '--km-ink-2': theme.foreground.text.secondary,
    '--km-accent': theme.background.control.button.primary.idle,
    '--km-accent-ink': '#ffffff',
    '--km-hover': theme.background.menu.item.hover,
  } as React.CSSProperties;
  const activeMods = state === 'plain' ? [] : state.split('+');
  const matches = (b: ParsedBinding, spec: KeySpec) => b.key === spec.k || (!!spec.note && b.key === spec.note);
  const onKey = (spec: KeySpec) => bindings.filter((b) => matches(b, spec));
  const selectedBindings = selected ? onKey(selected) : [];

  return (
    <div className="keyboard-map__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div
        ref={rootRef}
        className="keyboard-map"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard map"
        data-owns-keyboard=""
        data-keyboard-map
        style={style}
      >
        <div className="keyboard-map__head">
          <div>
            <h2 className="keyboard-map__title">Keyboard map</h2>
            <p className="keyboard-map__sub">Pick a modifier state, or hold the modifier. Click a lit key to see everything on it. {bindings.length} bindings.</p>
          </div>
          <button type="button" className="keyboard-map__close" data-keyboard-map-close aria-label="Close keyboard map" onClick={close}>✕</button>
        </div>
        <div className="keyboard-map__states" role="group" aria-label="Modifier state">
          {states.map((s) => (
            <button
              key={s}
              type="button"
              className="keyboard-map__chip"
              aria-pressed={s === state}
              data-state={s}
              onClick={() => { setPicked(s); setHeld(null); }}
            >
              {stateLabel(s)} <span className="keyboard-map__chip-n">{bindings.filter((b) => b.state === s).length}</span>
            </button>
          ))}
        </div>
        <div className="keyboard-map__board-wrap">
          <div className="keyboard-map__board" aria-label="Keyboard">
            {LAYOUT.map((row, ri) => (
              <div key={ri} className="keyboard-map__row">
                {row.keys.map((raw, ki) => {
                  const spec: KeySpec = typeof raw === 'string' ? { k: raw } : raw;
                  const cap = spec.cap ?? spec.k;
                  if (spec.mod) {
                    const active = spec.mod !== 'caps' && activeMods.includes(spec.mod);
                    return (
                      <div key={ki} className={`keyboard-map__key keyboard-map__key--mod${active ? ' keyboard-map__key--active' : ''}`} style={{ '--u': spec.u ?? 1 } as React.CSSProperties} aria-hidden="true">
                        <span className="keyboard-map__cap">{cap}</span>
                      </div>
                    );
                  }
                  const here = bindings.filter((b) => matches(b, spec) && b.state === state);
                  const elsewhere = bindings.some((b) => matches(b, spec) && b.state !== state);
                  const isSelected = selected?.k === spec.k;
                  const cls = ['keyboard-map__key', row.fn ? 'keyboard-map__key--fn' : '', here.length ? 'keyboard-map__key--bound' : elsewhere ? 'keyboard-map__key--other' : '', isSelected ? 'keyboard-map__key--selected' : ''].filter(Boolean).join(' ');
                  return (
                    <button
                      key={ki}
                      type="button"
                      className={cls}
                      style={{ '--u': spec.u ?? 1 } as React.CSSProperties}
                      data-key={spec.k}
                      aria-label={`${cap}${here.length ? ': ' + here.map((h) => h.action).join('; ') : ''}`}
                      disabled={!here.length && !elsewhere}
                      onClick={() => setSelected(spec)}
                    >
                      <span className="keyboard-map__cap">{cap}</span>
                      {here.length > 0 && <span className="keyboard-map__what">{here.length > 1 ? `${here.length} bindings` : here[0].action}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="keyboard-map__detail" aria-live="polite" data-keyboard-map-detail>
          {selected ? (
            <>
              <h3 className="keyboard-map__detail-title">{selected.cap ?? selected.k} <span className="keyboard-map__chip-n">{selectedBindings.length}</span></h3>
              {states.filter((s) => selectedBindings.some((b) => b.state === s)).map((s) => (
                <React.Fragment key={s}>
                  {selectedBindings.filter((b) => b.state === s).map((b, i) => (
                    <div key={`${s}-${i}`} className="keyboard-map__binding"><kbd>{b.text}</kbd><span>{b.action}</span></div>
                  ))}
                </React.Fragment>
              ))}
            </>
          ) : (
            <p className="keyboard-map__empty">A lit key is bound in this state; a dot marks a key bound in another. Click one.</p>
          )}
        </div>
      </div>
    </div>
  );
}

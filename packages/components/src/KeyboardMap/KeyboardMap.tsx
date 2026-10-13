import React from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { Dialog } from '../Dialog/Dialog';
import { SHORTCUT_CONTEXTS, type ShortcutRow, type ShortcutContext } from '../PreferencesModal/pages/shortcutsData';
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
  /** Where it works (the row's contexts; ['global'] when unset) */
  contexts: ReadonlyArray<ShortcutContext>;
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
  const contexts = row.contexts && row.contexts.length ? row.contexts : ['global' as const];
  const push = (mods: Modifier[], key: string, text: string) => out.push({ mods, key, text, action: row.action, rowId: row.id, state: stateOf(mods), contexts });
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
  { fn: true, keys: ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', { k: 'Home', u: 0.9 }, { k: 'End', u: 0.9 }] },
  { keys: ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', { k: 'Delete', u: 1.6, cap: '⌫' }] },
  { keys: [{ k: 'Tab', u: 1.6 }, 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', { k: '\\', u: 1 }] },
  { keys: [{ k: 'Caps', u: 1.9, mod: 'caps', cap: 'Caps' }, 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", { k: 'Return', u: 1.8, cap: '↩ Return' }] },
  { keys: [{ k: 'Shift', u: 2.4, mod: 'shift', cap: '⇧ Shift' }, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', { k: 'Shift', u: 2.3, mod: 'shift', cap: '⇧ Shift' }] },
  { keys: [{ k: 'Ctrl', u: 1.2, mod: 'ctrl', cap: '⌃' }, { k: 'Opt', u: 1.2, mod: 'opt', cap: '⌥' }, { k: 'Cmd', u: 1.5, mod: 'cmd', cap: '⌘' }, { k: 'Space', u: 5.6 }, { k: 'Cmd', u: 1.5, mod: 'cmd', cap: '⌘' }, { k: 'Opt', u: 1.2, mod: 'opt', cap: '⌥' }, '←', { k: '↑', cap: '↑ ↓', note: '↓' }, '→'] },
];
const STATE_ORDER = ['plain', 'shift', 'opt', 'cmd', 'opt+shift', 'shift+cmd', 'opt+cmd', 'opt+shift+cmd', 'ctrl', 'ctrl+shift'];

export type KeyboardMapContext = ShortcutContext | 'all' | 'follow';

/** The handle- or clip-context an element with the focus is in, if any */
function focusContext(el: Element | null): ShortcutContext | null {
  if (el?.closest('[data-fade-handle]')) return 'fade-handle';
  if (el?.closest('[data-handle-kind]')) return 'edge-handle';
  if (el?.closest('[data-clip-id]')) return 'clip';
  return null;
}

/** The contexts that apply RIGHT NOW: everywhere, what the focus is on
 *  (a fade handle, a trim / stretch handle, a clip), the clip SELECTION
 *  when there is one (the host's count — selection is state, not focus),
 *  and the time selection when there is one */
export function liveContexts(focused: Element | null, timeSelected: boolean, clipsSelected = false): ShortcutContext[] {
  const out: ShortcutContext[] = ['global'];
  const f = focusContext(focused);
  if (f) out.push(f);
  if (clipsSelected) out.push('clip-selected');
  if (timeSelected) out.push('time');
  return out;
}

/** The ONE context the map would open on from what had the focus: a
 *  fade handle, a trim / stretch handle, a clip — else, with a time
 *  selection, that; else all. (The map follows the app live now; this
 *  is the single-tab reading of the same question.) */
export function contextOfOpener(opener: Element | null, timeSelected: boolean): KeyboardMapContext {
  return focusContext(opener) ?? (timeSelected ? 'time' : 'all');
}

export interface KeyboardMapProps {
  isOpen: boolean;
  onClose: () => void;
  /** The Shortcuts page's rows (`SHORTCUT_ROWS`) */
  rows: ReadonlyArray<ShortcutRow>;
  /** Is there a time selection? The map opens on "Time selected" when
   *  nothing more specific had the focus */
  timeSelected?: boolean;
  /** Are any clips selected? "Clips selected" is a context of its own,
   *  beside the focused clip (2026-10-13) */
  clipsSelected?: boolean;
  /** The window chrome's OS style */
  os?: 'macos' | 'windows';
}

/**
 * THE KEYBOARD MAP (user request 2026-10-13, "I wouldn't mind seeing it
 * overlayed in the demo"): the app's shortcuts on a Mac keyboard —
 * View › Keyboard map and the command palette. Pick a modifier state
 * (or HOLD the modifier: the map follows the keys you are holding) and
 * the bound keys light up with a short caption; a dot marks a key bound
 * in another state; click a key to see everything on it, BY CONTEXT
 * (2026-10-13, "when I select a key, show the shortcuts by context": one
 * section per context the key has chords in — Everywhere, Clip focused…
 * — in the contexts' order, each chord once per context it works in).
 * Built from the same rows as Preferences › Shortcuts, so the two never
 * disagree. IT IS AN IN-APP WINDOW (2026-10-13, "it should be using our
 * in-app windows as containers"): the design system's Dialog in its
 * NON-MODAL form, as the Macro windows are — dragged by its header,
 * resized by its edges, the app behind it still in use (so the map can
 * sit beside the project while you try the keys), Tab going round it;
 * Escape closes it while it is the window in use, as does the header's
 * close button; focus returns to the opener.
 */
export function KeyboardMap({ isOpen, onClose, rows, timeSelected = false, clipsSelected = false, os = 'macos' }: KeyboardMapProps) {
  const { theme } = useTheme();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  const allBindings = React.useMemo(() => parseShortcutRows(rows), [rows]);
  // THE CONTEXT FILTER (2026-10-13, "in games they have controls filtered
  // by context, so perhaps we want to do the same with clip selected? …
  // or time selected?"): All, or one context — the map then shows only
  // the chords that work there. IT FOLLOWS THE APP (the same day, "can
  // the keyboard map be cognisant of what I have selected in the app so
  // it shows me all available shortcuts?"): the default tab, "Where you
  // are", is the UNION of the contexts that apply right now — everywhere,
  // plus the clip or handle with the focus, plus the time selection when
  // there is one — read live from the document's focus and the host's
  // `timeSelected`, so a click on a clip or a drag of a range changes
  // the map while the window sits beside the project. Focus moving INTO
  // the window (a chip, a key) keeps the app's last contexts, or every
  // click on the map would drop the clip it was about.
  const [context, setContext] = React.useState<KeyboardMapContext>('follow');
  const [focused, setFocused] = React.useState<Element | null>(null);
  const live = React.useMemo(() => liveContexts(focused, timeSelected, clipsSelected), [focused, timeSelected, clipsSelected]);
  const bindings = React.useMemo(() => {
    if (context === 'all') return allBindings;
    if (context === 'follow') return allBindings.filter((b) => b.contexts.some((c) => live.includes(c)));
    return allBindings.filter((b) => b.contexts.includes(context));
  }, [allBindings, context, live]);
  const states = React.useMemo(() => {
    const set = [...new Set(allBindings.map((b) => b.state))];
    return set.sort((a, b) => (STATE_ORDER.indexOf(a) + 1 || 99) - (STATE_ORDER.indexOf(b) + 1 || 99));
  }, [allBindings]);
  const [picked, setPicked] = React.useState('plain');
  const [held, setHeld] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<KeySpec | null>(null);
  const state = held ?? picked;

  React.useEffect(() => {
    if (!isOpen) return;
    setPicked('plain');
    setHeld(null);
    setSelected(null);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setContext('follow');
    setFocused(openerRef.current);
    // The app's focus, followed live; focus inside this window is not
    // the app's and leaves the reading alone
    const insideMap = (el: Element | null) => !!el?.closest('.keyboard-map-window');
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (insideMap(t)) return;
      setFocused(t);
    };
    const onFocusOut = (e: FocusEvent) => {
      // Focus going NOWHERE (a click on empty canvas, a blur) — unless
      // it is leaving the app for this window
      if (e.relatedTarget) return;
      const t = e.target instanceof Element ? e.target : null;
      if (insideMap(t)) return;
      requestAnimationFrame(() => { if (!insideMap(document.activeElement) && (!document.activeElement || document.activeElement === document.body)) setFocused(null); });
    };
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    const id = requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('.keyboard-map__tab[aria-pressed="true"]')?.focus());
    // The modifiers you HOLD pick the state, as long as you hold them
    // (wherever the focus is — the window is non-modal, and a Shift
    // held over the project still lights the map)
    const read = (e: KeyboardEvent) => {
      const mods: Modifier[] = [];
      if (e.ctrlKey) mods.push('ctrl');
      if (e.altKey) mods.push('opt');
      if (e.shiftKey) mods.push('shift');
      if (e.metaKey) mods.push('cmd');
      setHeld(mods.length ? stateOf(mods) : null);
    };
    const onKeyDown = (e: KeyboardEvent) => read(e);
    const onKeyUp = (e: KeyboardEvent) => read(e);
    const onBlur = () => setHeld(null);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
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
  const contextLabel = (c: ShortcutContext) => SHORTCUT_CONTEXTS.find((x) => x.id === c)?.label ?? c;
  // The contexts a key's chords belong to, in the contexts' own order
  const contextsOf = (bs: ParsedBinding[]) => SHORTCUT_CONTEXTS.map((x) => x.id).filter((c) => bs.some((b) => b.contexts.includes(c)));
  const contextCount = (c: KeyboardMapContext) => (c === 'all' ? allBindings : c === 'follow' ? allBindings.filter((b) => b.contexts.some((x) => live.includes(x))) : allBindings.filter((b) => b.contexts.includes(c))).length;
  const tabLabel = (c: KeyboardMapContext) => (c === 'all' ? 'All' : c === 'follow' ? 'Where you are' : contextLabel(c));

  return (
    <Dialog
      isOpen={isOpen}
      title="Keyboard map"
      onClose={close}
      os={os}
      nonModal
      loopTab
      closeOnClickOutside={false}
      className="keyboard-map-window"
      width={1040}
      minHeight={0}
      noPadding
    >
      <div ref={rootRef} className="keyboard-map" data-keyboard-map style={style}>
        <p className="keyboard-map__sub" data-keyboard-map-sub>
          {context === 'follow'
            ? <>Following the app — <strong>{live.map(contextLabel).join(' · ')}</strong>: {bindings.length} bindings work now. Pick a modifier state, or hold the modifier; click a lit key to see everything on it.</>
            : <>Pick where you are and a modifier state, or hold the modifier. Click a lit key to see everything on it. {bindings.length} bindings{context === 'all' ? '' : ' here'}.</>}
        </p>
        <div className="keyboard-map__contexts" role="group" aria-label="Context">
          {(['follow', 'all', ...SHORTCUT_CONTEXTS.map((c) => c.id)] as KeyboardMapContext[]).map((c) => (
            <button
              key={c}
              type="button"
              className="keyboard-map__tab"
              aria-pressed={c === context}
              data-context={c}
              onClick={() => { setContext(c); setSelected(null); }}
            >
              {tabLabel(c)} <span className="keyboard-map__chip-n">{contextCount(c)}</span>
            </button>
          ))}
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
              {contextsOf(selectedBindings).map((c) => (
                <section key={c} className="keyboard-map__ctx-group" data-detail-context={c}>
                  <h4 className="keyboard-map__ctx-title">{contextLabel(c)}</h4>
                  {states.flatMap((s) => selectedBindings.filter((b) => b.state === s && b.contexts.includes(c))).map((b, i) => (
                    <div key={`${c}-${i}`} className="keyboard-map__binding"><kbd>{b.text}</kbd><span>{b.action}</span></div>
                  ))}
                </section>
              ))}
            </>
          ) : (
            <p className="keyboard-map__empty">A lit key is bound in this state; a dot marks a key bound in another. Click one.</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}

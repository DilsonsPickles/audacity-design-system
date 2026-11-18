import React from 'react';
import { Button, SearchField, useTheme, findTool, PROJECT_TAB_TOOL_ID, TITLE_BAR_ONLY, type ToolbarLayout } from '@audacity-ui/components';
import { ALL_TOOLS, ToolGlyph, toolName } from './toolCatalogue';
import { useHiddenTools } from '../hooks/useHiddenTools';

/**
 * THE TOOL BANK (2026-11-18, "what if we did a layout where the tools are in
 * a bank … and the toolbars are all visible and in their actual space?" →
 * the macOS Customize Toolbar model, "build the bank"): a panel over the
 * canvas's foot holding EVERY TOOL, while the REAL toolbars sit in their
 * edit mode — inert, outlined, every tool grabbable without a modifier.
 * Drag a tile ONTO a toolbar to add it (a hidden one is shown; one already
 * on a toolbar moves), BESIDE one for a toolbar of its own, or between rows
 * for a row of its own — the drag and its drop lines are the toolbars' own
 * (`useToolbarToolDrag`); drag a tool OFF a toolbar and let go over the bank
 * (or anywhere off the toolbars) to take it off. A SEPARATOR and a FLEXIBLE
 * SPACE come first and go INTO a toolbar only. Done or Escape leaves; "Edit
 * as list…" opens the tree editor, the keyboard's way to do all of this.
 */

/** The bank's two layout items; a fresh separator / space id is made at the drop */
export const BANK_SEPARATOR_ID = 'bank-separator';
export const BANK_SPACER_ID = 'bank-spacer';
export const isBankLayoutItem = (id: string) => id === BANK_SEPARATOR_ID || id === BANK_SPACER_ID;

/** What the bank offers: never the project tabs (always in the title bar)
 *  nor the title-bar-only items (the title bar's own checklist adds them) */
const BANK_TOOLS = ALL_TOOLS.filter((id) => id !== PROJECT_TAB_TOOL_ID && !TITLE_BAR_ONLY.includes(id));

export interface ToolBankProps {
  layout: ToolbarLayout;
  /** Start a drag out of the bank (the toolbars' tool drag, with no toolbar) */
  onTileMouseDown: (toolId: string, e: React.MouseEvent, rect: DOMRect) => void;
  /** A tool from a toolbar is in hand and a release would take it off */
  removing: boolean;
  /** The tool in hand, from the bank or a toolbar */
  draggingToolId: string | null;
  onDone: () => void;
  onEditAsList: () => void;
}

const TILE_GHOST = 28;

export function ToolBank({ layout, onTileMouseDown, removing, draggingToolId, onDone, onEditAsList }: ToolBankProps) {
  const { theme } = useTheme();
  const { hidden: hiddenList } = useHiddenTools();
  const hidden = React.useMemo(() => new Set(hiddenList), [hiddenList]);
  const [query, setQuery] = React.useState('');

  // Over the canvas's foot, 12px above the bottom dock (the status bar)
  const [bottom, setBottom] = React.useState(56);
  React.useLayoutEffect(() => {
    const measure = () => {
      const docks = Array.from(document.querySelectorAll<HTMLElement>('.selection-toolbar'));
      const top = docks.reduce((m, d) => { const r = d.getBoundingClientRect(); return r.height > 0 ? Math.min(m, r.top) : m; }, window.innerHeight);
      setBottom(window.innerHeight - top + 12);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (label: string) => !q || label.toLowerCase().includes(q);
  const inUse = (id: string) => !!findTool(layout, id) && !hidden.has(id);
  const available = BANK_TOOLS.filter((id) => !inUse(id) && matches(toolName(id)));
  const used = BANK_TOOLS.filter((id) => inUse(id) && matches(toolName(id)));
  const items = [
    { id: BANK_SEPARATOR_ID, label: 'Separator' },
    { id: BANK_SPACER_ID, label: 'Flexible space' },
  ].filter((i) => matches(i.label));

  const press = (id: string) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onTileMouseDown(id, e, new DOMRect(e.clientX - TILE_GHOST / 2, e.clientY - TILE_GHOST / 2, TILE_GHOST, TILE_GHOST));
  };

  const tile = (id: string, label: string, glyph: React.ReactNode, note?: string) => (
    <div
      key={id}
      role="listitem"
      data-bank-tool={id}
      onMouseDown={press(id)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        height: 56, padding: '0 4px', borderRadius: 4, cursor: 'grab', userSelect: 'none',
        opacity: draggingToolId === id ? 0.35 : 1,
        border: `1px solid ${theme.border.default}`,
        background: theme.background.surface.default,
      }}
      className="tool-bank__tile"
    >
      <span style={{ height: 16, display: 'inline-flex', alignItems: 'center' }}>{glyph}</span>
      <span style={{ fontSize: 11, lineHeight: '13px', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {note && <span style={{ fontSize: 10, lineHeight: '12px', color: theme.foreground.text.secondary }}>{note}</span>}
    </div>
  );

  const heading = (text: string) => (
    <div style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600, color: theme.foreground.text.secondary, padding: '4px 0 0' }}>{text}</div>
  );

  return (
    <div
      data-tool-bank
      data-removing={removing ? '' : undefined}
      role="region"
      aria-label="Tool bank"
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom, zIndex: 1040,
        width: 'min(960px, calc(100vw - 32px))', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 8, padding: 12,
        background: theme.background.menu.background,
        color: theme.foreground.text.primary, fontSize: 12,
        border: `1px solid ${removing ? theme.accent.primary : theme.border.default}`,
        borderRadius: 8,
        boxShadow: removing
          ? `0 0 0 2px color-mix(in srgb, ${theme.accent.primary} 40%, transparent), 0 12px 32px rgba(0, 0, 0, 0.28)`
          : '0 12px 32px rgba(0, 0, 0, 0.28)',
      }}
    >
      <style>{`
        .tool-bank__tile:hover { background: ${theme.background.surface.hover} !important; }
        body[data-toolbar-tool-drag] .tool-bank__tile { cursor: grabbing; }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 auto', minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>Customise toolbars</span>
          <span data-tool-bank-hint style={{ color: removing ? theme.accent.primary : theme.foreground.text.secondary }}>
            {removing
              ? 'Release to take it off the toolbars'
              : 'Drag a tool onto a toolbar, beside one, or between rows. Drag one off a toolbar to remove it.'}
          </span>
        </div>
        <div style={{ width: 180, flex: '0 0 auto' }}>
          <SearchField value={query} onChange={setQuery} onClear={() => setQuery('')} placeholder="Search tools" />
        </div>
        <Button variant="secondary" size="default" onClick={onEditAsList}>Edit as list…</Button>
        <Button variant="primary" size="default" onClick={onDone}>Done</Button>
      </div>
      <div
        role="list"
        aria-label="Tools"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6,
          maxHeight: 232, overflowY: 'auto', paddingRight: 2,
        }}
      >
        {items.length > 0 && heading('Separator and space')}
        {items.map((i) => tile(i.id, i.label, i.id === BANK_SEPARATOR_ID
          ? <span style={{ width: 1, height: 16, background: 'currentColor', opacity: 0.6 }} />
          : <span style={{ width: 28, height: 12, borderRadius: 2, border: '1px dashed currentColor', opacity: 0.6 }} />))}
        {available.length > 0 && heading('Not on a toolbar')}
        {available.map((id) => tile(id, toolName(id), <ToolGlyph id={id} />, hidden.has(id) && findTool(layout, id) ? 'Hidden' : undefined))}
        {used.length > 0 && heading('On a toolbar — drag one to move it')}
        {used.map((id) => tile(id, toolName(id), <ToolGlyph id={id} />))}
        {items.length + available.length + used.length === 0 && (
          <div style={{ gridColumn: '1 / -1', color: theme.foreground.text.secondary, padding: '8px 0' }}>No tools match</div>
        )}
      </div>
    </div>
  );
}

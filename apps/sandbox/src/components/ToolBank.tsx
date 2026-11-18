import React from 'react';
import { Button, SearchField, useTheme, findTool, PROJECT_TAB_TOOL_ID, TITLE_BAR_ONLY, type ToolbarLayout } from '@audacity-ui/components';
import { ALL_TOOLS, ToolGlyph, toolName } from './toolCatalogue';
import { useHiddenTools } from '../hooks/useHiddenTools';

/**
 * THE TOOL BANK (2026-11-18, "what if we did a layout where the tools are in
 * a bank … and the toolbars are all visible and in their actual space?" →
 * the macOS Customize Toolbar model, "build the bank"), A DOCKABLE PANEL
 * since the same day ("could this customise toolbar be a panel that's
 * dockable?" → "stay usable"): the CUSTOMISE TOOLBARS panel, docked left,
 * right or in the bottom drawer — never an OS window, since its tiles drag
 * into the main window — holding EVERY TOOL. The toolbars STAY USABLE while
 * it is open, so it can sit docked as a parts bin: drag a tile ONTO a
 * toolbar to add it (a hidden one is shown; one already on a toolbar
 * moves), BESIDE one for a toolbar of its own, or between rows for a row
 * of its own — the toolbars' own tool drag (`useToolbarToolDrag`); Option-
 * or ⌘-drag a tool on a toolbar to move it, or onto the bank to take it
 * off — the ONE way to move a tool, with no mode (a Rearrange toggle for the
 * plain-press edit mode lived here for an hour: "I kinda hate that
 * concept"). A SEPARATOR and a FLEXIBLE SPACE lead and go INTO a toolbar
 * only. "Edit as list…" opens the tree editor, the keyboard's way.
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
  onEditAsList: () => void;
  /** A side dock (narrow: the controls stack) or the bottom drawer */
  placement: 'side' | 'bottom';
  os?: 'macos' | 'windows';
}

const TILE_GHOST = 28;

export function ToolBank({ layout, onTileMouseDown, removing, draggingToolId, onEditAsList, placement, os = 'macos' }: ToolBankProps) {
  const { theme } = useTheme();
  const { hidden: hiddenList } = useHiddenTools();
  const hidden = React.useMemo(() => new Set(hiddenList), [hiddenList]);
  const [query, setQuery] = React.useState('');
  const side = placement === 'side';
  const modifier = os === 'windows' ? 'Alt' : 'Option';

  const q = query.trim().toLowerCase();
  const matches = (label: string) => !q || label.toLowerCase().includes(q);
  const inUse = (id: string) => !!findTool(layout, id) && !hidden.has(id);
  const available = BANK_TOOLS.filter((id) => !inUse(id) && matches(toolName(id)));
  const used = BANK_TOOLS.filter((id) => inUse(id) && matches(toolName(id)));
  const items = [
    { id: BANK_SEPARATOR_ID, label: 'Divider' },
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

  const hint = removing
    ? 'Release to remove it from its group'
    : `Drag a tool into a group. ${modifier}-drag one in a group to move it, or onto this panel to remove it`;

  return (
    <div
      data-tool-bank
      data-removing={removing ? '' : undefined}
      role="region"
      aria-label="Customise toolbars"
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box',
        height: '100%', minHeight: 0, flex: '1 1 auto',
        color: theme.foreground.text.primary, fontSize: 12,
        // a tool from a toolbar over the panel: it lights as the place to let go
        outline: removing ? `2px solid ${theme.accent.primary}` : 'none', outlineOffset: -2,
        background: removing ? `color-mix(in srgb, ${theme.accent.primary} 8%, transparent)` : undefined,
      }}
    >
      <style>{`
        .tool-bank__tile:hover { background: ${theme.background.surface.hover} !important; }
        body[data-toolbar-tool-drag] .tool-bank__tile { cursor: grabbing; }
      `}</style>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span data-tool-bank-hint style={{ flex: side ? '1 1 100%' : '1 1 240px', minWidth: 0, color: removing ? theme.accent.primary : theme.foreground.text.secondary }}>
          {hint}
        </span>
        <div style={{ flex: side ? '1 1 100%' : '0 0 180px' }}>
          <SearchField value={query} onChange={setQuery} onClear={() => setQuery('')} placeholder="Search tools" />
        </div>
        <Button variant="secondary" size="default" onClick={onEditAsList}>Edit as list…</Button>
      </div>
      <div
        role="list"
        aria-label="Tools"
        style={{
          display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${side ? 84 : 96}px, 1fr))`, gap: 6,
          flex: '1 1 0', minHeight: 0, overflowY: 'auto', alignContent: 'start', paddingRight: 2,
        }}
      >
        {items.length > 0 && heading('Divider and space')}
        {items.map((i) => tile(i.id, i.label, i.id === BANK_SEPARATOR_ID
          ? <span style={{ width: 1, height: 16, background: 'currentColor', opacity: 0.6 }} />
          : <span style={{ width: 28, height: 12, borderRadius: 2, border: '1px dashed currentColor', opacity: 0.6 }} />))}
        {available.length > 0 && heading('Not in a group')}
        {available.map((id) => tile(id, toolName(id), <ToolGlyph id={id} />, hidden.has(id) && findTool(layout, id) ? 'Hidden' : undefined))}
        {used.length > 0 && heading('In a group — drag one to move it')}
        {used.map((id) => tile(id, toolName(id), <ToolGlyph id={id} />))}
        {items.length + available.length + used.length === 0 && (
          <div style={{ gridColumn: '1 / -1', color: theme.foreground.text.secondary, padding: '8px 0' }}>No tools match</div>
        )}
      </div>
    </div>
  );
}

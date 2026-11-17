import { CUSTOMISE_TOOLBAR_ENTRIES, CUSTOMISE_TOOL_ID, PROJECT_TAB_TOOL_ID, Icon } from '@audacity-ui/components';

/**
 * THE TOOL CATALOGUE (2026-11-17): every tool's name and glyph, shared by
 * the toolbar builder and the toolbars' own Add tool menu, so both name a
 * tool the same way. Moved verbatim out of ToolbarBuilderDialog.
 */

/** Names for the tools the Customise list does not carry */
const EXTRA_NAMES: Record<string, string> = {
  [PROJECT_TAB_TOOL_ID]: 'Project tabs',
  [CUSTOMISE_TOOL_ID]: 'Customise toolbar',
  debug: 'Debug',
  split: 'Split mode',
  'waveform-view': 'Waveform view',
  'status-cue': 'Playback status',
  'status-info': 'Info line',
  'selection-timecodes': 'Selection',
  'selection-duration': 'Selection duration',
};

export const ENTRY_BY_ID = new Map(
  CUSTOMISE_TOOLBAR_ENTRIES.flatMap((e) => (e.kind === 'tool' ? [[e.id, e] as const] : [])),
);
export const toolName = (id: string) => ENTRY_BY_ID.get(id)?.label ?? EXTRA_NAMES[id] ?? id;

/** Every tool the builder offers: the Customise list (less the metronome,
 *  which has nothing behind it), then the ones it does not carry */
export const ALL_TOOLS: ReadonlyArray<string> = [
  ...CUSTOMISE_TOOLBAR_ENTRIES.flatMap((e) => (e.kind === 'tool' && e.id !== 'metronome' ? [e.id] : [])),
  'split', 'waveform-view', 'status-cue', 'status-info', 'selection-timecodes', 'selection-duration',
  // The cog removes like any tool since 2026-11-16 (a right-click on any
  // toolbar opens this builder), and is added back from here
  CUSTOMISE_TOOL_ID,
  'debug',
];

export function ToolGlyph({ id }: { id: string }) {
  const entry = ENTRY_BY_ID.get(id);
  if (entry?.icon) return <Icon name={entry.icon} size={16} />;
  if (entry?.glyph) {
    return <span className="musescore-icon" aria-hidden="true" style={{ fontSize: 16, width: 16, display: 'inline-flex', justifyContent: 'center', color: entry.color }}>{entry.glyph}</span>;
  }
  return <span style={{ width: 16, display: 'inline-block' }} />;
}

/**
 * The panels that share the editor's docks (2026-10-02, when the Clip
 * properties panel joined Effects and Macros). Every placement site in
 * EditorLayout — dock tabs, tear-off, drag-to-dock, the tab kebab menu,
 * the OS-window popout, the bottom drawer — keys off this one id, so a
 * fourth panel is a new id and a content branch, not a fourth copy of
 * the plumbing.
 */
export type DockPanelId = 'effects' | 'macros' | 'clip-properties';

/** Where a panel can sit — every panel takes all four. (Effects never
 *  docked bottom until 2026-11-10, "the effects panel and macro manager
 *  panels… should be able to live in the bottom panel if the user so
 *  chooses": in the drawer it lays its sections side by side, the slots in
 *  columns — EffectsPanel `layout="columns"`.) */
export type PanelSide = 'left' | 'right' | 'bottom' | 'window';

export const DOCK_PANEL_LABELS: Record<DockPanelId, string> = {
  effects: 'Effects',
  macros: 'Macro manager',
  'clip-properties': 'Clip properties',
};

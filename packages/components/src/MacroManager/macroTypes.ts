/**
 * Shared macro data types — used by MacroManager (legacy combined modal),
 * MacrosPanel (dockable management panel) and MacroEditorDialog.
 */

export interface MacroStep {
  command: string;
  parameters: string;
}

export interface Macro {
  id: string;
  name: string;
  steps: MacroStep[];
}

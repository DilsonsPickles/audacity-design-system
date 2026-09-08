import type { Macro } from '@audacity-ui/components';

/**
 * Downloads a macro as a `<name>.macro.json` file — the shape
 * MacrosDockPanel's import flow reads back ({ name, steps }).
 */
export function exportMacroFile(macro: Macro): void {
  const blob = new Blob(
    [JSON.stringify({ name: macro.name, steps: macro.steps }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${macro.name.replace(/[^\w.-]+/g, '-')}.macro.json`;
  a.click();
  URL.revokeObjectURL(url);
}

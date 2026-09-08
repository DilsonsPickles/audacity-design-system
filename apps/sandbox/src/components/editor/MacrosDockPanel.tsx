import { MacrosPanel, toast, useGeneralPrefs, type Macro } from '@audacity-ui/components';
import { useMacros } from '../../contexts/MacrosContext';
import { exportMacroFile } from '../../utils/macroFile';

/** Type guard for the shape written by handleExportMacro. */
function isImportedMacro(value: unknown): value is Pick<Macro, 'name' | 'steps'> {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { name?: unknown; steps?: unknown };
  return (
    typeof v.name === 'string' &&
    Array.isArray(v.steps) &&
    v.steps.every(
      (s: unknown) =>
        typeof s === 'object' && s !== null &&
        typeof (s as { command?: unknown }).command === 'string' &&
        typeof (s as { parameters?: unknown }).parameters === 'string',
    )
  );
}

/**
 * MacrosDockPanel — sandbox wiring for the dockable MacrosPanel.
 * Owns import (file picker) / export (JSON download) plumbing; running a
 * macro is simulated with a toast, since the sandbox has no command engine.
 */
export function MacrosDockPanel() {
  const {
    macros, addMacro, renameMacro, deleteMacro, importMacro, setEditingMacroId,
  } = useMacros();
  const { operatingSystem } = useGeneralPrefs();

  const handleImportMacro = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      file.text().then((text) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          toast.error('Import failed', `${file.name} is not valid JSON.`);
          return;
        }
        if (!isImportedMacro(parsed)) {
          toast.error('Import failed', `${file.name} does not look like an exported macro.`);
          return;
        }
        importMacro(parsed);
        toast.success('Macro imported', `"${parsed.name}" was added to your macros.`);
      });
    };
    input.click();
  };

  const handleExportMacro = (macroId: string) => {
    const macro = macros.find((m) => m.id === macroId);
    if (macro) exportMacroFile(macro);
  };

  const runToast = (macroId: string, target: string) => {
    const macro = macros.find((m) => m.id === macroId);
    if (!macro) return;
    toast.info(`Running "${macro.name}"`, `Applying ${macro.steps.length} step${macro.steps.length === 1 ? '' : 's'} to ${target} (simulated).`);
  };

  return (
    <MacrosPanel
      macros={macros}
      onCreateMacro={addMacro}
      onImportMacro={handleImportMacro}
      onEditMacro={setEditingMacroId}
      onRenameMacro={renameMacro}
      onDeleteMacro={deleteMacro}
      onExportMacro={handleExportMacro}
      onRunOnProject={(id) => runToast(id, 'the current project')}
      onRunOnFiles={(id) => runToast(id, 'selected files')}
      os={operatingSystem}
    />
  );
}

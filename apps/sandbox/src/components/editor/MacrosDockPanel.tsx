import { MacrosPanel, toast, useGeneralPrefs, type Macro } from '@audacity-ui/components';
import { useMacros } from '../../contexts/MacrosContext';
import { exportMacroFile } from '../../utils/macroFile';
import { useMacroRunner } from '../../hooks/useMacroRunner';
import { useRunMacroOnFiles } from '../../hooks/useRunMacroOnFiles';

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
 * Owns import (file picker) / export (JSON download) plumbing. Running on
 * the project executes steps through the macro action registry
 * (`macros/macroActions.ts`) — commands without a registered action are
 * reported as simulated. Run-on-files goes straight to the OS file
 * browser (a multi-select .aup3 file input — the genuine native open
 * dialog in the Electron build), then opens the AU3-style
 * RunMacroOnFilesDialog progress window. Processing is simulated; the
 * single completion toast is batch-level (never one per file).
 */
export interface MacrosDockPanelProps {
  /** Where the panel sits in the app's reading order, which decides
   *  its place in the Tab order: docked left it comes BEFORE the
   *  tracks (`start`), docked right or bottom AFTER them (`end`). */
  placement?: 'start' | 'end';
}

export function MacrosDockPanel({ placement = 'start' }: MacrosDockPanelProps = {}) {
  const {
    macros, addMacro, renameMacro, deleteMacro, duplicateMacro, importMacro, setEditingMacroId,
  } = useMacros();
  const { operatingSystem } = useGeneralPrefs();
  const { runOnProject } = useMacroRunner();
  const { openRunOnFiles, runOnFilesDialog } = useRunMacroOnFiles();

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

  return (
    <>
      <MacrosPanel
        macros={macros}
        // Creating a macro drops you straight into the editor — the
        // natural next act after naming it is adding steps.
        onCreateMacro={(name) => setEditingMacroId(addMacro(name))}
        onImportMacro={handleImportMacro}
        onEditMacro={setEditingMacroId}
        onRenameMacro={renameMacro}
        onDuplicateMacro={duplicateMacro}
        onDeleteMacro={deleteMacro}
        onExportMacro={handleExportMacro}
        onRunOnProject={runOnProject}
        onRunOnFiles={openRunOnFiles}
        os={operatingSystem}
        placement={placement}
      />
      {runOnFilesDialog}
    </>
  );
}

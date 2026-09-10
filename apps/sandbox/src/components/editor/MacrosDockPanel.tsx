import React from 'react';
import { MacrosPanel, RunMacroOnFilesDialog, toast, useGeneralPrefs, type Macro, type MacroTargetFile } from '@audacity-ui/components';
import { useMacros } from '../../contexts/MacrosContext';
import { exportMacroFile } from '../../utils/macroFile';
import { useMacroRunner } from '../../hooks/useMacroRunner';

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
export function MacrosDockPanel() {
  const {
    macros, addMacro, renameMacro, deleteMacro, importMacro, setEditingMacroId,
  } = useMacros();
  const { operatingSystem } = useGeneralPrefs();
  const { runOnProject } = useMacroRunner();

  // Batch progress window state: which macro, and the files picked in
  // the OS browser.
  const [runOnFiles, setRunOnFiles] = React.useState<{
    macro: Macro;
    files: MacroTargetFile[];
  } | null>(null);

  const openRunOnFiles = (macroId: string) => {
    const macro = macros.find((m) => m.id === macroId);
    if (!macro) return;
    if (macro.steps.length === 0) {
      toast.info(`"${macro.name}" has no steps`, 'Add commands in the macro editor first.');
      return;
    }
    // The OS file browser IS the selection UI (AU3 model): no in-app
    // picker phase. In Electron this input opens the native dialog and
    // File.path carries full paths; on the web only names exist.
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    // No accept filter: the real product would filter to project files
    // (.aup3), but OS dialogs GRAY OUT non-matching files and the
    // extension set is in flux (aup/aup3/aup4) — for the mockup,
    // being unable to select a file is worse than an honest filter.
    input.onchange = () => {
      const picked = Array.from(input.files ?? []);
      if (picked.length === 0) return;
      setRunOnFiles({
        macro,
        files: picked.map((f, i) => ({
          id: `${i}-${f.name}`,
          path: (f as File & { path?: string }).path ?? f.name,
        })),
      });
    };
    input.click();
  };

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
        onDeleteMacro={deleteMacro}
        onExportMacro={handleExportMacro}
        onRunOnProject={runOnProject}
        onRunOnFiles={openRunOnFiles}
        os={operatingSystem}
      />
      <RunMacroOnFilesDialog
        isOpen={runOnFiles !== null}
        onClose={() => setRunOnFiles(null)}
        macroName={runOnFiles?.macro.name ?? ''}
        files={runOnFiles?.files ?? []}
        stepNames={runOnFiles?.macro.steps.map((s) => s.command) ?? []}
        onRunComplete={(fileIds) => {
          const macro = runOnFiles?.macro;
          if (!macro) return;
          // ONE batch-level toast — with 50 files, per-file toasts
          // would be noise; per-file feedback lives in the window.
          toast.success(
            `Applied "${macro.name}"`,
            `${macro.steps.length} step${macro.steps.length === 1 ? '' : 's'} applied to ${fileIds.length} file${fileIds.length === 1 ? '' : 's'} (simulated).`,
          );
        }}
        os={operatingSystem}
      />
    </>
  );
}

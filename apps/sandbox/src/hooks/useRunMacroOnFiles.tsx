import React from 'react';
import { RunMacroOnFilesDialog, toast, useGeneralPrefs, type Macro, type MacroTargetFile } from '@audacity-ui/components';
import { useMacros } from '../contexts/MacrosContext';

/**
 * The run-macro-on-files flow, shared by the Macros panel rows and the
 * macro editor's Run split button: OS file browser first (the genuine
 * native open dialog in the Electron build — selection happens THERE),
 * then the AU3-style RunMacroOnFilesDialog progress window. Processing
 * is simulated; the completion toast is batch-level only.
 *
 * Returns the opener and the dialog element — render `runOnFilesDialog`
 * once in the consuming component's JSX.
 */
export function useRunMacroOnFiles() {
  const { macros } = useMacros();
  const { operatingSystem } = useGeneralPrefs();

  const [runState, setRunState] = React.useState<{
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
    // No accept filter: the real product would filter to project files
    // (.aup3), but OS dialogs GRAY OUT non-matching files and the
    // extension set is in flux (aup/aup3/aup4) — for the mockup,
    // being unable to select a file is worse than an honest filter.
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      const picked = Array.from(input.files ?? []);
      if (picked.length === 0) return;
      setRunState({
        macro,
        files: picked.map((f, i) => ({
          id: `${i}-${f.name}`,
          path: (f as File & { path?: string }).path ?? f.name,
        })),
      });
    };
    input.click();
  };

  const runOnFilesDialog = (
    <RunMacroOnFilesDialog
      isOpen={runState !== null}
      onClose={() => setRunState(null)}
      macroName={runState?.macro.name ?? ''}
      files={runState?.files ?? []}
      stepNames={runState?.macro.steps.map((s) => s.command) ?? []}
      onRunComplete={(fileIds) => {
        const macro = runState?.macro;
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
  );

  return { openRunOnFiles, runOnFilesDialog };
}

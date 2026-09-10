import React from 'react';
import { MacrosPanel, RunMacroOnProjectsDialog, toast, useGeneralPrefs, type Macro, type MacroTargetProject } from '@audacity-ui/components';
import { useMacros } from '../../contexts/MacrosContext';
import { exportMacroFile } from '../../utils/macroFile';
import { useMacroRunner } from '../../hooks/useMacroRunner';
import { getProjects } from '../../utils/projectDatabase';

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
 * reported as simulated. Run-on-files opens RunMacroOnProjectsDialog over
 * the user's SAVED PROJECTS (the sandbox's stand-in for .aup files);
 * processing is simulated per project.
 */
export function MacrosDockPanel() {
  const {
    macros, addMacro, renameMacro, deleteMacro, importMacro, setEditingMacroId,
  } = useMacros();
  const { operatingSystem } = useGeneralPrefs();
  const { runOnProject } = useMacroRunner();

  // Run-on-projects dialog state: which macro, and the saved projects
  // loaded from IndexedDB at open time.
  const [runOnProjects, setRunOnProjects] = React.useState<{
    macro: Macro;
    projects: MacroTargetProject[];
  } | null>(null);

  const openRunOnProjects = async (macroId: string) => {
    const macro = macros.find((m) => m.id === macroId);
    if (!macro) return;
    const stored = await getProjects();
    setRunOnProjects({
      macro,
      projects: stored.map((p) => ({ id: p.id, title: p.title, dateModified: p.dateModified })),
    });
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
        onCreateMacro={addMacro}
        onImportMacro={handleImportMacro}
        onEditMacro={setEditingMacroId}
        onRenameMacro={renameMacro}
        onDeleteMacro={deleteMacro}
        onExportMacro={handleExportMacro}
        onRunOnProject={runOnProject}
        onRunOnFiles={openRunOnProjects}
        os={operatingSystem}
      />
      <RunMacroOnProjectsDialog
        isOpen={runOnProjects !== null}
        onClose={() => setRunOnProjects(null)}
        macroName={runOnProjects?.macro.name ?? ''}
        projects={runOnProjects?.projects ?? []}
        onRunComplete={(projectIds) => {
          const macro = runOnProjects?.macro;
          if (!macro) return;
          toast.success(
            `Applied "${macro.name}"`,
            `${macro.steps.length} step${macro.steps.length === 1 ? '' : 's'} applied to ${projectIds.length} project${projectIds.length === 1 ? '' : 's'} (simulated).`,
          );
        }}
        os={operatingSystem}
      />
    </>
  );
}

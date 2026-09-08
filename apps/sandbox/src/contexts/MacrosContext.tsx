import React, { createContext, useContext } from 'react';
import type { Macro } from '@audacity-ui/components';
import type { Command } from '@audacity-ui/components';

export type MacrosPanelSide = 'left' | 'right';

export interface MacrosContextValue {
  /** All macros in the project */
  macros: Macro[];

  /** Create a macro (seeded with the END step, matching Audacity's model) */
  addMacro: (name: string) => void;
  renameMacro: (macroId: string, newName: string) => void;
  deleteMacro: (macroId: string) => void;
  /** Add an imported macro verbatim (fresh id, name de-duplicated by caller if desired) */
  importMacro: (macro: Pick<Macro, 'name' | 'steps'>) => void;
  /** Append a command from the picker as a new step. `parameters` seeds the
   *  step's serialized parameters string (defaults to empty). */
  addCommandToMacro: (macroId: string, command: Command, parameters?: string) => void;
  deleteStep: (macroId: string, stepIndex: number) => void;
  moveStep: (macroId: string, stepIndex: number, direction: -1 | 1) => void;
  /** Move a step from one index to another (drag reorder) */
  reorderStep: (macroId: string, fromIndex: number, toIndex: number) => void;
  /** Replace a step's parameters string */
  updateStepParameters: (macroId: string, stepIndex: number, parameters: string) => void;

  /** Dockable Macros management panel */
  isMacrosPanelOpen: boolean;
  setIsMacrosPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  macrosPanelSide: MacrosPanelSide;
  setMacrosPanelSide: React.Dispatch<React.SetStateAction<MacrosPanelSide>>;

  /** Macro currently open in the floating MacroEditorDialog (null = closed) */
  editingMacroId: string | null;
  setEditingMacroId: React.Dispatch<React.SetStateAction<string | null>>;
}

const MacrosContext = createContext<MacrosContextValue | null>(null);

export function MacrosProvider({ children }: { children: React.ReactNode }) {
  const [macros, setMacros] = React.useState<Macro[]>([]);
  const [isMacrosPanelOpen, setIsMacrosPanelOpen] = React.useState(false);
  const [macrosPanelSide, setMacrosPanelSide] = React.useState<MacrosPanelSide>('left');
  const [editingMacroId, setEditingMacroId] = React.useState<string | null>(null);

  const addMacro = React.useCallback((name: string) => {
    const newMacro: Macro = {
      id: `macro-${Date.now()}`,
      name,
      steps: [{ command: 'END', parameters: '' }],
    };
    setMacros((prev) => [...prev, newMacro]);
  }, []);

  const renameMacro = React.useCallback((macroId: string, newName: string) => {
    setMacros((prev) => prev.map((m) => (m.id === macroId ? { ...m, name: newName } : m)));
  }, []);

  const deleteMacro = React.useCallback((macroId: string) => {
    setMacros((prev) => prev.filter((m) => m.id !== macroId));
    setEditingMacroId((prev) => (prev === macroId ? null : prev));
  }, []);

  const importMacro = React.useCallback((macro: Pick<Macro, 'name' | 'steps'>) => {
    const newMacro: Macro = {
      id: `macro-${Date.now()}`,
      name: macro.name,
      steps: macro.steps.map((s) => ({ command: s.command, parameters: s.parameters })),
    };
    setMacros((prev) => [...prev, newMacro]);
  }, []);

  const addCommandToMacro = React.useCallback((macroId: string, command: Command, parameters = '') => {
    setMacros((prev) => prev.map((m) => {
      if (m.id !== macroId) return m;
      return { ...m, steps: [...m.steps, { command: command.name, parameters }] };
    }));
  }, []);

  const deleteStep = React.useCallback((macroId: string, stepIndex: number) => {
    setMacros((prev) => prev.map((m) => {
      if (m.id !== macroId) return m;
      return { ...m, steps: m.steps.filter((_, i) => i !== stepIndex) };
    }));
  }, []);

  const moveStep = React.useCallback((macroId: string, stepIndex: number, direction: -1 | 1) => {
    setMacros((prev) => prev.map((m) => {
      if (m.id !== macroId) return m;
      const target = stepIndex + direction;
      if (target < 0 || target >= m.steps.length) return m;
      const steps = [...m.steps];
      [steps[stepIndex], steps[target]] = [steps[target], steps[stepIndex]];
      return { ...m, steps };
    }));
  }, []);

  const reorderStep = React.useCallback((macroId: string, fromIndex: number, toIndex: number) => {
    setMacros((prev) => prev.map((m) => {
      if (m.id !== macroId) return m;
      if (fromIndex === toIndex
        || fromIndex < 0 || fromIndex >= m.steps.length
        || toIndex < 0 || toIndex >= m.steps.length) return m;
      const steps = [...m.steps];
      const [moved] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, moved);
      return { ...m, steps };
    }));
  }, []);

  const updateStepParameters = React.useCallback((macroId: string, stepIndex: number, parameters: string) => {
    setMacros((prev) => prev.map((m) => {
      if (m.id !== macroId) return m;
      return {
        ...m,
        steps: m.steps.map((s, i) => (i === stepIndex ? { ...s, parameters } : s)),
      };
    }));
  }, []);

  const value = React.useMemo<MacrosContextValue>(() => ({
    macros,
    addMacro,
    renameMacro,
    deleteMacro,
    importMacro,
    addCommandToMacro,
    deleteStep,
    moveStep,
    reorderStep,
    updateStepParameters,
    isMacrosPanelOpen,
    setIsMacrosPanelOpen,
    macrosPanelSide,
    setMacrosPanelSide,
    editingMacroId,
    setEditingMacroId,
  }), [
    macros, addMacro, renameMacro, deleteMacro, importMacro,
    addCommandToMacro, deleteStep, moveStep, reorderStep, updateStepParameters,
    isMacrosPanelOpen, macrosPanelSide, editingMacroId,
  ]);

  return (
    <MacrosContext.Provider value={value}>
      {children}
    </MacrosContext.Provider>
  );
}

export function useMacros(): MacrosContextValue {
  const ctx = useContext(MacrosContext);
  if (!ctx) {
    throw new Error('useMacros must be used within a MacrosProvider');
  }
  return ctx;
}

import { toast } from '@audacity-ui/components';
import { useMacros } from '../contexts/MacrosContext';
import { useTracks } from '../contexts/TracksContext';
import { runMacroSteps } from '../macros/macroActions';

/**
 * Runs a macro on the current project through the macro action registry
 * (`macros/macroActions.ts`) and reports the applied/simulated split as
 * a toast. Shared by the MacrosPanel row play button and the macro
 * editor's Run button (the editor is non-modal so the timeline reacts
 * in view — test as you edit).
 */
export function useMacroRunner() {
  const { macros } = useMacros();
  const { state, dispatch } = useTracks();

  const runOnProject = (macroId: string) => {
    const macro = macros.find((m) => m.id === macroId);
    if (!macro) return;
    const { applied, simulated } = runMacroSteps(macro, state, dispatch);
    if (applied.length === 0 && simulated.length === 0) {
      toast.info(`"${macro.name}" has no steps`, 'Add commands in the macro editor first.');
      return;
    }
    const parts: string[] = [];
    if (applied.length > 0) parts.push(`${applied.length} step${applied.length === 1 ? '' : 's'} applied`);
    if (simulated.length > 0) parts.push(`${simulated.length} simulated (${simulated.join(', ')})`);
    toast.success(`Ran "${macro.name}"`, `${parts.join('; ')}.`);
  };

  return { runOnProject };
}

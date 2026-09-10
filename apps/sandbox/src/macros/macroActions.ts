/**
 * Macro action registry — the sandbox's command engine for running macros.
 *
 * Qt-style: each implemented command is a `MacroAction` registered by the
 * command name that appears in macro steps (matching `data/commands.ts` and
 * the parameter schemas in `data/commandParameters.ts`). `runMacroSteps`
 * executes a macro's steps in order against the tracks reducer; commands
 * without a registered action are counted as simulated so the caller can
 * report them.
 *
 * Steps that change the selection also return the updated selection view,
 * which the runner threads into the next step — so `Select Time` followed
 * by a `RelativeTo="Selectionend"` step composes within one run instead of
 * reading the pre-run state.
 */

import { parseMacroParameters } from '@audacity-ui/components';
import type { Macro } from '@audacity-ui/components';
import type { TracksAction, TracksState, TimeSelection } from '../contexts/TracksContext';

/** The slice of state macro actions read and thread between steps. */
export interface MacroSelectionView {
  timeSelection: TimeSelection | null;
  selectedTrackIndices: number[];
}

export interface MacroActionContext {
  dispatch: React.Dispatch<TracksAction>;
  /** Selection view as of this step (pre-run state merged with the
   *  results of earlier steps in the same run) */
  view: MacroSelectionView;
  /** Playhead position in seconds (for RelativeTo="Cursor") */
  playheadPosition: number;
  /** End of the last clip in the project, seconds (for RelativeTo="Projectend") */
  projectEnd: number;
  trackCount: number;
}

export interface MacroAction {
  /** Command name as it appears in macro steps */
  command: string;
  description: string;
  /** Execute; return the changed selection view (if any) for the runner
   *  to thread into subsequent steps */
  run: (params: Record<string, string>, ctx: MacroActionContext) => Partial<MacroSelectionView> | void;
}

/** End of the last audio/MIDI clip on any track. */
export function getProjectEnd(state: TracksState): number {
  let end = 0;
  for (const track of state.tracks) {
    for (const clip of track.clips) end = Math.max(end, clip.start + clip.duration);
    for (const clip of track.midiClips ?? []) end = Math.max(end, clip.start + clip.duration);
  }
  return end;
}

const toNumber = (value: string | undefined, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Resolve the anchor a Start/End offset is relative to. Values match the
 *  serialized `RelativeTo` enum in commandParameters.ts (labels with
 *  spaces stripped); absent/unknown values anchor to project start. */
function resolveAnchor(relativeTo: string | undefined, ctx: MacroActionContext): number {
  switch (relativeTo) {
    case 'Projectend': return ctx.projectEnd;
    case 'Selectionstart': return ctx.view.timeSelection?.startTime ?? 0;
    case 'Selectionend': return ctx.view.timeSelection?.endTime ?? 0;
    case 'Cursor': return ctx.playheadPosition;
    case 'Projectstart':
    default: return 0;
  }
}

function selectTime(params: Record<string, string>, ctx: MacroActionContext): Partial<MacroSelectionView> {
  const anchor = resolveAnchor(params.RelativeTo, ctx);
  const a = anchor + toNumber(params.Start);
  const b = anchor + toNumber(params.End);
  const startTime = Math.max(0, Math.min(a, b));
  const endTime = Math.max(0, Math.max(a, b));
  if (endTime <= startTime) {
    ctx.dispatch({ type: 'SET_TIME_SELECTION', payload: null });
    return { timeSelection: null };
  }
  const timeSelection: TimeSelection = { startTime, endTime, renderOnCanvas: true };
  ctx.dispatch({ type: 'SET_TIME_SELECTION', payload: timeSelection });
  return { timeSelection };
}

function selectTracks(params: Record<string, string>, ctx: MacroActionContext): Partial<MacroSelectionView> {
  // The combined 'Select' schema uses FirstTrack/NumTracks; 'Select Tracks'
  // uses Track/TrackCount — accept both spellings.
  const first = Math.max(0, Math.round(toNumber(params.Track ?? params.FirstTrack)));
  const count = Math.max(0, Math.round(toNumber(params.TrackCount ?? params.NumTracks, 1)));
  const wanted: number[] = [];
  for (let i = first; i < first + count && i < ctx.trackCount; i++) wanted.push(i);

  const mode = params.Mode ?? 'Set';
  let selected: number[];
  if (mode === 'Add') {
    selected = Array.from(new Set([...ctx.view.selectedTrackIndices, ...wanted])).sort((x, y) => x - y);
  } else if (mode === 'Remove') {
    const drop = new Set(wanted);
    selected = ctx.view.selectedTrackIndices.filter((i) => !drop.has(i));
  } else {
    selected = wanted;
  }
  ctx.dispatch({ type: 'SET_SELECTED_TRACKS', payload: selected });
  return { selectedTrackIndices: selected };
}

const ACTIONS: MacroAction[] = [
  {
    command: 'Select Time',
    description: 'Set the time selection (Start/End, relative to an anchor)',
    run: selectTime,
  },
  {
    command: 'Select Tracks',
    description: 'Set/add/remove a contiguous range of tracks in the selection',
    run: selectTracks,
  },
  {
    command: 'Select',
    description: 'Combined time + track selection',
    run: (params, ctx) => {
      const timePart = selectTime(params, ctx);
      const trackPart = selectTracks(params, { ...ctx, view: { ...ctx.view, ...timePart } });
      return { ...timePart, ...trackPart };
    },
  },
  {
    command: 'Select All',
    description: 'Select all tracks and the full project duration',
    run: (_params, ctx) => {
      const all = Array.from({ length: ctx.trackCount }, (_, i) => i);
      ctx.dispatch({ type: 'SET_SELECTED_TRACKS', payload: all });
      const timeSelection: TimeSelection | null = ctx.projectEnd > 0
        ? { startTime: 0, endTime: ctx.projectEnd, renderOnCanvas: true }
        : null;
      ctx.dispatch({ type: 'SET_TIME_SELECTION', payload: timeSelection });
      return { selectedTrackIndices: all, timeSelection };
    },
  },
  {
    command: 'Select None',
    description: 'Clear the time and track selection',
    run: (_params, ctx) => {
      ctx.dispatch({ type: 'SET_TIME_SELECTION', payload: null });
      ctx.dispatch({ type: 'SET_SELECTED_TRACKS', payload: [] });
      return { timeSelection: null, selectedTrackIndices: [] };
    },
  },
];

const registry = new Map(ACTIONS.map((a) => [a.command, a]));
// AU4-vocabulary aliases (the rebuilt command list uses the real
// action titles): 'Select all' = select-all, 'Clear selection' =
// clear-selection. The original names stay registered so previously
// exported macros keep running.
registry.set('Select all', registry.get('Select All')!);
registry.set('Clear selection', registry.get('Select None')!);

export const macroActionRegistry: ReadonlyMap<string, MacroAction> = registry;

export interface MacroRunResult {
  /** Command names that executed through a registered action, in order */
  applied: string[];
  /** Command names with no registered action (still prototype-simulated) */
  simulated: string[];
}

/** Execute a macro's steps in order. `END` steps are skipped — the
 *  editor no longer creates them, but AU3-style imported files may
 *  still carry the terminator. Selection changes are threaded between
 *  steps via the view. */
export function runMacroSteps(
  macro: Pick<Macro, 'steps'>,
  state: TracksState,
  dispatch: React.Dispatch<TracksAction>,
): MacroRunResult {
  const result: MacroRunResult = { applied: [], simulated: [] };
  let view: MacroSelectionView = {
    timeSelection: state.timeSelection,
    selectedTrackIndices: state.selectedTrackIndices,
  };
  const base = {
    dispatch,
    playheadPosition: state.playheadPosition,
    projectEnd: getProjectEnd(state),
    trackCount: state.tracks.length,
  };
  for (const step of macro.steps) {
    if (step.command === 'END') continue;
    const action = macroActionRegistry.get(step.command);
    if (!action) {
      result.simulated.push(step.command);
      continue;
    }
    const patch = action.run(parseMacroParameters(step.parameters), { ...base, view });
    if (patch) view = { ...view, ...patch };
    result.applied.push(step.command);
  }
  return result;
}

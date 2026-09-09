import { describe, it, expect, vi } from 'vitest';
import { runMacroSteps, getProjectEnd, macroActionRegistry } from '../macroActions';
import { initialState, type TracksState, type Track } from '../../contexts/TracksContext';

function makeState(overrides: Partial<TracksState> = {}): TracksState {
  const tracks: Track[] = [0, 1, 2].map((i) => ({
    id: i + 1,
    name: `Track ${i + 1}`,
    clips: [{ id: i + 1, name: 'Clip', start: 0, duration: 10 + i * 5, trimStart: 0 }],
  })) as Track[];
  return { ...initialState, tracks, ...overrides };
}

const step = (command: string, parameters = '') => ({ command, parameters });

describe('macroActions', () => {
  it('registers the starter selection actions', () => {
    for (const name of ['Select Time', 'Select Tracks', 'Select', 'Select All', 'Select None']) {
      expect(macroActionRegistry.has(name)).toBe(true);
    }
  });

  it('getProjectEnd is the end of the last clip on any track', () => {
    expect(getProjectEnd(makeState())).toBe(20); // track 3: start 0 + duration 20
  });

  it('Select Time sets the time selection from project start', () => {
    const dispatch = vi.fn();
    const result = runMacroSteps(
      { steps: [step('Select Time', 'Start="1", End="4", RelativeTo="Projectstart"'), step('END')] },
      makeState(), dispatch,
    );
    expect(result.applied).toEqual(['Select Time']);
    expect(result.simulated).toEqual([]);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 1, endTime: 4, renderOnCanvas: true },
    });
  });

  it('Select Time anchors to the cursor and clamps at zero', () => {
    const dispatch = vi.fn();
    runMacroSteps(
      { steps: [step('Select Time', 'Start="-100", End="2", RelativeTo="Cursor"')] },
      makeState({ playheadPosition: 5 }), dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 0, endTime: 7, renderOnCanvas: true },
    });
  });

  it('Select Tracks sets a contiguous range, clamped to the track count', () => {
    const dispatch = vi.fn();
    runMacroSteps(
      { steps: [step('Select Tracks', 'Track="1", TrackCount="5", Mode="Set"')] },
      makeState(), dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_TRACKS', payload: [1, 2] });
  });

  it('Select Tracks Add/Remove modes modify the existing selection', () => {
    const dispatch = vi.fn();
    runMacroSteps(
      {
        steps: [
          step('Select Tracks', 'Track="0", TrackCount="1", Mode="Set"'),
          step('Select Tracks', 'Track="2", TrackCount="1", Mode="Add"'),
          step('Select Tracks', 'Track="0", TrackCount="1", Mode="Remove"'),
        ],
      },
      makeState(), dispatch,
    );
    const payloads = dispatch.mock.calls
      .filter(([a]) => a.type === 'SET_SELECTED_TRACKS')
      .map(([a]) => a.payload);
    expect(payloads).toEqual([[0], [0, 2], [2]]);
  });

  it('threads the selection between steps — RelativeTo Selectionend sees the previous step', () => {
    const dispatch = vi.fn();
    runMacroSteps(
      {
        steps: [
          step('Select Time', 'Start="2", End="6"'),
          step('Select Time', 'Start="0", End="3", RelativeTo="Selectionend"'),
        ],
      },
      makeState(), dispatch,
    );
    const last = dispatch.mock.calls.at(-1)![0];
    expect(last).toEqual({
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 6, endTime: 9, renderOnCanvas: true },
    });
  });

  it('the basic "select track and select time" macro applies both', () => {
    const dispatch = vi.fn();
    const result = runMacroSteps(
      {
        steps: [
          step('Select Tracks', 'Track="1", TrackCount="1"'),
          step('Select Time', 'Start="0", End="5"'),
          step('END'),
        ],
      },
      makeState(), dispatch,
    );
    expect(result.applied).toEqual(['Select Tracks', 'Select Time']);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_TRACKS', payload: [1] });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 0, endTime: 5, renderOnCanvas: true },
    });
  });

  it('Select All selects every track and the whole project', () => {
    const dispatch = vi.fn();
    runMacroSteps({ steps: [step('Select All')] }, makeState(), dispatch);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_TRACKS', payload: [0, 1, 2] });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 0, endTime: 20, renderOnCanvas: true },
    });
  });

  it('Select None clears both selections', () => {
    const dispatch = vi.fn();
    runMacroSteps({ steps: [step('Select None')] }, makeState(), dispatch);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TIME_SELECTION', payload: null });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_TRACKS', payload: [] });
  });

  it('unregistered commands are reported as simulated, END is skipped', () => {
    const dispatch = vi.fn();
    const result = runMacroSteps(
      { steps: [step('Fade In'), step('Select None'), step('END')] },
      makeState(), dispatch,
    );
    expect(result.simulated).toEqual(['Fade In']);
    expect(result.applied).toEqual(['Select None']);
  });
});

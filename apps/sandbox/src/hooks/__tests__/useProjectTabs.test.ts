import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import React from 'react';
import { useProjectTabs } from '../useProjectTabs';
import { tracksReducer, initialState, type TracksState, type Track } from '../../contexts/TracksContext';

afterEach(cleanup);

// The project tabs (2026-11-12): each open project keeps its state; a
// switch swaps it in with REPLACE_STATE, a close hands over to a neighbour
function setup() {
  const openProject = vi.fn(async () => {});
  const stopPlayback = vi.fn();
  const setActiveMenuItem = vi.fn();
  const projects = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] as never;
  const { result } = renderHook(() => {
    const [state, dispatch] = React.useReducer(tracksReducer, initialState);
    const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(null);
    const tabs = useProjectTabs({
      state, dispatch, currentProjectId, setCurrentProjectId,
      setIsCloudProject: () => {}, setActiveMenuItem, projects, openProject, stopPlayback,
    });
    return { state, dispatch, currentProjectId, setCurrentProjectId, tabs };
  });
  const open = (id: string, tracks: Track[]) => act(() => {
    result.current.setCurrentProjectId(id);
    result.current.dispatch({ type: 'SET_TRACKS', payload: tracks });
  });
  return { result, open, openProject, stopPlayback };
}

const track = (name: string) => ({ id: name.length, name, clips: [] }) as unknown as Track;

describe('useProjectTabs', () => {
  it('every opened project gets a tab, and a switch brings its state back', () => {
    const { result, open, stopPlayback } = setup();
    open('a', [track('A1')]);
    open('b', [track('B1'), track('B2')]);
    expect(result.current.tabs.openProjectIds).toEqual(['a', 'b']);
    act(() => result.current.tabs.switchToProject('a'));
    expect(result.current.currentProjectId).toBe('a');
    expect(result.current.state.tracks.map((t) => t.name)).toEqual(['A1']);
    expect(stopPlayback).toHaveBeenCalled();
    act(() => result.current.tabs.switchToProject('b'));
    expect(result.current.state.tracks.map((t) => t.name)).toEqual(['B1', 'B2']);
  });

  it('closing the active tab hands over to its neighbour; the last goes Home', () => {
    const { result, open } = setup();
    open('a', [track('A1')]);
    open('b', [track('B1')]);
    act(() => result.current.tabs.closeProject('b'));
    expect(result.current.tabs.openProjectIds).toEqual(['a']);
    expect(result.current.currentProjectId).toBe('a');
    expect(result.current.state.tracks.map((t) => t.name)).toEqual(['A1']);
    act(() => result.current.tabs.closeProject('a'));
    expect(result.current.tabs.openProjectIds).toEqual([]);
    expect(result.current.currentProjectId).toBeNull();
    expect((result.current.state as TracksState).tracks).toEqual(initialState.tracks);
  });
});

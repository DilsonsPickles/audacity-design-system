import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import React from 'react';
import { useProjectTabs, OPEN_TABS_KEY, type ProjectView } from '../useProjectTabs';
import { tracksReducer, initialState, type TracksState, type Track } from '../../contexts/TracksContext';

afterEach(() => { cleanup(); localStorage.clear(); });

// The project tabs (2026-11-12): each open project keeps its state; a
// switch swaps it in with REPLACE_STATE, a close hands over to a neighbour
function setup(opts: { restoreOnLaunch?: boolean; stored?: string[] } = {}) {
  const openProject = vi.fn(async () => {});
  let view: ProjectView = { loop: { enabled: false, start: null, end: null }, pixelsPerSecond: 100, scrollLeft: 0, scrollTop: 0 };
  const restoreView = vi.fn((v: ProjectView | null) => { view = v ?? { ...view, scrollLeft: 0, scrollTop: 0 }; });
  const setView = (v: Partial<ProjectView>) => { view = { ...view, ...v }; };
  const stopPlayback = vi.fn();
  const setActiveMenuItem = vi.fn();
  const projects = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] as never;
  const { result } = renderHook(() => {
    const [state, dispatch] = React.useReducer(tracksReducer, initialState);
    const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(null);
    const tabs = useProjectTabs({
      state, dispatch, currentProjectId, setCurrentProjectId,
      setIsCloudProject: () => {}, setActiveMenuItem, projects, openProject, stopPlayback,
      inProject: currentProjectId !== null,
      captureView: () => view,
      restoreView,
      listProjects: async () => (opts.stored ?? ['a', 'b']).map((id) => ({ id, title: id })) as never,
      restoreOnLaunch: opts.restoreOnLaunch ?? false,
    });
    return { state, dispatch, currentProjectId, setCurrentProjectId, tabs };
  });
  const open = (id: string, tracks: Track[]) => act(() => {
    result.current.setCurrentProjectId(id);
    result.current.dispatch({ type: 'SET_TRACKS', payload: tracks });
  });
  return { result, open, openProject, stopPlayback, setView, getView: () => view };
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

describe('useProjectTabs — view, order, relaunch (2026-11-12)', () => {
  it('each tab keeps its own zoom, scroll and loop region', () => {
    const { result, open, setView, getView } = setup();
    open('a', [track('A1')]);
    setView({ pixelsPerSecond: 250, scrollLeft: 400, loop: { enabled: true, start: 1, end: 2 } });
    open('b', [track('B1')]);
    act(() => result.current.tabs.switchToProject('a'));
    // b was never left, so a's view was kept when b's switch began — a comes back
    setView({ pixelsPerSecond: 50, scrollLeft: 0, loop: { enabled: false, start: null, end: null } });
    act(() => result.current.tabs.switchToProject('b'));
    act(() => result.current.tabs.switchToProject('a'));
    expect(getView().pixelsPerSecond).toBe(50);
    act(() => result.current.tabs.switchToProject('b'));
    expect(getView().pixelsPerSecond).toBe(250);
  });

  it('reorders the tabs, and ignores an order that is not a permutation', () => {
    const { result, open } = setup();
    open('a', [track('A1')]);
    open('b', [track('B1')]);
    act(() => result.current.tabs.reorderProjects(['b', 'a']));
    expect(result.current.tabs.openProjectIds).toEqual(['b', 'a']);
    act(() => result.current.tabs.reorderProjects(['b', 'x']));
    expect(result.current.tabs.openProjectIds).toEqual(['b', 'a']);
  });

  it('the tabs are saved, and come back at the next launch — those whose project still exists', async () => {
    localStorage.setItem(OPEN_TABS_KEY, JSON.stringify({ ids: ['b', 'gone', 'a'], active: 'a', inProject: true }));
    const { result, openProject } = setup({ restoreOnLaunch: true });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.tabs.openProjectIds).toEqual(['b', 'a']);
    expect(openProject).toHaveBeenCalledWith('a');
    expect(JSON.parse(localStorage.getItem(OPEN_TABS_KEY) ?? '{}').ids).toEqual(['b', 'a']);
  });
});

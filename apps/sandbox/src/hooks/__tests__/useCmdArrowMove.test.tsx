// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { TracksProvider, useTracksState } from '../../contexts/TracksContext';
import { useCmdArrowMove } from '../useCmdArrowMove';
import { pendingClipMoveResolution } from '../../utils/pendingClipMoveResolution';

afterEach(cleanup);

/**
 * Minimal harness that renders useCmdArrowMove inside a TracksProvider
 * (mirrors useClipDragging.overlap.test.tsx) and forwards the hook's
 * return value + live tracks state to the test via onState.
 */
function Harness({
  onState,
}: {
  onState: (s: {
    tracksState: ReturnType<typeof useTracksState>;
    isCmdArrowMoving: boolean;
    beginCmdMove: () => void;
  }) => void;
}) {
  const tracksState = useTracksState();
  const { isCmdArrowMoving, beginCmdMove } = useCmdArrowMove({ tracks: tracksState.tracks });

  React.useEffect(() => {
    onState({ tracksState, isCmdArrowMoving, beginCmdMove });
  });

  return null;
}

describe('useCmdArrowMove', () => {
  afterEach(() => {
    // Guard against test bleed on the module-scoped ref.
    pendingClipMoveResolution.current = false;
  });

  it('clears isCmdArrowMoving on Cmd/Ctrl release and leaves overlapping clips intact', () => {
    let last: {
      tracksState: ReturnType<typeof useTracksState>;
      isCmdArrowMoving: boolean;
      beginCmdMove: () => void;
    };

    // clip 1: 0→5s, stays put (unselected). clip 2: selected, final resting
    // position 3→7s (as if a Cmd+Arrow nudge landed it there) — overlap
    // is legal (2026-09-21), so release must leave BOTH clips untouched.
    const initialClips = [
      { id: 1, name: '', start: 0, duration: 5, trimStart: 0, envelopePoints: [] },
      { id: 2, name: '', start: 3, duration: 4, trimStart: 0, envelopePoints: [], selected: true },
    ];

    render(
      <TracksProvider
        initialTracks={[{ id: 1, name: 'Track 1', clips: initialClips } as any]}
      >
        <Harness onState={(s) => { last = s; }} />
      </TracksProvider>,
    );

    // Seed the pending flag + flip the moving flag, as onClipMove would.
    act(() => {
      pendingClipMoveResolution.current = true;
      last!.beginCmdMove();
    });

    expect(last!.isCmdArrowMoving).toBe(true);

    act(() => {
      fireEvent.keyUp(document, { key: 'Meta' });
    });

    expect(last!.isCmdArrowMoving).toBe(false);
    expect(pendingClipMoveResolution.current).toBe(false);

    // Overlap is legal: clip 1 keeps its full 5s alongside clip 2 (3→7s);
    // the overlap region is a crossfade, not an eviction.
    const track = last!.tracksState.tracks[0];
    const clip1 = track.clips.find((c: any) => c.id === 1);
    const clip2 = track.clips.find((c: any) => c.id === 2);
    expect(clip1?.duration).toBe(5);
    expect(clip1?.start).toBe(0);
    expect(clip2?.start).toBe(3);
    expect(clip2?.duration).toBe(4);
  });

  it('does nothing on keyup when no pending resolution', () => {
    let last: {
      tracksState: ReturnType<typeof useTracksState>;
      isCmdArrowMoving: boolean;
      beginCmdMove: () => void;
    };

    render(
      <TracksProvider initialTracks={[{ id: 1, name: 'Track 1', clips: [] } as any]}>
        <Harness onState={(s) => { last = s; }} />
      </TracksProvider>,
    );

    expect(pendingClipMoveResolution.current).toBe(false);

    act(() => {
      fireEvent.keyUp(document, { key: 'Meta' });
    });

    expect(last!.isCmdArrowMoving).toBe(false);
  });
});

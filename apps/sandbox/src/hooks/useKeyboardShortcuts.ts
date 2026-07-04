import { useEffect, useRef } from 'react';
import type { TracksState, TracksAction, Clip } from '../contexts/TracksContext';
import { scrollIntoViewIfNeeded, usePreferences, announce } from '@dilsonspickles/components';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import type { EffectsPanelState } from './useContextMenuState';
import { handleCopy, handleCut, handlePaste } from './handlers/clipboardHandlers';
import { handleDelete } from './handlers/deleteHandlers';
import { handleSpacebar, handleRecordToggle, handleLoopToggle } from './handlers/transportHandlers';
import { handleHomeEnd, handleF6, handleTrackFocus, handleEnterSelection } from './handlers/navigationHandlers';
import { handlePlayheadMove, handleEscape, handleDeleteTimeRange } from './handlers/playheadSelectionHandlers';
import { handleTrackCreation } from './handlers/trackCreationHandlers';
import { handleEffectsKey } from './handlers/effectsPanelHandlers';
import { handleSplitAtPlayhead, handleSplitAllTracks } from './handlers/splitHandlers';
import { handleDuplicate } from './handlers/duplicateHandlers';
import { pendingClipMoveResolution } from '../utils/pendingClipMoveResolution';
import { confirmTrackDelete } from '../utils/confirmTrackDelete';

export interface ClipboardState {
  clips: (Clip & { trackIndex: number })[];
  operation: 'copy' | 'cut';
  timeSelection?: { startTime: number; endTime: number };
}

export interface UseKeyboardShortcutsOptions {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  handlePlay: () => void;
  handleRecord: () => void;
  handleStopRecording: () => void;
  selectionAnchor: number | null;
  setSelectionAnchor: React.Dispatch<React.SetStateAction<number | null>>;
  selectionAnchorRef: React.MutableRefObject<number | null>;
  selectionEdgesRef: React.MutableRefObject<{ startTime: number; endTime: number } | null>;
  effectsPanel: EffectsPanelState | null;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  clipboard: ClipboardState | null;
  setClipboard: React.Dispatch<React.SetStateAction<ClipboardState | null>>;
  isFlatNavigation: boolean;
  toggleLoopRegion: () => void;
  audioManagerRef: React.RefObject<AudioPlaybackManager>;
  /** Cmd/Ctrl+, opens the preferences modal. */
  onOpenPreferences?: () => void;
}

/**
 * Hook that manages global keyboard shortcuts for the application.
 * Routes key events to domain-specific handler modules.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const { preferences } = usePreferences();
  const {
    state,
    dispatch,
    handlePlay,
    handleRecord,
    handleStopRecording,
    selectionAnchor,
    setSelectionAnchor,
    selectionAnchorRef,
    selectionEdgesRef,
    effectsPanel,
    setEffectsPanel,
    clipboard,
    setClipboard,
    isFlatNavigation,
    toggleLoopRegion,
    audioManagerRef,
    onOpenPreferences,
  } = options;

  // Track whether the user is navigating via keyboard or mouse.
  const isKeyboardNavigatingRef = useRef(false);

  // Remembered focus origin from the last E-key open of the effects
  // panel — restored when the next E-key press closes it. Persisted
  // outside React state so it survives re-renders without spam.
  const effectsPanelFocusOriginRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleMouseDown = () => { isKeyboardNavigatingRef.current = false; };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, []);

  const scrollPlayheadIntoView = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = document.querySelector('.canvas-scroll-container') as HTMLElement;
        const playhead = container?.querySelector('.playhead-cursor') as HTMLElement;
        if (playhead) scrollIntoViewIfNeeded(playhead, container);
      });
    });
  };

  useEffect(() => {
    const transportDeps = { state, handlePlay, handleRecord, handleStopRecording, setEffectsPanel, toggleLoopRegion };
    const navDeps = { state, dispatch, selectionAnchor, setSelectionAnchor, selectionAnchorRef, selectionEdgesRef, isFlatNavigation, scrollPlayheadIntoView, trackSelectionMode: preferences.trackSelectionMode };
    const playheadDeps = { state, dispatch, selectionAnchorRef, selectionEdgesRef, scrollPlayheadIntoView };
    const clipboardDeps = { state, dispatch, clipboard, setClipboard, audioManagerRef };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation keys indicate keyboard navigation mode
      const navKeys = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Home', 'End'];
      if (navKeys.includes(e.key)) {
        isKeyboardNavigatingRef.current = true;
      }

      // Skip if in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // --- Escape ---
      if (e.key === 'Escape') {
        // Highest priority: bail out of split mode if active.
        if (state.splitMode) {
          e.preventDefault();
          dispatch({ type: 'SET_SPLIT_MODE', payload: false });
          return;
        }
        // Next: clear any active "selection-ish" state — time selection
        // and any selected clips. Both go in one Escape press so the
        // user has a single "deselect everything" gesture instead of
        // hunting separate shortcuts.
        const hasTimeSelection = !!state.timeSelection;
        const hasSelectedClips = state.tracks.some(
          (t) =>
            t.clips.some((c) => c.selected)
            || t.midiClips?.some((c) => c.selected),
        );
        if (hasTimeSelection || hasSelectedClips) {
          e.preventDefault();
          if (hasTimeSelection) handleEscape(playheadDeps);
          if (hasSelectedClips) dispatch({ type: 'DESELECT_ALL_CLIPS' });
          return;
        }
        // After time-selection / clip-selection are clear, the next
        // Escape narrows a multi-track selection down to just the
        // focused track. Focused-in-selection → keep only focused;
        // focused-out-of-selection → wipe the selection entirely
        // (matches the Model 3 spirit — the user is "away" from it).
        const selectedTrackIndices = state.selectedTrackIndices || [];
        if (selectedTrackIndices.length > 1) {
          e.preventDefault();
          const fti = state.focusedTrackIndex;
          const focusedInSelection =
            fti !== null && fti !== undefined && selectedTrackIndices.includes(fti);
          dispatch({
            type: 'SET_SELECTED_TRACKS',
            payload: focusedInSelection && fti !== null && fti !== undefined ? [fti] : [],
          });
          setSelectionAnchor(focusedInSelection ? (fti as number) : null);
          return;
        }
        // Progressive Escape:
        //   - DOM focus is on a track container (BW outline)
        //       → exit keyboard nav entirely. Blur, and the next Tab
        //         starts the user from a clean state.
        //   - DOM focus is on something inside a track (clip, handle,
        //     etc.) and a track is logically focused
        //       → anchor DOM focus to the focused-track container so
        //         the next Tab is deterministic (this case is mostly
        //         already handled by the clip's local Escape handler,
        //         but keep as a fallback for paths that don't have one).
        //   - Otherwise → blur whatever's focused.
        const active = document.activeElement as HTMLElement | null;
        if (
          state.focusedTrackIndex !== null
          && state.focusedTrackIndex !== undefined
          && active
          && active.classList.contains('track')
        ) {
          // Already on a track container — Escape exits.
          e.preventDefault();
          active.blur();
          isKeyboardNavigatingRef.current = false;
          return;
        }
        if (state.focusedTrackIndex !== null && state.focusedTrackIndex !== undefined) {
          const trackEl = document.querySelector(
            `.track-wrapper[data-track-index="${state.focusedTrackIndex}"] .track`,
          ) as HTMLElement | null;
          if (trackEl) {
            e.preventDefault();
            trackEl.focus();
            isKeyboardNavigatingRef.current = false;
            return;
          }
        }
        // No focused track to land on — fall back to clearing focus.
        if (active && active !== document.body && typeof active.blur === 'function') {
          e.preventDefault();
          active.blur();
          isKeyboardNavigatingRef.current = false;
          return;
        }
      }

      // --- Cmd/Ctrl+, : open Preferences ---
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        if (onOpenPreferences) {
          e.preventDefault();
          onOpenPreferences();
          return;
        }
      }

      // --- Home/End ---
      // Playhead → project start / end. Skipped only when focus is
      // inside an actual toolbar or menubar (where the browser's
      // native Home/End walks between items). Track panels use
      // role="group" too, but we want the playhead shortcut to work
      // there — so `[role="group"]` is intentionally NOT in the
      // early-exit list.
      if (e.key === 'Home' || e.key === 'End') {
        const target = e.target as HTMLElement;
        if (target.closest('[role="toolbar"], [role="menubar"]')) {
          return;
        }
        e.preventDefault();
        handleHomeEnd(e, navDeps);
        return;
      }

      // --- Spacebar ---
      if (e.key === ' ') {
        const target = e.target as HTMLElement;
        const isTextField = target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && ['text', 'search', 'url', 'email', 'tel', 'password', 'number'].includes((target as HTMLInputElement).type)) ||
          target.isContentEditable;

        if (!isTextField) {
          e.preventDefault();
          handleSpacebar(transportDeps);
          return;
        }
      }

      // --- R: Record ---
      if (e.key === 'r' || e.key === 'R') {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.isContentEditable;
        if (!isTextInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          handleRecordToggle(transportDeps);
          return;
        }
      }

      // --- E: Toggle effects panel ---
      // Panel closed → remember whatever the user was focused on, open
      //   the panel for the focused track, Add-effect button auto-
      //   focuses on mount.
      // Panel open  → close the panel and restore focus to whatever
      //   the user had before opening it (a clip, the track wrapper,
      //   a button — whatever).
      if (e.key === 'e' || e.key === 'E') {
        handleEffectsKey(e, { effectsPanel, setEffectsPanel, effectsPanelFocusOriginRef, transportDeps });
        return;
      }

      // --- S: Toggle split tool (bare key, no modifiers) ---
      if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true';
        if (!isTextInput) {
          e.preventDefault();
          dispatch({ type: 'SET_SPLIT_MODE', payload: !state.splitMode });
          return;
        }
      }

      // --- Shift+S / Shift+U: Solo / Mute the focused track ---
      // Mirrors the M / S buttons in the track-control-panel header.
      // Falls back to the selection when the focused track is part of
      // it (Model 3): focused-in-selection toggles every selected
      // track in lock-step, otherwise just the focused one.
      if (
        e.shiftKey
        && !e.metaKey
        && !e.ctrlKey
        && !e.altKey
        && (e.key === 'S' || e.key === 's' || e.key === 'U' || e.key === 'u')
      ) {
        const target = e.target as HTMLElement;
        const tag = target.tagName;
        const isTextInput = tag === 'INPUT' || tag === 'TEXTAREA'
          || target.getAttribute('role') === 'textbox'
          || target.getAttribute('contenteditable') === 'true';
        if (isTextInput) return;
        const fti = state.focusedTrackIndex;
        if (fti === null || fti === undefined) return;
        e.preventDefault();
        const isSolo = e.key === 'S' || e.key === 's';
        const focusInSelection = (state.selectedTrackIndices || []).includes(fti);
        const trackIndices = focusInSelection
          ? state.selectedTrackIndices
          : [fti];
        for (const ti of trackIndices) {
          const t = state.tracks[ti] as any;
          if (!t) continue;
          const newValue = isSolo ? !(t.soloed ?? false) : !(t.muted ?? false);
          dispatch({
            type: 'UPDATE_TRACK',
            payload: {
              index: ti,
              track: isSolo ? { soloed: newValue } : { muted: newValue },
            },
          });
          if (!isSolo) {
            if (newValue) {
              audioManagerRef.current?.setTrackMuted?.(ti, true);
            } else {
              audioManagerRef.current?.setTrackGain?.(ti, (t.gain ?? 75) as number);
            }
          }
        }
        // Announce so screen-reader users hear the toggle land.
        const action = isSolo ? 'Solo' : 'Mute';
        if (trackIndices.length === 1) {
          const t = state.tracks[trackIndices[0]] as any;
          const newValue = isSolo ? !(t.soloed ?? false) : !(t.muted ?? false);
          announce(`${action} ${newValue ? 'on' : 'off'}`);
        } else {
          announce(`${action} toggled on ${trackIndices.length} tracks`);
        }
        return;
      }

      // --- L: Loop region (bare key, no Cmd/Ctrl — those are reserved for
      //     other shortcuts like Cmd+Shift+L for new label track) ---
      if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true';
        if (!isTextInput) {
          e.preventDefault();
          handleLoopToggle(transportDeps);
          return;
        }
      }

      // --- F6: Block navigation ---
      if (e.key === 'F6' && isFlatNavigation) {
        e.preventDefault();
        handleF6(e, navDeps);
        return;
      }

      // --- ArrowUp/Down: Track focus ---
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const target = e.target as HTMLElement;
        if (target.hasAttribute('data-clip-id')) {
          return;
        }
        // Vertical rulers own their own ArrowUp/Down (step ruler-by-
        // ruler). Don't steal them via the single-item-group fall-
        // through logic below.
        if (target.hasAttribute('data-track-ruler-index')) {
          return;
        }
        // If a clip is currently selected but doesn't have DOM focus
        // (typical after clicking a clip header or a Tab that moved
        // focus elsewhere), treat the selected clip's track as the
        // "current" track and step to the prev / next one. Beats
        // silently jumping to the first / last track via the
        // single-item-group fallback below.
        //
        // Skipped when:
        //   - Shift is held: Shift+Arrow is track-selection extend,
        //     handled by TrackNew.onKeyDown on the .track container.
        //     Stealing it here would collapse the selection to a
        //     single track on every press.
        //   - Focus is already on a .track container: TrackNew's own
        //     onKeyDown handles arrows and doesn't need this fallback.
        //   - Focus owns arrows for its own value adjustment
        //     (slider / knob / text input).
        {
          const tag = target.tagName;
          const isTrackContainer = target.classList?.contains('track');
          const ownsArrows = e.shiftKey
            || isTrackContainer
            || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
            || target.getAttribute('role') === 'slider'
            || target.getAttribute('contenteditable') === 'true'
            || target.closest('.track-control-panel');
          if (!ownsArrows) {
            let selectedClipTrack: number | null = null;
            outer: for (let ti = 0; ti < state.tracks.length; ti++) {
              const t = state.tracks[ti] as any;
              for (const c of t.clips || []) {
                if (c.selected) { selectedClipTrack = ti; break outer; }
              }
              for (const c of t.midiClips || []) {
                if (c.selected) { selectedClipTrack = ti; break outer; }
              }
            }
            if (selectedClipTrack !== null) {
              const dir = e.key === 'ArrowDown' ? 1 : -1;
              const nextIndex = selectedClipTrack + dir;
              if (nextIndex >= 0 && nextIndex < state.tracks.length) {
                e.preventDefault();
                dispatch({ type: 'SET_FOCUSED_TRACK', payload: nextIndex });
                if (preferences.trackSelectionMode === 'follows-focus') {
                  dispatch({ type: 'SELECT_TRACK', payload: nextIndex });
                  setSelectionAnchor(nextIndex);
                }
                setTimeout(() => {
                  const trackEl = document.querySelector(
                    `.track-wrapper[data-track-index="${nextIndex}"] .track`,
                  ) as HTMLElement | null;
                  if (trackEl) {
                    trackEl.setAttribute('data-focus-from-nav', '1');
                    trackEl.focus();
                  }
                }, 0);
                return;
              }
              // At an edge — still preventDefault so the browser
              // doesn't scroll while we hold at the boundary.
              e.preventDefault();
              return;
            }
          }
        }
        const groupAncestor = target.closest(
          '[role="toolbar"], [role="group"], [role="menubar"], [role="region"], [role="menu"]',
        ) as HTMLElement | null;
        if (groupAncestor) {
          // Track-control-panel children (Pan / Volume slots, mute /
          // solo, etc.) live inside the panel's own arrow-nav scope
          // — the panel handles ArrowUp/Down to step between siblings
          // and ArrowLeft/Right to cycle. We must NOT steal those
          // arrows even when the immediate group only contains one
          // focusable (the Pan slot wraps a single Knob, but stepping
          // out of the slot should land on the next panel sibling,
          // not jump to a new track).
          if (target.closest('.track-control-panel')) {
            return;
          }
          // Multi-item tab groups own arrows for their internal nav —
          // we mustn't steal them. Single-item groups (e.g. the
          // "Add new" button, the timeline ruler) should fall through
          // and let the user arrow straight into the track list.
          const focusables = Array.from(
            groupAncestor.querySelectorAll<HTMLElement>(
              'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
          if (focusables.length > 1) {
            return;
          }
          // Single-item group → jump to the first / last track since
          // we're entering the track list from outside, not stepping
          // from an existing focused track.
          if (state.tracks.length === 0) return;
          e.preventDefault();
          const targetIndex = e.key === 'ArrowDown' ? 0 : state.tracks.length - 1;
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: targetIndex });
          if (preferences.trackSelectionMode === 'follows-focus') {
            dispatch({ type: 'SELECT_TRACK', payload: targetIndex });
            setSelectionAnchor(targetIndex);
          }
          // Defer DOM focus so React renders the new focusedTrackIndex
          // first; otherwise the track wrapper's onFocus logic sees a
          // stale state.
          setTimeout(() => {
            const trackEl = document.querySelector(
              `.track-wrapper[data-track-index="${targetIndex}"] .track`,
            ) as HTMLElement | null;
            if (trackEl) {
              trackEl.setAttribute('data-focus-from-nav', '1');
              trackEl.focus();
            }
          }, 0);
          return;
        }
        e.preventDefault();
        handleTrackFocus(e, navDeps);
        return;
      }

      // --- J / K: Playhead jump.
      //   - Plain J   → previous clip edge on the focused track
      //   - Plain K   → next     clip edge on the focused track
      //   - Shift+J   → start of the earliest clip on the focused
      //                 track (or project 0 as a fresh-load fallback)
      //   - Shift+K   → end   of the latest   clip on the focused
      //                 track (or project end as a fresh-load fallback)
      if (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.defaultPrevented) return;
        const target = e.target as HTMLElement;
        const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'textbox' || target.getAttribute('contenteditable') === 'true';
        if (isTextInput) return;
        e.preventDefault();
        const isLeftward = e.key === 'j' || e.key === 'J';

        const fti = state.focusedTrackIndex;
        const trackForBounds =
          fti !== null && fti !== undefined ? state.tracks[fti] : null;

        if (!e.shiftKey) {
          // Plain J / K → jump the playhead to the previous / next
          // clip edge (start or end of any clip) on the focused
          // track. Snap-to-clip-boundary navigation.
          if (!trackForBounds) return;
          const allClips = [
            ...(trackForBounds.clips || []),
            ...((trackForBounds.midiClips as any[]) || []),
          ];
          if (allClips.length === 0) return;
          // Collect every edge, dedupe so coincident start/end pairs
          // don't make the playhead stick.
          const edges = Array.from(
            new Set<number>(
              allClips.flatMap((c: any) => [c.start, c.start + c.duration]),
            ),
          ).sort((a, b) => a - b);
          const playhead = state.playheadPosition;
          const EPSILON = 0.0001;
          let target: number | null = null;
          if (isLeftward) {
            for (let i = edges.length - 1; i >= 0; i--) {
              if (edges[i] < playhead - EPSILON) {
                target = edges[i];
                break;
              }
            }
          } else {
            for (const edge of edges) {
              if (edge > playhead + EPSILON) {
                target = edge;
                break;
              }
            }
          }
          if (target !== null) {
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: target });
            scrollPlayheadIntoView();
          }
          return;
        }

        // Shift+J / Shift+K → jump to the outer edge of the focused
        // track's clip cluster:
        //   Shift+J → start of the earliest clip on that track
        //   Shift+K → end of the latest clip on that track
        // Falls back to the equivalent project-wide bound when no
        // track is focused, so the shortcut still does something
        // sensible from a fresh load.
        let targetTime = 0;
        if (trackForBounds) {
          const allClips = [
            ...(trackForBounds.clips || []),
            ...((trackForBounds.midiClips as any[]) || []),
          ];
          if (allClips.length > 0) {
            targetTime = isLeftward
              ? Math.min(...allClips.map((c: any) => c.start))
              : Math.max(...allClips.map((c: any) => c.start + c.duration));
          }
        } else if (!isLeftward) {
          // Project end fallback when no focused track.
          for (const t of state.tracks) {
            for (const c of t.clips) {
              const end = c.start + c.duration;
              if (end > targetTime) targetTime = end;
            }
            for (const c of (t.midiClips || [])) {
              const end = c.start + c.duration;
              if (end > targetTime) targetTime = end;
            }
          }
        }
        dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: targetTime });
        scrollPlayheadIntoView();
        return;
      }

      // --- ArrowLeft / ArrowRight: nudge the playhead ---
      // Plain arrow → 0.1 s playhead nudge.
      // Shift + arrow → extend the time selection by 0.1 s in that
      //                 direction (creates one at the playhead when
      //                 none exists).
      // Cmd/Ctrl + arrow → "move whatever's under the gesture":
      //   - a focused clip (handled by the clip's own keydown)
      //   - clips a time selection overlaps on the selected tracks
      //   - otherwise no-op so the gesture never silently turns into
      //     a playhead jump. , / . own the 1 s playhead jump.
      // Cmd+Shift + arrow → extend the time selection by 1 s.
      //
      // Fires when nothing else has claimed the arrow:
      //   - Element-level handlers that own arrows (clip nav in non-
      //     flat mode, Knob / range slider) call preventDefault, and
      //     defaultPrevented short-circuits us out.
      //   - In flat-nav mode the clip / track wrappers don't intercept
      //     plain arrows so we naturally pick them up and move the
      //     playhead.
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (e.defaultPrevented) return;
        // Alt+Shift+Arrow on a focused clip is the time-stretch chord
        // — the clip's own onKeyDown handles it and calls
        // preventDefault, which the defaultPrevented check above
        // catches. Outside a focused clip, Alt+Shift+Arrow is the
        // large-step selection extend (Alt = fast, Shift = extend).
        const target = e.target as HTMLElement;
        const tag = target.tagName;
        // Skip when the focused element owns arrow keys for its own
        // value adjustment / text editing.
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (target.getAttribute('role') === 'slider') return;
        if (target.getAttribute('contenteditable') === 'true') return;

        const isLeftward = e.key === 'ArrowLeft';
        const cmdHeld = e.metaKey || e.ctrlKey;

        // Cmd+Arrow on a time selection that overlaps any clips:
        // move the clips together with the selection. Mirrors the
        // Cmd+Arrow-on-focused-clip behaviour so the gesture means
        // the same thing whether you're "on" a clip or "around" some
        // clips. We scope the search to the selected tracks (or the
        // focused track when nothing's selected) so a wide time
        // selection across the whole canvas doesn't accidentally
        // sweep up clips on tracks the user never targeted. When the
        // time selection doesn't touch any clip on the scoped tracks
        // we fall through to the playhead-jump path.
        if (
          cmdHeld
          && !e.shiftKey
          && state.timeSelection
          && !target.closest('[data-clip-id]')
        ) {
          const { startTime, endTime } = state.timeSelection;
          const EPS = 0.0001;
          const scopedTrackIndices = state.selectedTrackIndices?.length
            ? state.selectedTrackIndices
            : state.focusedTrackIndex !== null && state.focusedTrackIndex !== undefined
              ? [state.focusedTrackIndex]
              : [];
          type Overlap = { trackIndex: number; clipId: number };
          const overlapping: Overlap[] = [];
          for (const ti of scopedTrackIndices) {
            const t = state.tracks[ti];
            if (!t) continue;
            for (const c of (t.clips || []) as any[]) {
              if (c.start < endTime - EPS && c.start + c.duration > startTime + EPS) {
                overlapping.push({ trackIndex: ti, clipId: c.id });
              }
            }
          }
          if (overlapping.length > 0) {
            e.preventDefault();
            // Alt = fast (1s), plain = fine (0.1s). Matches the
            // playhead-nudge and focused-clip Cmd+Arrow conventions.
            const step = e.altKey ? 1.0 : 0.1;
            const delta = isLeftward ? -step : step;
            // Mirror the drag-into-time-selection behaviour: promote
            // every overlapping clip to selected and drop the time
            // selection, then move the group as one. Subsequent
            // Cmd+Arrow presses move the same group without needing
            // to re-find overlappers — the selection is now what
            // "the group" means.
            const anyUnselected = overlapping.some(({ trackIndex: ti, clipId }) => {
              const c = state.tracks[ti]?.clips.find((cc: any) => cc.id === clipId);
              return c && !(c as any).selected;
            });
            if (anyUnselected) {
              dispatch({
                type: 'SELECT_CLIPS',
                payload: overlapping.map(({ trackIndex, clipId }) => ({
                  trackIndex,
                  clipId,
                })),
              });
              dispatch({ type: 'SET_TIME_SELECTION', payload: null });
            }
            dispatch({
              type: 'MOVE_SELECTED_CLIPS',
              payload: { deltaSeconds: delta },
            });
            // Signal Canvas's Cmd/Ctrl keyup handler to run
            // resolveOverlap once the modifier is released.
            pendingClipMoveResolution.current = true;
            return;
          }
        }

        // Cmd+Arrow is "move the thing under the gesture" — focused
        // clip, time-selection clips, or the current clip selection
        // (which is what a first-press-with-time-selection promoted
        // itself to). No fallback playhead jump; , / . and Alt+Arrow
        // own that. Skipped when Shift is also held so
        // Cmd+Shift+Arrow can reach the selection-reduce path in
        // handlePlayheadMove below.
        if (cmdHeld && !e.shiftKey) {
          const hasSelectedClip = state.tracks.some((t: any) =>
            t.clips.some((c: any) => c.selected)
            || (t.midiClips || []).some((c: any) => c.selected),
          );
          if (hasSelectedClip) {
            e.preventDefault();
            const step = e.altKey ? 1.0 : 0.1;
            const delta = isLeftward ? -step : step;
            dispatch({
              type: 'MOVE_SELECTED_CLIPS',
              payload: { deltaSeconds: delta },
            });
            pendingClipMoveResolution.current = true;
          }
          return;
        }
        e.preventDefault();
        // Alt = fast playhead (1 s); plain = fine playhead (0.1 s).
        const nudgeAmount = e.altKey ? 1.0 : 0.1;
        handlePlayheadMove(e, isLeftward, nudgeAmount, playheadDeps);
        return;
      }

      // Clear selection edges ref when not actively resizing
      if (selectionEdgesRef.current) {
        selectionEdgesRef.current = null;
      }

      // --- Enter: Clip/track selection ---
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const interactiveElements = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'];
        const hasRole = target.getAttribute('role');
        // `.track` is intentionally NOT considered interactive here —
        // when keyboard focus lands on a track element we want Enter to
        // select / deselect it (handleEnterSelection toggles when the
        // focused track is already the sole selection).
        const isInteractive = interactiveElements.includes(target.tagName) ||
          hasRole === 'button' || hasRole === 'checkbox' ||
          hasRole === 'menuitem' || hasRole === 'menuitemcheckbox' || hasRole === 'menuitemradio' ||
          hasRole === 'group';
        if (isInteractive) return;

        e.preventDefault();
        handleEnterSelection(e, navDeps);
        return;
      }

      // --- Comma/Period: Large playhead jumps ---
      // Skip when Cmd/Ctrl is held — Cmd+, is reserved for opening
      // Preferences (handled higher up). Shift is still allowed
      // because handlePlayheadMove uses it to extend the selection.
      if ((e.key === ',' || e.key === '.' || e.key === '<' || e.key === '>')
          && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const isLeftward = e.key === ',' || e.key === '<';
        handlePlayheadMove(e, isLeftward, 1.0, playheadDeps);
        return;
      }

      // --- Ctrl+K: Delete time range ---
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleDeleteTimeRange(playheadDeps);
        return;
      }

      // --- Cmd/Ctrl+I: Split clip(s) at the playhead ---
      // Cmd+Shift+I (handled below) is the explicit "every track"
      // gesture and ignores selection entirely.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I') && !e.shiftKey && !e.altKey) {
        handleSplitAtPlayhead(e, { state, dispatch });
        return;
      }

      // --- Cmd/Ctrl+Shift+I: Slice every track at the playhead ---
      // Keyboard equivalent of Shift+click in split mode: walk every
      // track and split whichever clip the playhead currently sits
      // inside. No-ops on tracks where the playhead doesn't intersect
      // any clip.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I') && !e.altKey) {
        handleSplitAllTracks(e, { state, dispatch });
        return;
      }

      // --- Ctrl+Z / Ctrl+Shift+Z: Undo / Redo (also Ctrl+Y as redo alias) ---
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      // --- Ctrl+C: Copy ---
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy(clipboardDeps);
        return;
      }

      // --- Ctrl+X: Cut ---
      if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        e.preventDefault();
        handleCut(clipboardDeps);
        return;
      }

      // --- Ctrl+V: Paste ---
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste(clipboardDeps);
        return;
      }

      // --- Ctrl+T / Ctrl+Shift+T / Ctrl+Shift+L: Create new tracks ---
      // Cmd+T  → new mono audio track
      // Cmd+Shift+T → new stereo audio track
      // Cmd+Shift+L → new label track
      // The outer guard matches exactly the keys handled by trackCreationHandlers:
      // t/T (any modifier combo) and l/L only when Shift is held (so plain Cmd+L
      // still falls through to later handlers as it did before).
      if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T' || ((e.key === 'l' || e.key === 'L') && e.shiftKey))) {
        handleTrackCreation(e, { state, dispatch });
        return;
      }

      // --- Ctrl+D: Duplicate the focused clip(s) or track(s) ---
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        handleDuplicate(e, { state, dispatch });
        return;
      }

      // --- Ctrl+W: Close (delete) focused track ---
      if ((e.metaKey || e.ctrlKey) && (e.key === 'w' || e.key === 'W')) {
        const focused = state.focusedTrackIndex;
        if (focused === null || focused === undefined) return;
        e.preventDefault();
        const t = state.tracks[focused] as any;
        const hasContent = t
          && ((t.clips?.length ?? 0) > 0 || (t.midiClips?.length ?? 0) > 0);
        confirmTrackDelete(
          1,
          () => dispatch({ type: 'DELETE_TRACK', payload: focused }),
          { skipDialog: !hasContent },
        );
        return;
      }

      // --- Cmd/Ctrl+Delete: Always delete the focused clip ---
      // Skips the priority cascade (labels → time → clips → tracks). Useful
      // when, e.g., a track is the most-recently-selected thing but you
      // want to delete the clip you've actually got focused.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
        const activeElement = document.activeElement as HTMLElement | null;
        const clipIdStr = activeElement?.getAttribute('data-clip-id');
        const trackIndexStr = activeElement?.getAttribute('data-track-index');
        if (clipIdStr !== null && clipIdStr !== undefined && trackIndexStr !== null && trackIndexStr !== undefined) {
          e.preventDefault();
          const clipId = !isNaN(Number(clipIdStr)) ? Number(clipIdStr) : clipIdStr;
          dispatch({
            type: 'DELETE_CLIP',
            payload: { trackIndex: parseInt(trackIndexStr, 10), clipId: typeof clipId === 'string' ? Number(clipId) : clipId },
          });
          return;
        }
        // No focused clip — fall through to the normal priority cascade.
      }

      // --- Delete/Backspace ---
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete({
          state,
          dispatch,
          selectionAnchorRef,
          selectionEdgesRef,
          isKeyboardNavigating: isKeyboardNavigatingRef.current,
        });
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    state.tracks,
    state.focusedTrackIndex,
    state.playheadPosition,
    state.selectedTrackIndices,
    state.timeSelection,
    state.focusedTrackIndex,
    state.splitMode,
    dispatch,
    isFlatNavigation,
    toggleLoopRegion,
    preferences.trackSelectionMode,
    effectsPanel,
  ]);
}

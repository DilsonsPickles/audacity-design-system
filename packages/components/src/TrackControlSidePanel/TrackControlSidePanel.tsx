import React, { ReactElement, cloneElement, useState } from 'react';
import { SidePanel } from '../SidePanel';
import { ResizablePanel, type ResizeSource } from '../ResizablePanel';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { AddTrackFlyout, TrackType } from '../AddTrackFlyout';
import { GROUP_END_PAD, GROUP_COLLAPSE_MS, GROUP_COLLAPSE_EASING } from '@audacity-ui/core';
import { useCollapseTransition } from '../hooks/useCollapseTransition';
import type { TrackControlPanelProps } from '../TrackControlPanel';
import { useTabOrder } from '../hooks/useTabOrder';
import { useTheme } from '../ThemeProvider';
import './TrackControlSidePanel.css';

/** The fields of core's GroupRowLayout the panel draws from. */
export interface TrackGroupRowLayout {
  depth: number;
  isHeader: boolean;
  collapsed: boolean;
  hidden: boolean;
  closing: number;
  opensBelow: boolean;
}

export interface TrackControlSidePanelProps {
  /** Track-folder items for the row's kebab menu (folders v1). The
   *  host supplies the model; this component only renders it. */
  groupMenu?: {
    /** Folders a track can be added to */
    groups: Array<{ folderId: number; name: string }>;
    /** Groups nest: which groups THIS row may be added to. A group row
     *  can't join itself or anything inside it, so the list depends on
     *  the row. Falls back to `groups` when absent. */
    joinableFor?: (trackIndex: number) => Array<{ folderId: number; name: string }>;
    /** The folder a track currently belongs to, if any */
    groupOf: (trackIndex: number) => number | undefined;
    /** True when the row is a folder header */
    isFolderRow: (trackIndex: number) => boolean;
    /** Wrap this one track in a brand-new group */
    onCreateGroup: (trackIndex: number) => void;
    /** Folder rows: copy the whole family below the original */
    onDuplicateGroup: (trackIndex: number) => void;
    /** Folder rows: delete the folder AND its tracks (destructive —
     *  Ungroup is the non-destructive alternative) */
    onDeleteGroupAndTracks: (trackIndex: number) => void;
    onAddToGroup: (trackIndex: number, folderId: number) => void;
    onRemoveFromGroup: (trackIndex: number) => void;
    onUngroup: (trackIndex: number) => void;
  };

  /** Live drag-reorder preview (track folders). The list renders in
   *  `order` (track indices in their PREVIEWED positions) with the
   *  dragged rows ghosted in place, so the column simply shows the
   *  result. The host computes it with the same move helper the
   *  commit uses, so the preview can't differ from the drop. */
  dragPreview?: {
    order: number[];
    ghostIndices: number[];
    indented: boolean;
    /** The landing is inside this COLLAPSED group: its header is marked */
    intoCollapsed?: number | null;
  } | null;

  /** Each row's place in its groups, by track index (core's
   *  `computeGroupLayout`; during a reorder drag, the PREVIEWED
   *  list's). The panel draws groups from this and nothing else, so
   *  it cannot disagree with the canvas about where a group ends. */
  groupLayout?: Array<TrackGroupRowLayout | undefined>;

  /**
   * TrackControlPanel components
   */
  children: ReactElement<TrackControlPanelProps> | ReactElement<TrackControlPanelProps>[];

  /**
   * Whether the panel is resizable
   */
  resizable?: boolean;

  /**
   * Minimum width when resizing (px)
   */
  minWidth?: number;

  /**
   * Maximum width when resizing (px)
   */
  maxWidth?: number;

  /**
   * Track heights in pixels - should match timeline track heights
   */
  trackHeights?: number[];

  /**
   * Index of the focused track (shows focus border)
   */
  focusedTrackIndex?: number | null;

  /**
   * Called when panel is resized
   */
  onResize?: (width: number) => void;

  /**
   * Called when a track is resized
   */
  /** A track's height changed — by the drag on its edge, the Cmd/Ctrl+
   *  wheel over it or the Cmd/Ctrl+Shift+wheel (`source`; a resize end
   *  reports 'drag') */
  onTrackResize?: (trackIndex: number, height: number, source: ResizeSource) => void;

  /**
   * Called when "Add new" button is clicked (deprecated - use onAddTrackType)
   */
  onAddTrack?: () => void;

  /**
   * Called when a track type is selected from the flyout
   */
  onAddTrackType?: (type: TrackType) => void;

  /**
   * Whether to show the MIDI option in the add track flyout
   */
  showMidiOption?: boolean;

  /**
   * Called when a track should be deleted
   */
  onDeleteTrack?: (trackIndex: number) => void;

  /**
   * Called when a track should be duplicated
   */
  onDuplicateTrack?: (trackIndex: number) => void;

  /**
   * Called when a track should move up
   */
  onMoveTrackUp?: (trackIndex: number) => void;

  /**
   * Called when a track should move down
   */
  onMoveTrackDown?: (trackIndex: number) => void;

  /**
   * Called when track view mode changes
   */
  onTrackViewChange?: (trackIndex: number, viewMode: 'waveform' | 'spectrogram' | 'split') => void;

  /**
   * Called when track colour changes
   */
  onTrackColorChange?: (trackIndex: number, color: 'cyan' | 'blue' | 'violet' | 'magenta' | 'red' | 'orange' | 'yellow' | 'green' | 'teal') => void;

  /**
   * Track view modes for each track
   */
  trackViewModes?: Array<'waveform' | 'spectrogram' | 'split' | undefined>;

  /**
   * Current colour for each track (from first clip)
   */
  trackColors?: Array<string | undefined>;

  /**
   * Additional CSS class
   */
  className?: string;

  /**
   * Ref for the scrollable track list container
   */
  scrollRef?: React.RefObject<HTMLDivElement>;

  /**
   * Called when the track list is scrolled
   */
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;

  /**
   * Buffer space below the last track (px)
   * @default 0
   */
  bufferSpace?: number;

  /**
   * Called when "Spectrogram settings" is clicked in the track menu
   */
  onSpectrogramSettings?: (trackIndex: number) => void;

  /**
   * Current label text size in points — with onLabelTextSizeChange, adds
   * a "Label text size" submenu to LABEL tracks' context menu. The
   * preference is global (all label tracks share it).
   */
  labelTextSizePt?: number;

  /**
   * Called when a label text size is picked from the submenu
   */
  onLabelTextSizeChange?: (pt: number) => void;
}

export const TrackControlSidePanel: React.FC<TrackControlSidePanelProps> = ({
  children,
  dragPreview,
  groupLayout,
  groupMenu,
  resizable = false,
  minWidth = 280,
  maxWidth = 280,
  trackHeights = [],
  focusedTrackIndex = null,
  onResize,
  onTrackResize,
  onAddTrack,
  onAddTrackType,
  showMidiOption = false,
  onDeleteTrack,
  onDuplicateTrack,
  onMoveTrackUp,
  onMoveTrackDown,
  onTrackViewChange,
  onTrackColorChange,
  onSpectrogramSettings,
  labelTextSizePt,
  onLabelTextSizeChange,
  trackViewModes = [],
  trackColors = [],
  className = '',
  scrollRef,
  onScroll,
  bufferSpace = 0,
}) => {
  const { theme } = useTheme();
  const childArray = React.Children.toArray(children) as ReactElement<TrackControlPanelProps>[];
  // Collapse/expand tween (see useCollapseTransition). Rows that just hid
  // stay mounted and shrink; rows that just appeared grow from zero.
  const collapse = useCollapseTransition(
    trackHeights.map((h) => h === 0),
    childArray.map((c) => c.key),
  );
  const TWEEN = `${GROUP_COLLAPSE_MS}ms ${GROUP_COLLAPSE_EASING}`;
  const collapseStyle = (index: number): React.CSSProperties | null => {
    if (collapse.hiding.has(index)) {
      // Shrink to nothing. The negative margin swallows the flex gap
      // too, so the row's whole footprint reaches zero — otherwise the
      // gap would linger until the placeholder takes over and the
      // column would end the tween 2px taller than the canvas.
      return {
        height: 0,
        marginBottom: 'calc(-1 * var(--tcsp-list-gap, 2px))',
        overflow: 'hidden',
        boxShadow: 'none',
        transition: `height ${TWEEN}, margin-bottom ${TWEEN}`,
      };
    }
    if (collapse.revealing.has(index)) {
      return { overflow: 'hidden', animation: `tcsp-row-expand ${TWEEN}` };
    }
    return null;
  };
  const [menuState, setMenuState] = useState<{ isOpen: boolean; trackIndex: number; x: number; y: number }>({
    isOpen: false,
    trackIndex: -1,
    x: 0,
    y: 0,
  });
  const [addTrackFlyoutOpen, setAddTrackFlyoutOpen] = useState(false);
  const [addTrackFlyoutPosition, setAddTrackFlyoutPosition] = useState({ x: 0, y: 0 });
  const [addTrackFlyoutAutoFocus, setAddTrackFlyoutAutoFocus] = useState(false);
  const addButtonRef = React.useRef<HTMLDivElement>(null);
  const addButtonElementRef = React.useRef<HTMLButtonElement>(null);
  // The per-panel Cmd/Ctrl+wheel resize (ResizablePanel wheelResize)
  // preventDefaults over the panels themselves, but wheel events landing
  // on the gaps/padding between and below panels would still scroll this
  // list mid-gesture. Suppress ALL zoom-modifier wheel scrolling over the
  // list (native non-passive listener — React's onWheel is passive).
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const setListRef = (node: HTMLDivElement | null) => {
    listRef.current = node;
    if (scrollRef) {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };
  // THE WHEEL'S TARGET IS LOCKED FOR THE GESTURE (user decision
  // 2026-10-08, "if I'm scrolling to make the track header smaller and
  // it causes my cursor to be over another track header, the original
  // track header should scroll — if the cursor doesn't move, don't
  // change the target"): the first Cmd/Ctrl+wheel locks onto the panel
  // under it, and every further wheel event goes to THAT panel until the
  // pointer actually moves (a mousemove — content shifting under a still
  // pointer fires none) or the wheel rests for WHEEL_LOCK_REST_MS. A
  // locked event aimed at another panel is stopped here, in the capture
  // phase above the panels, and re-dispatched on the locked one.
  const wheelLockRef = React.useRef<{ el: HTMLElement; at: number } | null>(null);
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const WHEEL_LOCK_REST_MS = 300;
    const panelOf = (target: EventTarget | null) =>
      (target instanceof Element ? target.closest<HTMLElement>('.track-control-side-panel__track') : null);
    const onWheelCapture = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      // Suppress the list's own scrolling (and Electron's page zoom) for
      // every zoom-modifier wheel, over the panels and the gaps alike —
      // but only the RESIZE chords lock and redirect: Cmd/Ctrl+Option
      // (this track) and Cmd/Ctrl+Shift (every track); a plain
      // Cmd/Ctrl+wheel resizes nothing here (2026-10-08)
      e.preventDefault();
      if (!e.altKey && !e.shiftKey) return;
      if ((e as WheelEvent & { __redirected?: boolean }).__redirected) return;
      const now = Date.now();
      const lock = wheelLockRef.current;
      const live = lock && lock.el.isConnected && now - lock.at <= WHEEL_LOCK_REST_MS ? lock : null;
      const under = panelOf(e.target);
      const target = live ? live.el : under;
      if (!target) return;
      wheelLockRef.current = { el: target, at: now };
      if (target === under || (under && target.contains(under))) return; // the panel under it handles it
      e.stopPropagation();
      const copy = new WheelEvent('wheel', {
        deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ, deltaMode: e.deltaMode,
        clientX: e.clientX, clientY: e.clientY,
        ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey,
        bubbles: true, cancelable: true,
      }) as WheelEvent & { __redirected?: boolean };
      copy.__redirected = true;
      target.dispatchEvent(copy);
    };
    // The pointer moving — for real — releases the lock
    const onMouseMove = () => { wheelLockRef.current = null; };
    el.addEventListener('wheel', onWheelCapture, { passive: false, capture: true });
    el.addEventListener('mousemove', onMouseMove);
    return () => {
      el.removeEventListener('wheel', onWheelCapture, { capture: true });
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);
  // Captures the panel's menu button that opened the side-panel
  // context menu so focus can return there when the menu closes —
  // including after an item (e.g. Track color) is picked.
  const menuTriggerRef = React.useRef<HTMLElement | null>(null);
  // Remembered track index for the fallback path when the original
  // trigger no longer exists (e.g. user picked "Delete").
  const menuTrackIndexRef = React.useRef<number>(-1);

  const addButtonTabIndex = useTabOrder('add-track');

  const style = {
    '--tcsp-bg': theme.background.trackHeader.parent,
    '--tcsp-header-bg': theme.background.trackHeader.parent,
    '--tcsp-title-color': theme.foreground.text.primary,
    '--tcsp-list-bg': theme.background.trackHeader.parent,
    // The side panel sits on the recessed rail, not the default app
    // surface, so we source its outline from `onElevated` (which
    // moved alongside the darker rail) rather than `onSurface`
    // (which is calibrated for the light toolbar background).
    '--tcsp-border': theme.border.onElevated,
    '--tcsp-focus-outline': theme.border.focus,
    // Feeds the scoped !important override in TrackControlSidePanel.css —
    // without these the CSS falls back to light-mode hexes in every theme.
    '--tcsp-add-btn-bg-idle': theme.background.trackHeader.addButton.idle,
    '--tcsp-add-btn-bg-hover': theme.background.trackHeader.addButton.hover,
    '--tcsp-add-btn-bg-active': theme.background.trackHeader.addButton.active,
  } as React.CSSProperties;

  const handleMenuClick = (trackIndex: number, event?: React.MouseEvent) => {
    menuTrackIndexRef.current = trackIndex;
    // If event is provided, use the button's position
    if (event) {
      const button = event.currentTarget as HTMLElement;
      menuTriggerRef.current = button;
      const rect = button.getBoundingClientRect();
      setMenuState({
        isOpen: true,
        trackIndex,
        x: rect.left, // Align to left of button
        y: rect.bottom + 1, // 1px below the button
      });
    } else {
      // Fallback: Get the track control panel element to position menu
      const trackElement = document.querySelector(`.track-control-side-panel__track:nth-child(${trackIndex + 1})`);
      if (trackElement) {
        // Best-effort: capture the menu button inside the panel so we
        // can still restore focus when the user opened the menu via
        // keyboard rather than a mouse click.
        menuTriggerRef.current = trackElement.querySelector<HTMLElement>(
          '[aria-label="Track menu"]',
        );
        const rect = trackElement.getBoundingClientRect();
        setMenuState({
          isOpen: true,
          trackIndex,
          x: rect.right + 4,
          y: rect.top + 40,
        });
      }
    }
  };

  // Restores focus to the panel button that opened the side-panel
  // context menu. If that button is gone (e.g. the user just deleted
  // the track), falls back to the next nearest panel's menu button,
  // and finally to the side-panel header's "Add new" button.
  //
  // handleMenuClose tends to fire twice in a row — once from the
  // action handler (e.g. swatch onClick) and once from the
  // ContextMenu's own close mechanism. Bailing here when the trigger
  // and fallback are both gone prevents the second call from
  // overriding the first restore with the "Add new" last-resort
  // fallback.
  /** Right-click anywhere on a row opens the same menu the kebab does,
   *  at the pointer. Editable fields keep the browser's own menu (a
   *  rename in progress wants cut/copy/paste), and a menu already open
   *  is left alone. Focus returns to the row's kebab on close, as it
   *  does for a kebab-opened menu. */
  const handleRowContextMenu = (trackIndex: number, event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')) return;
    event.preventDefault();
    event.stopPropagation();
    const row = event.currentTarget as HTMLElement;
    menuTriggerRef.current = row.querySelector<HTMLElement>('[aria-label="Track menu"]') ?? row;
    menuTrackIndexRef.current = trackIndex;
    setMenuState({ isOpen: true, trackIndex, x: event.clientX, y: event.clientY });
  };

  const restoreMenuTriggerFocus = () => {
    const trigger = menuTriggerRef.current;
    const fallbackIndex = menuTrackIndexRef.current;
    if (!trigger && fallbackIndex < 0) return;
    menuTriggerRef.current = null;
    menuTrackIndexRef.current = -1;
    setTimeout(() => {
      if (trigger && document.contains(trigger)) {
        trigger.focus();
        return;
      }
      const panels = document.querySelectorAll<HTMLElement>('.track-control-panel');
      if (panels.length > 0 && fallbackIndex >= 0) {
        const targetIdx = Math.max(0, Math.min(panels.length - 1, fallbackIndex));
        const candidate = panels[targetIdx].querySelector<HTMLElement>(
          '[aria-label="Track menu"]',
        );
        if (candidate) {
          candidate.focus();
          return;
        }
      }
      addButtonElementRef.current?.focus();
    }, 0);
  };

  const handleMenuClose = () => {
    setMenuState({ isOpen: false, trackIndex: -1, x: 0, y: 0 });
    restoreMenuTriggerFocus();
  };


  // A track group is drawn as a BOX BEHIND its rows: a band across the
  // header, a strip down the gutter beside every member, a floor under
  // the last one. The rows sit on it untouched — grouping must never
  // resize a track (user decision 2026-09-23); membership is a
  // relationship, not a size change.
  //
  // Groups NEST (2026-09-28), so there is one box per LEVEL, each
  // starting one strip further right than the level around it:
  //
  //   x = inset                      level 1 (outermost)
  //   x = inset + STRIP              level 2
  //   x = inset + STRIP × (k − 1)    level k
  //   x = gutter                     the rows — every row, grouped or not
  //
  // The gutter is as wide as the DEEPEST nesting in the project needs,
  // for every row alike: rows all start on one line, whatever they are
  // in. Each row paints its own slice of every box it is inside, and
  // the slices meet because each reaches down to the next row.
  const STRIP = GROUP_END_PAD; // side strip = floor: a group is wrapped evenly
  const GROUP_LEFT_INSET = 8; // the band stops short of the panel edge
  const LIST_GAP = 2; // mirrors --tcsp-list-gap
  const levelsInUse = (groupLayout ?? []).reduce(
    (max, row) => (row ? Math.max(max, row.depth + (row.isHeader ? 1 : 0)) : max),
    0,
  );
  const listGutter = GROUP_LEFT_INSET + STRIP * Math.max(1, levelsInUse);
  const GROUP_OUTDENT = listGutter - GROUP_LEFT_INSET;
  // Level colours step from the group tone toward the card tone: each
  // level must separate from the one around it AND from the cards on
  // it. Deeper than three they hold — the strips still count the depth.
  const levelColor = (level: number): string => {
    const towardCard = level <= 1 ? 0 : level === 2 ? 35 : 60;
    return towardCard === 0
      ? theme.background.trackHeader.group
      : `color-mix(in srgb, ${theme.background.trackHeader.group}, ${theme.background.trackHeader.idle} ${towardCard}%)`;
  };
  const isGrouped = (index: number): boolean => {
    const row = groupLayout?.[index];
    return !!row && (row.depth > 0 || row.isHeader);
  };
  /** Layout for a grouped row's wrapper. It outdents to where the
   *  outermost box starts and pads the same back, so its CONTENT is
   *  exactly where an ungrouped row's is — and its own box covers the
   *  strips, which keeps them painted while a collapse tween clips it. */
  const groupWellStyle = (index: number): React.CSSProperties | null => {
    const row = groupLayout?.[index];
    if (!row || !isGrouped(index)) return null;
    return {
      boxSizing: 'border-box',
      position: 'relative',
      // Its own stacking context, so the boxes (z-index −1) sit above
      // the rail and below this row's content, and nowhere else.
      isolation: 'isolate',
      marginLeft: -GROUP_OUTDENT,
      paddingLeft: GROUP_OUTDENT,
      // Floors under the row: MARGIN, never padding — padding on a
      // border-box row would eat the last track's content height. The
      // canvas adds the identical space through core's rowGapAfter; if
      // the two ever disagree the columns drift by this much per group.
      ...(row.closing > 0 && !row.hidden ? { marginBottom: row.closing * GROUP_END_PAD } : null),
    };
  };
  /** The row's slice of every box it is inside, outermost first (so
   *  inner levels paint over outer ones). */
  const groupUnderlay = (index: number): React.ReactNode => {
    const row = groupLayout?.[index];
    if (!row || !isGrouped(index)) return null;
    const R = 4; // LEFT corners only: the right edge meets the canvas seam
    // A group that just collapsed keeps its open shape until its rows
    // have finished shrinking away beneath it.
    const stillClosing = row.isHeader && collapse.hiding.has(index + 1);
    const boxes: React.ReactNode[] = [];
    for (let level = 1; level <= row.depth; level++) {
      // The innermost `closing` of the groups around this row end here.
      const closes = !row.hidden && level > row.depth - row.closing;
      // Floors stack innermost first, so an outer level reaches past
      // every floor inside it. A level that carries on reaches the
      // next row: past the floors that end here, and the row gap.
      const reach = row.hidden
        ? 0
        : closes
          ? GROUP_END_PAD * (row.depth - level + 1)
          : GROUP_END_PAD * row.closing + LIST_GAP;
      boxes.push(
        <div
          key={level}
          data-group-level={level}
          style={{
            position: 'absolute',
            left: STRIP * (level - 1),
            right: 0,
            top: 0,
            bottom: -reach,
            background: levelColor(level),
            ...(closes ? { borderBottomLeftRadius: R } : null),
          }}
        />,
      );
    }
    if (row.isHeader) {
      const level = row.depth + 1;
      const open = !row.hidden && (row.opensBelow || stillClosing);
      boxes.push(
        <div
          key={level}
          data-group-level={level}
          data-group-header-box
          style={{
            position: 'absolute',
            left: STRIP * (level - 1),
            right: 0,
            top: 0,
            // Open, the band runs on into its first row. Closed, the
            // header is the whole shape: no floor — a collapsed group
            // takes no more room than its own row.
            bottom: open ? -LIST_GAP : 0,
            background: levelColor(level),
            borderTopLeftRadius: R,
            ...(open ? null : { borderBottomLeftRadius: R }),
            // Edges are INSET SHADOWS, never borders: a border is part
            // of the box, and would resize the row when it appears.
            boxShadow: dragPreview?.intoCollapsed === index
              ? `inset 0 0 0 2px ${theme.border.focus}`
              : `inset 0 1px 0 ${theme.border.default}`,
          }}
        />,
      );
    }
    return (
      <div
        aria-hidden
        data-group-underlay
        style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}
      >
        {boxes}
      </div>
    );
  };

  return (
    <SidePanel
      position="left"
      width={280}
      resizable={resizable}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResize={onResize}
      className={`track-control-side-panel ${className}`}
      style={style}
    >
      {/* Header */}
      <div className="track-control-side-panel__header">
        <h2 className="track-control-side-panel__title">Tracks</h2>
        {/* role="group" marks this as an island tab stop so the global
            ArrowUp/Down track-focus handler doesn't steal arrow keys
            pressed while the Add-new button has focus. The class is
            what the global shortcut handler keys on to no-op every
            arrow key from within this group. */}
        <div
          ref={addButtonRef}
          role="group"
          aria-label="Add track"
          className="track-control-side-panel__add-group"
        >

          <Button
            ref={addButtonElementRef}
            variant="secondary"
            size="default"
            onClick={(e) => {
              // If using new onAddTrackType callback, show flyout
              if (onAddTrackType && addButtonRef.current) {
                const rect = addButtonRef.current.getBoundingClientRect();
                setAddTrackFlyoutPosition({
                  x: rect.left + rect.width / 2 - 96, // Center the flyout (192px / 2 = 96)
                  y: rect.bottom + 8, // 8px gap below button
                });

                // Check if this was triggered by keyboard (Enter/Space)
                // React synthetic events don't expose nativeEvent.detail, so we check if it's a MouseEvent
                const isKeyboard = e && (e as any).nativeEvent && (e as any).nativeEvent.detail === 0; // justified: nativeEvent.detail not on React.MouseEvent type — pending components sweep
                setAddTrackFlyoutAutoFocus(isKeyboard);
                setAddTrackFlyoutOpen(!addTrackFlyoutOpen);
              } else if (onAddTrack) {
                // Fallback to old callback for backward compatibility
                onAddTrack();
              }
            }}
            showIcon={true}
            icon={<Icon name="plus" size={16} />}
            tabIndex={addButtonTabIndex}
          >
            Add new
          </Button>
        </div>
      </div>

      {/* Track list */}
      <div
        className="track-control-side-panel__list"
        ref={setListRef}
        onScroll={onScroll}
        style={{
          paddingBottom: `${bufferSpace}px`,
          // Read by the list's own padding rule (TrackControlSidePanel.css)
          ['--tcsp-list-gutter' as string]: `${listGutter}px`,
        } as React.CSSProperties}
        tabIndex={-1}
      >
        {(dragPreview?.order ?? childArray.map((_c, i) => i)).map((index, displayPos) => {
          // During a drag the list renders in PREVIEWED order: the
          // dragged rows sit in their landing spot, ghosted. React
          // keys are stable, so moving a row reorders its DOM node
          // WITHOUT unmounting the panel — which matters because the
          // dragged panel owns the gesture's document listeners.
          const child = childArray[index];
          if (!child) return null;
          const ghosted = dragPreview?.ghostIndices.includes(index) ?? false;
          // Ghosted rows fade, and that is all: they keep their exact
          // footprint. The old 14px indent for a landing inside a
          // group made the dragged row narrower mid-flight — and the
          // group's strip and field already show where it would land.
          const ghostStyle = ghosted ? { opacity: 0.55 } : null;
          // Folders v1: a height of 0 = child of a collapsed folder —
          // keep the node in the DOM (panel ordinals must stay aligned
          // with track indices for focus/drag routing) but render
          // nothing. Folder rows are slim and NOT resizable.
          const rawHeight = trackHeights[index];
          if (rawHeight === 0 && !collapse.hiding.has(index)) {
            return <div key={child.key || index} style={{ display: 'none' }} data-hidden-track-row />;
          }
          if ((child.props as { trackType?: string }).trackType === 'folder') {
            const isFocusedFolder = focusedTrackIndex === index;
            return (
              <div
                key={child.key || index}
                className={`track-control-side-panel__track ${isFocusedFolder ? 'track-control-side-panel__track--focused' : ''}`}
                onContextMenu={(e) => handleRowContextMenu(index, e)}
                style={{ height: rawHeight || 28, flexShrink: 0, ...groupWellStyle(index), ...ghostStyle, ...collapseStyle(index) }}
              >
                {groupUnderlay(index)}
                {cloneElement(child, {
                  ...child.props,
                  isMenuOpen: menuState.isOpen && menuState.trackIndex === index,
                  onMenuClick: (event: React.MouseEvent<HTMLButtonElement>) => handleMenuClick(index, event),
                  trackHeight: rawHeight || 28,
                })}
              </div>
            );
          }
          // A row mid-tween has an effective height of 0; its NATURAL
          // height (what it grows to / shrinks from) is the panel's own.
          const height = rawHeight || child.props.trackHeight || 114;
          // Use child's isFocused prop if provided, otherwise calculate from focusedTrackIndex
          const isFocused = child.props.isFocused !== undefined
            ? child.props.isFocused
            : focusedTrackIndex === index;
          const isContainerFocused = (child.props as any).containerFocused || false; // justified: containerFocused is a non-standard extension on child props — pending components sweep
          return (
            <ResizablePanel
              key={child.key || index}
              initialHeight={height}
              minHeight={44}
              className={`track-control-side-panel__track ${isFocused ? 'track-control-side-panel__track--focused' : ''}`}
              onContextMenu={(e) => handleRowContextMenu(index, e)}
              style={{ ...groupWellStyle(index), ...ghostStyle, ...collapseStyle(index) }}
              underlay={groupUnderlay(index)}
              isFirstPanel={displayPos === 0}
              wheelResize
              onHeightChange={(newHeight, source) => onTrackResize?.(index, newHeight, source)}
              onResizeEnd={(finalHeight, source) => onTrackResize?.(index, finalHeight, source)}
            >
              {cloneElement(child, {
                ...child.props,
                // Only override isFocused if not already provided by parent
                ...(child.props.isFocused === undefined && { isFocused }),
                isMenuOpen: menuState.isOpen && menuState.trackIndex === index,
                onMenuClick: (event: React.MouseEvent<HTMLButtonElement>) => handleMenuClick(index, event),
                trackHeight: height,
              })}
            </ResizablePanel>
          );
        })}
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={menuState.isOpen}
        x={menuState.x}
        y={menuState.y}
        onClose={handleMenuClose}
      >
        {!(groupMenu?.isFolderRow(menuState.trackIndex)) && (
          <>
            <ContextMenuItem
              label="Delete"
              onClick={() => {
                onDeleteTrack?.(menuState.trackIndex);
                handleMenuClose();
              }}
            />
            <ContextMenuItem
              label="Duplicate"
              onClick={() => {
                onDuplicateTrack?.(menuState.trackIndex);
                handleMenuClose();
              }}
            />
          </>
        )}
        {groupMenu && (() => {
          const idx = menuState.trackIndex;
          if (groupMenu.isFolderRow(idx)) {
            // A group's own CRUD: rename lives on the row (click the
            // name, same as a track); the rest are here. Ungroup keeps
            // the tracks, Delete takes them with it.
            return (
              <>
                <ContextMenuItem
                  label="Duplicate group"
                  onClick={() => {
                    groupMenu.onDuplicateGroup(idx);
                    handleMenuClose();
                  }}
                />
                {(groupMenu.joinableFor?.(idx) ?? []).map((g) => (
                  <ContextMenuItem
                    key={`add-to-${g.folderId}`}
                    label={`Add to ${g.name}`}
                    onClick={() => {
                      groupMenu.onAddToGroup(idx, g.folderId);
                      handleMenuClose();
                    }}
                  />
                ))}
                {groupMenu.groupOf(idx) !== undefined && (
                  <ContextMenuItem
                    label="Remove from group"
                    onClick={() => {
                      groupMenu.onRemoveFromGroup(idx);
                      handleMenuClose();
                    }}
                  />
                )}
                <ContextMenuItem
                  label="Ungroup"
                  onClick={() => {
                    groupMenu.onUngroup(idx);
                    handleMenuClose();
                  }}
                />
                <ContextMenuItem
                  label="Delete group and tracks"
                  onClick={() => {
                    groupMenu.onDeleteGroupAndTracks(idx);
                    handleMenuClose();
                  }}
                />
              </>
            );
          }
          const current = groupMenu.groupOf(idx);
          const joinable = (groupMenu.joinableFor?.(idx) ?? groupMenu.groups).filter((g) => g.folderId !== current);
          return (
            <>
              <ContextMenuItem
                label="Create group"
                onClick={() => {
                  groupMenu.onCreateGroup(idx);
                  handleMenuClose();
                }}
              />
              {joinable.map((g) => (
                <ContextMenuItem
                  key={`add-to-${g.folderId}`}
                  label={`Add to ${g.name}`}
                  onClick={() => {
                    groupMenu.onAddToGroup(idx, g.folderId);
                    handleMenuClose();
                  }}
                />
              ))}
              {current !== undefined && (
                <ContextMenuItem
                  label="Remove from group"
                  onClick={() => {
                    groupMenu.onRemoveFromGroup(idx);
                    handleMenuClose();
                  }}
                />
              )}
            </>
          );
        })()}
        <ContextMenuItem
          label="Move track up"
          onClick={() => {
            onMoveTrackUp?.(menuState.trackIndex);
            handleMenuClose();
          }}
          disabled={menuState.trackIndex === 0}
        />
        <ContextMenuItem
          label="Move track down"
          onClick={() => {
            onMoveTrackDown?.(menuState.trackIndex);
            handleMenuClose();
          }}
          disabled={menuState.trackIndex === childArray.length - 1}
        />
        {/* Track view menu - hidden for label tracks */}
        {(() => {
          const trackChild = childArray[menuState.trackIndex];
          const isLabelTrack = trackChild?.props?.trackType === 'label';
          const isMidiTrack = trackChild?.props?.trackType === 'midi';

          // MIDI tracks get neither; LABEL tracks get Track color (their
          // labels render in it) but no Track view (nothing to view).
          if (isMidiTrack) return null;

          return (
            <>
              <div className="context-menu-separator" />
              {/* Track color submenu */}
              <ContextMenuItem label="Track color" onClose={handleMenuClose}>
                {(['cyan', 'blue', 'violet', 'magenta', 'red', 'orange', 'yellow', 'green', 'teal'] as const).map((color) => {
                  const isActive = trackColors[menuState.trackIndex] === color;
                  return (
                    <ContextMenuItem
                      key={color}
                      label={color.charAt(0).toUpperCase() + color.slice(1)}
                      icon={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: `var(--clip-${color}-body)`,
                            border: '1px solid rgba(0,0,0,0.2)',
                            flexShrink: 0,
                          }} />
                          {isActive && <span style={{ fontSize: 12 }}>✓</span>}
                        </span>
                      }
                      onClick={() => { onTrackColorChange?.(menuState.trackIndex, color); handleMenuClose(); }}
                      onClose={handleMenuClose}
                    />
                  );
                })}
              </ContextMenuItem>
              {isLabelTrack && labelTextSizePt !== undefined && onLabelTextSizeChange && (
                <ContextMenuItem label="Label text size" onClose={handleMenuClose}>
                  {/* Keep in sync with AppearancePage's LABEL_TEXT_SIZE_OPTIONS */}
                  {([9, 10, 12, 14, 18, 24, 36, 48] as const).map((pt) => (
                    <ContextMenuItem
                      key={pt}
                      label={`${pt} pt`}
                      icon={labelTextSizePt === pt ? <span style={{ fontSize: '14px' }}>✓</span> : undefined}
                      onClick={() => {
                        onLabelTextSizeChange(pt);
                        handleMenuClose();
                      }}
                      onClose={handleMenuClose}
                    />
                  ))}
                </ContextMenuItem>
              )}
              {!isLabelTrack && (
              <ContextMenuItem
                label="Track view"
                hasSubmenu={true}
                onClose={handleMenuClose}
              >
                <ContextMenuItem
                  label="Waveform"
                  icon={trackViewModes[menuState.trackIndex] === 'waveform' || trackViewModes[menuState.trackIndex] === undefined ? <span style={{ fontSize: '14px' }}>✓</span> : undefined}
                  onClick={() => {
                    onTrackViewChange?.(menuState.trackIndex, 'waveform');
                  }}
                />
                <ContextMenuItem
                  label="Spectrogram"
                  icon={trackViewModes[menuState.trackIndex] === 'spectrogram' ? <span style={{ fontSize: '14px' }}>✓</span> : undefined}
                  onClick={() => {
                    onTrackViewChange?.(menuState.trackIndex, 'spectrogram');
                  }}
                />
                <ContextMenuItem
                  label="Split view"
                  icon={trackViewModes[menuState.trackIndex] === 'split' ? <span style={{ fontSize: '14px' }}>✓</span> : undefined}
                  onClick={() => {
                    onTrackViewChange?.(menuState.trackIndex, 'split');
                  }}
                />
                {onSpectrogramSettings && (
                  <>
                    <div className="context-menu-separator" />
                    <ContextMenuItem
                      label="Spectrogram settings..."
                      onClick={() => {
                        onSpectrogramSettings(menuState.trackIndex);
                        handleMenuClose();
                      }}
                      onClose={handleMenuClose}
                    />
                  </>
                )}
              </ContextMenuItem>
              )}
            </>
          );
        })()}
      </ContextMenu>

      {/* Add Track Flyout */}
      <AddTrackFlyout
        isOpen={addTrackFlyoutOpen}
        x={addTrackFlyoutPosition.x}
        y={addTrackFlyoutPosition.y}
        showMidiOption={showMidiOption}
        autoFocus={addTrackFlyoutAutoFocus}
        triggerRef={addButtonElementRef}
        onSelectTrackType={(type: TrackType) => {
          onAddTrackType?.(type);
          // Don't close flyout - let user click outside or press Escape
        }}
        onClose={() => setAddTrackFlyoutOpen(false)}
      />
    </SidePanel>
  );
};

export default TrackControlSidePanel;

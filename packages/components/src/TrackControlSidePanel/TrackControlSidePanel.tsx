import React, { ReactElement, cloneElement, useState } from 'react';
import { SidePanel } from '../SidePanel';
import { ResizablePanel } from '../ResizablePanel';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { ContextMenu } from '../ContextMenu';
import { ContextMenuItem } from '../ContextMenuItem';
import { AddTrackFlyout, TrackType } from '../AddTrackFlyout';
import type { TrackControlPanelProps } from '../TrackControlPanel';
import { useTabOrder } from '../hooks/useTabOrder';
import { useTheme } from '../ThemeProvider';
import './TrackControlSidePanel.css';

export interface TrackControlSidePanelProps {
  /** Track-folder items for the row's kebab menu (folders v1). The
   *  host supplies the model; this component only renders it. */
  groupMenu?: {
    /** Folders a track can be added to */
    groups: Array<{ folderId: number; name: string }>;
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
  dragPreview?: { order: number[]; ghostIndices: number[]; indented: boolean } | null;

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
  onTrackResize?: (trackIndex: number, height: number) => void;

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
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const suppressZoomScroll = (e: WheelEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', suppressZoomScroll, { passive: false });
    return () => el.removeEventListener('wheel', suppressZoomScroll);
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


  // Track groups read as a FULL-BLEED band, not a card: the header
  // strip runs the panel's whole width, the parent's colour carries
  // on down the left gutter beside the members (so the parent visibly
  // WRAPS its children), and the members keep exactly the footprint
  // they would have ungrouped.
  //
  // Grouping must never resize a track (user decision 2026-09-23).
  // The earlier accordion inset the family by 6px and padded members
  // by 5, so a grouped track rendered narrower than its ungrouped
  // neighbour and the LAST member also lost 5px of content height to
  // the well's padding (border-box). Membership is a relationship,
  // not a size change — so the group is drawn with tone and a
  // closing edge only.
  // Mirrors --tcsp-list-gutter in TrackControlSidePanel.css — the
  // left padding the rows sit inside, which the group header cancels.
  const LIST_GUTTER = 'var(--tcsp-list-gutter, 12px)';
  const groupWellStyle = (index: number): React.CSSProperties | null => {
    if (!groupMenu) return null;
    const isHeader = groupMenu.isFolderRow(index);
    const folderId = isHeader ? undefined : groupMenu.groupOf(index);
    if (!isHeader && folderId === undefined) return null;
    const nextInSameGroup = !isHeader
      && groupMenu.groupOf(index + 1) === folderId
      && !groupMenu.isFolderRow(index + 1);
    const isLast = !isHeader && !nextInSameGroup;
    // A COLLAPSED group has no visible members (their heights are 0),
    // so its header closes the band itself — otherwise the panel
    // hangs open on a void.
    const collapsedHeader = isHeader && trackHeights[index + 1] === 0;
    const closesBand = isLast || collapsedHeader;
    return {
      boxSizing: 'border-box',
      // ONE colour for the whole family, so the parent reads as
      // wrapping its children: a band across the header and a strip
      // continuing down the gutter beside every member.
      //
      // `elevated` because it lands BETWEEN the list's rail
      // (trackHeader.parent) and the track cards in BOTH themes —
      // light #E3E3E8 against rail #D5D5DB and cards #ECECEF, dark
      // #2c2e33 against rail #252B31 and cards #32383E. So the strip
      // separates from the plain gutter an ungrouped track sits in,
      // and still reads as sitting behind the children.
      background: theme.background.surface.elevated,
      // The family outdents through the list's left gutter, to the
      // panel's own edge. Members then pad that gutter back on THIS
      // wrapper, so their content returns to where an ungrouped
      // track sits and only the parent's colour occupies the strip.
      marginLeft: `calc(-1 * ${LIST_GUTTER})`,
      // Edges only along the band's flow — never on the sides, where
      // they would shift the row's content inward.
      ...(isHeader
        ? {
            borderTop: `1px solid ${theme.border.default}`,
            // No padding on the header's wrapper: its CONTENT paints
            // the band edge to edge, and TrackControlPanel re-adds
            // the gutter to its own left padding so the chevron
            // stays in line with the track content below.
          }
        : { paddingLeft: LIST_GUTTER }),
      ...(closesBand ? { borderBottom: `1px solid ${theme.border.default}` } : null),
    };
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
        style={{ paddingBottom: `${bufferSpace}px` }}
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
          const ghostStyle = ghosted
            ? {
                opacity: 0.55,
                ...(dragPreview?.indented ? { marginLeft: 14 } : { marginLeft: 0 }),
              }
            : null;
          // Folders v1: a height of 0 = child of a collapsed folder —
          // keep the node in the DOM (panel ordinals must stay aligned
          // with track indices for focus/drag routing) but render
          // nothing. Folder rows are slim and NOT resizable.
          const rawHeight = trackHeights[index];
          if (rawHeight === 0) {
            return <div key={child.key || index} style={{ display: 'none' }} data-hidden-track-row />;
          }
          if ((child.props as { trackType?: string }).trackType === 'folder') {
            const isFocusedFolder = focusedTrackIndex === index;
            return (
              <div
                key={child.key || index}
                className={`track-control-side-panel__track ${isFocusedFolder ? 'track-control-side-panel__track--focused' : ''}`}
                style={{ height: rawHeight || 28, flexShrink: 0, ...groupWellStyle(index), ...ghostStyle }}
              >
                {cloneElement(child, {
                  ...child.props,
                  isMenuOpen: menuState.isOpen && menuState.trackIndex === index,
                  onMenuClick: (event: React.MouseEvent<HTMLButtonElement>) => handleMenuClick(index, event),
                  trackHeight: rawHeight || 28,
                })}
              </div>
            );
          }
          const height = rawHeight || 114; // Default to 114px
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
              style={{ ...groupWellStyle(index), ...ghostStyle }}
              isFirstPanel={displayPos === 0}
              wheelResize
              onHeightChange={(newHeight) => onTrackResize?.(index, newHeight)}
              onResizeEnd={(finalHeight) => onTrackResize?.(index, finalHeight)}
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
          const joinable = groupMenu.groups.filter((g) => g.folderId !== current);
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

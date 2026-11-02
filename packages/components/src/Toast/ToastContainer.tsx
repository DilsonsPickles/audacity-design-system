/**
 * ToastContainer — the NOTIFICATION CENTRE (2026-11-02, after a look at
 * Cakewalk's: "perhaps it's because they're tucked in a single panel, it
 * feels less intrusive").
 *
 * SEPARATE CARDS, 12PX APART (the same day, "re-add space between
 * notifications" — for an hour they were rows of one card, dividers
 * between them, after Cakewalk's single panel): each notification is its
 * own card. THE OPEN ARCHIVE IS ONE CONSOLIDATED CARD (the same day, "when
 * looking at notifications from the bell, they can be in [a] consolidated
 * container view"): rows with dividers, Mute and Clear all at its foot.
 *
 * ARRIVAL ALWAYS SHOWS ("notifications can arrive silently... if there's a
 * red dot on the bell and a new notification arrives... it'll be
 * invisible"): every notification pops out as a row, as it always has —
 * nothing lands silently in the bell. The one silent mode is MUTE, which
 * the user chooses, and even muted an ERROR still pops out.
 *
 * THE BELL IS THE ARCHIVE, NOT THE DOORBELL (`NotificationBell`, at the
 * top bar's right end, the card hanging below it): a notification that is closed or times out goes
 * into the archive instead of away; opening the bell shows the archive in
 * the same card, with MUTE and CLEAR ALL at its foot. Progress
 * notifications are not archived (their outcome is its own notification).
 *
 * THE DOT MEANS "STILL NEEDS YOU", not "unread": it lights only for an
 * error or a notification with buttons that went into the archive WITHOUT
 * BEING SEEN — while muted, or pushed out of a full stack — and opening
 * the bell clears it. A notification that popped out has been seen,
 * whatever happens to it next.
 *
 * PINNED TOP-RIGHT (2026-11-02, "I think we have to go top right... the
 * notifications going up when anchored bottom right is just weird"): the
 * card's top edge is fixed under the toolbar, so closing the top row slides
 * the next into the same place and the × stays under the pointer; newest at
 * the bottom, so one arriving mid-clear never lands under the pointer unread.
 * (A bottom position still works: it holds its top edge while hovered.)
 */

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Toast, ToastProps } from './Toast';
import './ToastContainer.css';

export interface ToastContainerProps {
  /** Maximum number of notifications popped out at once — older ones go to
   *  the archive. Unset: no count — a TOP stack runs all the way down the
   *  page and scrolls past the bottom inset (2026-11-02) */
  maxToasts?: number;
  /** Position of the container */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** For a TOP position: the stack's top edge in px from the viewport's
   *  top (default 16) — a host pins it under its toolbar */
  top?: number;
  /** For a RIGHT position: the stack's right edge in px from the
   *  viewport's right (default 16) — a host lines it up with its bell */
  right?: number;
  /** For a TOP position: the room to keep clear under the open archive, in
   *  px from the viewport's bottom (default 16) — a host keeps its status
   *  bar clear */
  bottomInset?: number;
  /** For a TOP position: the stack's whole height in px, measured by the
   *  host — wins over `100vh - top - bottomInset`, which a shell whose 100vh
   *  is not its window's height gets wrong (the Electron shell, 2026-11-02) */
  maxHeight?: number;
  /** For a TOP position: where the cards start at rest, in px down from
   *  the frame's top (default 12) — a frame taller than its resting place,
   *  so scrolled cards can slide up past it (2026-11-02) */
  restTop?: number;
}

interface ManagedToast extends ToastProps {
  id: string;
  exiting?: boolean;
  /** In the archive: seen when it popped out, or once the bell was opened */
  seen?: boolean;
}

interface NotificationState {
  /** Popped out, newest last */
  live: ManagedToast[];
  /** Closed or timed out, newest last */
  archive: ManagedToast[];
  panelOpen: boolean;
  muted: boolean;
}

let toastId = 0;
let state: NotificationState = { live: [], archive: [], panelOpen: false, muted: false };
const listeners: Set<() => void> = new Set();
/** The most notifications popped out at once (the host's `maxToasts`) */
let maxLive = Infinity;

function setState(next: Partial<NotificationState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getSnapshot = () => state;

/** A closing notification's row collapses over this long, then is removed —
 *  ToastContainer.css's --toast-exit-ms default; keep the two in step */
const EXIT_MS = 120;

/** A new notification's row grows open over this long — ToastContainer.css's
 *  --toast-enter-ms default; keep the two in step */
const ENTER_MS = 200;

/** Errors and notifications with buttons are the ones that need you */
const needsYou = (t: ToastProps) => t.type === 'error' || (t.actions?.length ?? 0) > 0;

/** Into the archive — unless it reports progress, whose outcome is its own notification */
function archived(t: ManagedToast, seen: boolean): ManagedToast[] {
  if (t.showProgress) return state.archive;
  return [...state.archive, { ...t, exiting: false, seen }];
}

export const toast = {
  success(title: string, description?: string, actions?: ToastProps['actions'], duration = 5000) {
    return this.show({ type: 'success', title, description, actions, duration });
  },

  error(title: string, description?: string, actions?: ToastProps['actions'], duration = 0) {
    return this.show({ type: 'error', title, description, actions, duration });
  },

  warning(title: string, description?: string, actions?: ToastProps['actions'], duration = 5000) {
    return this.show({ type: 'warning', title, description, actions, duration });
  },

  info(title: string, description?: string, actions?: ToastProps['actions'], duration = 5000) {
    return this.show({ type: 'info', title, description, actions, duration });
  },

  show(props: Omit<ToastProps, 'id' | 'onDismiss'> & { duration?: number }) {
    const id = `toast-${++toastId}`;
    const newToast: ManagedToast = {
      ...props,
      id,
      onDismiss: () => this.dismiss(id),
    };
    // Muted: straight to the archive, unseen if it needs you — except an
    // error, which pops out whatever (progress always shows; it is the
    // feedback for something the user just started)
    if (state.muted && props.type !== 'error' && !props.showProgress) {
      setState({ archive: archived(newToast, !needsYou(newToast)) });
      return id;
    }
    let live = [...state.live, newToast];
    let archive = state.archive;
    // A full stack pushes its oldest out to the archive, unseen if it needs you
    while (live.filter((t) => !t.exiting).length > maxLive) {
      const oldest = live.find((t) => !t.exiting)!;
      live = live.filter((t) => t !== oldest);
      if (!oldest.showProgress) archive = [...archive, { ...oldest, seen: !needsYou(oldest) }];
    }
    setState({ live, archive });
    // The toast runs its own countdown (paused while hovered or focused)
    // and calls onDismiss when it runs out — Toast.tsx
    return id;
  },

  /** Close a popped-out notification: it leaves, then goes to the archive (seen) */
  dismiss(id: string) {
    const target = state.live.find((t) => t.id === id && !t.exiting);
    if (!target) return;
    setState({ live: state.live.map((t) => (t.id === id ? { ...t, exiting: true } : t)) });
    // After the row's collapse (ToastContainer.css, --toast-exit-ms)
    setTimeout(() => {
      const leaving = state.live.find((t) => t.id === id);
      if (!leaving) return;
      setState({
        live: state.live.filter((t) => t.id !== id),
        archive: archived(leaving, true),
      });
    }, EXIT_MS);
  },

  /** Take the popped-out notifications away, without archiving them */
  dismissAll() {
    setState({ live: [] });
  },

  /** Remove one notification from the archive */
  remove(id: string) {
    setState({ archive: state.archive.filter((t) => t.id !== id) });
  },

  /** Empty everything — the panel's Clear all */
  clearAll() {
    setState({ live: state.live.filter((t) => t.showProgress), archive: [] });
  },

  /** Open or close the bell's panel; opening marks the archive seen */
  setPanelOpen(open: boolean) {
    setState({
      panelOpen: open,
      archive: open ? state.archive.map((t) => (t.seen ? t : { ...t, seen: true })) : state.archive,
    });
  },

  togglePanel() {
    this.setPanelOpen(!state.panelOpen);
  },

  setMuted(muted: boolean) {
    setState({ muted });
  },

  progress(title: string, description?: string, initialProgress = 0) {
    const id = this.show({
      type: 'info',
      title,
      description,
      showProgress: true,
      progress: initialProgress,
      duration: 0, // Don't auto-dismiss
    });
    return id;
  },

  syncing(title: string = 'Syncing to audio.com…', initialProgress = 0) {
    const id = this.show({
      type: 'syncing',
      title,
      showProgress: true,
      progress: initialProgress,
      duration: 0, // Don't auto-dismiss
    });
    return id;
  },

  updateProgress(id: string, progress: number, timeRemaining?: string) {
    setState({ live: state.live.map((t) => (t.id === id ? { ...t, progress, timeRemaining } : t)) });
  },

  /** Back to empty, unmuted and closed — for tests */
  reset() {
    state = { live: [], archive: [], panelOpen: false, muted: false };
    listeners.forEach((listener) => listener());
  },
};

/** The notification centre's state, for the bell and the panel */
export function useNotifications() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    live: snapshot.live,
    archive: snapshot.archive,
    panelOpen: snapshot.panelOpen,
    muted: snapshot.muted,
    /** Archived notifications that need you and were never seen — the dot */
    attention: snapshot.archive.filter((t) => !t.seen && needsYou(t)).length,
  };
}

/** How long the pointer may be off the stack before a bottom stack lets
 *  go of its pinned top — long enough to cross the gap between two toasts
 *  or ride out a closing toast's EXIT_MS collapse */
const UNPIN_DELAY_MS = 400;

/** How long after the pointer leaves a full stack its close-spacer settles */
const SETTLE_DELAY_MS = 400;

export function ToastContainer({
  maxToasts,
  position = 'bottom-right',
  top,
  right,
  bottomInset = 16,
  maxHeight,
  restTop,
}: ToastContainerProps) {
  maxLive = maxToasts ?? Infinity;
  const { live, archive, panelOpen, muted } = useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // A BOTTOM stack's top edge, held while the pointer (or the focus) is in
  // it — see the render below
  const [pinnedTop, setPinnedTop] = useState<number | null>(null);
  const unpinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomAnchored = position.startsWith('bottom');
  const empty = live.length === 0 && !panelOpen;

  // An emptied stack lets go (its leave never fires once it unmounts)
  useEffect(() => {
    if (empty && pinnedTop !== null) setPinnedTop(null);
  }, [empty, pinnedTop]);
  useEffect(() => () => { if (unpinTimer.current) clearTimeout(unpinTimer.current); }, []);

  // A TOP stack runs ALL THE WAY DOWN THE PAGE AND SCROLLS PAST IT
  // (2026-11-02, "let them stack all the way down the page", then "so can
  // it overflow?" → "perhaps it should scroll?"): its height is held to the
  // room above the bottom inset in CSS (so a resize keeps it there), and
  // nothing is pushed out unseen. A new notification arriving below the
  // fold is scrolled into view — but never while the pointer is in the
  // stack, so it does not move under someone clearing it
  const hoveredRef = useRef(false);
  const lastLiveCount = useRef(0);

  // A CLOSE IN A FULL STACK HOLDS THE SCROLL (2026-11-02, "when list is
  // full, removing item from list feels clunky"): scrolled to its foot, a
  // stack that shrinks has its scroll pulled back every frame of the
  // collapse, so the cards ABOVE slid down into the gap — the × under the
  // pointer went to the card above, in steps. While the pointer (or the
  // focus) is in the stack, a SPACER at its foot grows by exactly what the
  // closing row gives up, on the same curve, so the height never changes,
  // nothing is clamped and the cards below slide up under the × as they do
  // with room. The tabs' trick, again: the spacer closes SETTLE_DELAY_MS
  // after the pointer leaves, and the stack settles back to its foot
  const [spacer, setSpacer] = useState(0);
  const [settling, setSettling] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingSeen = useRef(new Set<string>());
  const holding = () =>
    hoveredRef.current || !!containerRef.current?.contains(document.activeElement);
  React.useLayoutEffect(() => {
    const panel = panelRef.current;
    let grow = 0;
    for (const t of live) {
      if (!t.exiting || exitingSeen.current.has(t.id)) continue;
      exitingSeen.current.add(t.id);
      if (panelOpen || !panel || !holding() || panel.scrollHeight <= panel.clientHeight + 1) continue;
      const wrapper = panel.querySelector<HTMLElement>(`[data-toast-id="${t.id.replace(/["\\]/g, '\\$&')}"]`);
      // The card's own height — its content's, which the collapse (already
      // under way here) does not change — and the 8px gap it gives back
      const card = wrapper?.firstElementChild as HTMLElement | null | undefined;
      if (card) grow += card.scrollHeight + 8;
    }
    const ids = new Set(live.map((t) => t.id));
    for (const id of exitingSeen.current) if (!ids.has(id)) exitingSeen.current.delete(id);
    if (grow > 0) {
      if (settleTimer.current) { clearTimeout(settleTimer.current); settleTimer.current = null; }
      setSettling(false);
      setSpacer((h) => h + grow);
    }
  }, [live, panelOpen]);
  // The bell's card has no spacer
  useEffect(() => { if (panelOpen) { setSpacer(0); setSettling(false); } }, [panelOpen]);
  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);
  const holdSpacer = () => {
    if (settleTimer.current) { clearTimeout(settleTimer.current); settleTimer.current = null; }
  };
  const settleSoon = () => {
    holdSpacer();
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      setSettling(true);
      setSpacer(0);
    }, SETTLE_DELAY_MS);
  };
  // When each live row was first drawn, and how it arrived: an ARRIVAL into a
  // FULL stack opens its row and pushes the others up ('push'); one with room
  // below the last card just fades in ('fade') — (2026-11-02, "only do that
  // when the list is full because when there's space it looks weird")
  const firstSeen = useRef(new Map<string, { at: number; mode: 'push' | 'fade' }>());
  // Whether the stack was already full — scrolling — at the last commit, so
  // an arrival knows how it came in (read in render, before it is drawn)
  const fullRef = useRef(false);
  React.useLayoutEffect(() => {
    const panel = panelRef.current;
    fullRef.current = !!panel && !panelOpen && panel.scrollHeight > panel.clientHeight + 1;
  });
  React.useLayoutEffect(() => {
    const grew = live.length > lastLiveCount.current;
    lastLiveCount.current = live.length;
    const panel = panelRef.current;
    if (!grew || panelOpen || hoveredRef.current || !panel) return;
    panel.scrollTop = panel.scrollHeight;
    // THE ARRIVAL PUSHES THE OTHERS UP (2026-11-02, "when a new one comes
    // in, can the animation show that it's pushed the others up?"): the new
    // row grows open from nothing over ENTER_MS (ToastContainer.css), and
    // the stack is held scrolled to its foot on every frame of it, so the
    // cards above glide up by the room it takes rather than jumping — ONLY
    // in a stack that was already full; with room below the last card the
    // new one just fades in there, nothing above moves
    if (typeof requestAnimationFrame !== 'function') return;
    const until = performance.now() + ENTER_MS + 50;
    let frame = 0;
    const follow = () => {
      if (hoveredRef.current) return;
      panel.scrollTop = panel.scrollHeight;
      if (performance.now() < until) frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [live, panelOpen]);

  // The open panel closes on Escape and on a press outside it (the bell
  // toggles it itself)
  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (containerRef.current?.contains(t as Node) || t?.closest?.('[data-notification-bell]')) return;
      toast.setPanelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      toast.setPanelOpen(false);
      document.querySelector<HTMLElement>('[data-notification-bell]')?.focus();
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  if (empty) {
    return null;
  }

  const pin = () => {
    if (!bottomAnchored) return;
    if (unpinTimer.current) { clearTimeout(unpinTimer.current); unpinTimer.current = null; }
    if (pinnedTop === null && containerRef.current) setPinnedTop(containerRef.current.getBoundingClientRect().top);
  };
  const unpinSoon = () => {
    if (!bottomAnchored) return;
    if (unpinTimer.current) clearTimeout(unpinTimer.current);
    unpinTimer.current = setTimeout(() => { unpinTimer.current = null; setPinnedTop(null); }, UNPIN_DELAY_MS);
  };

  // The open panel is anchored by its foot (the footer is where the
  // pointer lives); the pop-out stack holds its top while hovered
  const pinTop = bottomAnchored && !panelOpen && pinnedTop !== null;
  const style: React.CSSProperties = {
    ...(bottomAnchored
      ? (pinTop ? { top: pinnedTop, bottom: 'auto' } : {})
      : (top !== undefined ? { top } : {})),
    ...(right !== undefined && position.endsWith('right') ? { right } : {}),
    ...(restTop !== undefined ? { ['--notification-rest-top' as string]: `${restTop}px` } : {}),
    // The open archive comes ALL THE WAY DOWN THE SCREEN (2026-11-02, "I
    // think we can come all the way down the screen"): its list may grow to
    // the bottom inset, less its 45px foot, and scrolls past that
    ...(!bottomAnchored && top !== undefined
      ? (maxHeight !== undefined
        ? {
            // The frame's height; the stack pads 12px inside it top and
            // bottom, the open archive keeps 12px clear and its 45px foot
            ['--notification-list-max' as string]: `${Math.max(0, maxHeight - (restTop ?? 12) - 12 - 45)}px`,
            ['--notification-stack-max' as string]: `${Math.max(0, maxHeight)}px`,
          }
        : {
            ['--notification-list-max' as string]: `calc(100vh - ${top + bottomInset + 45}px)`,
            ['--notification-stack-max' as string]: `calc(100vh - ${top + bottomInset}px)`,
          })
      : {}),
  };

  // Only an ARRIVAL opens its row (the push-up, ToastContainer.css): a row
  // first drawn in the last ENTER_MS. Opening or closing the bell remounts
  // every row, and they must not all grow open again
  const arriving = (id: string): 'push' | 'fade' | undefined => {
    const now = performance.now();
    let seen = firstSeen.current.get(id);
    if (seen === undefined) {
      seen = { at: now, mode: fullRef.current ? 'push' : 'fade' };
      firstSeen.current.set(id, seen);
    }
    return now - seen.at < ENTER_MS ? seen.mode : undefined;
  };

  const row = (t: ManagedToast, inArchive: boolean) => (
    <div
      key={t.id}
      className={t.exiting ? 'toast-wrapper toast-wrapper--exiting' : 'toast-wrapper'}
      data-toast-id={t.id}
      data-archived={inArchive ? 'true' : undefined}
      data-entering={!inArchive && !t.exiting ? arriving(t.id) : undefined}
    >
      <Toast
        {...t}
        // In the open archive a notification is a ROW of the one card
        embedded={panelOpen}
        // An archived row has no countdown, was announced when it arrived,
        // and its × removes it from the archive
        duration={inArchive ? 0 : t.duration}
        announce={!inArchive}
        onDismiss={inArchive ? () => toast.remove(t.id) : t.onDismiss}
      />
    </div>
  );

  return (
    // THE × STAYS UNDER THE POINTER (2026-11-02, "the goal of the change was
    // to make the 'X' button position a bit more consistent so it's easy to
    // delete them all"): the × sits in each row's header, so with the
    // stack's TOP edge held still, closing the top row slides the next up
    // into the same place, whatever the rows' heights. The stack rests in
    // its corner and HOLDS ITS TOP EDGE ONLY WHILE THE POINTER (or the
    // focus) IS IN IT — the tabs' trick — letting go UNPIN_DELAY_MS after
    // the pointer leaves ("the notifications cover the user's workspace…
    // could we try bottom right again but have the notifications move
    // upwards instead so that the X remains in place?").
    <div
      ref={containerRef}
      className={`toast-container toast-container--${position}`}
      data-pinned={pinTop ? 'true' : undefined}
      data-panel-open={panelOpen ? 'true' : undefined}
      style={style}
      onMouseEnter={() => { hoveredRef.current = true; pin(); holdSpacer(); }}
      onMouseLeave={() => { hoveredRef.current = false; unpinSoon(); settleSoon(); }}
      onFocus={() => { pin(); holdSpacer(); }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { unpinSoon(); settleSoon(); }
      }}
    >
      <div
        ref={panelRef}
        className={`notification-panel${panelOpen ? ' notification-panel--open' : ''}`}
        role={panelOpen ? 'region' : undefined}
        aria-label={panelOpen ? 'Notifications' : undefined}
      >
        {panelOpen && (
          <div className="notification-panel__list">
            {archive.length === 0 && live.length === 0 && (
              <div className="notification-panel__empty">No notifications</div>
            )}
            {archive.map((t) => row(t, true))}
            {live.map((t) => row(t, false))}
          </div>
        )}
        {!panelOpen && live.map((t) => row(t, false))}
        {/* Always there (at 0 when idle) so its growth transitions */}
        {!panelOpen && live.length > 0 && (
          <div
            className="notification-panel__spacer"
            data-settling={settling ? 'true' : undefined}
            style={{ height: spacer }}
            onTransitionEnd={() => { if (settling && spacer === 0) setSettling(false); }}
            aria-hidden="true"
          />
        )}
        {panelOpen && (
          <div className="notification-panel__footer">
            <button
              type="button"
              className="notification-panel__mute"
              data-muted={muted ? 'true' : undefined}
              aria-pressed={muted}
              aria-label={muted ? 'Unmute notifications' : 'Mute notifications'}
              onClick={() => toast.setMuted(!muted)}
            >
              <span className="notification-panel__glyph" aria-hidden="true">{'\uF363'}</span>
              <span>{muted ? 'Muted' : 'Mute'}</span>
            </button>
            <button
              type="button"
              className="notification-panel__clear"
              disabled={archive.length === 0 && live.every((t) => t.showProgress)}
              onClick={() => toast.clearAll()}
            >
              <span className="notification-panel__glyph" aria-hidden="true">{'\uEF2C'}</span>
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export interface NotificationBellProps {
  className?: string;
}

/** The notification centre's door, for a status bar: a bell that opens the
 *  archive, with a dot while something that needs you was never seen */
export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { panelOpen, attention, muted } = useNotifications();
  const label = `Notifications${muted ? ', muted' : ''}${attention > 0 ? `, ${attention} need${attention === 1 ? 's' : ''} attention` : ''}`;
  return (
    <button
      type="button"
      className={`notification-bell ${className}`}
      data-notification-bell=""
      data-attention={attention > 0 ? 'true' : undefined}
      data-muted={muted ? 'true' : undefined}
      aria-label={label}
      aria-expanded={panelOpen}
      aria-haspopup="true"
      onClick={() => toast.togglePanel()}
    >
      <span className="notification-bell__glyph" aria-hidden="true">{'\uF363'}</span>
      {attention > 0 && <span className="notification-bell__dot" aria-hidden="true" />}
    </button>
  );
}

export default ToastContainer;

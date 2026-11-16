/**
 * ProjectTabRail — VERTICAL PROJECT TABS, FIREFOX'S (2026-11-16, "let's do
 * firefox-style vertical tabs"): the open projects as a column at the
 * window's left edge, OUTSIDE everything else (window edge → this rail →
 * toolbar docks → panels → canvas), from under the title bar to the foot.
 *
 * COLLAPSED (48px) it shows a BADGE per project — its colour (from its id)
 * and its initials, since every project shares the waveform icon; HOVER (or
 * keyboard focus) EXPANDS it over the content to its width with the names;
 * the PIN keeps it open, taking its width in the layout, and its right edge
 * then drags the width (remembered). Home at the top, the projects, + New
 * project at the foot. The tabs' gestures carry over: a click switches, the
 * × (on hover, always on the active one) or a middle-click closes, a
 * double-click renames (expanded), a drag reorders (vertically). A
 * right-click on the rail offers horizontal tabs back and the pin.
 */
import React from 'react';
import { Icon, useTheme } from '@audacity-ui/components';
import type { ProjectTabInfo } from './ProjectBarTools';

export const RAIL_COLLAPSED_PX = 48;
export const RAIL_MIN_PX = 160;
export const RAIL_MAX_PX = 360;
const HOVER_OPEN_MS = 250;
const HOVER_CLOSE_MS = 150;
const DRAG_THRESHOLD_PX = 4;

/** The badge colours — the clip palette's strong tones, white text on each */
const BADGE_COLOURS = ['#4A6FE3', '#8E5BD9', '#C2449B', '#D9534F', '#E07B2A', '#2E9E6A', '#1F8FA8', '#6B7A8F'];

/** A project's badge colour: stable for its id */
export function badgeColour(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BADGE_COLOURS[h % BADGE_COLOURS.length];
}

/** A project's initials: the first letters of its first two words, or one */
export function projectInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return '?';
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}

export interface ProjectTabRailProps {
  inProject: boolean;
  onHome: () => void;
  projects: ProjectTabInfo[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCloseProject: (id: string) => void;
  onReorderProjects: (ids: string[]) => void;
  onRenameProject: (id: string, title: string) => void;
  onNewProject: () => void;
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  width: number;
  onWidthChange: (width: number) => void;
  /** A right-click on the rail: its menu (horizontal tabs, the pin) */
  onRailMenu: (anchor: { x: number; y: number }) => void;
}

export function ProjectTabRail(props: ProjectTabRailProps) {
  const { inProject, onHome, projects, activeProjectId, onSelectProject, onCloseProject, onReorderProjects, onRenameProject, onNewProject, pinned, onPinnedChange, width, onWidthChange, onRailMenu } = props;
  const { theme } = useTheme();
  const [hoverOpen, setHoverOpen] = React.useState(false);
  const [focusOpen, setFocusOpen] = React.useState(false);
  const [liveWidth, setLiveWidth] = React.useState<number | null>(null);
  const [renaming, setRenaming] = React.useState<{ id: string; draft: string } | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const suppressClickRef = React.useRef(false);
  const idsRef = React.useRef(projects.map((p) => p.id));
  idsRef.current = projects.map((p) => p.id);

  const expanded = pinned || hoverOpen || focusOpen || renaming !== null || draggingId !== null;
  const shownWidth = liveWidth ?? width;
  const panelWidth = expanded ? shownWidth : RAIL_COLLAPSED_PX;

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };
  React.useEffect(() => clearTimers, []);

  const onEnter = () => {
    if (pinned) return;
    clearTimers();
    openTimer.current = window.setTimeout(() => setHoverOpen(true), HOVER_OPEN_MS);
  };
  const onLeave = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setHoverOpen(false), HOVER_CLOSE_MS);
  };

  // A VERTICAL DRAG REORDERS (the horizontal tabs' rule, turned)
  const onItemPointerDown = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || renaming) return;
    if ((e.target as HTMLElement).closest('[data-rail-close], input')) return;
    const startY = e.clientY;
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.abs(ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        suppressClickRef.current = true;
        setDraggingId(id);
        try { el.setPointerCapture(pointerId); } catch { /* ended */ }
      }
      const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-rail-project]') ?? []);
      const current = idsRef.current;
      const from = current.indexOf(id);
      let to = from;
      items.forEach((item) => {
        const other = item.getAttribute('data-rail-project');
        if (!other || other === id) return;
        const r = item.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const i = current.indexOf(other);
        if (i < from && ev.clientY < mid) to = Math.min(to, i);
        if (i > from && ev.clientY > mid) to = Math.max(to, i);
      });
      if (to !== from) {
        const next = current.filter((x) => x !== id);
        next.splice(to, 0, id);
        idsRef.current = next;
        onReorderProjects(next);
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (dragging) {
        setDraggingId(null);
        window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  // THE WIDTH, pinned: the right edge drags it, stored once at the release
  const onResizeDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const start = width;
    const at = (x: number) => Math.max(RAIL_MIN_PX, Math.min(RAIL_MAX_PX, start + (x - startX)));
    document.body.setAttribute('data-rail-resize', '');
    const move = (ev: MouseEvent) => setLiveWidth(at(ev.clientX));
    const up = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.removeAttribute('data-rail-resize');
      setLiveWidth(null);
      onWidthChange(Math.round(at(ev.clientX)));
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const finishRename = (value: string | null) => {
    if (!renaming) return;
    const { id } = renaming;
    setRenaming(null);
    const title = value?.trim();
    const was = projects.find((p) => p.id === id)?.title;
    if (title && title !== was) onRenameProject(id, title);
  };

  const chrome = `color-mix(in srgb, ${theme.background.toolbar}, black 10%)`;
  const style = {
    '--rail-bg': chrome,
    '--rail-border': theme.border.onSurface,
    '--rail-text': theme.foreground.text.primary,
    '--rail-text-secondary': theme.foreground.text.secondary,
    '--rail-hover': `color-mix(in srgb, ${theme.foreground.text.primary} 8%, transparent)`,
    '--rail-active': theme.background.toolbar,
    '--rail-accent': theme.accent.primary,
  } as React.CSSProperties;

  const row = (key: string, opts: {
    active?: boolean; label: string; badge: React.ReactNode; onClick: () => void; projectId?: string; title?: string;
  }) => (
    <div
      key={key}
      className={`project-rail__item${opts.active ? ' project-rail__item--active' : ''}${draggingId && draggingId === opts.projectId ? ' project-rail__item--dragging' : ''}`}
      data-rail-project={opts.projectId}
      onPointerDown={opts.projectId ? onItemPointerDown(opts.projectId) : undefined}
      onAuxClick={opts.projectId ? (e) => { if (e.button === 1) { e.preventDefault(); onCloseProject(opts.projectId!); } } : undefined}
      onDoubleClick={opts.projectId ? () => { if (expanded) setRenaming({ id: opts.projectId!, draft: opts.label }); } : undefined}
    >
      <button
        type="button"
        className="project-rail__button"
        aria-current={opts.active ? 'page' : undefined}
        aria-label={opts.label}
        title={expanded ? undefined : opts.label}
        onClick={() => { if (suppressClickRef.current) return; opts.onClick(); }}
      >
        <span className="project-rail__badge" aria-hidden="true">{opts.badge}</span>
        {renaming && renaming.id === opts.projectId ? (
          <input
            className="project-rail__rename"
            data-rail-rename
            aria-label="Project name"
            value={renaming.draft}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setRenaming({ id: renaming.id, draft: e.target.value })}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') { e.preventDefault(); finishRename(renaming.draft); }
              if (e.key === 'Escape') { e.preventDefault(); finishRename(null); }
            }}
            onBlur={() => finishRename(renaming.draft)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="project-rail__label">{opts.label}</span>
        )}
      </button>
      {opts.projectId && expanded && !(renaming && renaming.id === opts.projectId) && (
        <button
          type="button"
          className="project-rail__close"
          data-rail-close={opts.projectId}
          aria-label={`Close ${opts.label}`}
          tabIndex={opts.active ? 0 : -1}
          onClick={(e) => { e.stopPropagation(); onCloseProject(opts.projectId!); }}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`project-rail${pinned ? ' project-rail--pinned' : ''}`}
      data-project-rail
      data-expanded={expanded || undefined}
      style={{ ...style, width: pinned ? shownWidth : RAIL_COLLAPSED_PX }}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('input')) return;
        e.preventDefault();
        onRailMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <nav
        className="project-rail__panel"
        aria-label="Projects"
        style={{ width: panelWidth }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={() => setFocusOpen(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusOpen(false); }}
      >
        {row('home', { active: !inProject, label: 'Home', badge: <Icon name="home" size={16} />, onClick: onHome })}
        <div className="project-rail__divider" />
        <div className="project-rail__list" ref={listRef}>
          {projects.map((p) => row(p.id, {
            active: inProject && p.id === activeProjectId,
            label: p.title,
            projectId: p.id,
            badge: <span className="project-rail__initials" style={{ background: badgeColour(p.id) }}>{projectInitials(p.title)}</span>,
            onClick: () => onSelectProject(p.id),
          }))}
        </div>
        <div className="project-rail__foot">
          {row('new', { label: 'New project', badge: <Icon name="plus" size={16} />, onClick: onNewProject })}
          {expanded && (
            <button
              type="button"
              className={`project-rail__pin${pinned ? ' project-rail__pin--on' : ''}`}
              aria-pressed={pinned}
              aria-label={pinned ? 'Unpin the projects sidebar' : 'Pin the projects sidebar'}
              onClick={() => { onPinnedChange(!pinned); setHoverOpen(false); }}
            >
              <span>{pinned ? 'Unpin sidebar' : 'Pin sidebar'}</span>
            </button>
          )}
        </div>
        {pinned && (
          <div className="project-rail__resize" data-rail-resize-edge aria-hidden="true" onMouseDown={onResizeDown}
            onDoubleClick={() => onWidthChange(220)} />
        )}
      </nav>
    </div>
  );
}

/**
 * The dev INSPECTOR (user request 2026-10-01, then "I was hoping that
 * dev view would work anywhere in the UI"): with the Debug panel's
 * switch on, the element under the pointer — ANY element — gets a
 * Figma-style readout drawn over the page: its box and W × H, its
 * offsets from its container's edges (negative = outside), the gap to
 * the nearest sibling on each side, and its padding and margin when it
 * has any. Plain hover takes the deepest element (an SVG's innards
 * collapse to the SVG); SHIFT takes its parent instead. A clip control
 * — trim/stretch handle, fade handle, shape handle, crossfade node,
 * edge zone — keeps its friendlier name and is measured against its
 * CLIP, with the clip's other controls as neighbours. Pure DOM
 * measurement (getBoundingClientRect, viewport px), so it reads the
 * real boxes the pointer meets. It takes no pointer events and changes
 * nothing.
 */
import React from 'react';
import {
  nearestGaps, clipOffsets, sizeOf, describeControl, describeElement, spacingText, round,
  type Box, type Gap, type Neighbour,
} from '../utils/inspectorGeometry';

const CONTROL_SELECTOR = [
  '[data-buried-handle]',
  '.clip-display__handle',
  '[data-fade-handle]',
  '[data-quickfade-node]',
  '[data-crossfade-node]',
  '[data-edge-trim]',
  '[data-fade-guideline]',
].join(', ');

const toBox = (r: DOMRect): Box => ({ left: round(r.left), top: round(r.top), right: round(r.right), bottom: round(r.bottom) });

const isControl = (el: Element) => el.matches(CONTROL_SELECTOR);

function describe(el: Element): string {
  if (isControl(el) || el.hasAttribute('data-clip-id')) {
    return describeControl({
      className: el.className?.toString(),
      fadeHandle: el.getAttribute('data-fade-handle'),
      quickfadeNode: el.getAttribute('data-quickfade-node'),
      crossfadeNode: el.getAttribute('data-crossfade-node'),
      edgeTrim: el.getAttribute('data-edge-trim'),
      edgeMode: el.getAttribute('data-edge-mode'),
      buriedHandle: el.getAttribute('data-buried-handle'),
      clipId: el.getAttribute('data-clip-id'),
      fadeGuideline: el.getAttribute('data-fade-guideline'),
    });
  }
  return describeElement({
    tag: el.tagName,
    id: el.id || null,
    className: typeof el.className === 'string' ? el.className : undefined,
    role: el.getAttribute('role'),
    ariaLabel: el.getAttribute('aria-label'),
  });
}

/** The clip a control belongs to: by DOM (inside the wrapper) or by
 *  the id it carries at track level. A crossfade node belongs to two;
 *  it is measured against the incoming (second) clip. */
function clipIdOf(el: Element): string | null {
  const inside = el.closest('[data-clip-id]');
  if (inside) return inside.getAttribute('data-clip-id');
  const ref = el.getAttribute('data-fade-clip') ?? el.getAttribute('data-clip-ref');
  if (ref) return ref;
  const node = el.getAttribute('data-crossfade-node');
  if (node) return node.split('-')[1] ?? null;
  return null;
}

/** What the pointer is on: the deepest element, collapsed to its SVG
 *  when inside one; with Shift, its parent */
function resolveTarget(hit: Element | null, shift: boolean): Element | null {
  if (!hit) return null;
  let el: Element = hit.closest('svg') ?? hit;
  if (shift && el.parentElement && el.parentElement !== document.documentElement) el = el.parentElement;
  return el;
}

const hasBox = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

interface Reading {
  label: string;
  box: Box;
  size: { width: number; height: number };
  container?: { label: string; box: Box; offsets: { left: number; right: number; top: number } };
  gaps: Gap[];
  spacing: string[];
  pointer: { x: number; y: number };
}

const INK = '#ff2d9b';   // the target
const CTR = '#22d3ee';   // offsets from the container
const GAP = '#f59e0b';   // gaps to neighbours

export function DevInspector({ enabled }: { enabled: boolean }) {
  const [reading, setReading] = React.useState<Reading | null>(null);
  const pointer = React.useRef<{ x: number; y: number; shift: boolean } | null>(null);

  React.useEffect(() => {
    if (!enabled) { setReading(null); return; }
    const measure = () => {
      const p = pointer.current;
      if (!p) return;
      const el = resolveTarget(document.elementFromPoint(p.x, p.y), p.shift);
      if (!el || el === document.documentElement || el === document.body) { setReading(null); return; }
      const box = toBox(el.getBoundingClientRect());

      // The container and the neighbours: a clip control's are its clip
      // and the clip's other controls; anything else's are its
      // positioned ancestor and its siblings
      let container: Reading['container'];
      const neighbours: Neighbour[] = [];
      const clipId = isControl(el) ? clipIdOf(el) : null;
      const clipEl = clipId != null ? document.querySelector(`[data-clip-id="${clipId}"]`) : null;
      if (clipEl && clipId != null) {
        const clipBox = toBox(clipEl.getBoundingClientRect());
        container = { label: `Clip ${clipId}`, box: clipBox, offsets: clipOffsets(box, clipBox) };
        for (const other of document.querySelectorAll(CONTROL_SELECTOR)) {
          if (other === el || other.hasAttribute('data-leaving') || clipIdOf(other) !== clipId) continue;
          neighbours.push({ box: toBox(other.getBoundingClientRect()), label: describe(other) });
        }
      } else {
        // The positioned ancestor — or, when that is only the body (a
        // static toolbar, say), the parent, which is the box that
        // actually lays the element out
        const positioned = (el as HTMLElement).offsetParent;
        const parent = positioned && positioned !== document.body ? positioned : el.parentElement;
        if (parent && parent !== document.body && parent !== document.documentElement) {
          const pBox = toBox(parent.getBoundingClientRect());
          container = { label: describe(parent), box: pBox, offsets: clipOffsets(box, pBox) };
        }
        for (const sib of el.parentElement?.children ?? []) {
          if (sib === el || !hasBox(sib) || sib.hasAttribute('data-dev-inspector')) continue;
          neighbours.push({ box: toBox(sib.getBoundingClientRect()), label: describe(sib) });
        }
      }

      const cs = getComputedStyle(el);
      const px = (v: string) => round(parseFloat(v) || 0);
      const spacing = [
        spacingText('padding', px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)),
        spacingText('margin', px(cs.marginTop), px(cs.marginRight), px(cs.marginBottom), px(cs.marginLeft)),
        spacingText('border', px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)),
      ].filter((s): s is string => s !== null);

      setReading({ label: describe(el), box, size: sizeOf(box), container, gaps: nearestGaps(box, neighbours), spacing, pointer: p });
    };
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; measure(); });
    };
    const onMove = (e: MouseEvent) => { pointer.current = { x: e.clientX, y: e.clientY, shift: e.shiftKey }; schedule(); };
    // Shift pressed or released over a resting pointer re-aims
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Shift' || !pointer.current) return;
      pointer.current = { ...pointer.current, shift: e.type === 'keydown' };
      schedule();
    };
    const onLeave = () => { pointer.current = null; setReading(null); };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKey, true);
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', schedule);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keyup', onKey, true);
      document.removeEventListener('scroll', schedule, true);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled || !reading) return null;
  const { box, size, container, gaps, label, spacing, pointer: p } = reading;
  const midY = (box.top + box.bottom) / 2;
  const midX = (box.left + box.right) / 2;

  // A measured span: a line with end ticks and its length written beside it
  const span = (key: string, color: string, x1: number, y1: number, x2: number, y2: number, text: string) => {
    const horizontal = y1 === y2;
    const tx = horizontal ? (x1 + x2) / 2 : x1 + 6;
    const ty = horizontal ? y1 - 5 : (y1 + y2) / 2 + 4;
    return (
      <g key={key} stroke={color} fill={color}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1} />
        {horizontal
          ? <><line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} /><line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} /></>
          : <><line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} /><line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} /></>}
        <text x={tx} y={ty} textAnchor={horizontal ? 'middle' : 'start'} style={labelStyle}>{text}</text>
      </g>
    );
  };

  const cardX = Math.min(p.x + 16, window.innerWidth - 320);
  const cardY = Math.min(p.y + 20, window.innerHeight - 160);
  const nearerLeft = container ? Math.abs(container.offsets.left) <= Math.abs(container.offsets.right) : false;

  return (
    <div data-dev-inspector style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100000 }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {container && (
          <rect x={container.box.left} y={container.box.top} width={container.box.right - container.box.left} height={container.box.bottom - container.box.top}
            fill="none" stroke={CTR} strokeWidth={1} strokeDasharray="4 3" opacity={0.8} />
        )}
        <rect x={box.left} y={box.top} width={size.width} height={size.height} fill={`${INK}22`} stroke={INK} strokeWidth={1} />
        <text x={midX} y={box.top - 6} textAnchor="middle" style={{ ...labelStyle, fill: INK }}>{`${size.width} × ${size.height}`}</text>
        {/* The NEARER horizontal offset only — a line across the whole
            container to the far edge says nothing the card does not */}
        {container && nearerLeft && container.offsets.left !== 0
          && span('off-left', CTR, container.box.left, midY, box.left, midY, `${container.offsets.left}`)}
        {container && !nearerLeft && container.offsets.right !== 0
          && span('off-right', CTR, box.right, midY, container.box.right, midY, `${container.offsets.right}`)}
        {container && container.offsets.top !== 0
          && span('off-top', CTR, midX, container.box.top, midX, box.top, `${container.offsets.top}`)}
        {gaps.map((g) => (g.side === 'left' || g.side === 'right')
          ? span(`gap-${g.side}`, GAP, g.from, g.at, g.toCoord, g.at, `${g.px}`)
          : span(`gap-${g.side}`, GAP, g.at, g.from, g.at, g.toCoord, `${g.px}`))}
      </svg>
      <div style={{
        position: 'absolute', left: cardX, top: cardY, minWidth: 220, maxWidth: 320,
        background: 'rgba(20, 21, 26, 0.92)', color: '#fff', borderRadius: 6, padding: '8px 10px',
        font: '12px/16px ui-monospace, SFMono-Regular, Menlo, monospace', boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        wordBreak: 'break-word',
      }}>
        <div style={{ color: INK, fontWeight: 600 }}>{label}</div>
        <div>{size.width} × {size.height} px{spacing.length > 0 ? ` · ${spacing.join(' · ')}` : ''}</div>
        {container && (
          <div style={{ color: CTR }}>
            in {container.label}: left {container.offsets.left} · right {container.offsets.right} · top {container.offsets.top}
          </div>
        )}
        {gaps.map((g) => (
          <div key={g.side} style={{ color: GAP }}>
            {g.side === 'left' ? '←' : g.side === 'right' ? '→' : g.side === 'above' ? '↑' : '↓'} {g.px} to {g.to}
          </div>
        ))}
        <div style={{ opacity: 0.55, marginTop: 4 }}>Shift: parent</div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  paintOrder: 'stroke',
  stroke: 'rgba(255,255,255,0.9)',
  strokeWidth: 3,
  strokeLinejoin: 'round',
};

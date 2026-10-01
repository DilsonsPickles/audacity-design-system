/**
 * The dev INSPECTOR (user request 2026-10-01): with the Debug panel's
 * switch on, the clip control under the pointer — trim/stretch handle,
 * fade length or shape handle, crossfade node, edge zone, or the clip
 * itself — gets a Figma-style readout drawn over the page: its box and
 * W × H, its offsets from its clip's edges (negative = outside), and
 * the gap to the nearest control of the same clip on each side. Pure
 * DOM measurement (getBoundingClientRect, viewport px), so it reads
 * the real boxes the pointer meets — the same ones Hit Markers paints.
 * It takes no pointer events and changes nothing.
 */
import React from 'react';
import { nearestGaps, clipOffsets, sizeOf, describeControl, round, type Box, type Gap, type Neighbour } from '../utils/inspectorGeometry';

const CONTROL_SELECTOR = [
  '[data-buried-handle]',
  '.clip-display__handle',
  '[data-fade-handle]',
  '[data-quickfade-node]',
  '[data-crossfade-node]',
  '[data-edge-trim]',
  '[data-fade-guideline]',
].join(', ');
const TARGET_SELECTOR = `${CONTROL_SELECTOR}, [data-clip-id]`;

const toBox = (r: DOMRect): Box => ({ left: round(r.left), top: round(r.top), right: round(r.right), bottom: round(r.bottom) });

function describe(el: Element): string {
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

interface Reading {
  label: string;
  box: Box;
  size: { width: number; height: number };
  clip?: { id: string; box: Box; offsets: { left: number; right: number; top: number } };
  gaps: Gap[];
  pointer: { x: number; y: number };
}

const INK = '#ff2d9b';   // the target
const CLIP = '#22d3ee';  // offsets from the clip
const GAP = '#f59e0b';   // gaps to neighbours

export function DevInspector({ enabled }: { enabled: boolean }) {
  const [reading, setReading] = React.useState<Reading | null>(null);
  const pointer = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!enabled) { setReading(null); return; }
    const measure = () => {
      const p = pointer.current;
      if (!p) return;
      const el = document.elementFromPoint(p.x, p.y)?.closest(TARGET_SELECTOR) ?? null;
      if (!el) { setReading(null); return; }
      const box = toBox(el.getBoundingClientRect());
      const clipId = clipIdOf(el);
      const clipEl = clipId != null ? document.querySelector(`[data-clip-id="${clipId}"]`) : null;
      const clipBox = clipEl ? toBox(clipEl.getBoundingClientRect()) : null;
      const neighbours: Neighbour[] = [];
      if (clipId != null) {
        for (const other of document.querySelectorAll(CONTROL_SELECTOR)) {
          if (other === el || other.hasAttribute('data-leaving') || clipIdOf(other) !== clipId) continue;
          neighbours.push({ box: toBox(other.getBoundingClientRect()), label: describe(other) });
        }
      }
      setReading({
        label: describe(el),
        box,
        size: sizeOf(box),
        clip: clipBox && clipId != null && clipEl !== el ? { id: clipId, box: clipBox, offsets: clipOffsets(box, clipBox) } : undefined,
        gaps: nearestGaps(box, neighbours),
        pointer: p,
      });
    };
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; measure(); });
    };
    const onMove = (e: MouseEvent) => { pointer.current = { x: e.clientX, y: e.clientY }; schedule(); };
    const onLeave = () => { pointer.current = null; setReading(null); };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', schedule);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('scroll', schedule, true);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled || !reading) return null;
  const { box, size, clip, gaps, label, pointer: p } = reading;
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

  const cardX = Math.min(p.x + 16, window.innerWidth - 300);
  const cardY = Math.min(p.y + 20, window.innerHeight - 140);

  return (
    <div data-dev-inspector style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100000 }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {clip && (
          <rect x={clip.box.left} y={clip.box.top} width={clip.box.right - clip.box.left} height={clip.box.bottom - clip.box.top}
            fill="none" stroke={CLIP} strokeWidth={1} strokeDasharray="4 3" opacity={0.8} />
        )}
        <rect x={box.left} y={box.top} width={size.width} height={size.height} fill={`${INK}22`} stroke={INK} strokeWidth={1} />
        <text x={midX} y={box.top - 6} textAnchor="middle" style={{ ...labelStyle, fill: INK }}>{`${size.width} × ${size.height}`}</text>
        {/* The NEARER horizontal offset only — a line across the whole
            clip to the far edge says nothing the card does not */}
        {clip && Math.abs(clip.offsets.left) <= Math.abs(clip.offsets.right) && clip.offsets.left !== 0
          && span('off-left', CLIP, clip.box.left, midY, box.left, midY, `${clip.offsets.left}`)}
        {clip && Math.abs(clip.offsets.right) < Math.abs(clip.offsets.left) && clip.offsets.right !== 0
          && span('off-right', CLIP, box.right, midY, clip.box.right, midY, `${clip.offsets.right}`)}
        {clip && clip.offsets.top !== 0 && span('off-top', CLIP, midX, clip.box.top, midX, box.top, `${clip.offsets.top}`)}
        {gaps.map((g) => (g.side === 'left' || g.side === 'right')
          ? span(`gap-${g.side}`, GAP, g.from, g.at, g.toCoord, g.at, `${g.px}`)
          : span(`gap-${g.side}`, GAP, g.at, g.from, g.at, g.toCoord, `${g.px}`))}
      </svg>
      <div style={{
        position: 'absolute', left: cardX, top: cardY, minWidth: 220, maxWidth: 300,
        background: 'rgba(20, 21, 26, 0.92)', color: '#fff', borderRadius: 6, padding: '8px 10px',
        font: '12px/16px ui-monospace, SFMono-Regular, Menlo, monospace', boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}>
        <div style={{ color: INK, fontWeight: 600 }}>{label}</div>
        <div>{size.width} × {size.height} px</div>
        {clip && (
          <div style={{ color: CLIP }}>
            in Clip {clip.id}: left {clip.offsets.left} · right {clip.offsets.right} · top {clip.offsets.top}
          </div>
        )}
        {gaps.map((g) => (
          <div key={g.side} style={{ color: GAP }}>
            {g.side === 'left' ? '←' : g.side === 'right' ? '→' : g.side === 'above' ? '↑' : '↓'} {g.px} to {g.to}
          </div>
        ))}
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

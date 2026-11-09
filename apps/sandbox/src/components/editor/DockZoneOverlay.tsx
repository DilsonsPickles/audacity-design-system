import React from 'react';

/** Width of the drag-to-dock bands along the editor row's edges */
export const DOCK_ZONE_SIZE = 88;

export interface DockZoneBand {
  zone: string;
  /** The subtle band along the edge while the pointer is elsewhere */
  band: React.CSSProperties;
  /** The docked FOOTPRINT, shown while the pointer is in the band */
  preview: React.CSSProperties;
  active: boolean;
}

/**
 * THE DRAG-TO-DOCK ZONES (the dockable panels' visuals, 2026-11-10 shared
 * with the toolbar drag — "we already have the visuals I want (see effect
 * panel drag behaviour)"): while something that can dock is dragged, the
 * candidate zones along the editor row's edges show a subtle dashed band;
 * the HOVERED zone previews the thing's actual docked footprint, so "drop
 * to dock here" also says exactly WHERE it will land. A fixed overlay that
 * takes no pointer.
 */
export function DockZoneOverlay({ bands }: { bands: ReadonlyArray<DockZoneBand> }) {
  if (bands.length === 0) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9500 }}>
      {bands.map(({ zone, band, preview, active }) => (
        <div
          key={zone}
          data-dock-zone={zone}
          data-active={active ? 'true' : 'false'}
          style={{
            position: 'fixed',
            ...(active ? preview : band),
            boxSizing: 'border-box',
            borderRadius: active ? 4 : 6,
            background: active ? 'rgba(103, 124, 228, 0.25)' : 'rgba(103, 124, 228, 0.08)',
            border: active ? '2px solid #677CE4' : '1px dashed rgba(103, 124, 228, 0.55)',
            transition: 'background 0.12s ease, border-color 0.12s ease, left 0.12s ease, top 0.12s ease, width 0.12s ease, height 0.12s ease',
          }}
        />
      ))}
    </div>
  );
}

/** The band along one side of a row, inset as the panels' bands are */
export function sideBand(rect: DOMRect, side: 'left' | 'right', inset = 4): React.CSSProperties {
  return side === 'left'
    ? { left: rect.left + inset, top: rect.top + inset, width: DOCK_ZONE_SIZE - inset * 2, height: rect.height - inset * 2 }
    : { left: rect.right - DOCK_ZONE_SIZE + inset, top: rect.top + inset, width: DOCK_ZONE_SIZE - inset * 2, height: rect.height - inset * 2 };
}

/** Is the point inside a row's side band? */
export function sideZoneAt(x: number, y: number, rect: DOMRect): 'left' | 'right' | null {
  if (y < rect.top || y > rect.bottom || x < rect.left || x > rect.right) return null;
  if (x <= rect.left + DOCK_ZONE_SIZE) return 'left';
  if (x >= rect.right - DOCK_ZONE_SIZE) return 'right';
  return null;
}

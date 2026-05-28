// MuseHub marketplace + installed-effects browser modal.
// Opens from the "Effects" button in the effects-panel header. One cohesive
// surface — manufacturer-first navigation for what you own, a one-click
// pivot to "Browse MuseHub" for marketplace discovery, and search that blends
// results across both.

import React, { useEffect, useMemo, useState } from 'react';
import './MarketplaceModal.css';

const POPOVER_WIDTH = 860;
const POPOVER_HEIGHT = 640;
const ANCHOR_GAP = 10;
const VIEWPORT_PAD = 16;

type Side = 'right' | 'left' | 'center';

function computePopoverPosition(rect: DOMRect | null | undefined): {
  style: React.CSSProperties;
  side: Side;
  arrowTop: number | null;
} {
  if (!rect) {
    return {
      style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
      side: 'center',
      arrowTop: null,
    };
  }
  const { innerWidth, innerHeight } = window;

  const spaceRight = innerWidth - rect.right - ANCHOR_GAP;
  const placeRight = spaceRight >= POPOVER_WIDTH + VIEWPORT_PAD;
  const side: Side = placeRight ? 'right' : 'left';
  const left = placeRight
    ? rect.right + ANCHOR_GAP
    : Math.max(VIEWPORT_PAD, rect.left - ANCHOR_GAP - POPOVER_WIDTH);

  // Position the popover so the arrow lands well below its top edge — that
  // way the flyout feels like it's hanging off the button (not jumping the
  // user up to the top-left corner). We aim for the arrow about a fifth of
  // the way down the popover.
  const anchorCenter = rect.top + rect.height / 2;
  const desiredArrowOffset = Math.min(POPOVER_HEIGHT * 0.2, 140);
  let top = anchorCenter - desiredArrowOffset;
  // Clamp so the popover stays inside the viewport.
  if (top + POPOVER_HEIGHT + VIEWPORT_PAD > innerHeight) {
    top = innerHeight - POPOVER_HEIGHT - VIEWPORT_PAD;
  }
  if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;

  const arrowTop = Math.max(20, Math.min(POPOVER_HEIGHT - 20, anchorCenter - top));

  return {
    style: { left: `${left}px`, top: `${top}px`, transform: 'none' },
    side,
    arrowTop,
  };
}

export type EffectCategory =
  | 'dynamics'
  | 'eq'
  | 'reverb'
  | 'delay'
  | 'modulation'
  | 'distortion'
  | 'mastering';

export interface MarketplaceEffect {
  id: string;
  name: string;
  vendor: string;
  category: EffectCategory;
  installed: boolean;
  /** Price in USD. Only set when installed === false. */
  price?: number;
  /** Optional accent colour for marketplace artwork. */
  color: string;
  /** Tagline shown in the detail view. */
  blurb?: string;
}

const CATALOG: MarketplaceEffect[] = [
  // Installed (free / built-in)
  { id: 'compressor',  name: 'Compressor', vendor: 'Audacity', category: 'dynamics',   installed: true, color: '#3B82F6', blurb: 'Classic VCA-style dynamics' },
  { id: 'eq-graphic',  name: 'Graphic EQ', vendor: 'Audacity', category: 'eq',         installed: true, color: '#10B981', blurb: '7-band graphic EQ' },
  { id: 'reverb',      name: 'Reverb',     vendor: 'Audacity', category: 'reverb',     installed: true, color: '#8B5CF6', blurb: 'Plate, hall, room presets' },
  { id: 'echo',        name: 'Echo',       vendor: 'Audacity', category: 'delay',      installed: true, color: '#F59E0B', blurb: 'Tape-style delay' },
  { id: 'limiter',     name: 'Limiter',    vendor: 'Audacity', category: 'dynamics',   installed: true, color: '#EF4444', blurb: 'Brick-wall limiter' },
  { id: 'gate',        name: 'Noise Gate', vendor: 'Audacity', category: 'dynamics',   installed: true, color: '#0EA5E9', blurb: 'Dialogue + drum gating' },
  { id: 'distortion',  name: 'Distortion', vendor: 'Audacity', category: 'distortion', installed: true, color: '#DB2777', blurb: 'Tube + tape saturation' },

  // MuseHub marketplace
  { id: 'pro-q4',      name: 'Pro-Q 4',         vendor: 'FabFilter',       category: 'eq',         installed: false, price: 179, color: '#F97316', blurb: '24-band dynamic EQ' },
  { id: 'pro-l2',      name: 'Pro-L 2',         vendor: 'FabFilter',       category: 'mastering',  installed: false, price: 199, color: '#22D3EE', blurb: 'Transparent mastering limiter' },
  { id: 'vintageverb', name: 'VintageVerb',     vendor: 'Valhalla DSP',    category: 'reverb',     installed: false, price: 50,  color: '#A855F7', blurb: 'Lush 70s/80s reverb' },
  { id: 'shimmer',     name: 'Shimmer',         vendor: 'Valhalla DSP',    category: 'reverb',     installed: false, price: 50,  color: '#6366F1', blurb: 'Ethereal pitch-shift reverb' },
  { id: 'echoboy',     name: 'EchoBoy',         vendor: 'Soundtoys',       category: 'delay',      installed: false, price: 199, color: '#FBBF24', blurb: 'Tape, analog & dub delays' },
  { id: 'decapitator', name: 'Decapitator',     vendor: 'Soundtoys',       category: 'distortion', installed: false, price: 199, color: '#7C2D12', blurb: 'Analog saturation modeler' },
  { id: 'tremolator',  name: 'Tremolator',      vendor: 'Soundtoys',       category: 'modulation', installed: false, price: 99,  color: '#EC4899', blurb: 'Rhythm-locked tremolo' },
  { id: 'cla-76',      name: 'CLA-76',          vendor: 'Waves',           category: 'dynamics',   installed: false, price: 49,  color: '#1F2937', blurb: 'Iconic FET compressor' },
  { id: 'h-delay',     name: 'H-Delay',         vendor: 'Waves',           category: 'delay',      installed: false, price: 49,  color: '#0F766E', blurb: 'Hybrid analog/digital delay' },
  { id: 'rx-11',       name: 'RX 11 Standard',  vendor: 'iZotope',         category: 'mastering',  installed: false, price: 399, color: '#14B8A6', blurb: 'Audio repair suite' },
  { id: 'maag-eq4',    name: 'Maag EQ4',        vendor: 'Plugin Alliance', category: 'eq',         installed: false, price: 129, color: '#EAB308', blurb: 'Air-band EQ classic' },
  { id: 'pultec',      name: 'Pultec EQP-1A',   vendor: 'UAD',             category: 'mastering',  installed: false, price: 299, color: '#92400E', blurb: 'Tube program EQ' },
];

type ViewMode = 'tile' | 'list';

export interface MarketplaceModalProps {
  open: boolean;
  /** Friendly name of the destination — "Vocals", "Master track", etc. */
  destinationName: string;
  /** Bounding rect of the trigger button — the popover anchors to it. */
  anchorRect?: DOMRect | null;
  /** 'add' appends a new slot; 'replace' swaps the slot the user opened from. */
  mode?: 'add' | 'replace';
  /** The effect currently in the slot being replaced — used to mark the
   *  matching row with a "Current" badge so the user can see which effect
   *  they're replacing (especially helpful when names collide). */
  currentEffect?: { id: string; name: string } | null;
  onClose: () => void;
  /** Add a built-in or already-installed effect to the destination stack. */
  onAddEffect: (effect: MarketplaceEffect) => void;
  /** Begin purchase / install flow for a marketplace effect. */
  onPurchase?: (effect: MarketplaceEffect) => void;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  open,
  destinationName,
  anchorRect,
  mode = 'add',
  currentEffect = null,
  onClose,
  onAddEffect,
  onPurchase,
}) => {
  const [manufacturer, setManufacturer] = useState<string>('All');
  // The library section is always a list (utility-style); only the MuseHub
  // section has a tile/list toggle so power users can flip the marketplace
  // into dense rows too.
  const [marketplaceView, setMarketplaceView] = useState<ViewMode>('tile');
  const [search, setSearch] = useState('');
  // Single-click on a library row is terminal (matches the old context-menu
  // speed of "press effect → it's added"). Marketplace items always require
  // going through the detail view first so we never accidentally charge a card.
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [openEditorAfterAdd, setOpenEditorAfterAdd] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Manufacturers list pulled from the full catalog — installed and
  // marketplace items live in the same rail, distinguished only by their
  // per-item badge, so MuseHub never reads as a separate "store tab".
  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    for (const e of CATALOG) set.add(e.vendor);
    return ['All', ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return CATALOG.filter((e) => {
      if (manufacturer !== 'All' && e.vendor !== manufacturer) return false;
      if (!term) return true;
      return (
        e.name.toLowerCase().includes(term) ||
        e.vendor.toLowerCase().includes(term) ||
        (e.blurb ?? '').toLowerCase().includes(term)
      );
    });
  }, [manufacturer, search]);

  // Split results into "your library" and "marketplace" sections so users
  // can't accidentally click "Add" on a paid effect, even though they share
  // a single view.
  const { installedHits, marketplaceHits } = useMemo(() => {
    const installed: MarketplaceEffect[] = [];
    const marketplace: MarketplaceEffect[] = [];
    for (const e of filtered) {
      if (e.installed) installed.push(e);
      else marketplace.push(e);
    }
    return { installedHits: installed, marketplaceHits: marketplace };
  }, [filtered]);

  const detail = detailId ? CATALOG.find((e) => e.id === detailId) ?? null : null;

  // Library rows are single-click terminal (add + close). Marketplace rows
  // route to details so users never accidentally trigger a purchase.
  const handleRowClick = (effect: MarketplaceEffect) => {
    if (effect.installed) {
      onAddEffect(effect);
    } else {
      setDetailId(effect.id);
    }
  };

  // Close on Escape, since the lighter scrim no longer feels like a hard
  // modal — keyboard dismissal is the obvious affordance.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const { style: popoverStyle, side, arrowTop } = computePopoverPosition(anchorRect);

  return (
    <div
      className="mp-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`mp-modal mp-modal--${side}`}
        role="dialog"
        aria-modal="true"
        aria-label="Browse effects"
        style={popoverStyle}
      >
        {arrowTop !== null && (
          <span
            className={`mp-arrow mp-arrow--${side}`}
            style={{ top: arrowTop }}
            aria-hidden="true"
          />
        )}
        <header className="mp-header">
          <div className="mp-header__title">
            <h2>Effects</h2>
            <p className="mp-header__destination">
              {mode === 'replace' ? 'Replacing in' : 'Adding to'} <strong>{destinationName}</strong>
            </p>
          </div>
          <div className="mp-header__search">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search installed effects + MuseHub"
              autoFocus
            />
          </div>
          <button className="mp-header__close" type="button" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="mp-body">
          <aside className="mp-sidebar">
            <div className="mp-sidebar__section-title">Manufacturers</div>
            <div className="mp-sidebar__list">
              {manufacturers.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`mp-sidebar__tab ${manufacturer === m ? 'mp-sidebar__tab--active' : ''}`}
                  onClick={() => setManufacturer(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </aside>

          <main className="mp-grid-wrap">
            {filtered.length === 0 ? (
              <div className="mp-empty">
                <p>
                  {search.trim()
                    ? `No effects match “${search}”.`
                    : 'No effects in this view.'}
                </p>
                {search.trim() && (
                  <button onClick={() => setSearch('')} type="button" className="mp-empty__reset">
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                {installedHits.length > 0 && (
                  <section className="mp-section mp-section--library">
                    <h3 className="mp-section__title">
                      <span>Your library</span>
                      <span className="mp-section__count">{installedHits.length}</span>
                    </h3>
                    <ul className="mp-list mp-list--embedded" role="listbox" aria-label="Your library">
                      {installedHits.map((effect) => (
                        <EffectListRow
                          key={effect.id}
                          effect={effect}
                          favorite={favorites.has(effect.id)}
                          isCurrent={currentEffect?.id === effect.id}
                          onActivate={() => handleRowClick(effect)}
                          onDetails={() => setDetailId(effect.id)}
                          onToggleFavorite={() => toggleFavorite(effect.id)}
                        />
                      ))}
                    </ul>
                  </section>
                )}
                {marketplaceHits.length > 0 && (
                  <section className="mp-section mp-section--marketplace">
                    <h3 className="mp-section__title">
                      <span>From MuseHub</span>
                      <span className="mp-section__count">{marketplaceHits.length}</span>
                      <div className="mp-view-toggle" role="group" aria-label="Marketplace view mode">
                        <button
                          type="button"
                          className={`mp-view-btn ${marketplaceView === 'tile' ? 'mp-view-btn--active' : ''}`}
                          onClick={() => setMarketplaceView('tile')}
                          aria-pressed={marketplaceView === 'tile'}
                          aria-label="Tile view"
                          title="Tile view"
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
                            <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
                            <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
                            <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
                            <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`mp-view-btn ${marketplaceView === 'list' ? 'mp-view-btn--active' : ''}`}
                          onClick={() => setMarketplaceView('list')}
                          aria-pressed={marketplaceView === 'list'}
                          aria-label="List view"
                          title="List view"
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
                            <rect x="1" y="2" width="12" height="1.6" rx="0.5" fill="currentColor" />
                            <rect x="1" y="6.2" width="12" height="1.6" rx="0.5" fill="currentColor" />
                            <rect x="1" y="10.4" width="12" height="1.6" rx="0.5" fill="currentColor" />
                          </svg>
                        </button>
                      </div>
                    </h3>
                    {marketplaceView === 'tile' ? (
                      <div className="mp-grid">
                        {marketplaceHits.map((effect) => (
                          <EffectCard
                            key={effect.id}
                            effect={effect}
                            favorite={favorites.has(effect.id)}
                            isCurrent={currentEffect?.id === effect.id}
                            onActivate={() => handleRowClick(effect)}
                            onDetails={() => setDetailId(effect.id)}
                            onToggleFavorite={() => toggleFavorite(effect.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <ul className="mp-list mp-list--embedded" role="listbox" aria-label="From MuseHub">
                        {marketplaceHits.map((effect) => (
                          <EffectListRow
                            key={effect.id}
                            effect={effect}
                            favorite={favorites.has(effect.id)}
                            isCurrent={currentEffect?.id === effect.id}
                            onActivate={() => handleRowClick(effect)}
                            onDetails={() => setDetailId(effect.id)}
                            onToggleFavorite={() => toggleFavorite(effect.id)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </>
            )}
          </main>
        </div>

        <footer className="mp-footer">
          <label className="mp-footer__check">
            <input
              type="checkbox"
              checked={openEditorAfterAdd}
              onChange={(e) => setOpenEditorAfterAdd(e.target.checked)}
            />
            <span>Open plugin editor automatically</span>
          </label>
        </footer>

        {detail && (
          <EffectDetail
            effect={detail}
            destinationName={destinationName}
            onClose={() => setDetailId(null)}
            onAddEffect={() => {
              onAddEffect(detail);
              setDetailId(null);
            }}
            onPurchase={() => {
              onPurchase?.(detail);
              setDetailId(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

const CategoryGlyph: React.FC<{ category: EffectCategory }> = ({ category }) => {
  // Tiny stylised glyphs that hint at each category — used in lieu of vendor
  // art on built-in effect tiles.
  const stroke = 'rgba(255,255,255,0.45)';
  const dot = 'rgba(255,255,255,0.6)';
  const common = { fill: 'none', stroke, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="mp-card__glyph">
      {category === 'dynamics' && (
        <>
          <path d="M6 26 L14 26 L18 18 L22 26 L34 26" {...common} />
          <circle cx="18" cy="18" r="1.6" fill={dot} />
        </>
      )}
      {category === 'eq' && (
        <>
          <path d="M6 26 Q14 26 16 18 Q18 10 22 18 Q26 26 34 22" {...common} />
        </>
      )}
      {category === 'reverb' && (
        <>
          <path d="M6 20 Q12 14 18 20 Q24 26 30 20" {...common} />
          <path d="M10 26 Q14 22 18 26 Q22 30 26 26" {...common} opacity="0.6" />
        </>
      )}
      {category === 'delay' && (
        <>
          <circle cx="8" cy="22" r="2" fill={dot} />
          <circle cx="16" cy="22" r="1.6" fill={dot} opacity="0.65" />
          <circle cx="24" cy="22" r="1.2" fill={dot} opacity="0.4" />
          <circle cx="32" cy="22" r="0.9" fill={dot} opacity="0.25" />
        </>
      )}
      {category === 'modulation' && (
        <>
          <path d="M6 22 Q12 12 18 22 T30 22 L34 22" {...common} />
        </>
      )}
      {category === 'distortion' && (
        <>
          <path d="M6 22 L10 22 L10 12 L18 12 L18 30 L26 30 L26 14 L30 14 L34 14" {...common} />
        </>
      )}
      {category === 'mastering' && (
        <>
          <rect x="8" y="14" width="4" height="14" rx="1" {...common} />
          <rect x="16" y="10" width="4" height="18" rx="1" {...common} />
          <rect x="24" y="18" width="4" height="10" rx="1" {...common} />
        </>
      )}
    </svg>
  );
};

const EffectCard: React.FC<{
  effect: MarketplaceEffect;
  favorite: boolean;
  isCurrent?: boolean;
  onActivate: () => void;
  onDetails: () => void;
  onToggleFavorite: () => void;
}> = ({ effect, favorite, isCurrent = false, onActivate, onDetails, onToggleFavorite }) => {
  // Built-ins don't have real artwork — render a flat tile with a category
  // glyph so they read as utilitarian tools, not branded products. Marketplace
  // items keep the rich vendor-coloured gradient.
  const builtIn = effect.installed && effect.vendor === 'Audacity';
  const artBackground = builtIn ? '#1F2530' : gradientFor(effect.color);

  return (
    <article
      className={`mp-card ${isCurrent ? 'mp-card--current' : ''}`}
      onClick={onActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <button
        type="button"
        className={`mp-card__art ${builtIn ? 'mp-card__art--builtin' : ''}`}
        style={{ background: artBackground }}
        onClick={(e) => {
          e.stopPropagation();
          onDetails();
        }}
        aria-label={`${effect.name} details`}
      >
        {builtIn ? (
          <CategoryGlyph category={effect.category} />
        ) : (
          <span className="mp-card__initials" aria-hidden="true">
            {initials(effect.vendor)}
          </span>
        )}
        {isCurrent ? (
          <span className="mp-card__tag mp-card__tag--current">Current</span>
        ) : (
          <span
            className={`mp-card__tag ${effect.installed ? 'mp-card__tag--installed' : 'mp-card__tag--price'}`}
          >
            {effect.installed ? 'Installed' : `$${effect.price}`}
          </span>
        )}
        <button
          type="button"
          className={`mp-card__star ${favorite ? 'mp-card__star--on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={favorite ? 'Unfavorite' : 'Favorite'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M7 1l1.8 3.7 4.1.6-3 2.9.7 4.1L7 10.4 3.4 12.3l.7-4.1-3-2.9 4.1-.6L7 1z"
              fill={favorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </button>
      <div className="mp-card__meta">
        <div className="mp-card__text">
          <div className="mp-card__name" title={effect.name}>{effect.name}</div>
          <div className="mp-card__vendor">{effect.vendor}</div>
        </div>
      </div>
    </article>
  );
};

const EffectListRow: React.FC<{
  effect: MarketplaceEffect;
  favorite: boolean;
  isCurrent?: boolean;
  onActivate: () => void;
  onDetails: () => void;
  onToggleFavorite: () => void;
}> = ({ effect, favorite, isCurrent = false, onActivate, onDetails, onToggleFavorite }) => {
  return (
    <li
      role="button"
      className={`mp-row ${isCurrent ? 'mp-row--current' : ''}`}
      onClick={onActivate}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <button
        type="button"
        className={`mp-row__star ${favorite ? 'mp-row__star--on' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={favorite ? 'Unfavorite' : 'Favorite'}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M7 1l1.8 3.7 4.1.6-3 2.9.7 4.1L7 10.4 3.4 12.3l.7-4.1-3-2.9 4.1-.6L7 1z"
            fill={favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className="mp-row__name">
        {isCurrent && (
          <svg className="mp-row__check" width="12" height="12" viewBox="0 0 12 12" aria-label="Current effect">
            <path d="M2 6.5L5 9.5L10 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {effect.name}
      </span>
      <span className="mp-row__vendor">{effect.vendor}</span>
      <span className={`mp-row__tag ${isCurrent ? 'mp-row__tag--current' : effect.installed ? 'mp-row__tag--installed' : 'mp-row__tag--price'}`}>
        {isCurrent ? 'Current' : effect.installed ? 'Installed' : `$${effect.price}`}
      </span>
      <button
        type="button"
        className="mp-row__info"
        onClick={(e) => {
          e.stopPropagation();
          onDetails();
        }}
        aria-label="Effect details"
        title="Details"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="7" cy="4.2" r="0.8" fill="currentColor" />
          <rect x="6.4" y="6" width="1.2" height="4.4" rx="0.4" fill="currentColor" />
        </svg>
      </button>
    </li>
  );
};

const EffectDetail: React.FC<{
  effect: MarketplaceEffect;
  destinationName: string;
  onClose: () => void;
  onAddEffect: () => void;
  onPurchase: () => void;
}> = ({ effect, destinationName, onClose, onAddEffect, onPurchase }) => {
  return (
    <div className="mp-detail" role="dialog" aria-modal="true" aria-label={`${effect.name} details`}>
      <button className="mp-detail__close" type="button" onClick={onClose} aria-label="Back">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Back</span>
      </button>
      <div className="mp-detail__art" style={{ background: gradientFor(effect.color) }}>
        <span aria-hidden="true">{initials(effect.vendor)}</span>
      </div>
      <div className="mp-detail__body">
        <div className="mp-detail__heading">
          <h3>{effect.name}</h3>
          <p>{effect.vendor}</p>
        </div>
        <p className="mp-detail__blurb">{effect.blurb}</p>
        <ul className="mp-detail__bullets">
          <li>Adapts to your sample rate and channel count automatically</li>
          <li>Includes 30+ presets and a tutorial walkthrough</li>
          <li>One licence covers all your devices on a single MuseHub account</li>
        </ul>
        <div className="mp-detail__cta-row">
          {effect.installed ? (
            <button className="mp-detail__cta mp-detail__cta--primary" onClick={onAddEffect} type="button">
              Add to {destinationName}
            </button>
          ) : (
            <>
              <button className="mp-detail__cta mp-detail__cta--primary" onClick={onPurchase} type="button">
                Get for ${effect.price}
              </button>
              <button className="mp-detail__cta mp-detail__cta--ghost" type="button">
                Try for 7 days
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function gradientFor(color: string) {
  return `linear-gradient(135deg, ${color} 0%, ${shade(color, -30)} 100%)`;
}

function initials(vendor: string): string {
  return vendor
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function shade(hex: string, percent: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0xff) + Math.round((percent / 100) * 255);
  let b = (num & 0xff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default MarketplaceModal;

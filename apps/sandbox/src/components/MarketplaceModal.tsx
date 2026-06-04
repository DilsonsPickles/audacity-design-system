// MuseHub marketplace modal. Opens centred on the viewport, draggable by its
// header and resizable from the corners.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MuseWallet } from './wallet/MuseWallet';
import { UserMenu } from './wallet/UserMenu';
import { SignInRequiredPrompt } from './wallet/SignInRequiredPrompt';
import { useSignedIn, useMuseHub } from '../contexts/MuseHubContext';
import { getPlugins, type MuseHubPlugin } from '../lib/musehub-client';
import './MarketplaceModal.css';

const DEFAULT_WIDTH = 920;
const DEFAULT_HEIGHT = 640;
const VIEWPORT_PAD = 16;

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

// Fallback used when the moose-hub backend is unreachable (offline dev). The
// real catalog is fetched on first modal open and cached at module scope.
const CATALOG_FALLBACK: MarketplaceEffect[] = [
  // MuseHub marketplace — a spread of price tiers so the wallet/purchase flow
  // is demoable from a modest starting balance. Audacity's built-in effects
  // are excluded from the catalog since they're shipped with the app and live
  // in the picker context menu.
  { id: 'tape-warmer', name: 'Tape Warmer',     vendor: 'Klanghelm',       category: 'distortion', installed: false, price: 4.99,  color: '#D97706', blurb: 'Subtle analog tape saturation' },
  { id: 'mini-comp',   name: 'MiniComp',        vendor: 'Klanghelm',       category: 'dynamics',   installed: false, price: 6.99,  color: '#475569', blurb: 'One-knob bus compressor' },
  { id: 'roomy',       name: 'Roomy',           vendor: 'Goodhertz',       category: 'reverb',     installed: false, price: 9.99,  color: '#0EA5E9', blurb: 'Small-room ambience' },
  { id: 'slap-delay',  name: 'Slap Delay',      vendor: 'Goodhertz',       category: 'delay',      installed: false, price: 12.0,  color: '#22D3EE', blurb: 'Vintage-style slapback echo' },
  { id: 'wobbler',     name: 'Wobbler',         vendor: 'Klevgrand',       category: 'modulation', installed: false, price: 14.0,  color: '#EC4899', blurb: 'Chorus + vibrato pedal in a box' },
  { id: 'air-eq',      name: 'Air EQ',          vendor: 'Klevgrand',       category: 'eq',         installed: false, price: 19.0,  color: '#84CC16', blurb: 'Top-end sheen EQ' },
  { id: 'cla-76',      name: 'CLA-76',          vendor: 'Waves',           category: 'dynamics',   installed: false, price: 29.0,  color: '#1F2937', blurb: 'Iconic FET compressor' },
  { id: 'h-delay',     name: 'H-Delay',         vendor: 'Waves',           category: 'delay',      installed: false, price: 29.0,  color: '#0F766E', blurb: 'Hybrid analog/digital delay' },
  { id: 'vintageverb', name: 'VintageVerb',     vendor: 'Valhalla DSP',    category: 'reverb',     installed: false, price: 50.0,  color: '#A855F7', blurb: 'Lush 70s/80s reverb' },
  { id: 'shimmer',     name: 'Shimmer',         vendor: 'Valhalla DSP',    category: 'reverb',     installed: false, price: 50.0,  color: '#6366F1', blurb: 'Ethereal pitch-shift reverb' },
  { id: 'tremolator',  name: 'Tremolator',      vendor: 'Soundtoys',       category: 'modulation', installed: false, price: 99.0,  color: '#EC4899', blurb: 'Rhythm-locked tremolo' },
  { id: 'maag-eq4',    name: 'Maag EQ4',        vendor: 'Plugin Alliance', category: 'eq',         installed: false, price: 129.0, color: '#EAB308', blurb: 'Air-band EQ classic' },
  { id: 'pro-q4',      name: 'Pro-Q 4',         vendor: 'FabFilter',       category: 'eq',         installed: false, price: 179.0, color: '#F97316', blurb: '24-band dynamic EQ' },
  { id: 'pro-l2',      name: 'Pro-L 2',         vendor: 'FabFilter',       category: 'mastering',  installed: false, price: 199.0, color: '#22D3EE', blurb: 'Transparent mastering limiter' },
  { id: 'decapitator', name: 'Decapitator',     vendor: 'Soundtoys',       category: 'distortion', installed: false, price: 199.0, color: '#7C2D12', blurb: 'Analog saturation modeler' },
  { id: 'echoboy',     name: 'EchoBoy',         vendor: 'Soundtoys',       category: 'delay',      installed: false, price: 199.0, color: '#FBBF24', blurb: 'Tape, analog & dub delays' },
  { id: 'pultec',      name: 'Pultec EQP-1A',   vendor: 'UAD',             category: 'mastering',  installed: false, price: 299.0, color: '#92400E', blurb: 'Tube program EQ' },
  { id: 'rx-11',       name: 'RX 11 Standard',  vendor: 'iZotope',         category: 'mastering',  installed: false, price: 399.0, color: '#14B8A6', blurb: 'Audio repair suite' },
];

// Fallback colour for server entries that don't ship one. The marketplace
// tile rendering requires a colour so we never hand it `undefined`.
const DEFAULT_TILE_COLOR = '#475569';

function toMarketplaceEffect(p: MuseHubPlugin): MarketplaceEffect {
  return {
    id: p.id,
    name: p.name,
    vendor: p.vendor,
    category: p.category as EffectCategory,
    // Server doesn't track local install state — derived client-side from
    // purchasedIds + uninstalledIds in the useMemo below.
    installed: false,
    price: p.priceCents / 100,
    color: p.color ?? DEFAULT_TILE_COLOR,
    blurb: p.blurb,
  };
}

// Module-scope cache so re-opening the modal doesn't re-fetch.
let catalogCache: MarketplaceEffect[] | null = null;

async function fetchCatalog(): Promise<MarketplaceEffect[]> {
  if (catalogCache) return catalogCache;
  try {
    const { plugins } = await getPlugins();
    catalogCache = plugins.map(toMarketplaceEffect);
    return catalogCache;
  } catch {
    // Server unreachable — fall back to the hardcoded catalog so the modal
    // is still demoable offline. We don't cache this so a later open can
    // try the network again.
    return CATALOG_FALLBACK;
  }
}

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
  /** Effects the user has purchased this session (overrides `installed:false`
   *  in the catalog so freshly bought items immediately appear in the library). */
  purchasedIds?: Set<string>;
  onClose: () => void;
  /** Add a built-in or already-installed effect to the destination stack. */
  onAddEffect: (effect: MarketplaceEffect) => void;
  /** Confirmed purchase of a marketplace effect. Deduct from wallet and
   *  mark the effect as installed in the host's catalog. */
  onPurchase?: (effect: MarketplaceEffect) => void;
  /** Optional callback to open the global Plugin Manager dialog — surfaced
   *  as a link from the Owned view so users can manage installs there. */
  onOpenPluginManager?: () => void;
  /** Uninstall a previously-purchased effect (remove the local install but
   *  keep the entitlement so the user can reinstall for free later). */
  onUninstallEffect?: (effect: MarketplaceEffect) => void;
  /** Reinstall an uninstalled effect — entitlement is preserved. */
  onReinstallEffect?: (effect: MarketplaceEffect) => void;
  /** Effects the user owns but has uninstalled locally — the marketplace
   *  shows these as "Reinstall" instead of "Installed". */
  uninstalledIds?: Set<string>;
  /** Effects mid-install — the Owned row renders a progress indicator
   *  instead of action buttons, and pickers skip them. */
  installingIds?: Set<string>;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  open,
  destinationName,
  currentEffect = null,
  purchasedIds,
  onClose,
  onAddEffect,
  onPurchase,
  onOpenPluginManager,
  onUninstallEffect,
  onReinstallEffect,
  uninstalledIds,
  installingIds,
}) => {
  const [manufacturer, setManufacturer] = useState<string>('All');
  // The library section is always a list (utility-style); only the MuseHub
  // section has a tile/list toggle so power users can flip the marketplace
  // into dense rows too.
  const [marketplaceView, setMarketplaceView] = useState<ViewMode>('tile');
  // Primary view — Marketplace shows the full catalogue, Owned narrows to
  // effects the user already has so they can browse just their library.
  const [view, setView] = useState<'marketplace' | 'owned'>('marketplace');
  const [search, setSearch] = useState('');
  // Single-click on a library row is terminal (matches the old context-menu
  // speed of "press effect → it's added"). Marketplace items always require
  // going through the detail view first so we never accidentally charge a card.
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [openEditorAfterAdd, setOpenEditorAfterAdd] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  // When set, the unified purchase modal opens over everything. It owns the
  // sign-in → confirm → success flow internally.
  const [signInGate, setSignInGate] = useState<string | null>(null);
  const signedIn = useSignedIn();
  const {
    activeInstall,
    pauseActiveInstall,
    resumeActiveInstall,
    cancelActiveInstall,
    installerWizardEffect,
  } = useMuseHub();
  // Footer band is only the download progress. When the download finishes
  // the installer wizard pops automatically and takes over the screen, so
  // the footer hides without any user action in between.
  const showInstallToast =
    activeInstall &&
    !installerWizardEffect &&
    activeInstall.phase === 'downloading';

  // If the user signs out while the Owned tab is active (or opens the modal
  // already signed out with a stale view), snap back to Marketplace — Owned
  // is hidden in the tab strip and "owned" would silently filter everything
  // out otherwise.
  useEffect(() => {
    if (!signedIn) setView((v) => (v === 'owned' ? 'marketplace' : v));
  }, [signedIn]);

  // "Uninstalled" only means anything if the user is signed in AND still owns
  // the effect on the server. Without ownership we shouldn't surface an
  // "Install" button — that would let a signed-out (or post-refund) user
  // re-add an effect they don't have a current entitlement to.
  const isUninstalled = React.useCallback(
    (id: string) =>
      signedIn &&
      (purchasedIds?.has(id) ?? false) &&
      (uninstalledIds?.has(id) ?? false),
    [signedIn, purchasedIds, uninstalledIds],
  );

  // Live catalog from moose-hub, falling back to the hardcoded list for
  // offline dev. Fetched on first modal open and reused thereafter.
  const [catalogSource, setCatalogSource] = useState<MarketplaceEffect[]>(
    () => catalogCache ?? CATALOG_FALLBACK,
  );
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchCatalog().then((next) => {
      if (!cancelled) setCatalogSource(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Overlay session purchases onto the static catalog so freshly bought
  // effects immediately read as "installed" — unless the user has since
  // uninstalled them, in which case they go back to "Reinstall" affordances.
  const catalog = useMemo(() => {
    if ((!purchasedIds || purchasedIds.size === 0) && (!uninstalledIds || uninstalledIds.size === 0)) {
      return catalogSource;
    }
    return catalogSource.map((e) => {
      const purchased = purchasedIds?.has(e.id) ?? false;
      const uninstalled = uninstalledIds?.has(e.id) ?? false;
      if (!purchased) return e;
      // Owned + uninstalled is still "installed: false" from the picker's
      // perspective (it shouldn't show in playable lists), but downstream
      // logic uses purchasedIds + uninstalledIds to render Reinstall.
      return { ...e, installed: !uninstalled };
    });
  }, [catalogSource, purchasedIds, uninstalledIds]);

  // Manufacturers list pulled from the full catalog — installed and
  // marketplace items live in the same rail, distinguished only by their
  // per-item badge, so MuseHub never reads as a separate "store tab".
  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    for (const e of catalog) set.add(e.vendor);
    return ['All', ...Array.from(set).sort()];
  }, [catalog]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((e) => {
      // Owned view = anything the user has an entitlement for, including
      // items they've uninstalled locally.
      const owned = purchasedIds?.has(e.id) ?? false;
      if (view === 'owned' && !owned) return false;
      if (manufacturer !== 'All' && e.vendor !== manufacturer) return false;
      if (!term) return true;
      return (
        e.name.toLowerCase().includes(term) ||
        e.vendor.toLowerCase().includes(term) ||
        (e.blurb ?? '').toLowerCase().includes(term)
      );
    });
  }, [catalog, view, manufacturer, search, purchasedIds]);

  // Number of effects the user owns — shown next to the Owned tab.
  const ownedCount = useMemo(
    () => (purchasedIds ? purchasedIds.size : 0),
    [purchasedIds],
  );

  // Modal is marketplace-only now — installed effects live in the picker
  // context menu invoked from the "Effects" button. We still allow installed
  // items to surface in search so users can confirm they already own
  // something before reaching for their card.
  const marketplaceHits = filtered;

  const detail = detailId ? catalog.find((e) => e.id === detailId) ?? null : null;

  // Tiles and rows always open the store page now — clicking through to
  // detail lets the user read the description / watch a tutorial / hit the
  // "Add to {destination}" CTA from the hero. For installed effects, the
  // shortcut to add lives in the picker context menu instead.
  const handleRowClick = (effect: MarketplaceEffect) => {
    setDetailId(effect.id);
  };

  // Price-chip click shortcut: open the unified purchase modal. The same
  // modal handles both signed-in (confirm) and signed-out (sign-in first)
  // paths, so we never detour through the store page just to buy.
  const handleBuyClick = (effect: MarketplaceEffect) => {
    if (effect.installed) return;
    setSignInGate(effect.id);
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

  return (
    <div
      className="mp-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <DraggableModal>
        <header className="mp-header" data-mp-drag-handle>
          <div className="mp-header__title">
            <h2>MuseHub</h2>
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
              placeholder="Search MuseHub"
              autoFocus
            />
            {search && (
              <button
                type="button"
                className="mp-header__search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                title="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <MuseWallet />
          {signedIn && <UserMenu />}
          <button className="mp-header__close" type="button" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="mp-body">
          <aside className="mp-sidebar">
            {signedIn && (
              <div
                className="mp-sidebar__segment"
                role="tablist"
                aria-label="Marketplace view"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'marketplace'}
                  className={`mp-sidebar__segment-tab ${view === 'marketplace' ? 'mp-sidebar__segment-tab--active' : ''}`}
                  onClick={() => setView('marketplace')}
                >
                  Marketplace
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'owned'}
                  className={`mp-sidebar__segment-tab ${view === 'owned' ? 'mp-sidebar__segment-tab--active' : ''}`}
                  onClick={() => setView('owned')}
                >
                  <span>Owned</span>
                  {ownedCount > 0 && <span className="mp-sidebar__segment-count">{ownedCount}</span>}
                </button>
              </div>
            )}
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

          <main className="mp-main">
            <div className="mp-grid-wrap">
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
                {marketplaceHits.length > 0 && (
                  <section className="mp-section mp-section--marketplace">
                    <h3 className="mp-section__title">
                      <span>{view === 'owned' ? 'Your library' : 'From MuseHub'}</span>
                      <span className="mp-section__count">{marketplaceHits.length}</span>
                      {view === 'owned' && onOpenPluginManager && (
                        <button
                          type="button"
                          className="mp-section__link"
                          onClick={onOpenPluginManager}
                        >
                          Open in Plugin Manager
                          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                            <path d="M5 2h5v5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 2L5 7" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 7v3H2V4h3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                      <div
                        className="mp-view-toggle"
                        role="group"
                        aria-label="Marketplace view mode"
                        style={view === 'owned' ? { display: 'none' } : undefined}
                      >
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
                    {/* Owned view is a management surface — force list mode
                        regardless of the tile/list toggle. */}
                    {view === 'marketplace' && marketplaceView === 'tile' ? (
                      <div className="mp-grid">
                        {marketplaceHits.map((effect) => (
                          <EffectCard
                            key={effect.id}
                            effect={effect}
                            favorite={favorites.has(effect.id)}
                            isCurrent={currentEffect?.id === effect.id}
                            currentLocked={
                              currentEffect?.id === effect.id && !signedIn && !effect.installed
                            }
                            uninstalled={isUninstalled(effect.id)}
                            installing={installingIds?.has(effect.id) ?? false}
                            onActivate={() => handleRowClick(effect)}
                            onDetails={() => setDetailId(effect.id)}
                            onBuy={() => handleBuyClick(effect)}
                            onReinstall={() => onReinstallEffect?.(effect)}
                            onToggleFavorite={() => toggleFavorite(effect.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <ul className="mp-list mp-list--embedded" role="listbox" aria-label={view === 'owned' ? 'Your library' : 'From MuseHub'}>
                        {marketplaceHits.map((effect) => (
                          <EffectListRow
                            key={effect.id}
                            effect={effect}
                            favorite={favorites.has(effect.id)}
                            isCurrent={currentEffect?.id === effect.id}
                            currentLocked={
                              currentEffect?.id === effect.id && !signedIn && !effect.installed
                            }
                            manage={view === 'owned'}
                            uninstalled={isUninstalled(effect.id)}
                            installing={installingIds?.has(effect.id) ?? false}
                            onActivate={() => handleRowClick(effect)}
                            onDetails={() => setDetailId(effect.id)}
                            onBuy={() => handleBuyClick(effect)}
                            onUninstall={() => onUninstallEffect?.(effect)}
                            onReinstall={() => onReinstallEffect?.(effect)}
                            onToggleFavorite={() => toggleFavorite(effect.id)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </>
            )}
            </div>
            {showInstallToast && activeInstall && (
              <div
                className="mp-install-toast"
                role="status"
                aria-live="polite"
                aria-label={`Downloading ${activeInstall.name}`}
              >
                <div className="mp-install-toast__label">
                  {activeInstall.paused ? 'Paused' : 'Downloading 1 Item…'}
                </div>
                <div className="mp-install-toast__bar" aria-hidden="true">
                  <div
                    className="mp-install-toast__bar-fill"
                    style={{ width: `${Math.round(activeInstall.progress * 100)}%` }}
                  />
                </div>
                <div className="mp-install-toast__actions">
                  <button
                    type="button"
                    className="mp-install-toast__btn"
                    onClick={activeInstall.paused ? resumeActiveInstall : pauseActiveInstall}
                    aria-label={activeInstall.paused ? 'Resume download' : 'Pause download'}
                    title={activeInstall.paused ? 'Resume' : 'Pause'}
                  >
                    {activeInstall.paused ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                        <path d="M2.5 1.5 L8 5 L2.5 8.5 Z" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                        <rect x="2.5" y="1.5" width="1.6" height="7" fill="currentColor" />
                        <rect x="5.9" y="1.5" width="1.6" height="7" fill="currentColor" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className="mp-install-toast__btn"
                    onClick={cancelActiveInstall}
                    aria-label="Cancel download"
                    title="Cancel"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                      <path d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
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
            uninstalled={isUninstalled(detail.id)}
            installing={installingIds?.has(detail.id) ?? false}
            onClose={() => setDetailId(null)}
            onAddEffect={() => {
              onAddEffect(detail);
              setDetailId(null);
            }}
            onBuy={() => handleBuyClick(detail)}
            onReinstall={() => onReinstallEffect?.(detail)}
          />
        )}

        {signInGate && (() => {
          const gatedEffect = catalog.find((e) => e.id === signInGate);
          if (!gatedEffect) return null;
          return (
            <SignInRequiredPrompt
              effect={gatedEffect}
              destinationName={destinationName}
              onCancel={() => setSignInGate(null)}
              onPurchase={() => {
                // Hand off to the host (debits the wallet + creates the
                // entitlement, then opens the installer wizard). Drop the
                // sign-in prompt right away so the wizard owns the screen
                // — the prompt's "Purchase complete" panel would just
                // stack behind the wizard.
                onPurchase?.(gatedEffect);
                setSignInGate(null);
              }}
              onAddAfterPurchase={() => {
                onAddEffect(gatedEffect);
                setSignInGate(null);
              }}
            />
          );
        })()}
      </DraggableModal>
    </div>
  );
};

/* ------------------------------------------------------------------------
 * DraggableModal — centres on first mount, lets the user drag by any element
 * marked [data-mp-drag-handle], and resizes from the bottom-right corner via
 * CSS `resize`.
 * ---------------------------------------------------------------------- */

const DraggableModal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Centre on mount (and on viewport resize, only if user hasn't moved yet).
  useEffect(() => {
    if (pos) return;
    const left = Math.max(VIEWPORT_PAD, (window.innerWidth - DEFAULT_WIDTH) / 2);
    const top = Math.max(VIEWPORT_PAD, (window.innerHeight - DEFAULT_HEIGHT) / 2);
    setPos({ left, top });
  }, [pos]);

  // Drag from the header (or anything marked with the drag-handle attribute).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't start a drag from interactive controls inside the header.
      if (target.closest('button, input, a, select, textarea, [role="button"], [role="menuitem"]')) {
        return;
      }
      if (!target.closest('[data-mp-drag-handle]')) return;

      const rect = el.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const maxLeft = window.innerWidth - rect.width - VIEWPORT_PAD;
        const maxTop = window.innerHeight - rect.height - VIEWPORT_PAD;
        setPos({
          left: Math.max(VIEWPORT_PAD, Math.min(maxLeft, startLeft + dx)),
          top: Math.max(VIEWPORT_PAD, Math.min(maxTop, startTop + dy)),
        });
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.userSelect = '';
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    el.addEventListener('mousedown', onMouseDown);
    return () => el.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div
      ref={ref}
      className="mp-modal mp-modal--floating"
      role="dialog"
      aria-modal="true"
      aria-label="MuseHub marketplace"
      style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
    >
      {children}
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
  /** Currently applied effect that the user can't actually use right now
   *  (signed out + non-built-in plugin). Surfaces as "Sign in to use"
   *  instead of "Current" so the badge tells the truth. */
  currentLocked?: boolean;
  /** Owned but not currently installed locally — show an Install button
   *  instead of the price chip. */
  uninstalled?: boolean;
  /** Mid-install — show a small "Installing…" indicator. */
  installing?: boolean;
  onActivate: () => void;
  onDetails: () => void;
  onBuy?: () => void;
  onReinstall?: () => void;
  onToggleFavorite: () => void;
}> = ({
  effect,
  favorite,
  isCurrent = false,
  currentLocked = false,
  uninstalled = false,
  installing = false,
  onActivate,
  onBuy,
  onReinstall,
  onToggleFavorite,
}) => {
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
      <div
        className={`mp-card__art ${builtIn ? 'mp-card__art--builtin' : ''}`}
        style={{ background: artBackground }}
        aria-hidden="true"
      >
        {builtIn ? (
          <CategoryGlyph category={effect.category} />
        ) : (
          <span className="mp-card__initials" aria-hidden="true">
            {initials(effect.vendor)}
          </span>
        )}
        {isCurrent ? (
          <span
            className={`mp-card__tag mp-card__tag--current${currentLocked ? ' mp-card__tag--current-locked' : ''}`}
            title={currentLocked ? 'Sign in to your MuseHub account to use this effect' : undefined}
          >
            {currentLocked ? 'Sign in to use' : 'Current'}
          </span>
        ) : installing ? (
          <span className="mp-card__tag mp-card__tag--installing">Installing…</span>
        ) : uninstalled ? (
          // Owned but not installed locally — single-click reinstall, no
          // wallet involvement.
          <button
            type="button"
            className="mp-card__tag mp-card__tag--install mp-card__tag--button"
            onClick={(e) => {
              e.stopPropagation();
              onReinstall?.();
            }}
            aria-label={`Install ${effect.name}`}
          >
            Install
          </button>
        ) : effect.installed ? (
          <span className="mp-card__tag mp-card__tag--installed">Installed</span>
        ) : (
          // Price chip is its own button — clicking it jumps to purchase
          // (sign-in or confirm) instead of opening the store page.
          <button
            type="button"
            className="mp-card__tag mp-card__tag--price mp-card__tag--button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy?.();
            }}
            aria-label={`Buy ${effect.name} for $${effect.price}`}
          >
            ${effect.price}
          </button>
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
      </div>
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
  /** See EffectCard.currentLocked. */
  currentLocked?: boolean;
  /** When true, render as a management row (Update / Uninstall / Reinstall)
   *  instead of the browse row (price chip / Installed badge). */
  manage?: boolean;
  /** True if the user has uninstalled this effect locally (but still owns
   *  the entitlement) — swaps Uninstall for Reinstall. */
  uninstalled?: boolean;
  /** True while the local install/reinstall is in progress. */
  installing?: boolean;
  onActivate: () => void;
  onDetails: () => void;
  onBuy?: () => void;
  onUninstall?: () => void;
  onReinstall?: () => void;
  onToggleFavorite: () => void;
}> = ({
  effect,
  favorite,
  isCurrent = false,
  currentLocked = false,
  manage = false,
  uninstalled = false,
  installing = false,
  onActivate,
  onDetails,
  onBuy,
  onUninstall,
  onReinstall,
  onToggleFavorite,
}) => {
  // Two-click confirm for uninstall — first click flips the button into a
  // "Confirm" state, second click actually removes the effect.
  const [confirmingUninstall, setConfirmingUninstall] = React.useState(false);
  // Mocked "update available" flag — flip half the catalog to give the demo
  // some Update buttons to interact with.
  const hasUpdate = React.useMemo(() => effect.id.charCodeAt(0) % 2 === 0, [effect.id]);
  const [updating, setUpdating] = React.useState(false);
  const handleUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (updating) return;
    setUpdating(true);
    setTimeout(() => setUpdating(false), 800);
  };
  return (
    <li
      role="button"
      className={`mp-row ${isCurrent ? 'mp-row--current' : ''} ${manage ? 'mp-row--manage' : ''}`}
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
      {manage ? (
        <div className="mp-row__actions" onClick={(e) => e.stopPropagation()}>
          {installing ? (
            <span className="mp-row__installing">
              <span className="mp-row__installing-spinner" aria-hidden="true" />
              <span>Installing…</span>
            </span>
          ) : uninstalled ? (
            <button
              type="button"
              className="mp-row__action mp-row__action--update"
              onClick={(e) => {
                e.stopPropagation();
                onReinstall?.();
              }}
              title="Reinstall this effect — entitlement preserved"
            >
              Reinstall
            </button>
          ) : (
            <>
              {hasUpdate && (
                <button
                  type="button"
                  className="mp-row__action mp-row__action--update"
                  onClick={handleUpdate}
                  disabled={updating}
                  title="Update to latest version"
                >
                  {updating ? 'Updating…' : 'Update'}
                </button>
              )}
              {confirmingUninstall ? (
                <>
                  <button
                    type="button"
                    className="mp-row__action mp-row__action--danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUninstall?.();
                      setConfirmingUninstall(false);
                    }}
                  >
                    Confirm uninstall
                  </button>
                  <button
                    type="button"
                    className="mp-row__action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingUninstall(false);
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="mp-row__action"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingUninstall(true);
                  }}
                  title="Remove the local install — your purchase stays in your library"
                >
                  Uninstall
                </button>
              )}
            </>
          )}
        </div>
      ) : isCurrent ? (
        <span
          className={`mp-row__tag mp-row__tag--current${currentLocked ? ' mp-row__tag--current-locked' : ''}`}
          title={currentLocked ? 'Sign in to your MuseHub account to use this effect' : undefined}
        >
          {currentLocked ? 'Sign in to use' : 'Current'}
        </span>
      ) : installing ? (
        <span className="mp-row__tag mp-row__tag--installing">Installing…</span>
      ) : uninstalled ? (
        <button
          type="button"
          className="mp-row__tag mp-row__tag--install mp-row__tag--button"
          onClick={(e) => {
            e.stopPropagation();
            onReinstall?.();
          }}
          aria-label={`Install ${effect.name}`}
        >
          Install
        </button>
      ) : effect.installed ? (
        <span className="mp-row__tag mp-row__tag--installed">Installed</span>
      ) : (
        <button
          type="button"
          className="mp-row__tag mp-row__tag--price mp-row__tag--button"
          onClick={(e) => {
            e.stopPropagation();
            onBuy?.();
          }}
          aria-label={`Buy ${effect.name} for $${effect.price}`}
        >
          ${effect.price}
        </button>
      )}
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
  uninstalled?: boolean;
  installing?: boolean;
  onClose: () => void;
  onAddEffect: () => void;
  onBuy: () => void;
  onReinstall?: () => void;
}> = ({
  effect,
  destinationName,
  uninstalled = false,
  installing = false,
  onClose,
  onAddEffect,
  onBuy,
  onReinstall,
}) => {
  const price = effect.price ?? 0;
  const isFree = !effect.installed && price === 0;
  const builtIn = effect.installed && effect.vendor === 'Audacity';
  const longBlurb =
    effect.blurb ??
    `${effect.name} from ${effect.vendor} — a focused tool that slots into your effects stack.`;

  // Once the user scrolls past the initial inset, expand the hero to full
  // bleed (no rounded corners, edge-to-edge) and let the back button hover
  // over it. Stays in lock-step with the sticky behaviour.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`mp-detail ${scrolled ? 'mp-detail--scrolled' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${effect.name} details`}
    >
      <button className="mp-detail__back" type="button" onClick={onClose} aria-label="Back">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Back</span>
      </button>

      <div className="mp-detail__scroll" ref={scrollRef}>
        <section
          className="mp-detail__hero"
          style={{ background: heroBackground(effect.color, builtIn) }}
        >
          <div className="mp-detail__hero-overlay" aria-hidden="true" />
          <div className="mp-detail__hero-content">
            <div className="mp-detail__hero-thumb" style={{ background: builtIn ? '#1F2530' : gradientFor(effect.color) }}>
              {builtIn ? (
                <CategoryGlyph category={effect.category} />
              ) : (
                <span aria-hidden="true">{initials(effect.vendor)}</span>
              )}
            </div>
            <div className="mp-detail__hero-meta">
              <h2 className="mp-detail__hero-name">{effect.name}</h2>
              <p className="mp-detail__hero-vendor">{effect.vendor}</p>
              <p className="mp-detail__hero-blurb">{longBlurb}</p>
            </div>
            <div className="mp-detail__hero-actions">
              {!effect.installed && !uninstalled && !installing && (
                <button type="button" className="mp-detail__tip">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path
                      d="M7 12.5C6 11.6 1.5 8.6 1.5 5.4 1.5 3.6 2.9 2.2 4.7 2.2c1 0 1.9.5 2.3 1.2.4-.8 1.3-1.2 2.3-1.2 1.8 0 3.2 1.4 3.2 3.2 0 3.2-4.5 6.2-5.5 7.1z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Tip</span>
                </button>
              )}
              {installing ? (
                <button type="button" className="mp-detail__buy" disabled>
                  <span>Installing…</span>
                </button>
              ) : uninstalled ? (
                <button type="button" className="mp-detail__buy" onClick={onReinstall}>
                  <span>Install</span>
                </button>
              ) : effect.installed ? (
                <button type="button" className="mp-detail__buy" onClick={onAddEffect}>
                  <span>Add to {destinationName}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="mp-detail__buy"
                  onClick={onBuy}
                  aria-label={isFree ? 'Get free' : `Buy for $${effect.price}`}
                >
                  <span>{isFree ? 'Free' : `$${effect.price}`}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mp-detail__section">
          <header className="mp-detail__section-header">
            <h3>Previews</h3>
            <div className="mp-detail__carousel-controls" aria-hidden="true">
              <button type="button" disabled>
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" disabled>
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </header>
          <div className="mp-detail__previews">
            <div className="mp-detail__preview" style={{ background: gradientFor(effect.color) }}>
              <span aria-hidden="true">{effect.name}</span>
            </div>
          </div>
        </section>

        <section className="mp-detail__section">
          <h3>What's New?</h3>
          <ul className="mp-detail__changelog-list">
            <li className="mp-detail__changelog">
              <span className="mp-detail__version-chip">2.0</span>
              <span className="mp-detail__changelog-note">
                Major rewrite of the DSP engine for lower CPU and improved transient response.
              </span>
            </li>
            <li className="mp-detail__changelog">
              <span className="mp-detail__version-chip">1.4</span>
              <span className="mp-detail__changelog-note">
                Added 12 new presets from guest engineers. Apple silicon native build.
              </span>
            </li>
            <li className="mp-detail__changelog">
              <span className="mp-detail__version-chip">1.0</span>
              <span className="mp-detail__changelog-note">Initial release on MuseHub.</span>
            </li>
          </ul>
        </section>

        <section className="mp-detail__section">
          <h3>Description</h3>
          <div className="mp-detail__description">
            <p>
              {effect.name} from {effect.vendor} is a focused {categoryLabel(effect.category)}{' '}
              designed to slot into your sessions without ceremony. {longBlurb} Built for daily
              mixing duties — adapts to your sample rate and channel count automatically, ships
              with curated presets, and one licence covers every device on a single MuseHub
              account.
            </p>
            <p>
              Whether you're tightening up a podcast vocal, gluing a drum bus, or carving out
              space in a dense mix, {effect.name} stays musical at extreme settings and out of
              the way at subtle ones. The signal path is fully analog-modelled with carefully
              tuned hysteresis, so pushing it harder rewards you with character rather than
              digital harshness.
            </p>
            <p>
              The interface keeps the essential controls front-and-centre, with deeper parameter
              access tucked behind an expand panel for power users. Every knob is automatable
              and supports MIDI learn, and the entire state can be saved as a snapshot that
              travels with your project file.
            </p>
          </div>

          <ul className="mp-detail__features">
            <li>
              <Check />
              <div>
                <strong>{categoryLabel(effect.category)} core</strong>
                <span>Hand-tuned algorithm with analog character at every setting</span>
              </div>
            </li>
            <li>
              <Check />
              <div>
                <strong>Curated presets</strong>
                <span>30+ starting points from working engineers and producers</span>
              </div>
            </li>
            <li>
              <Check />
              <div>
                <strong>Low CPU</strong>
                <span>Native Apple silicon + AVX2 builds; safe for live use</span>
              </div>
            </li>
            <li>
              <Check />
              <div>
                <strong>Automation-ready</strong>
                <span>Every parameter exposed with MIDI learn out of the box</span>
              </div>
            </li>
            <li>
              <Check />
              <div>
                <strong>One licence, all devices</strong>
                <span>Tied to your MuseHub account, no per-machine activation</span>
              </div>
            </li>
            <li>
              <Check />
              <div>
                <strong>Tutorial walkthrough</strong>
                <span>Built-in guided tour gets new users productive in minutes</span>
              </div>
            </li>
          </ul>
        </section>

        <section className="mp-detail__section">
          <h3>System Requirements</h3>
          <dl className="mp-detail__sysreq">
            <div><dt>macOS</dt><dd>12.0 or later · Intel + Apple silicon</dd></div>
            <div><dt>Windows</dt><dd>10 (64-bit) or later</dd></div>
            <div><dt>Formats</dt><dd>VST3, AU, AAX</dd></div>
            <div><dt>Sample rate</dt><dd>44.1 kHz – 192 kHz</dd></div>
          </dl>
        </section>

        <section className="mp-detail__section">
          <h3>Support</h3>
          <p className="mp-detail__description">
            <a href="https://musehub.com/support" target="_blank" rel="noreferrer">Visit support page</a>
            {' · '}
            <a href={`https://musehub.com/vendors/${slugify(effect.vendor)}`} target="_blank" rel="noreferrer">
              More from {effect.vendor}
            </a>
          </p>
        </section>

        {!builtIn && (
          <a
            className="mp-detail__musehub-link"
            href={`https://musehub.com/effects/${slugify(effect.name)}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>Find out more on MuseHub</span>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M5 2h7v7" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 2L6 8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 8v4H2V4h4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
};

const Check: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path
      d="M3 7L6 10L11 4"
      stroke="#7FE3A5"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function categoryLabel(c: EffectCategory): string {
  switch (c) {
    case 'dynamics': return 'compressor';
    case 'eq': return 'EQ';
    case 'reverb': return 'reverb';
    case 'delay': return 'delay';
    case 'modulation': return 'modulation effect';
    case 'distortion': return 'saturator';
    case 'mastering': return 'mastering tool';
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function heroBackground(color: string, builtIn: boolean): string {
  if (builtIn) return '#1A1F26';
  // Layered radial + diagonal gradient to feel like a marketing banner without
  // needing real artwork.
  return `radial-gradient(circle at 75% 50%, ${shade(color, -10)} 0%, ${shade(color, -40)} 60%, ${shade(color, -55)} 100%)`;
}

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

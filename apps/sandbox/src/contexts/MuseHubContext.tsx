// Single source of truth for the MuseHub data layer.
//
// Authentication, wallet, and library entitlements are owned by the moose-hub
// backend (http://localhost:3000). On mount we hydrate from the server if a
// token is present. signIn redirects to moose-hub's OAuth /authorize page;
// the demo never sees the user's password.
//
// Local-only state (kept client-side):
//   - installingIds   — transient install animations
//   - uninstalledIds  — locally-uninstalled (but still entitled) plugins
//   - disabledPluginIds — Plugin Manager toggles
//
// Lives alongside the other app-level providers in App.tsx. Components use
// the granular hooks (useWalletBalance, useSignedIn, useUser,
// usePurchasedEffects, useDisabledPlugins) when they only need one slice,
// or useMuseHub() for the full surface (actions + state).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  hasToken,
  logout as museHubLogout,
  getUserInfo,
  getWallet,
  getLibrary,
  spendWallet,
  buyPlugin,
  type MuseHubEntitlement,
} from '../lib/musehub-client';
import { AuthDialog } from '../components/wallet/AuthDialog';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface PurchasedEffect {
  id: string;
  name: string;
  vendor: string;
}

export interface ActiveInstall {
  id: string;
  name: string;
  vendor: string;
  /** 0–1. Driven from a RAF tick so the UI re-renders ~60Hz. Resets to 0
   *  when the phase transitions (download → install). */
  progress: number;
  paused: boolean;
  /** Lifecycle of an install job:
   *   downloading — bytes pulled from MuseHub, shown in the marketplace
   *     footer with a progress bar + pause/cancel.
   *   ready       — download complete; footer shows a "Launch installer"
   *     button. User can also cancel to throw the bits away.
   *   installing  — installer wizard is open and the install simulation
   *     is running inside its Installation step.
   *   done        — install simulation finished; wizard auto-advances to
   *     Summary. Cleared when the user dismisses the wizard. */
  phase: 'downloading' | 'ready' | 'installing' | 'done';
}

interface MuseHubContextValue {
  // ---- Wallet ---------------------------------------------------------
  /** Wallet balance in USD (the server stores cents; this is dollars). */
  balance: number;
  signedIn: boolean;
  user: UserProfile;
  /** Convenience: opens the MuseHub AuthDialog in sign-in mode. */
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch user/wallet/library from moose-hub. Call after the sign-in
   *  dialog writes fresh tokens. */
  hydrate: () => Promise<void>;
  /** State of the globally-mounted AuthDialog. */
  authDialog: 'closed' | 'sign-in' | 'create-account';
  /** Open the AuthDialog in a given mode. */
  openAuthDialog: (mode: 'sign-in' | 'create-account') => void;
  /** Close the AuthDialog. No-op if already closed. */
  closeAuthDialog: () => void;
  /** Charge the wallet for an arbitrary amount in USD. Returns once the
   *  server confirms. Optimistic local update is reconciled to the server
   *  response. */
  spend: (amountUsd: number, pluginId: string) => Promise<void>;

  // ---- Library --------------------------------------------------------
  /** Everything the user has bought — the full set of entitlements,
   *  regardless of whether the local copy is currently installed. */
  purchasedEffects: PurchasedEffect[];
  /** Effects the user has uninstalled locally — the entitlement remains so
   *  they can reinstall without paying again. Client-only state. */
  uninstalledIds: Set<string>;
  /** Effects currently being installed locally (purchase complete, install
   *  pending). Transient and client-only. */
  installingIds: Set<string>;
  /** Effects currently installed locally (purchased AND not uninstalled
   *  AND not still installing). */
  installedEffects: PurchasedEffect[];
  /** The install/download currently surfaced in the marketplace footer or
   *  the installer wizard — at most one at a time. Walks through download
   *  → ready → installing → done. See ActiveInstall for phase semantics. */
  activeInstall: ActiveInstall | null;
  /** Pause/resume/cancel act on activeInstall (any phase). No-ops if none. */
  pauseActiveInstall: () => void;
  resumeActiveInstall: () => void;
  cancelActiveInstall: () => void;
  /** Effect the user is currently walking through an installer wizard for.
   *  Modeled on a Windows/macOS program installer: welcome, destination,
   *  type, installing, summary. Auto-set when a download completes — no
   *  manual "launch" affordance, the wizard just appears. */
  installerWizardEffect: PurchasedEffect | null;
  /** Begin the download phase. Used by purchase (after addToLibrary) and
   *  reinstall flows. Sets activeInstall with phase='downloading'; when
   *  the download finishes the wizard auto-opens. */
  startDownload: (effect: PurchasedEffect) => void;
  closeInstallerWizard: () => void;
  /** Wizard's "Install" button — moves the job from phase='ready' to
   *  phase='installing' and runs the install simulation. */
  beginWizardInstall: (effect: PurchasedEffect) => void;
  /** Purchase a plugin: atomic debit + entitlement on the server. */
  addToLibrary: (effect: PurchasedEffect) => Promise<void>;
  /** Drop the entitlement locally. The server does not yet expose a
   *  DELETE-entitlement endpoint, so this is client-only. */
  removeFromLibrary: (id: string) => void;
  /** Mark a previously-installed effect as uninstalled locally. */
  uninstallEffect: (id: string) => void;
  /** Re-install a previously-uninstalled effect (the entitlement is
   *  preserved either way, so this is free). */
  reinstallEffect: (id: string) => void;

  // ---- Plugin manager -------------------------------------------------
  disabledPluginIds: Set<string>;
  setPluginDisabled: (id: string, disabled: boolean) => void;
  /** Replace the disabled set wholesale from a full plugins list. The
   *  Plugin Manager dialog calls this when its enabled flags change. */
  syncDisabledFromList: (list: { id: string; enabled: boolean }[]) => void;
}

const MuseHubContext = createContext<MuseHubContextValue | null>(null);

const GUEST_USER: UserProfile = { name: 'Guest', email: '' };

// Client-only state still gets persisted across reloads. Wallet, user, and
// library state used to live here too — those now come from the server, so
// only the local-install toggles remain.
const STORAGE_KEY = 'musehub-local-v1';

interface PersistedLocal {
  uninstalledIds: string[];
  disabledPluginIds: string[];
}

function loadPersisted(): PersistedLocal {
  const empty: PersistedLocal = { uninstalledIds: [], disabledPluginIds: [] };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedLocal>;
    return {
      uninstalledIds: Array.isArray(parsed?.uninstalledIds)
        ? parsed.uninstalledIds.filter((s): s is string => typeof s === 'string')
        : [],
      disabledPluginIds: Array.isArray(parsed?.disabledPluginIds)
        ? parsed.disabledPluginIds.filter((s): s is string => typeof s === 'string')
        : [],
    };
  } catch {
    return empty;
  }
}

function entitlementToEffect(e: MuseHubEntitlement): PurchasedEffect {
  return { id: e.pluginId, name: e.name, vendor: e.vendor };
}

export const MuseHubProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const persisted = useMemo(loadPersisted, []);

  // Server-backed state — populated by hydration after sign-in.
  const [signedIn, setSignedIn] = useState<boolean>(() => hasToken());
  const [user, setUser] = useState<UserProfile>(GUEST_USER);
  const [balance, setBalanceState] = useState<number>(0);
  const [purchasedEffects, setPurchasedEffects] = useState<PurchasedEffect[]>([]);
  // Mirror in a ref so callbacks (e.g. reinstallEffect) can look up name/
  // vendor without making the callback dep on purchasedEffects identity.
  const purchasedEffectsRef = React.useRef(purchasedEffects);
  React.useEffect(() => {
    purchasedEffectsRef.current = purchasedEffects;
  }, [purchasedEffects]);

  // Local-only state.
  const [uninstalledIds, setUninstalledIds] = useState<Set<string>>(
    () => new Set(persisted.uninstalledIds),
  );
  const [installingIds, setInstallingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [disabledPluginIds, setDisabledPluginIds] = useState<Set<string>>(
    () => new Set(persisted.disabledPluginIds),
  );

  // Hydrate user/wallet/library from the server. Runs on mount, after a
  // successful sign-in, and whenever the Audacity tab regains focus — so
  // changes made in the moose-hub UI (top up, buy, etc.) show up here on
  // tab switch.
  //
  // Only auth errors flip us to signed-out. Transient network errors leave
  // the last-known state alone so a brief connectivity hiccup doesn't kick
  // the user out mid-session.
  const hydrate = useCallback(async () => {
    if (!hasToken()) {
      setSignedIn(false);
      setUser(GUEST_USER);
      setBalanceState(0);
      setPurchasedEffects([]);
      return;
    }
    try {
      const [info, wallet, library] = await Promise.all([
        getUserInfo(),
        getWallet(),
        getLibrary(),
      ]);
      setUser({
        name: info.name,
        email: info.email,
        avatarUrl: info.avatarUrl,
      });
      setBalanceState(wallet.balanceCents / 100);
      setPurchasedEffects(library.entitlements.map(entitlementToEffect));
      setSignedIn(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const isAuthError = /session expired|not signed in/i.test(message);
      if (isAuthError) {
        setSignedIn(false);
        setUser(GUEST_USER);
        setBalanceState(0);
        setPurchasedEffects([]);
      }
      // Otherwise: keep last-known state and try again on the next focus.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrate();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  // Refetch when the tab becomes visible / regains focus. Lets the user
  // change wallet balance, buy plugins, etc. in moose-hub and see those
  // changes reflected here on tab switch.
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === 'visible') void hydrate();
    };
    document.addEventListener('visibilitychange', refetch);
    window.addEventListener('focus', refetch);
    return () => {
      document.removeEventListener('visibilitychange', refetch);
      window.removeEventListener('focus', refetch);
    };
  }, [hydrate]);

  // Persist local-only fields (install / disabled toggles).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const snapshot: PersistedLocal = {
      uninstalledIds: Array.from(uninstalledIds),
      disabledPluginIds: Array.from(disabledPluginIds),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Quota / serialisation failures are non-fatal — local toggles
      // re-derive on the next session.
    }
  }, [uninstalledIds, disabledPluginIds]);

  // ---- Install simulation -------------------------------------------------
  // Real plugin installs happen in two phases: pull the package down from
  // the CDN, then run the installer to lay the files out on disk. This
  // demo mirrors that — startDownload kicks phase 1, beginWizardInstall
  // (called from the wizard's Install button) kicks phase 2. Both use the
  // same RAF loop, just with different durations and phase markers.
  const [activeInstall, setActiveInstall] = useState<ActiveInstall | null>(null);
  // Refs for the RAF loop so we don't have to thread state through deps.
  const activeRef = React.useRef<{
    id: string;
    name: string;
    vendor: string;
    durationMs: number;
    startedAt: number;
    pausedAt: number | null;
    pauseAccumMs: number;
    rafId: number | null;
    // What to do when progress hits 1.0 — for downloads we park at
    // phase='ready' so the footer can show "Launch installer"; for
    // installs we park at phase='done' so the wizard can show the
    // Summary step before the user dismisses it.
    onComplete: 'ready' | 'done';
  } | null>(null);
  // Hoisted above runSimulation so the download → wizard auto-handoff
  // (inside the RAF tick) can poke the wizard open without forward-refs.
  const [installerWizardEffect, setInstallerWizardEffect] =
    useState<PurchasedEffect | null>(null);

  const clearInstallingId = useCallback((id: string) => {
    setInstallingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const stopActiveLoop = useCallback(() => {
    const a = activeRef.current;
    if (a?.rafId != null) cancelAnimationFrame(a.rafId);
    activeRef.current = null;
  }, []);

  const runSimulation = useCallback(
    (
      effect: PurchasedEffect,
      phase: 'downloading' | 'installing',
      durationMs: number,
    ) => {
      stopActiveLoop();

      setInstallingIds((prev) => {
        if (prev.has(effect.id)) return prev;
        const next = new Set(prev);
        next.add(effect.id);
        return next;
      });

      const onComplete: 'ready' | 'done' =
        phase === 'downloading' ? 'ready' : 'done';
      activeRef.current = {
        id: effect.id,
        name: effect.name,
        vendor: effect.vendor,
        durationMs,
        startedAt: performance.now(),
        pausedAt: null,
        pauseAccumMs: 0,
        rafId: null,
        onComplete,
      };
      setActiveInstall({
        id: effect.id,
        name: effect.name,
        vendor: effect.vendor,
        progress: 0,
        paused: false,
        phase,
      });

      const tick = () => {
        const a = activeRef.current;
        if (!a || a.id !== effect.id) return;
        const now = performance.now();
        const elapsed = a.pausedAt != null
          ? a.pausedAt - a.startedAt - a.pauseAccumMs
          : now - a.startedAt - a.pauseAccumMs;
        const progress = Math.min(1, Math.max(0, elapsed / a.durationMs));
        setActiveInstall((prev) =>
          prev && prev.id === effect.id
            ? { ...prev, progress, paused: a.pausedAt != null }
            : prev,
        );
        if (progress >= 1) {
          // Phase complete — park the job at the appropriate next phase
          // and stop the RAF. The download phase auto-hands-off to the
          // installer wizard so the user doesn't have to click a "Launch"
          // button (that step felt like busywork — real installers just
          // pop after the download finishes).
          setActiveInstall((prev) =>
            prev && prev.id === effect.id
              ? { ...prev, progress: 1, paused: false, phase: a.onComplete }
              : prev,
          );
          if (a.onComplete === 'ready') {
            setInstallerWizardEffect({
              id: effect.id,
              name: effect.name,
              vendor: effect.vendor,
            });
          }
          if (a.onComplete === 'done') clearInstallingId(effect.id);
          activeRef.current = null;
          return;
        }
        a.rafId = requestAnimationFrame(tick);
      };
      activeRef.current.rafId = requestAnimationFrame(tick);
    },
    [clearInstallingId, stopActiveLoop],
  );

  const startDownload = useCallback(
    (effect: PurchasedEffect) => {
      runSimulation(effect, 'downloading', 4000);
    },
    [runSimulation],
  );

  const pauseActiveInstall = useCallback(() => {
    const a = activeRef.current;
    if (!a || a.pausedAt != null) return;
    a.pausedAt = performance.now();
    setActiveInstall((prev) => (prev ? { ...prev, paused: true } : prev));
  }, []);

  const resumeActiveInstall = useCallback(() => {
    const a = activeRef.current;
    if (!a || a.pausedAt == null) return;
    a.pauseAccumMs += performance.now() - a.pausedAt;
    a.pausedAt = null;
    setActiveInstall((prev) => (prev ? { ...prev, paused: false } : prev));
  }, []);

  const cancelActiveInstall = useCallback(() => {
    stopActiveLoop();
    setActiveInstall((prev) => {
      if (prev) clearInstallingId(prev.id);
      return null;
    });
  }, [clearInstallingId, stopActiveLoop]);

  // Clean up the RAF on unmount so we don't leak across HMR reloads.
  React.useEffect(() => stopActiveLoop, [stopActiveLoop]);

  // Globally-mounted AuthDialog state. signIn() opens it in sign-in mode;
  // the dialog itself calls hydrate() after a successful login.
  const [authDialog, setAuthDialog] = useState<'closed' | 'sign-in' | 'create-account'>('closed');
  const openAuthDialog = useCallback((mode: 'sign-in' | 'create-account') => {
    setAuthDialog(mode);
  }, []);
  const closeAuthDialog = useCallback(() => setAuthDialog('closed'), []);
  const signIn = useCallback(async () => {
    setAuthDialog('sign-in');
  }, []);

  const signOut = useCallback(async () => {
    await museHubLogout();
    setSignedIn(false);
    setUser(GUEST_USER);
    setBalanceState(0);
    setPurchasedEffects([]);
  }, []);

  const spend = useCallback(
    async (amountUsd: number, pluginId: string) => {
      const previousBalance = balance;
      // Optimistic update first so the wallet chip moves immediately.
      setBalanceState((b) => Math.max(0, b - amountUsd));
      try {
        const wallet = await spendWallet(Math.round(amountUsd * 100), pluginId);
        setBalanceState(wallet.balanceCents / 100);
      } catch (err) {
        // Server rejected — revert the optimistic update.
        setBalanceState(previousBalance);
        throw err;
      }
    },
    [balance],
  );

  const addToLibrary = useCallback(
    async (effect: PurchasedEffect) => {
      // Server atomically debits the wallet and creates the entitlement.
      // Local copy: append the effect (using the input shape we already
      // have, since the server entitlement may not include UX details)
      // and reconcile the balance to what the server reports.
      //
      // This is the *purchase* half of buying a plugin — it does NOT kick
      // off the local install. The caller is responsible for opening the
      // installer wizard (or otherwise calling beginWizardInstall) so the
      // user walks through the install steps explicitly, the same as for
      // a reinstall.
      const result = await buyPlugin(effect.id);
      setBalanceState(result.balanceCents / 100);
      setPurchasedEffects((prev) =>
        prev.some((e) => e.id === effect.id) ? prev : [...prev, effect],
      );
    },
    [],
  );

  const removeFromLibrary = useCallback((id: string) => {
    setPurchasedEffects((prev) => prev.filter((e) => e.id !== id));
    setUninstalledIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const uninstallEffect = useCallback((id: string) => {
    setUninstalledIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const reinstallEffect = useCallback(
    (id: string) => {
      setUninstalledIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Resolve name/vendor from the owned library so the footer can show
      // them. If we somehow don't have a row for this id (shouldn't happen),
      // fall back to the id itself.
      const owned = purchasedEffectsRef.current.find((e) => e.id === id);
      startDownload(owned ?? { id, name: id, vendor: 'MuseHub' });
    },
    [startDownload],
  );

  // ---- Installer wizard ---------------------------------------------------
  // The wizard auto-opens at the end of the download phase (the RAF tick
  // calls setInstallerWizardEffect when onComplete === 'ready'), so there
  // is no separate "Launch installer" entry point.
  const closeInstallerWizard = useCallback(() => {
    setInstallerWizardEffect(null);
    // Tear down the parked job once the wizard closes (whether the user
    // finished, cancelled, or dismissed early). Cancel handles the RAF
    // cleanup too.
    cancelActiveInstall();
  }, [cancelActiveInstall]);

  const beginWizardInstall = useCallback(
    (effect: PurchasedEffect) => {
      setUninstalledIds((prev) => {
        if (!prev.has(effect.id)) return prev;
        const next = new Set(prev);
        next.delete(effect.id);
        return next;
      });
      runSimulation(effect, 'installing', 3500);
    },
    [runSimulation],
  );

  const installedEffects = useMemo(
    () =>
      purchasedEffects.filter(
        (e) => !uninstalledIds.has(e.id) && !installingIds.has(e.id),
      ),
    [purchasedEffects, uninstalledIds, installingIds],
  );

  const setPluginDisabled = useCallback((id: string, disabled: boolean) => {
    setDisabledPluginIds((prev) => {
      const has = prev.has(id);
      if (disabled === has) return prev;
      const next = new Set(prev);
      if (disabled) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const syncDisabledFromList = useCallback(
    (list: { id: string; enabled: boolean }[]) => {
      setDisabledPluginIds((prev) => {
        const next = new Set<string>();
        for (const p of list) if (!p.enabled) next.add(p.id);
        if (
          next.size === prev.size &&
          Array.from(next).every((id) => prev.has(id))
        ) {
          return prev;
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo<MuseHubContextValue>(
    () => ({
      balance,
      signedIn,
      user,
      signIn,
      signOut,
      hydrate,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
      spend,
      purchasedEffects,
      uninstalledIds,
      installingIds,
      installedEffects,
      activeInstall,
      pauseActiveInstall,
      resumeActiveInstall,
      cancelActiveInstall,
      installerWizardEffect,
      startDownload,
      closeInstallerWizard,
      beginWizardInstall,
      addToLibrary,
      removeFromLibrary,
      uninstallEffect,
      reinstallEffect,
      disabledPluginIds,
      setPluginDisabled,
      syncDisabledFromList,
    }),
    [
      balance,
      signedIn,
      user,
      signIn,
      signOut,
      hydrate,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
      spend,
      purchasedEffects,
      uninstalledIds,
      installingIds,
      installedEffects,
      activeInstall,
      pauseActiveInstall,
      resumeActiveInstall,
      cancelActiveInstall,
      installerWizardEffect,
      startDownload,
      closeInstallerWizard,
      beginWizardInstall,
      addToLibrary,
      removeFromLibrary,
      uninstallEffect,
      reinstallEffect,
      disabledPluginIds,
      setPluginDisabled,
      syncDisabledFromList,
    ],
  );

  return (
    <MuseHubContext.Provider value={value}>
      {children}
      <AuthDialog />
    </MuseHubContext.Provider>
  );
};

export function useMuseHub(): MuseHubContextValue {
  const ctx = useContext(MuseHubContext);
  if (!ctx) {
    throw new Error('useMuseHub must be used inside <MuseHubProvider>');
  }
  return ctx;
}

// ---- Granular selectors (preserve the previous hook names) -------------

export const useWalletBalance = (): number => useMuseHub().balance;
export const useSignedIn = (): boolean => useMuseHub().signedIn;
export const useUser = (): UserProfile => useMuseHub().user;
export const usePurchasedEffects = (): PurchasedEffect[] =>
  useMuseHub().purchasedEffects;
export const useInstalledEffects = (): PurchasedEffect[] =>
  useMuseHub().installedEffects;
export const useUninstalledIds = (): Set<string> => useMuseHub().uninstalledIds;
export const useInstallingIds = (): Set<string> => useMuseHub().installingIds;
export const useDisabledPlugins = (): Set<string> =>
  useMuseHub().disabledPluginIds;

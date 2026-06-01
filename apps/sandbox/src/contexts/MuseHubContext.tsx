// Single source of truth for the MuseHub data layer:
//   - the user's wallet balance and sign-in state
//   - the library of effects they've purchased this session
//   - which plugin IDs are currently disabled in the Plugin Manager
//
// Lives alongside the other app-level providers in App.tsx. Components use
// the granular hooks (useWalletBalance, useSignedIn, useUser,
// usePurchasedEffects, useDisabledPlugins) when they only need one slice,
// or useMuseHub() for the full surface (actions + state).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

interface MuseHubContextValue {
  // ---- Wallet ---------------------------------------------------------
  balance: number;
  signedIn: boolean;
  user: UserProfile;
  signIn: () => Promise<void>;
  signOut: () => void;
  spend: (amount: number) => void;
  setBalance: (next: number) => void;

  // ---- Library --------------------------------------------------------
  /** Everything the user has bought this session — the full set of
   *  entitlements, regardless of whether the local copy is currently
   *  installed. */
  purchasedEffects: PurchasedEffect[];
  /** Effects the user has uninstalled locally — the entitlement remains so
   *  they can reinstall without paying again. */
  uninstalledIds: Set<string>;
  /** Effects currently being installed locally (purchase complete, install
   *  pending). The Owned page renders these with a progress indicator and
   *  they aren't yet listed in pickers / Plugin Manager. */
  installingIds: Set<string>;
  /** Effects currently installed locally (purchased AND not uninstalled
   *  AND not still installing). */
  installedEffects: PurchasedEffect[];
  addToLibrary: (effect: PurchasedEffect) => void;
  /** Drop the entitlement entirely — the user would need to buy it again. */
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

const DEFAULT_USER: UserProfile = {
  name: 'Alex Dawson',
  email: 'a.dawson@mu.se',
};

// localStorage key for the persisted session. Bump the suffix when the shape
// changes so old saved state doesn't break the app.
const STORAGE_KEY = 'musehub-session-v1';

interface PersistedState {
  balance: number;
  signedIn: boolean;
  purchasedEffects: PurchasedEffect[];
  uninstalledIds: string[];
  disabledPluginIds: string[];
}

function loadPersisted(): Partial<PersistedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const MuseHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lazy-init from localStorage so a refresh keeps the user signed in with
  // their wallet balance, library and Plugin Manager toggles intact.
  const persisted = useMemo(loadPersisted, []);

  const [balance, setBalanceState] = useState<number>(persisted.balance ?? 42.5);
  const [signedIn, setSignedIn] = useState<boolean>(persisted.signedIn ?? false);
  const [user] = useState<UserProfile>(DEFAULT_USER);
  const [purchasedEffects, setPurchasedEffects] = useState<PurchasedEffect[]>(
    persisted.purchasedEffects ?? [],
  );
  const [uninstalledIds, setUninstalledIds] = useState<Set<string>>(
    () => new Set(persisted.uninstalledIds ?? []),
  );
  // installingIds is intentionally transient — fresh load = nothing in flight.
  const [installingIds, setInstallingIds] = useState<Set<string>>(() => new Set());

  // Helper to drive a simulated install: flag the id as installing, then
  // clear it after a short delay so callers can render a progress state.
  const simulateInstall = useCallback((id: string, durationMs = 1600) => {
    setInstallingIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setInstallingIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, durationMs);
  }, []);
  const [disabledPluginIds, setDisabledPluginIds] = useState<Set<string>>(
    () => new Set(persisted.disabledPluginIds ?? []),
  );

  // Mirror everything persistent back into localStorage on change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const snapshot: PersistedState = {
      balance,
      signedIn,
      purchasedEffects,
      uninstalledIds: Array.from(uninstalledIds),
      disabledPluginIds: Array.from(disabledPluginIds),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Quota or serialisation failure — swallow; library state is mock.
    }
  }, [balance, signedIn, purchasedEffects, uninstalledIds, disabledPluginIds]);

  const signIn = useCallback(() => {
    // Simulated MuseHub OAuth — the UI shows a "Signing in…" spinner during
    // this delay.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setSignedIn(true);
        resolve();
      }, 1500);
    });
  }, []);

  const signOut = useCallback(() => setSignedIn(false), []);

  const spend = useCallback((amount: number) => {
    setBalanceState((b) => Math.max(0, b - amount));
  }, []);

  const setBalance = useCallback((next: number) => {
    setBalanceState(Math.max(0, next));
  }, []);

  const addToLibrary = useCallback(
    (effect: PurchasedEffect) => {
      setPurchasedEffects((prev) =>
        prev.some((e) => e.id === effect.id) ? prev : [...prev, effect],
      );
      // Kick off the simulated local install. Until it finishes, the effect
      // is visible in the Owned page but absent from picker menus.
      simulateInstall(effect.id);
    },
    [simulateInstall],
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
      simulateInstall(id);
    },
    [simulateInstall],
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
        if (next.size === prev.size && Array.from(next).every((id) => prev.has(id))) return prev;
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
      spend,
      setBalance,
      purchasedEffects,
      uninstalledIds,
      installingIds,
      installedEffects,
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
      spend,
      setBalance,
      purchasedEffects,
      uninstalledIds,
      installingIds,
      installedEffects,
      addToLibrary,
      removeFromLibrary,
      uninstallEffect,
      reinstallEffect,
      disabledPluginIds,
      setPluginDisabled,
      syncDisabledFromList,
    ],
  );

  return <MuseHubContext.Provider value={value}>{children}</MuseHubContext.Provider>;
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
export const usePurchasedEffects = (): PurchasedEffect[] => useMuseHub().purchasedEffects;
export const useInstalledEffects = (): PurchasedEffect[] => useMuseHub().installedEffects;
export const useUninstalledIds = (): Set<string> => useMuseHub().uninstalledIds;
export const useInstallingIds = (): Set<string> => useMuseHub().installingIds;
export const useDisabledPlugins = (): Set<string> => useMuseHub().disabledPluginIds;

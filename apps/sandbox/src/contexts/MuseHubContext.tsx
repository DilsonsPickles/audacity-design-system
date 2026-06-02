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

export type AuthDialogMode = 'closed' | 'sign-in' | 'create-account';

interface MuseHubContextValue {
  // ---- Wallet ---------------------------------------------------------
  balance: number;
  signedIn: boolean;
  user: UserProfile;
  /** Resolves on success. Rejects with a user-facing error message if
   *  the (mock) validation fails. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Same shape — succeeds for any input that passes the mock validator. */
  createAccount: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  signOut: () => void;
  spend: (amount: number) => void;
  setBalance: (next: number) => void;

  // ---- Auth dialog ----------------------------------------------------
  /** Open / closed state of the global MuseHubAuthDialog. */
  authDialog: AuthDialogMode;
  openAuthDialog: (mode?: 'sign-in' | 'create-account') => void;
  closeAuthDialog: () => void;

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

const DEFAULT_BALANCE = 42.5;

// Per-account state. Each MuseHub account owns its own wallet, library and
// Plugin Manager preferences — signing out of one and into another swaps
// the entire surface.
interface AccountSnapshot {
  name: string;
  avatarUrl?: string;
  balance: number;
  purchasedEffects: PurchasedEffect[];
  uninstalledIds: string[];
  disabledPluginIds: string[];
}

const EMPTY_ACCOUNT = (name: string): AccountSnapshot => ({
  name,
  balance: DEFAULT_BALANCE,
  purchasedEffects: [],
  uninstalledIds: [],
  disabledPluginIds: [],
});

// localStorage key for the persisted session. Bump the suffix when the
// shape changes so old saved state doesn't break the app.
const STORAGE_KEY = 'musehub-session-v2';

interface PersistedState {
  accounts: Record<string, AccountSnapshot>;
  /** Email of the currently signed-in account, or null when signed out. */
  activeEmail: string | null;
}

function loadPersisted(): PersistedState {
  const empty: PersistedState = { accounts: {}, activeEmail: null };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== 'object') return empty;
    return {
      accounts: parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {},
      activeEmail: typeof parsed.activeEmail === 'string' ? parsed.activeEmail : null,
    };
  } catch {
    return empty;
  }
}

export const MuseHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lazy-init from localStorage so a refresh keeps everyone signed in
  // (or signed out), with their per-account libraries intact.
  const persisted = useMemo(loadPersisted, []);

  const [accounts, setAccounts] = useState<Record<string, AccountSnapshot>>(
    persisted.accounts,
  );
  const [activeEmail, setActiveEmail] = useState<string | null>(persisted.activeEmail);
  const [authDialog, setAuthDialog] = useState<AuthDialogMode>('closed');
  // installingIds is intentionally transient — fresh load = nothing in
  // flight. It's also intentionally global, not per-account: install state
  // only lives during the lifetime of a single signed-in session.
  const [installingIds, setInstallingIds] = useState<Set<string>>(() => new Set());

  const signedIn = activeEmail !== null;
  const activeAccount: AccountSnapshot | null =
    activeEmail !== null ? accounts[activeEmail] ?? null : null;

  // Internal helper to mutate the active account's snapshot. No-ops when
  // signed out — mutating actions should be gated upstream anyway, but
  // this is the belt-and-braces guarantee.
  const updateActiveAccount = useCallback(
    (updater: (prev: AccountSnapshot) => AccountSnapshot) => {
      setAccounts((prev) => {
        if (!activeEmail) return prev;
        const current = prev[activeEmail];
        if (!current) return prev;
        const next = updater(current);
        if (next === current) return prev;
        return { ...prev, [activeEmail]: next };
      });
    },
    [activeEmail],
  );

  // Derived published surface — empty/zero when signed out so consumers
  // see nothing of the previously-signed-in user's data.
  const balance = activeAccount?.balance ?? 0;
  const user: UserProfile = activeAccount
    ? { name: activeAccount.name, email: activeEmail!, avatarUrl: activeAccount.avatarUrl }
    : { name: 'Guest', email: '' };
  const purchasedEffects = activeAccount?.purchasedEffects ?? [];
  const uninstalledIds = useMemo(
    () => new Set(activeAccount?.uninstalledIds ?? []),
    [activeAccount],
  );
  const disabledPluginIds = useMemo(
    () => new Set(activeAccount?.disabledPluginIds ?? []),
    [activeAccount],
  );

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

  // Mirror persistent state to localStorage on every change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const snapshot: PersistedState = { accounts, activeEmail };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Quota or serialisation failure — swallow; library state is mock.
    }
  }, [accounts, activeEmail]);

  // Mock validator shared by sign-in and create-account. Returns a
  // user-facing error string if the input is rejected, or `null` if good.
  // In a real backend this would be replaced with an API call.
  const validateCreds = (email: string, password: string): string | null => {
    if (!email.trim()) return 'Enter an email address.';
    if (!email.includes('@') || !email.includes('.')) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  const signIn = useCallback((email: string, password: string) => {
    const err = validateCreds(email, password);
    if (err) return Promise.reject(new Error(err));
    const normalised = email.trim().toLowerCase();
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // If this email already has an account snapshot, just activate it.
        // Otherwise initialise an empty account with a guessed display name.
        setAccounts((prev) => {
          if (prev[normalised]) return prev;
          const guessedName = normalised.split('@')[0] || 'Member';
          return { ...prev, [normalised]: EMPTY_ACCOUNT(guessedName) };
        });
        setActiveEmail(normalised);
        resolve();
      }, 1200);
    });
  }, []);

  const createAccount = useCallback(
    ({ email, password, displayName }: { email: string; password: string; displayName: string }) => {
      const err = validateCreds(email, password);
      if (err) return Promise.reject(new Error(err));
      if (!displayName.trim()) return Promise.reject(new Error('Enter a display name.'));
      const normalised = email.trim().toLowerCase();
      const name = displayName.trim();
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setAccounts((prev) => ({
            ...prev,
            // If the account exists already, refresh the display name but
            // keep the existing library — this is mock auth, no real
            // "account exists" rejection.
            [normalised]: prev[normalised]
              ? { ...prev[normalised], name }
              : EMPTY_ACCOUNT(name),
          }));
          setActiveEmail(normalised);
          resolve();
        }, 1200);
      });
    },
    [],
  );

  // Sign-out just deactivates the session — the account snapshot stays in
  // localStorage so signing back in restores the library.
  const signOut = useCallback(() => setActiveEmail(null), []);

  const openAuthDialog = useCallback((mode: 'sign-in' | 'create-account' = 'sign-in') => {
    setAuthDialog(mode);
  }, []);
  const closeAuthDialog = useCallback(() => setAuthDialog('closed'), []);

  const spend = useCallback(
    (amount: number) => {
      updateActiveAccount((acc) => ({ ...acc, balance: Math.max(0, acc.balance - amount) }));
    },
    [updateActiveAccount],
  );

  const setBalance = useCallback(
    (next: number) => {
      updateActiveAccount((acc) => ({ ...acc, balance: Math.max(0, next) }));
    },
    [updateActiveAccount],
  );

  const addToLibrary = useCallback(
    (effect: PurchasedEffect) => {
      updateActiveAccount((acc) =>
        acc.purchasedEffects.some((e) => e.id === effect.id)
          ? acc
          : { ...acc, purchasedEffects: [...acc.purchasedEffects, effect] },
      );
      // Kick off the simulated local install. Until it finishes, the effect
      // is visible in the Owned page but absent from picker menus.
      simulateInstall(effect.id);
    },
    [updateActiveAccount, simulateInstall],
  );

  const removeFromLibrary = useCallback(
    (id: string) => {
      updateActiveAccount((acc) => ({
        ...acc,
        purchasedEffects: acc.purchasedEffects.filter((e) => e.id !== id),
        uninstalledIds: acc.uninstalledIds.filter((i) => i !== id),
      }));
    },
    [updateActiveAccount],
  );

  const uninstallEffect = useCallback(
    (id: string) => {
      updateActiveAccount((acc) =>
        acc.uninstalledIds.includes(id)
          ? acc
          : { ...acc, uninstalledIds: [...acc.uninstalledIds, id] },
      );
    },
    [updateActiveAccount],
  );

  const reinstallEffect = useCallback(
    (id: string) => {
      updateActiveAccount((acc) =>
        acc.uninstalledIds.includes(id)
          ? { ...acc, uninstalledIds: acc.uninstalledIds.filter((i) => i !== id) }
          : acc,
      );
      simulateInstall(id);
    },
    [updateActiveAccount, simulateInstall],
  );

  const installedEffects = useMemo(
    () =>
      purchasedEffects.filter(
        (e) => !uninstalledIds.has(e.id) && !installingIds.has(e.id),
      ),
    [purchasedEffects, uninstalledIds, installingIds],
  );

  const setPluginDisabled = useCallback(
    (id: string, disabled: boolean) => {
      updateActiveAccount((acc) => {
        const has = acc.disabledPluginIds.includes(id);
        if (disabled === has) return acc;
        return {
          ...acc,
          disabledPluginIds: disabled
            ? [...acc.disabledPluginIds, id]
            : acc.disabledPluginIds.filter((d) => d !== id),
        };
      });
    },
    [updateActiveAccount],
  );

  const syncDisabledFromList = useCallback(
    (list: { id: string; enabled: boolean }[]) => {
      updateActiveAccount((acc) => {
        const nextIds = list.filter((p) => !p.enabled).map((p) => p.id);
        const sameAsBefore =
          nextIds.length === acc.disabledPluginIds.length &&
          nextIds.every((id) => acc.disabledPluginIds.includes(id));
        if (sameAsBefore) return acc;
        return { ...acc, disabledPluginIds: nextIds };
      });
    },
    [updateActiveAccount],
  );

  const value = useMemo<MuseHubContextValue>(
    () => ({
      balance,
      signedIn,
      user,
      signIn,
      createAccount,
      signOut,
      spend,
      setBalance,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
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
      createAccount,
      signOut,
      spend,
      setBalance,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
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

  return (
    <MuseHubContext.Provider value={value}>
      {children}
      {/* Globally mounted so it can be triggered from anywhere — the
          marketplace modal's Sign-In prompt, the chrome wallet chip,
          or any future surface that needs to gate on auth. */}
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
export const usePurchasedEffects = (): PurchasedEffect[] => useMuseHub().purchasedEffects;
export const useInstalledEffects = (): PurchasedEffect[] => useMuseHub().installedEffects;
export const useUninstalledIds = (): Set<string> => useMuseHub().uninstalledIds;
export const useInstallingIds = (): Set<string> => useMuseHub().installingIds;
export const useDisabledPlugins = (): Set<string> => useMuseHub().disabledPluginIds;

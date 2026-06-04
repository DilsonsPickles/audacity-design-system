// Single source of truth for the adieu cloud-projects data layer.
//
// adieu owns cloud project storage (independent from moose-hub, which owns
// auth + plugins + wallet + library). The user signs in to each service
// separately: AdieuContext tracks ONLY adieu auth + the project list.
//
// On mount we hydrate from the server if a token is present. signIn opens
// the AdieuAuthDialog; the dialog itself calls hydrate() after a successful
// password-grant login.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  hasToken,
  logout as adieuLogout,
  getUserInfo,
  listProjects,
  type AdieuProjectSummary,
} from '../lib/adieu-client';
import { AdieuAuthDialog } from '../components/adieu/AdieuAuthDialog';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}

export class SignInCancelledError extends Error {
  constructor() {
    super('adieu_sign_in_cancelled');
    this.name = 'SignInCancelledError';
  }
}

interface AdieuContextValue {
  signedIn: boolean;
  user: UserProfile;
  /** Project summaries returned by `listProjects()` on the most recent hydrate. */
  cloudProjects: AdieuProjectSummary[];
  /** True once `listProjects()` has returned at least once since sign-in.
   *  Consumers that prune local caches based on cloud-list contents (e.g.
   *  orphan cleanup) MUST gate on this — otherwise the initial empty state
   *  would be mistaken for "every cached cloud project was deleted." */
  cloudProjectsLoaded: boolean;
  /**
   * Open the adieu AuthDialog (no-op if already signed in). Returns a
   * Promise that resolves once tokens are written and state is hydrated,
   * or rejects with SignInCancelledError if the user closes the dialog
   * without completing. Callers can `await` this to chain a follow-up
   * action (e.g. a Save-to-Cloud flow that needs auth first).
   */
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch userinfo + projects from adieu. Called on mount + tab focus. */
  hydrate: () => Promise<void>;
  /** Re-fetch only the project list (cheaper; for post-save refresh). */
  refreshProjects: () => Promise<void>;
  /** State of the globally-mounted AdieuAuthDialog. */
  authDialog: 'closed' | 'sign-in' | 'create-account';
  /** Open the AdieuAuthDialog in a given mode. */
  openAuthDialog: (mode: 'sign-in' | 'create-account') => void;
  /** Close the AdieuAuthDialog. No-op if already closed. */
  closeAuthDialog: () => void;
  /** Called by the AuthDialog after a successful sign-in to resolve any
   *  pending `signIn()` promise. Not used by other consumers. */
  completePendingSignIn: () => void;
}

const AdieuContext = createContext<AdieuContextValue | null>(null);

const GUEST_USER: UserProfile = { name: 'Guest', email: '' };

export const AdieuProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Server-backed state — populated by hydration after sign-in.
  const [signedIn, setSignedIn] = useState<boolean>(() => hasToken());
  const [user, setUser] = useState<UserProfile>(GUEST_USER);
  const [cloudProjects, setCloudProjects] = useState<AdieuProjectSummary[]>([]);
  const [cloudProjectsLoaded, setCloudProjectsLoaded] = useState<boolean>(false);

  // Hydrate user + project list. Mirrors MuseHubContext.hydrate: only auth
  // errors flip us to signed-out; transient network errors leave the last-
  // known state alone so a brief connectivity hiccup doesn't kick the user
  // out mid-session.
  const hydrate = useCallback(async () => {
    if (!hasToken()) {
      setSignedIn(false);
      setUser(GUEST_USER);
      setCloudProjects([]);
      setCloudProjectsLoaded(false);
      return;
    }
    try {
      const [info, projects] = await Promise.all([
        getUserInfo(),
        listProjects(),
      ]);
      setUser({
        name: info.name,
        email: info.email,
        avatarUrl: info.avatarUrl,
      });
      setCloudProjects(projects.projects);
      setCloudProjectsLoaded(true);
      setSignedIn(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const isAuthError = /session expired|not signed in|invalid_token/i.test(message);
      if (isAuthError) {
        setSignedIn(false);
        setUser(GUEST_USER);
        setCloudProjects([]);
        setCloudProjectsLoaded(false);
      }
      // Otherwise: keep last-known state and try again on the next focus.
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!hasToken()) return;
    try {
      const projects = await listProjects();
      setCloudProjects(projects.projects);
      setCloudProjectsLoaded(true);
    } catch {
      // Non-fatal: caller still sees their last-known list.
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
  // change project state in adieu (e.g. delete a project from a separate
  // tab) and see the changes reflected here on tab switch.
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

  const [authDialog, setAuthDialog] = useState<'closed' | 'sign-in' | 'create-account'>('closed');

  // Pending signIn() promise resolver. Set when signIn() is called; cleared
  // either when the dialog reports a successful sign-in (resolve) or when
  // it closes without one (reject with SignInCancelledError).
  const pendingSignInRef = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

  const openAuthDialog = useCallback((mode: 'sign-in' | 'create-account') => {
    setAuthDialog(mode);
  }, []);
  const closeAuthDialog = useCallback(() => {
    setAuthDialog('closed');
    if (pendingSignInRef.current) {
      pendingSignInRef.current.reject(new SignInCancelledError());
      pendingSignInRef.current = null;
    }
  }, []);
  const signIn = useCallback((): Promise<void> => {
    // If already signed in, resolve immediately — no dialog needed.
    if (hasToken()) return Promise.resolve();
    // Replace any prior pending sign-in (treat as cancellation).
    if (pendingSignInRef.current) {
      pendingSignInRef.current.reject(new SignInCancelledError());
      pendingSignInRef.current = null;
    }
    return new Promise<void>((resolve, reject) => {
      pendingSignInRef.current = { resolve, reject };
      setAuthDialog('sign-in');
    });
  }, []);

  // The AuthDialog resolves a pending sign-in by calling this after hydrate
  // succeeds. Exposed via context so the dialog can call it directly.
  const completePendingSignIn = useCallback(() => {
    if (pendingSignInRef.current) {
      pendingSignInRef.current.resolve();
      pendingSignInRef.current = null;
    }
  }, []);

  const signOut = useCallback(async () => {
    await adieuLogout();
    setSignedIn(false);
    setUser(GUEST_USER);
    setCloudProjects([]);
    setCloudProjectsLoaded(false);
  }, []);

  const value = useMemo<AdieuContextValue>(
    () => ({
      signedIn,
      user,
      cloudProjects,
      cloudProjectsLoaded,
      signIn,
      signOut,
      hydrate,
      refreshProjects,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
      completePendingSignIn,
    }),
    [
      signedIn,
      user,
      cloudProjects,
      cloudProjectsLoaded,
      signIn,
      signOut,
      hydrate,
      refreshProjects,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
      completePendingSignIn,
    ],
  );

  return (
    <AdieuContext.Provider value={value}>
      {children}
      <AdieuAuthDialog />
    </AdieuContext.Provider>
  );
};

export function useAdieu(): AdieuContextValue {
  const ctx = useContext(AdieuContext);
  if (!ctx) {
    throw new Error('useAdieu must be used inside <AdieuProvider>');
  }
  return ctx;
}

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

interface AdieuContextValue {
  signedIn: boolean;
  user: UserProfile;
  /** Project summaries returned by `listProjects()` on the most recent hydrate. */
  cloudProjects: AdieuProjectSummary[];
  /** Convenience: opens the adieu AuthDialog in sign-in mode. */
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

  // Hydrate user + project list. Mirrors MuseHubContext.hydrate: only auth
  // errors flip us to signed-out; transient network errors leave the last-
  // known state alone so a brief connectivity hiccup doesn't kick the user
  // out mid-session.
  const hydrate = useCallback(async () => {
    if (!hasToken()) {
      setSignedIn(false);
      setUser(GUEST_USER);
      setCloudProjects([]);
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
      setSignedIn(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const isAuthError = /session expired|not signed in/i.test(message);
      if (isAuthError) {
        setSignedIn(false);
        setUser(GUEST_USER);
        setCloudProjects([]);
      }
      // Otherwise: keep last-known state and try again on the next focus.
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!hasToken()) return;
    try {
      const projects = await listProjects();
      setCloudProjects(projects.projects);
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
  const openAuthDialog = useCallback((mode: 'sign-in' | 'create-account') => {
    setAuthDialog(mode);
  }, []);
  const closeAuthDialog = useCallback(() => setAuthDialog('closed'), []);
  const signIn = useCallback(async () => {
    setAuthDialog('sign-in');
  }, []);

  const signOut = useCallback(async () => {
    await adieuLogout();
    setSignedIn(false);
    setUser(GUEST_USER);
    setCloudProjects([]);
  }, []);

  const value = useMemo<AdieuContextValue>(
    () => ({
      signedIn,
      user,
      cloudProjects,
      signIn,
      signOut,
      hydrate,
      refreshProjects,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
    }),
    [
      signedIn,
      user,
      cloudProjects,
      signIn,
      signOut,
      hydrate,
      refreshProjects,
      authDialog,
      openAuthDialog,
      closeAuthDialog,
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
